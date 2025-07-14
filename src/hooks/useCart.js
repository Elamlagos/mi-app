// 🛒 USE CART HOOK - MANEJO DEL CARRITO DE PLACAS
// Archivo: src/hooks/useCart.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { validationService, ConflictError, LimitError } from '../services/validationService';
import { compatibilityService } from '../services/compatibilityService';

// ═══════════════════════════════════════════════════════════════
// HOOK PRINCIPAL DEL CARRITO
// ═══════════════════════════════════════════════════════════════

export const useCart = (userId) => {
  // ┌─────────────────────────────────────────────────────────────
  // │ ESTADOS DEL HOOK
  // └─────────────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expirationTime, setExpirationTime] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [confirming, setConfirming] = useState(false);
  
  // Refs para timers
  const refreshTimerRef = useRef(null);
  const expirationTimerRef = useRef(null);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ OBTENER CARRITO DESDE BASE DE DATOS
  // └─────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError('');
      
      const now = new Date().toISOString();
      
      const { data, error: fetchError } = await supabase
        .from('carritos_prestamo')
        .select(`
          id,
          id_placa,
          fecha_agregado,
          expira_en,
          observaciones,
          placas:id_placa (
            id,
            id_visual,
            estado_actual,
            temas:id_tema (nombre),
            subtemas:id_subtema (nombre)
          )
        `)
        .eq('id_usuario', userId)
        .eq('estado', 'activo')
        .gt('expira_en', now)
        .order('fecha_agregado', { ascending: true });
      
      if (fetchError) {
        console.error('Error obteniendo carrito:', fetchError);
        throw fetchError;
      }
      
      const items = data || [];
      setCartItems(items);
      
      // Calcular tiempo de expiración
      if (items.length > 0) {
        const earliestExpiration = Math.min(...items.map(item => new Date(item.expira_en).getTime()));
        setExpirationTime(new Date(earliestExpiration));
        setIsExpired(earliestExpiration < Date.now());
      } else {
        setExpirationTime(null);
        setIsExpired(false);
      }
      
      console.log(`🛒 Carrito cargado: ${items.length} items`);
      
    } catch (error) {
      console.error('❌ Error cargando carrito:', error.message);
      setError(`Error cargando carrito: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ AGREGAR PLACA AL CARRITO
  // └─────────────────────────────────────────────────────────────
  const addToCart = useCallback(async (plateCode) => {
    if (!userId) {
      throw new Error('Usuario requerido');
    }
    
    try {
      setError('');
      
      // 1. Validar código de barras
      const cleanCode = validationService.validateBarcode(plateCode);
      
      // 2. Buscar placa por código
      const { data: plate, error: plateError } = await supabase
        .from('placas')
        .select('id, id_visual, codigo_barra_txt')
        .eq('codigo_barra_txt', cleanCode)
        .single();
      
      if (plateError || !plate) {
        throw new ConflictError(`No se encontró placa con código ${cleanCode}`);
      }
      
      // 3. Validar disponibilidad
      await validationService.validatePlateAvailability(plate.id, userId);
      
      // 4. Validar límites del usuario
      await validationService.validateUserLimits(userId);
      
      // 5. Calcular expiración (24 horas desde ahora)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      
      // 6. Insertar en carrito
      const { data: cartItem, error: insertError } = await supabase
        .from('carritos_prestamo')
        .insert({
          id_usuario: userId,
          id_placa: plate.id,
          expira_en: expirationDate.toISOString(),
          estado: 'activo',
          ip_origen: null, // Se puede agregar más tarde
          user_agent: navigator.userAgent
        })
        .select()
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          throw new ConflictError('Esta placa ya está en tu carrito');
        }
        throw insertError;
      }
      
      console.log(`✅ Placa ${plate.id_visual} agregada al carrito`);
      
      // 7. Refrescar carrito
      await fetchCart();
      
      return {
        success: true,
        message: `Placa ${plate.id_visual} agregada al carrito`,
        plate: plate,
        cartItem: cartItem
      };
      
    } catch (error) {
      console.error(`❌ Error agregando placa al carrito:`, error.message);
      
      // Manejar diferentes tipos de error
      if (error instanceof ConflictError || error instanceof LimitError) {
        setError(error.message);
        throw error;
      } else {
        const errorMsg = `Error agregando placa: ${error.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }, [userId, fetchCart]);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ REMOVER PLACA DEL CARRITO
  // └─────────────────────────────────────────────────────────────
  const removeFromCart = useCallback(async (plateId) => {
    if (!userId) return;
    
    try {
      setError('');
      
      const { error } = await supabase
        .from('carritos_prestamo')
        .delete()
        .eq('id_usuario', userId)
        .eq('id_placa', plateId)
        .eq('estado', 'activo');
      
      if (error) {
        throw error;
      }
      
      console.log(`➖ Placa ${plateId} removida del carrito`);
      
      // Refrescar carrito
      await fetchCart();
      
      return {
        success: true,
        message: 'Placa removida del carrito'
      };
      
    } catch (error) {
      console.error('❌ Error removiendo placa:', error.message);
      setError(`Error removiendo placa: ${error.message}`);
      throw error;
    }
  }, [userId, fetchCart]);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ LIMPIAR CARRITO COMPLETO
  // └─────────────────────────────────────────────────────────────
  const clearCart = useCallback(async () => {
    if (!userId) return;
    
    try {
      setError('');
      
      const { error } = await supabase
        .from('carritos_prestamo')
        .update({ estado: 'cancelado' })
        .eq('id_usuario', userId)
        .eq('estado', 'activo');
      
      if (error) {
        throw error;
      }
      
      console.log('🗑️ Carrito limpiado');
      
      // Refrescar carrito
      await fetchCart();
      
      return {
        success: true,
        message: 'Carrito limpiado'
      };
      
    } catch (error) {
      console.error('❌ Error limpiando carrito:', error.message);
      setError(`Error limpiando carrito: ${error.message}`);
      throw error;
    }
  }, [userId, fetchCart]);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ CONFIRMAR PRÉSTAMO (CRÍTICO - TRANSACCIÓN COMPLETA)
  // └─────────────────────────────────────────────────────────────
  const confirmLoan = useCallback(async (reports = []) => {
    if (!userId) {
      throw new Error('Usuario requerido');
    }
    
    if (cartItems.length === 0) {
      throw new Error('Carrito vacío');
    }
    
    try {
      setConfirming(true);
      setError('');
      
      console.log(`🚀 Confirmando préstamo de ${cartItems.length} placas...`);
      
      // 1. Validar que todas las placas sigan disponibles
      const plateIds = cartItems.map(item => item.id_placa);
      for (const plateId of plateIds) {
        await validationService.validatePlateAvailability(plateId, userId);
      }
      
      // 2. Crear registros de préstamo
      const semestre = await compatibilityService.getCurrentSemester();
      const loanRecords = cartItems.map(item => ({
        id_usuario: userId,
        id_placa: item.id_placa,
        fecha_prestamo: new Date().toISOString(),
        estado: 'prestado',
        semestre: semestre,
        observaciones_prestamo: null, // Se puede agregar más tarde
        id_creador: userId
      }));
      
      const { data: createdLoans, error: loanError } = await supabase
        .from('historial_prestamos')
        .insert(loanRecords)
        .select();
      
      if (loanError) {
        throw loanError;
      }
      
      console.log(`✅ Creados ${createdLoans.length} registros de préstamo`);
      
      // 3. Actualizar estados de placas (una por una para evitar conflictos)
      for (const plateId of plateIds) {
        await compatibilityService.syncPlateOwnership(plateId, userId, 'loan');
      }
      
      console.log(`✅ Actualizados estados de ${plateIds.length} placas`);
      
      // 4. Marcar carrito como procesado
      const { error: cartError } = await supabase
        .from('carritos_prestamo')
        .update({ estado: 'procesado' })
        .eq('id_usuario', userId)
        .eq('estado', 'activo');
      
      if (cartError) {
        console.warn('Advertencia actualizando carrito:', cartError);
        // No es crítico, continuar
      }
      
      // 5. Actualizar estado del usuario
      await compatibilityService.syncUserPlateStatus(userId);
      
      console.log(`✅ Actualizado estado del usuario`);
      
      // 6. Procesar reportes si existen (más tarde)
      // TODO: Implementar reportes en fase posterior
      
      // 7. Limpiar estado local
      setCartItems([]);
      setExpirationTime(null);
      setIsExpired(false);
      
      const successMessage = `¡Tienes ${cartItems.length} placas prestadas!`;
      console.log(`🎉 ${successMessage}`);
      
      return {
        success: true,
        message: successMessage,
        totalPlates: cartItems.length,
        plates: plateIds,
        loanRecords: createdLoans
      };
      
    } catch (error) {
      console.error('❌ Error confirmando préstamo:', error.message);
      setError(`Error confirmando préstamo: ${error.message}`);
      throw error;
    } finally {
      setConfirming(false);
    }
  }, [userId, cartItems]);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ EFECTOS Y TIMERS
  // └─────────────────────────────────────────────────────────────
  
  // Cargar carrito inicial
  useEffect(() => {
    if (userId) {
      fetchCart();
    }
  }, [userId, fetchCart]);
  
  // Timer para refrescar carrito cada 30 segundos
  useEffect(() => {
    if (userId && cartItems.length > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchCart();
      }, 30000); // 30 segundos
      
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [userId, cartItems.length, fetchCart]);
  
  // Timer para verificar expiración cada minuto
  useEffect(() => {
    if (expirationTime) {
      expirationTimerRef.current = setInterval(() => {
        const now = Date.now();
        const expiration = new Date(expirationTime).getTime();
        
        if (expiration <= now && !isExpired) {
          setIsExpired(true);
          console.log('⏰ Carrito expirado');
          fetchCart(); // Refrescar para limpiar items expirados
        }
      }, 60000); // 1 minuto
      
      return () => {
        if (expirationTimerRef.current) {
          clearInterval(expirationTimerRef.current);
        }
      };
    }
  }, [expirationTime, isExpired, fetchCart]);
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (expirationTimerRef.current) {
        clearInterval(expirationTimerRef.current);
      }
    };
  }, []);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALORES CALCULADOS
  // └─────────────────────────────────────────────────────────────
  const totalItems = cartItems.length;
  const isEmpty = totalItems === 0;
  const timeUntilExpiration = expirationTime ? Math.max(0, new Date(expirationTime).getTime() - Date.now()) : 0;
  const minutesUntilExpiration = Math.floor(timeUntilExpiration / 60000);
  
  // ┌─────────────────────────────────────────────────────────────
  // │ RETURN DEL HOOK
  // └─────────────────────────────────────────────────────────────
  return {
    // Estado
    cartItems,
    totalItems,
    isEmpty,
    loading,
    error,
    confirming,
    
    // Expiración
    expirationTime,
    isExpired,
    timeUntilExpiration,
    minutesUntilExpiration,
    
    // Acciones
    addToCart,
    removeFromCart,
    clearCart,
    confirmLoan,
    refreshCart: fetchCart,
    
    // Utilidades
    setError // Para limpiar errores desde componentes
  };
};

// ═══════════════════════════════════════════════════════════════
// HOOK HELPER PARA ESTADÍSTICAS DEL CARRITO
// ═══════════════════════════════════════════════════════════════

export const useCartStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const { count: activeCartsCount } = await supabase
        .from('carritos_prestamo')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo')
        .gt('expira_en', new Date().toISOString());
      
      const { count: expiredCartsCount } = await supabase
        .from('carritos_prestamo')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo')
        .lt('expira_en', new Date().toISOString());
      
      setStats({
        activeCarts: activeCartsCount || 0,
        expiredCarts: expiredCartsCount || 0,
        lastUpdate: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo estadísticas de carrito:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    stats,
    loading,
    fetchStats
  };
};

console.log('🛒 useCart hook cargado y listo');