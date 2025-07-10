import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import UltraFastScanner from './UltraFastScanner';

const PlateWithdrawal = ({ onNavigate }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [plateData, setPlateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemReady, setSystemReady] = useState(false);

  // Verificar si el sistema está listo
  useEffect(() => {
    const checkSystem = () => {
      if (window.ZXing && window.BARCODE_SYSTEM_READY) {
        setSystemReady(true);
        console.log('✅ Sistema de escaneo listo');
      } else {
        console.log('⏳ Esperando sistema de escaneo...');
        setTimeout(checkSystem, 500);
      }
    };
    
    checkSystem();
  }, []);

  // 🚀 MANEJAR CÓDIGO ESCANEADO - SÚPER SIMPLE
  const handleCodeScanned = async (code) => {
    try {
      setLoading(true);
      setError('');
      setScannedCode(code);
      setIsScanning(false);
      
      console.log('🔍 Procesando código:', code);
      
      // Buscar placa en la base de datos
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
    }
  };

  // Manejar errores de la cámara
  const handleCameraError = (errorMessage) => {
    setError(errorMessage);
    setIsScanning(false);
  };

  // 🚀 INICIAR ESCANEO NUEVO
  const startNewScan = () => {
    if (!systemReady) {
      setError('El sistema de escaneo aún no está listo. Por favor, espera un momento y recarga la página.');
      return;
    }
    
    setScannedCode(null);
    setPlateData(null);
    setError('');
    setIsScanning(true);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => onNavigate('dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Volver al Dashboard
        </button>
        
        <h2>⚡ Escáner Ultra Rápido de Placas</h2>
        <p style={{ color: '#666' }}>
          Sistema optimizado para detección instantánea de códigos de 6 dígitos
        </p>
      </div>

      {/* Errores */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Estado del sistema */}
      {!systemReady && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ffeaa7'
        }}>
          <strong>⏳ Cargando sistema de escaneo...</strong>
          <br />
          <span style={{ fontSize: '14px' }}>
            Esperando que se carguen las librerías de códigos de barras
          </span>
        </div>
      )}

      {/* Controles de escaneo */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        {systemReady && !isScanning && !scannedCode && (
          <button
            onClick={startNewScan}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(40, 167, 69, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            ⚡ Iniciar Escáner Ultra Rápido
          </button>
        )}

        {!systemReady && (
          <button
            disabled
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#ccc',
              color: '#666',
              border: 'none',
              borderRadius: '10px',
              cursor: 'not-allowed'
            }}
          >
            ⏳ Cargando Sistema...
          </button>
        )}

        {isScanning && (
          <button
            onClick={() => setIsScanning(false)}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            ⏹️ Detener Escáner
          </button>
        )}

        {scannedCode && (
          <button
            onClick={startNewScan}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🔄 Escanear Otra Placa
          </button>
        )}
      </div>

      {/* 🚀 ESCÁNER ULTRA RÁPIDO */}
      {isScanning && systemReady && (
        <div style={{ marginBottom: '30px' }}>
          <UltraFastScanner
            isActive={isScanning}
            onCodeDetected={handleCodeScanned}
            onError={handleCameraError}
          />
        </div>
      )}

      {/* Código escaneado */}
      {scannedCode && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>✅ Código Detectado</h4>
          <code style={{ 
            fontSize: '20px', 
            fontWeight: 'bold',
            backgroundColor: '#fff',
            padding: '5px 10px',
            borderRadius: '5px',
            border: '1px solid #c3e6cb'
          }}>
            {scannedCode}
          </code>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '15px' }}>⏳</div>
          <p style={{ fontSize: '16px', color: '#666' }}>
            Buscando información de la placa...
          </p>
        </div>
      )}

      {/* 🚀 DATOS DE LA PLACA MEJORADOS */}
      {plateData && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            color: '#28a745', 
            marginBottom: '20px',
            fontSize: '26px',
            borderBottom: '3px solid #28a745',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center'
          }}>
            📋 Información de la Placa
            <span style={{
              marginLeft: 'auto',
              fontSize: '14px',
              backgroundColor: '#28a745',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px'
            }}>
              ✅ ENCONTRADA
            </span>
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '25px'
          }}>
            {/* Información básica */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '2px solid #dee2e6',
                paddingBottom: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
                🔍 Identificación
              </h4>
              <div style={{ lineHeight: '2' }}>
                <p><strong>ID de Placa:</strong> 
                  <span style={{ 
                    backgroundColor: '#e7f3ff', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    marginLeft: '8px',
                    fontFamily: 'monospace'
                  }}>
                    {plateData.id}
                  </span>
                </p>
                <p><strong>ID Visual:</strong> 
                  <span style={{ 
                    backgroundColor: '#e7f3ff', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    marginLeft: '8px',
                    fontFamily: 'monospace'
                  }}>
                    {plateData.id_visual}
                  </span>
                </p>
                <p><strong>Tema:</strong> {plateData.id_tema} - {plateData.temas?.nombre || 'N/A'}</p>
                <p><strong>Subtema:</strong> {plateData.id_subtema} - {plateData.subtemas?.nombre || 'N/A'}</p>
                <p><strong>Caja:</strong> 
                  <span style={{ 
                    backgroundColor: '#fff3cd', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    marginLeft: '8px',
                    fontWeight: 'bold'
                  }}>
                    {plateData.caja || 'N/A'}
                  </span>
                </p>
              </div>
            </div>

            {/* Detalles técnicos */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '2px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                🧪 Detalles Técnicos
              </h4>
              <div style={{ lineHeight: '2' }}>
                <p><strong>Tinción:</strong> {plateData.tinciones?.nombre || 'N/A'}</p>
                <p><strong>Tipo de Tinción:</strong> 
                  <span style={{
                    backgroundColor: plateData.tinciones?.tipo === 'especial' ? '#ffeaa7' : '#e9ecef',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginLeft: '8px',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}>
                    {plateData.tinciones?.tipo || 'N/A'}
                  </span>
                </p>
                <p><strong>Estado:</strong> 
                  <span style={{
                    backgroundColor: 
                      plateData.estado_placa === 'excelente' ? '#28a745' :
                      plateData.estado_placa === 'muy buena' ? '#20c997' :
                      plateData.estado_placa === 'buena' ? '#ffc107' : '#dc3545',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    marginLeft: '8px',
                    fontWeight: 'bold',
                    textTransform: 'capitalize'
                  }}>
                    {plateData.estado_placa || 'N/A'}
                  </span>
                </p>
                <p><strong>Actividad:</strong> 
                  <span style={{
                    backgroundColor: plateData.actividad === 'guardada' ? '#d4edda' : '#fff3cd',
                    color: plateData.actividad === 'guardada' ? '#155724' : '#856404',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginLeft: '8px',
                    fontSize: '12px',
                    textTransform: 'capitalize'
                  }}>
                    {plateData.actividad || 'N/A'}
                  </span>
                </p>
              </div>
            </div>

            {/* Fechas */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '2px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                📅 Historial
              </h4>
              <div style={{ lineHeight: '2' }}>
                <p><strong>Creación:</strong> {formatDate(plateData.creacion)}</p>
                <p><strong>Última Edición:</strong> {formatDate(plateData.edicion)}</p>
                <p><strong>Último Uso:</strong> {formatDate(plateData.ultimo_uso)}</p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {plateData.observaciones && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #dee2e6',
              marginTop: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '2px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                📝 Observaciones
              </h4>
              <p style={{ 
                lineHeight: '1.6', 
                color: '#495057',
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                fontStyle: 'italic'
              }}>
                "{plateData.observaciones}"
              </p>
            </div>
          )}

          {/* Imágenes */}
          {(plateData.imagen_macro_url || (plateData.imagen_micro_url && plateData.imagen_micro_url.length > 0) || plateData.codigo_barra_url) && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #dee2e6',
              marginTop: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '2px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                🖼️ Imágenes
              </h4>
              
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '20px' 
              }}>
                {plateData.imagen_macro_url && (
                  <div>
                    <h5 style={{ marginBottom: '10px', color: '#6c757d' }}>📷 Imagen Macro</h5>
                    <img 
                      src={plateData.imagen_macro_url} 
                      alt="Imagen macro" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '200px',
                        border: '3px solid #dee2e6',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                      onClick={() => window.open(plateData.imagen_macro_url, '_blank')}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  </div>
                )}
                
                {plateData.imagen_micro_url && plateData.imagen_micro_url.length > 0 && (
                  <div>
                    <h5 style={{ marginBottom: '10px', color: '#6c757d' }}>
                      🔬 Imágenes Micro ({plateData.imagen_micro_url.length})
                    </h5>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {plateData.imagen_micro_url.map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`Micro ${index + 1}`} 
                          style={{ 
                            width: '90px', 
                            height: '90px',
                            objectFit: 'cover',
                            border: '2px solid #dee2e6',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                          }}
                          onClick={() => window.open(url, '_blank')}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {plateData.codigo_barra_url && (
                  <div>
                    <h5 style={{ marginBottom: '10px', color: '#6c757d' }}>📊 Código de Barras</h5>
                    <img 
                      src={plateData.codigo_barra_url} 
                      alt="Código de barras" 
                      style={{ 
                        maxWidth: '250px',
                        border: '2px solid #dee2e6',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        padding: '10px'
                      }}
                      onClick={() => window.open(plateData.codigo_barra_url, '_blank')}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer informativo */}
      <div style={{
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '30px',
        textAlign: 'center'
      }}>
        <p style={{ 
          margin: '0', 
          fontSize: '14px', 
          color: '#6c757d',
          fontStyle: 'italic'
        }}>
          💡 <strong>Tip:</strong> El escáner detecta automáticamente códigos de 6 dígitos. 
          Mantén el código centrado en el área verde para mejor precisión.
        </p>
      </div>
    </div>
  );
};

export default PlateWithdrawal;