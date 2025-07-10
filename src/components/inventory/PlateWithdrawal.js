import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ProfessionalBarcodeScanner from './ProfessionalBarcodeScanner';

const PlateWithdrawal = ({ onNavigate }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [plateData, setPlateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quaggaReady, setQuaggaReady] = useState(false);

  // Verificar si QuaggaJS está disponible
  useEffect(() => {
    const checkQuagga = () => {
      if (window.Quagga) {
        setQuaggaReady(true);
        console.log('✅ QuaggaJS está disponible');
      } else {
        console.log('⏳ Esperando QuaggaJS...');
        setTimeout(checkQuagga, 500);
      }
    };
    
    checkQuagga();
  }, []);

  // Manejar código escaneado con optimizaciones profesionales
  const handleCodeScanned = async (code) => {
    try {
      setLoading(true);
      setError('');
      setScannedCode(code);
      setIsScanning(false); // Detener la cámara inmediatamente
      
      console.log('🔍 Procesando código escaneado:', code);
      
      // Buscar placa con optimización de consulta
      const startTime = Date.now();
      
      const { data: plate, error: plateError } = await supabase
        .from('placas')
        .select('*')
        .eq('codigo_barra_txt', code)
        .maybeSingle(); // Usar maybeSingle en lugar de single para mejor manejo
      
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
      
      // Buscar datos relacionados en paralelo con mejor manejo de errores
      const [temaResult, subtemaResult, tincionResult] = await Promise.allSettled([
        // Buscar tema
        supabase
          .from('temas')
          .select('nombre, caja')
          .eq('id_tema', plate.id_tema)
          .maybeSingle(),
        
        // Buscar subtema
        supabase
          .from('subtemas')
          .select('nombre')
          .eq('id_tema', plate.id_tema)
          .eq('id_subtema', plate.id_subtema)
          .maybeSingle(),
        
        // Buscar tinción
        supabase
          .from('tinciones')
          .select('nombre, tipo')
          .eq('id_tincion', plate.id_tincion)
          .maybeSingle()
      ]);
      
      // Procesar resultados con manejo robusto de errores
      const temaData = temaResult.status === 'fulfilled' && temaResult.value.data 
        ? temaResult.value.data 
        : { nombre: 'Información no disponible', caja: 'N/A' };
      
      const subtemaData = subtemaResult.status === 'fulfilled' && subtemaResult.value.data
        ? subtemaResult.value.data
        : { nombre: 'Información no disponible' };
      
      const tincionData = tincionResult.status === 'fulfilled' && tincionResult.value.data
        ? tincionResult.value.data
        : { nombre: 'Información no disponible', tipo: 'N/A' };
      
      // Combinar datos completos
      const completeData = {
        ...plate,
        temas: temaData,
        subtemas: subtemaData,
        tinciones: tincionData,
        // Metadata de rendimiento
        _metadata: {
          queryTime: Date.now() - startTime,
          scannedAt: new Date().toISOString()
        }
      };
      
      const queryTime = Date.now() - startTime;
      console.log(`✅ Datos completos obtenidos en ${queryTime}ms`);
      
      setPlateData(completeData);
      
    } catch (error) {
      console.error('Error crítico procesando código:', error);
      setError(`Error crítico del sistema: ${error.message}`);
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

  // Reiniciar escaneo
  const startNewScan = () => {
    if (!quaggaReady) {
      setError('El escáner aún no está listo. Por favor, espera un momento.');
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
        
        <h2>🚀 Sistema Profesional de Escaneo</h2>
        <p style={{ color: '#666' }}>
          Escaneo optimizado con detección multi-algoritmo y validación por consenso
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

      {/* Controles */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        {!quaggaReady && (
          <div style={{
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #ffeaa7'
          }}>
            <strong>⏳ Cargando escáner...</strong>
            <br />
            <span style={{ fontSize: '14px' }}>
              Esperando que se cargue la librería de escaneo
            </span>
          </div>
        )}

        {quaggaReady && !isScanning && !scannedCode && (
          <button
            onClick={() => setIsScanning(true)}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              background: 'linear-gradient(135deg, #28a745, #20c997)'
            }}
          >
            🚀 Iniciar Escáner Profesional
          </button>
        )}

        {!quaggaReady && !isScanning && !scannedCode && (
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
            📱 Cargando Escáner...
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
              cursor: 'pointer'
            }}
          >
            🔄 Escanear Otra Placa
          </button>
        )}
      </div>

      {/* Cámara profesional */}
      {isScanning && quaggaReady && (
        <div style={{ marginBottom: '30px' }}>
          <ProfessionalBarcodeScanner
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
          <h4 style={{ margin: '0 0 5px 0' }}>✅ Código Escaneado</h4>
          <code style={{ fontSize: '18px', fontWeight: 'bold' }}>{scannedCode}</code>
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

      {/* Datos de la placa */}
      {plateData && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '10px',
          padding: '25px',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            color: '#28a745', 
            marginBottom: '20px',
            fontSize: '24px',
            borderBottom: '2px solid #28a745',
            paddingBottom: '10px'
          }}>
            📋 Información de la Placa
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
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                🔍 Identificación
              </h4>
              <div style={{ lineHeight: '1.8' }}>
                <p><strong>ID de Placa:</strong> {plateData.id}</p>
                <p><strong>ID Visual:</strong> {plateData.id_visual}</p>
                <p><strong>Tema:</strong> {plateData.id_tema} - {plateData.temas?.nombre || 'N/A'}</p>
                <p><strong>Subtema:</strong> {plateData.id_subtema} - {plateData.subtemas?.nombre || 'N/A'}</p>
                <p><strong>Caja:</strong> {plateData.caja || 'N/A'}</p>
              </div>
            </div>

            {/* Detalles técnicos */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                🧪 Detalles Técnicos
              </h4>
              <div style={{ lineHeight: '1.8' }}>
                <p><strong>Tinción:</strong> {plateData.tinciones?.nombre || 'N/A'}</p>
                <p><strong>Tipo de Tinción:</strong> {plateData.tinciones?.tipo || 'N/A'}</p>
                <p><strong>Estado:</strong> 
                  <span style={{
                    backgroundColor: 
                      plateData.estado_placa === 'excelente' ? '#28a745' :
                      plateData.estado_placa === 'muy buena' ? '#20c997' :
                      plateData.estado_placa === 'buena' ? '#ffc107' : '#dc3545',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    marginLeft: '8px'
                  }}>
                    {plateData.estado_placa || 'N/A'}
                  </span>
                </p>
                <p><strong>Actividad:</strong> {plateData.actividad || 'N/A'}</p>
              </div>
            </div>

            {/* Fechas */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                📅 Historial
              </h4>
              <div style={{ lineHeight: '1.8' }}>
                <p><strong>Creación:</strong> {formatDate(plateData.creacion)}</p>
                <p><strong>Última Edición:</strong> {formatDate(plateData.edicion)}</p>
                <p><strong>Último Uso:</strong> {formatDate(plateData.ultimo_uso)}</p>
              </div>
            </div>
          </div>

          {/* Metadata de rendimiento */}
          {plateData._metadata && (
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginTop: '15px'
            }}>
              <h5 style={{ 
                color: '#6c757d', 
                marginBottom: '10px',
                fontSize: '14px',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '5px'
              }}>
                📊 Información de Rendimiento
              </h5>
              <div style={{ 
                display: 'flex', 
                gap: '20px', 
                fontSize: '12px',
                color: '#495057'
              }}>
                <span>⚡ Consulta: {plateData._metadata.queryTime}ms</span>
                <span>🕐 Escaneado: {new Date(plateData._metadata.scannedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          {/* Observaciones */}
          {plateData.observaciones && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginTop: '20px'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                📝 Observaciones
              </h4>
              <p style={{ 
                lineHeight: '1.6', 
                color: '#495057',
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '5px',
                border: '1px solid #e9ecef'
              }}>
                {plateData.observaciones}
              </p>
            </div>
          )}

          {/* Imágenes */}
          {(plateData.imagen_macro_url || (plateData.imagen_micro_url && plateData.imagen_micro_url.length > 0) || plateData.codigo_barra_url) && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginTop: '20px'
            }}>
              <h4 style={{ 
                color: '#495057', 
                marginBottom: '15px',
                fontSize: '18px',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '8px'
              }}>
                🖼️ Imágenes
              </h4>
              
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '15px' 
              }}>
                {plateData.imagen_macro_url && (
                  <div>
                    <h5 style={{ marginBottom: '8px', color: '#6c757d' }}>Imagen Macro</h5>
                    <img 
                      src={plateData.imagen_macro_url} 
                      alt="Imagen macro" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '200px',
                        border: '2px solid #dee2e6',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(plateData.imagen_macro_url, '_blank')}
                    />
                  </div>
                )}
                
                {plateData.imagen_micro_url && plateData.imagen_micro_url.length > 0 && (
                  <div>
                    <h5 style={{ marginBottom: '8px', color: '#6c757d' }}>
                      Imágenes Micro ({plateData.imagen_micro_url.length})
                    </h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {plateData.imagen_micro_url.map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`Micro ${index + 1}`} 
                          style={{ 
                            width: '80px', 
                            height: '80px',
                            objectFit: 'cover',
                            border: '2px solid #dee2e6',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {plateData.codigo_barra_url && (
                  <div>
                    <h5 style={{ marginBottom: '8px', color: '#6c757d' }}>Código de Barras</h5>
                    <img 
                      src={plateData.codigo_barra_url} 
                      alt="Código de barras" 
                      style={{ 
                        maxWidth: '200px',
                        border: '2px solid #dee2e6',
                        borderRadius: '8px',
                        cursor: 'pointer'
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
    </div>
  );
};

export default PlateWithdrawal;