// 📦 PLATE WITHDRAWAL COMPONENT - VERSIÓN CORREGIDA SIN WARNINGS
// Archivo: src/components/inventory/PlateWithdrawal.js

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import UltraFastScanner from './UltraFastScanner';
import LoanCart from '../loan/LoanCart';
import { useCart } from '../../hooks/useCart';

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL DE RETIRO DE PLACAS
// ═══════════════════════════════════════════════════════════════

const PlateWithdrawal = ({ onNavigate }) => {
  // ┌─────────────────────────────────────────────────────────────
  // │ ESTADOS PRINCIPALES
  // └─────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [plateData, setPlateData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartMode, setCartMode] = useState(false);
  
  // 🔒 NUEVO: Estados para prevenir escaneos múltiples
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedCode, setLastProcessedCode] = useState('');
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  
  // Hook del carrito
  const {
    addToCart,
    totalItems,
    isEmpty: cartIsEmpty,
    error: cartError,
    setError: setCartError,
    loading: cartLoading
  } = useCart(currentUser?.id);

  // ┌─────────────────────────────────────────────────────────────
  // │ OBTENER USUARIO ACTUAL
  // └─────────────────────────────────────────────────────────────
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Obtener perfil completo del usuario
          const { data: profile } = await supabase
            .from('usuarios')
            .select('id, nombre, apellidos, rol, comite')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setCurrentUser({
              ...session.user,
              ...profile
            });
          } else {
            setCurrentUser(session.user);
          }
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    };

    getCurrentUser();
  }, []);

  // ┌─────────────────────────────────────────────────────────────
  // │ FUNCIÓN PRINCIPAL DE ESCANEO - VERSIÓN CORREGIDA
  // └─────────────────────────────────────────────────────────────
  const handleCodeScanned = useCallback(async (code) => {
    const now = Date.now();
    
    // 🔒 PROTECCIÓN CONTRA ESCANEOS DUPLICADOS
    if (isProcessing) {
      console.log('⏸️ Ignorando escaneo - ya procesando:', code);
      return;
    }

    // 🔒 PROTECCIÓN TEMPORAL (evitar el mismo código en menos de 2 segundos)
    if (lastProcessedCode === code && (now - lastProcessedTime) < 2000) {
      console.log('⏸️ Ignorando escaneo duplicado reciente:', code);
      return;
    }

    try {
      // 🔒 ACTIVAR PROTECCIONES
      setIsProcessing(true);
      setLastProcessedCode(code);
      setLastProcessedTime(now);
      
      setLoading(true);
      setError('');
      setScannedCode(code);
      setIsScanning(false);
      
      console.log('🔍 Procesando código:', code);
      
      // 🆕 MODO CARRITO - AGREGAR DIRECTAMENTE
      if (cartMode && currentUser) {
        try {
          // Limpiar errores anteriores del carrito
          if (setCartError) setCartError('');
          
          const result = await addToCart(code);
          
          console.log('✅ Placa agregada al carrito:', result);
          
          // Limpiar la vista de placa individual cuando se agrega al carrito
          setPlateData(null);
          
          // Mostrar mensaje de éxito brevemente
          setError(`✅ ${result.plate?.id_visual || 'Placa'} agregada al carrito`);
          setTimeout(() => setError(''), 3000);
          
          return;
          
        } catch (cartError) {
          console.error('❌ Error agregando al carrito:', cartError);
          setError(`❌ ${cartError.message}`);
          setPlateData(null);
          return;
        }
      }
      
      // MODO BÚSQUEDA INDIVIDUAL (mantener funcionalidad existente)
      const { data: plate, error: plateError } = await supabase
        .from('placas')
        .select('*')
        .eq('codigo_barra_txt', code)
        .maybeSingle();
      
      if (plateError) {
        console.error('Error buscando placa:', plateError);
        setError(`Error en base de datos: ${plateError.message}`);
        setPlateData(null);
        return;
      }
      
      if (!plate) {
        setError(`No se encontró ninguna placa con el código: ${code}`);
        setPlateData(null);
        return;
      }
      
      console.log('✅ Placa encontrada:', plate);
      
      // Buscar datos relacionados en paralelo
      const [temaResult, subtemaResult, tincionResult] = await Promise.allSettled([
        supabase.from('temas').select('nombre, caja').eq('id_tema', plate.id_tema).maybeSingle(),
        supabase.from('subtemas').select('nombre').eq('id_tema', plate.id_tema).eq('id_subtema', plate.id_subtema).maybeSingle(),
        supabase.from('tinciones').select('nombre, tipo').eq('id_tincion', plate.id_tincion).maybeSingle()
      ]);
      
      // Procesar resultados con fallbacks
      const temaData = temaResult.status === 'fulfilled' && temaResult.value.data 
        ? temaResult.value.data 
        : { nombre: 'No disponible', caja: 'N/A' };
      
      const subtemaData = subtemaResult.status === 'fulfilled' && subtemaResult.value.data
        ? subtemaResult.value.data
        : { nombre: 'No disponible' };
      
      const tincionData = tincionResult.status === 'fulfilled' && tincionResult.value.data
        ? tincionResult.value.data
        : { nombre: 'No disponible', tipo: 'N/A' };
      
      // Combinar todos los datos
      const completeData = {
        ...plate,
        temas: temaData,
        subtemas: subtemaData,
        tinciones: tincionData
      };
      
      console.log('✅ Datos completos obtenidos');
      setPlateData(completeData);
      
    } catch (error) {
      console.error('Error procesando código:', error);
      setError(`Error: ${error.message}`);
      setPlateData(null);
    } finally {
      setLoading(false);
      
      // 🔒 LIBERAR PROTECCIONES CON DELAY MÍNIMO
      setTimeout(() => {
        setIsProcessing(false);
      }, 500); // 500ms de delay mínimo entre escaneos
    }
  }, [cartMode, currentUser, addToCart, setCartError, isProcessing, lastProcessedCode, lastProcessedTime]);

  // ┌─────────────────────────────────────────────────────────────
  // │ MANEJAR ERRORES DEL ESCÁNER
  // └─────────────────────────────────────────────────────────────
  const handleScanError = useCallback((errorMessage) => {
    console.error('Error del escáner:', errorMessage);
    setError(`Error del escáner: ${errorMessage}`);
    setIsScanning(false);
  }, []);

  // ┌─────────────────────────────────────────────────────────────
  // │ TOGGLE ENTRE MODOS
  // └─────────────────────────────────────────────────────────────
  const toggleMode = () => {
    setCartMode(!cartMode);
    setPlateData(null);
    setError('');
    if (setCartError) setCartError('');
    setScannedCode('');
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ MANEJAR CONFIRMACIÓN DE PRÉSTAMO
  // └─────────────────────────────────────────────────────────────
  const handleLoanConfirmed = (result) => {
    console.log('Préstamo confirmado:', result);
    setError('');
    if (setCartError) setCartError('');
    
    // Mostrar mensaje de éxito
    alert(`¡Préstamo confirmado! ${result.totalPlates} placas asignadas.`);
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ LIMPIAR BÚSQUEDA
  // └─────────────────────────────────────────────────────────────
  const clearSearch = () => {
    setPlateData(null);
    setScannedCode('');
    setError('');
    if (setCartError) setCartError('');
    setIsScanning(false);
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ COMPONENTE: INFORMACIÓN DE PLACA
  // └─────────────────────────────────────────────────────────────
  const PlateInfo = ({ data }) => {
    const getStatusColor = (status) => {
      const colors = {
        'disponible': '#28a745',
        'prestada': '#ffc107', 
        'mantenimiento': '#dc3545',
        'perdida': '#6c757d'
      };
      return colors[status] || '#6c757d';
    };

    const getActivityColor = (activity) => {
      const colors = {
        'guardada': '#28a745',
        'en_uso': '#ffc107',
        'en_transferencia': '#17a2b8'
      };
      return colors[activity] || '#6c757d';
    };

    return (
      <div style={{
        backgroundColor: 'white',
        border: '2px solid #dee2e6',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Header con ID Visual */}
        <div style={{
          textAlign: 'center',
          borderBottom: '2px solid #e9ecef',
          paddingBottom: '15px',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: '0',
            color: '#495057',
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            📦 {data.id_visual || `Placa #${data.id}`}
          </h2>
          <div style={{
            fontSize: '14px',
            color: '#6c757d',
            marginTop: '5px'
          }}>
            Código: {data.codigo_barra_txt || data.id}
          </div>
        </div>

        {/* Grid de información */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* Clasificación */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>🔬 Clasificación</h4>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Tema:</strong> {data.temas?.nombre || 'No disponible'}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Subtema:</strong> {data.subtemas?.nombre || 'No disponible'}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Tinción:</strong> {data.tinciones?.nombre || 'No disponible'}
            </p>
            {data.tinciones?.tipo && (
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#6c757d' }}>
                Tipo: {data.tinciones.tipo}
              </p>
            )}
          </div>

          {/* Estado y ubicación */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📍 Estado y Ubicación</h4>
            <div style={{ marginBottom: '8px' }}>
              <span style={{
                backgroundColor: getStatusColor(data.estado_actual),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {data.estado_actual || 'No definido'}
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{
                backgroundColor: getActivityColor(data.actividad),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {data.actividad || 'No definido'}
              </span>
            </div>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Caja:</strong> {data.caja || data.temas?.caja || 'No especificada'}
            </p>
            {data.estado_placa && (
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Condición:</strong> {data.estado_placa}
              </p>
            )}
          </div>

          {/* Usuario actual */}
          {data.usuario_actual && (
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #ffeaa7'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>👤 Usuario Actual</h4>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#856404' }}>
                Asignada a: {data.usuario_actual}
              </p>
              {data.ultimo_uso && (
                <p style={{ margin: '5px 0', fontSize: '12px', color: '#856404' }}>
                  Último uso: {new Date(data.ultimo_uso).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Observaciones */}
        {data.observaciones && (
          <div style={{
            backgroundColor: '#e9ecef',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '15px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📝 Observaciones</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#495057' }}>
              {data.observaciones}
            </p>
          </div>
        )}

        {/* Imágenes */}
        {(data.imagen_macro_url || data.imagen_micro_url?.length > 0) && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '15px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>📸 Imágenes</h4>
            
            {data.imagen_macro_url && (
              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Imagen Macro:
                </p>
                <img 
                  src={data.imagen_macro_url} 
                  alt="Imagen macro"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}
                />
              </div>
            )}
            
            {data.imagen_micro_url && data.imagen_micro_url.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Imágenes Microscópicas ({data.imagen_micro_url.length}):
                </p>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {data.imagen_micro_url.map((url, index) => (
                    <img 
                      key={index}
                      src={url} 
                      alt={`Imagen microscópica ${index + 1}`}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Código de barras */}
        {data.codigo_barra_url && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '15px',
            border: '1px solid #dee2e6',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📊 Código de Barras</h4>
            <img 
              src={data.codigo_barra_url} 
              alt="Código de barras"
              style={{
                maxWidth: '300px',
                height: 'auto',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ RENDER PRINCIPAL
  // └─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <button 
            onClick={() => onNavigate('dashboard')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            ← Volver al Dashboard
          </button>
          <h1 style={{ margin: 0 }}>
            {cartMode ? '🛒 Retiro de Placas - Modo Carrito' : '🔍 Retiro de Placas - Modo Búsqueda'}
          </h1>
        </div>

        {/* Toggle de modo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <button
            onClick={toggleMode}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: cartMode ? '#28a745' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {cartMode ? '🔍 Cambiar a Búsqueda' : '🛒 Cambiar a Carrito'}
          </button>

          {cartMode && !cartIsEmpty && (
            <div style={{
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {totalItems}
            </div>
          )}
        </div>
      </div>

      {/* Información del usuario */}
      {currentUser && (
        <div style={{
          backgroundColor: '#e7f3ff',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #b3d7ff'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0066cc' }}>
            👤 {currentUser.nombre} {currentUser.apellidos}
          </h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <span style={{
              backgroundColor: currentUser.rol === 'administrador' ? '#dc3545' : '#28a745',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginRight: '10px'
            }}>
              {currentUser.rol?.toUpperCase()}
            </span>
            {currentUser.comite && `Comité: ${currentUser.comite}`}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: cartMode ? '1fr 1fr' : '1fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        {/* Panel izquierdo: Escáner y controles */}
        <div>
          {/* Controles de escaneo */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #dee2e6',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: 0 }}>🔍 Escanear Código</h3>
              <div style={{
                display: 'flex',
                gap: '10px'
              }}>
                <button
                  onClick={() => setIsScanning(!isScanning)}
                  disabled={loading || isProcessing}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: isScanning 
                      ? '#dc3545' 
                      : (loading || isProcessing) 
                        ? '#6c757d' 
                        : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: (loading || isProcessing) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {loading || isProcessing ? '⏳ Procesando...' : 
                   isScanning ? '⏹️ Detener' : '📷 Escanear'}
                </button>
                
                {(plateData || scannedCode) && (
                  <button
                    onClick={clearSearch}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Escáner */}
            {isScanning && (
              <div style={{ marginBottom: '20px' }}>
                <UltraFastScanner
                  onCodeDetected={handleCodeScanned}
                  onError={handleScanError}
                  isActive={isScanning}
                />
              </div>
            )}

            {/* Estado del procesamiento */}
            {isProcessing && (
              <div style={{
                backgroundColor: '#fff3cd',
                color: '#856404',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '15px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                ⏳ Procesando código escaneado...
              </div>
            )}

            {/* Código escaneado */}
            {scannedCode && !loading && (
              <div style={{
                backgroundColor: '#d4edda',
                color: '#155724',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                <strong>Código procesado:</strong> {scannedCode}
              </div>
            )}

            {/* Instrucciones */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#666'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Instrucciones:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Modo Búsqueda:</strong> Escanea para ver información detallada</li>
                <li><strong>Modo Carrito:</strong> Escanea para agregar placas al carrito</li>
                <li>Asegúrate de que el código esté bien iluminado</li>
                <li>Mantén el código centrado en el área verde</li>
                {cartMode && <li>Las placas se agregan automáticamente al carrito</li>}
              </ul>
            </div>
          </div>

          {/* Información de placa (solo en modo búsqueda) */}
          {!cartMode && plateData && <PlateInfo data={plateData} />}
        </div>

        {/* Panel derecho: Carrito (solo en modo carrito) */}
        {cartMode && (
          <div>
            <LoanCart 
              userId={currentUser?.id}
              onLoanConfirmed={handleLoanConfirmed}
            />
          </div>
        )}
      </div>

      {/* Errores */}
      {(error || cartError) && (
        <div style={{
          backgroundColor: error?.includes('✅') ? '#d4edda' : '#f8d7da',
          color: error?.includes('✅') ? '#155724' : '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          border: `1px solid ${error?.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <strong>{error?.includes('✅') ? '🎉 Éxito:' : '⚠️ Error:'}</strong> {error || cartError}
        </div>
      )}

      {/* Loading indicator global */}
      {(loading || cartLoading) && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div className="spinner" />
          Procesando...
        </div>
      )}

      {/* CSS para animación de loading - SIN JSX WARNING */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #fff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Debug info (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 999
        }}>
          <div>Processing: {isProcessing ? 'YES' : 'NO'}</div>
          <div>Last Code: {lastProcessedCode || 'None'}</div>
          <div>Mode: {cartMode ? 'Cart' : 'Search'}</div>
          <div>Cart Items: {totalItems}</div>
        </div>
      )}
    </div>
  );
};

export default PlateWithdrawal;

console.log('📦 PlateWithdrawal CORREGIDO v2.2 - SIN JSX WARNINGS');
console.log('✅ Cambiado <style jsx> por <style> normal');
console.log('✅ Eliminado warning de non-boolean attribute jsx');
console.log('🔒 Protecciones activas: Anti-spam, Lock temporal, Delay mínimo');
console.log('🛒 Modos disponibles: Búsqueda individual + Carrito múltiple');
console.log('✅ Listo para deploy en Netlify sin warnings');