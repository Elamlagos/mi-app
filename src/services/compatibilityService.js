// 🔄 COMPATIBILITY SERVICE - SINCRONIZACIÓN CON SISTEMA EXISTENTE
// Archivo: src/services/compatibilityService.js

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════
// SERVICIO DE COMPATIBILIDAD CON TABLAS EXISTENTES
// ═══════════════════════════════════════════════════════════════

export const compatibilityService = {
  
  // ┌─────────────────────────────────────────────────────────────
  // │ SINCRONIZAR ESTADO DE USUARIO (usuarios.estado_placa)
  // └─────────────────────────────────────────────────────────────
  async syncUserPlateStatus(userId) {
    console.log(`🔄 Sincronizando estado de placas para usuario ${userId}`);
    
    try {
      // Contar placas prestadas actualmente
      const { count: activePlates, error: countError } = await supabase
        .from('historial_prestamos')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', userId)
        .eq('estado', 'prestado');
      
      if (countError) {
        console.error('Error contando placas activas:', countError);
        throw countError;
      }
      
      // Determinar nuevo estado
      const newStatus = activePlates > 0 ? 'En uso' : 'Sin usos';
      
      // Actualizar tabla usuarios
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          estado_placa: newStatus,
          ultima_placa: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error actualizando estado usuario:', updateError);
        throw updateError;
      }
      
      console.log(`✅ Usuario ${userId}: ${activePlates} placas activas → estado: ${newStatus}`);
      return {
        userId,
        activePlates,
        newStatus
      };
      
    } catch (error) {
      console.error(`❌ Error sincronizando usuario ${userId}:`, error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ SINCRONIZAR ESTADO DE PLACA (placas.usuario_actual, estado_actual)
  // └─────────────────────────────────────────────────────────────
  async syncPlateOwnership(plateId, userId, action) {
    console.log(`🔄 Sincronizando placa ${plateId}: acción=${action}, usuario=${userId}`);
    
    try {
      const updates = {};
      
      if (action === 'loan') {
        // PRÉSTAMO: asignar usuario y cambiar estado
        updates.usuario_actual = userId;
        updates.estado_actual = 'prestada';
        updates.actividad = 'en_uso';
      } else if (action === 'return') {
        // DEVOLUCIÓN: quitar usuario y cambiar estado
        updates.usuario_actual = null;
        updates.estado_actual = 'disponible';
        updates.actividad = 'guardada';
      } else if (action === 'transfer') {
        // TRANSFERENCIA: cambiar usuario pero mantener prestada
        updates.usuario_actual = userId;
        updates.estado_actual = 'prestada';
        updates.actividad = 'en_transferencia';
      }
      
      // Siempre actualizar último uso
      updates.ultimo_uso = new Date().toISOString();
      
      // Actualizar tabla placas
      const { data, error } = await supabase
        .from('placas')
        .update(updates)
        .eq('id', plateId)
        .select('id, id_visual, estado_actual, usuario_actual')
        .single();
      
      if (error) {
        console.error('Error actualizando placa:', error);
        throw error;
      }
      
      console.log(`✅ Placa ${data.id_visual}: ${action} → estado: ${data.estado_actual}, usuario: ${data.usuario_actual || 'ninguno'}`);
      return data;
      
    } catch (error) {
      console.error(`❌ Error sincronizando placa ${plateId}:`, error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ MIGRAR DATOS EXISTENTES (ejecutar una sola vez)
  // └─────────────────────────────────────────────────────────────
  async migrateExistingLoans() {
    console.log('🚀 Iniciando migración de préstamos existentes...');
    
    try {
      // Obtener placas actualmente prestadas
      const { data: prestadas, error: selectError } = await supabase
        .from('placas')
        .select('id, usuario_actual, ultimo_uso, id_visual')
        .eq('estado_actual', 'prestada')
        .not('usuario_actual', 'is', null);
      
      if (selectError) {
        console.error('Error obteniendo placas prestadas:', selectError);
        throw selectError;
      }
      
      if (!prestadas || prestadas.length === 0) {
        console.log('✅ No hay placas prestadas para migrar');
        return { migrated: 0, message: 'No hay datos para migrar' };
      }
      
      console.log(`📋 Encontradas ${prestadas.length} placas prestadas para migrar`);
      
      // Obtener semestre actual
      const semestre = await this.getCurrentSemester();
      
      // Preparar registros para insertar
      const registros = prestadas.map(placa => ({
        id_usuario: placa.usuario_actual,
        id_placa: placa.id,
        fecha_prestamo: placa.ultimo_uso || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás si no hay fecha
        estado: 'prestado',
        semestre: semestre,
        observaciones_prestamo: 'Migrado desde sistema anterior - datos estimados',
        id_creador: placa.usuario_actual
      }));
      
      // Insertar en historial_prestamos
      const { data: insertedRecords, error: insertError } = await supabase
        .from('historial_prestamos')
        .insert(registros)
        .select();
      
      if (insertError) {
        console.error('Error insertando historial migrado:', insertError);
        throw insertError;
      }
      
      console.log(`✅ Migrados ${insertedRecords.length} registros de préstamo`);
      
      // Actualizar estados de usuarios afectados
      const userIds = [...new Set(prestadas.map(p => p.usuario_actual))];
      console.log(`🔄 Actualizando estados de ${userIds.length} usuarios...`);
      
      for (const userId of userIds) {
        await this.syncUserPlateStatus(userId);
      }
      
      console.log('🎉 Migración completada exitosamente');
      return {
        migrated: insertedRecords.length,
        users_updated: userIds.length,
        message: `Migrados ${insertedRecords.length} préstamos de ${userIds.length} usuarios`
      };
      
    } catch (error) {
      console.error('❌ Error en migración:', error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ OBTENER SEMESTRE ACTUAL
  // └─────────────────────────────────────────────────────────────
  async getCurrentSemester() {
    try {
      // Por ahora retornar semestre por defecto
      // Más tarde esto vendrá de la tabla configuracion_sistema
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() es 0-indexado
      
      // Determinar semestre basado en el mes
      const semester = month <= 6 ? 1 : 2;
      
      const semestreCalculado = `${year}-${semester}`;
      console.log(`📅 Semestre actual calculado: ${semestreCalculado}`);
      
      return semestreCalculado;
      
    } catch (error) {
      console.error('Error obteniendo semestre:', error);
      return '2024-2'; // Fallback
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VERIFICAR CONSISTENCIA DE DATOS
  // └─────────────────────────────────────────────────────────────
  async verifyDataConsistency() {
    console.log('🔍 Verificando consistencia de datos...');
    
    try {
      const issues = [];
      
      // 1. Placas con usuario_actual pero estado_actual != 'prestada'
      const { data: inconsistentPlates1, error: error1 } = await supabase
        .from('placas')
        .select('id, id_visual, estado_actual, usuario_actual')
        .not('usuario_actual', 'is', null)
        .neq('estado_actual', 'prestada');
      
      if (error1) throw error1;
      
      if (inconsistentPlates1 && inconsistentPlates1.length > 0) {
        issues.push({
          type: 'placas_usuario_sin_prestamo',
          count: inconsistentPlates1.length,
          details: inconsistentPlates1
        });
      }
      
      // 2. Placas con estado_actual = 'prestada' pero sin usuario_actual
      const { data: inconsistentPlates2, error: error2 } = await supabase
        .from('placas')
        .select('id, id_visual, estado_actual, usuario_actual')
        .eq('estado_actual', 'prestada')
        .is('usuario_actual', null);
      
      if (error2) throw error2;
      
      if (inconsistentPlates2 && inconsistentPlates2.length > 0) {
        issues.push({
          type: 'placas_prestadas_sin_usuario',
          count: inconsistentPlates2.length,
          details: inconsistentPlates2
        });
      }
      
      // 3. Usuarios con estado_placa = 'En uso' pero sin placas prestadas
      const { data: usersWithStatus, error: error3 } = await supabase
        .from('usuarios')
        .select('id, nombre, apellidos, estado_placa')
        .eq('estado_placa', 'En uso');
      
      if (error3) throw error3;
      
      for (const user of usersWithStatus || []) {
        const { count: actualPlates } = await supabase
          .from('historial_prestamos')
          .select('*', { count: 'exact', head: true })
          .eq('id_usuario', user.id)
          .eq('estado', 'prestado');
        
        if (actualPlates === 0) {
          issues.push({
            type: 'usuario_estado_incorrecto',
            userId: user.id,
            userName: `${user.nombre} ${user.apellidos}`,
            expected: 'Sin usos',
            actual: 'En uso'
          });
        }
      }
      
      console.log(`🔍 Verificación completa. ${issues.length} inconsistencias encontradas`);
      return {
        consistent: issues.length === 0,
        issues: issues,
        summary: {
          total_issues: issues.length,
          types: issues.map(i => i.type)
        }
      };
      
    } catch (error) {
      console.error('❌ Error verificando consistencia:', error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ REPARAR INCONSISTENCIAS AUTOMÁTICAMENTE - FIXED SWITCH
  // └─────────────────────────────────────────────────────────────
  async repairDataInconsistencies() {
    console.log('🔧 Reparando inconsistencias de datos...');
    
    try {
      const verification = await this.verifyDataConsistency();
      
      if (verification.consistent) {
        console.log('✅ No hay inconsistencias que reparar');
        return { repaired: 0, message: 'Datos consistentes' };
      }
      
      let repaired = 0;
      
      for (const issue of verification.issues) {
        switch (issue.type) {
          case 'placas_usuario_sin_prestamo':
            // Quitar usuario_actual de placas que no deberían tenerlo
            for (const plate of issue.details) {
              await this.syncPlateOwnership(plate.id, null, 'return');
              repaired++;
            }
            break;
            
          case 'placas_prestadas_sin_usuario':
            // Cambiar estado a disponible si no tienen usuario
            for (const plate of issue.details) {
              await supabase
                .from('placas')
                .update({ estado_actual: 'disponible', actividad: 'guardada' })
                .eq('id', plate.id);
              repaired++;
            }
            break;
            
          case 'usuario_estado_incorrecto':
            // Actualizar estado del usuario
            await this.syncUserPlateStatus(issue.userId);
            repaired++;
            break;
            
          default:
            // ✅ CORREGIDO: Agregado caso default
            console.warn('Tipo de inconsistencia desconocido:', issue.type);
            break;
        }
      }
      
      console.log(`✅ Reparadas ${repaired} inconsistencias`);
      return {
        repaired: repaired,
        message: `Se repararon ${repaired} inconsistencias de datos`
      };
      
    } catch (error) {
      console.error('❌ Error reparando inconsistencias:', error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ OBTENER ESTADÍSTICAS DEL SISTEMA
  // └─────────────────────────────────────────────────────────────
  async getSystemStats() {
    try {
      // Estadísticas paralelas
      const [
        totalUsers,
        totalPlates,
        activePlates,
        totalLoans,
        activeLoans,
        activeCartItems
      ] = await Promise.all([
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase.from('placas').select('*', { count: 'exact', head: true }),
        supabase.from('placas').select('*', { count: 'exact', head: true }).eq('estado_actual', 'prestada'),
        supabase.from('historial_prestamos').select('*', { count: 'exact', head: true }),
        supabase.from('historial_prestamos').select('*', { count: 'exact', head: true }).eq('estado', 'prestado'),
        supabase.from('carritos_prestamo').select('*', { count: 'exact', head: true }).eq('estado', 'activo')
      ]);
      
      return {
        users: {
          total: totalUsers.count || 0
        },
        plates: {
          total: totalPlates.count || 0,
          active: activePlates.count || 0,
          available: (totalPlates.count || 0) - (activePlates.count || 0)
        },
        loans: {
          total_historical: totalLoans.count || 0,
          currently_active: activeLoans.count || 0
        },
        carts: {
          active_items: activeCartItems.count || 0
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      throw error;
    }
  }
};

console.log('🔄 CompatibilityService cargado y listo');