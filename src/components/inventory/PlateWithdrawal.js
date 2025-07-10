import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import BarcodeCamera from './BarcodeCamera'; // Ruta correcta

const PlateWithdrawal = ({ onNavigate }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [plateData, setPlateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBarcodeDetected = async (barcodeText) => {
    try {
      setLoading(true);
      setScannedData(barcodeText);
      setError('');
      setScanning(false); // Detener la cámara

      console.log('Buscando placa con código:', barcodeText);

      // Timeout para evitar cuelgues
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout - La consulta tardó más de 15 segundos')), 15000);
      });

      const platePromise = supabase
        .from('placas')
        .select('*')
        .eq('codigo_barra_txt', barcodeText)
        .single();

      const { data: plateData, error: plateError } = await Promise.race([platePromise, timeoutPromise]);

      console.log('Resultado de consulta:', { plateData, plateError });

      if (plateError) {
        console.error('Error buscando placa:', plateError);
        if (plateError.code === 'PGRST116') {
          setError(`No se encontró ninguna placa con el código: ${barcodeText}`);
        } else {
          setError(`Error buscando placa: ${plateError.message} (Código: ${plateError.code})`);
        }
        setPlateData(null);
        return;
      }

      if (!plateData) {
        setError(`No se encontraron datos para el código: ${barcodeText}`);
        setPlateData(null);
        return;
      }

      console.log('Placa encontrada:', plateData);

      // Buscar datos relacionados con timeout individual
      try {
        const [temaResult, subtemaResult, tincionResult] = await Promise.race([
          Promise.all([
            supabase.from('temas').select('nombre, caja').eq('id_tema', plateData.id_tema).single(),
            supabase.from('subtemas').select('nombre').eq('id_tema', plateData.id_tema).eq('id_subtema', plateData.id_subtema).single(),
            supabase.from('tinciones').select('nombre, tipo').eq('id_tincion', plateData.id_tincion).single()
          ]),
          timeoutPromise
        ]);

        console.log('Datos relacionados obtenidos:', {
          tema: temaResult,
          subtema: subtemaResult,
          tincion: tincionResult
        });

        const completeData = {
          ...plateData,
          tema: temaResult.data || { nombre: 'No encontrado', caja: 'N/A' },
          subtema: subtemaResult.data || { nombre: 'No encontrado' },
          tincion: tincionResult.data || { nombre: 'No encontrado', tipo: 'N/A' }
        };

        setPlateData(completeData);

      } catch (relatedError) {
        console.warn('Error en datos relacionados:', relatedError);
        
        // Mostrar placa con datos básicos
        const basicData = {
          ...plateData,
          tema: { nombre: 'Error cargando', caja: 'N/A' },
          subtema: { nombre: 'Error cargando' },
          tincion: { nombre: 'Error cargando', tipo: 'N/A' }
        };
        
        setPlateData(basicData);
        setError('Se encontró la placa pero hubo errores cargando algunos datos relacionados');
      }

    } catch (error) {
      console.error('Error procesando código:', error);
      
      if (error.message.includes('Timeout')) {
        setError('La consulta está tardando demasiado. Verifica tu conexión a internet.');
      } else {
        setError(`Error procesando código: ${error.message}`);
      }
      
      setPlateData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraError = (errorMessage) => {
    setError(errorMessage);
    setScanning(false);
  };

  const startScanning = () => {
    setError('');
    setScannedData(null);
    setPlateData(null);
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  const resetScanner = () => {
    setScannedData(null);
    setPlateData(null);
    setError('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <button onClick={() => onNavigate('inventario-placas')}>← Volver al Inventario</button>
      
      <h2>Retiro de Placas</h2>
      <p>Escanea el código de barras de la placa para ver su información</p>

      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Controles principales */}
      <div style={{ marginBottom: '20px' }}>
        {!scanning && !scannedData && (
          <button 
            onClick={startScanning}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            📷 Iniciar Escáner
          </button>
        )}

        {scanning && (
          <button 
            onClick={stopScanning}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginBottom: '15px'
            }}
          >
            ⏹️ Detener Escáner
          </button>
        )}

        {scannedData && (
          <button 
            onClick={resetScanner}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            📱 Escanear Otra Placa
          </button>
        )}
      </div>

      {/* Cámara profesional */}
      {scanning && (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <BarcodeCamera
            isActive={scanning}
            onCodeDetected={handleBarcodeDetected}
            onError={handleCameraError}
            style={{
              maxWidth: '600px',
              margin: '0 auto'
            }}
          />
          
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#e9ecef',
            borderRadius: '5px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <strong>💡 Tips para mejor detección:</strong>
            <ul style={{ 
              margin: '8px 0 0 0', 
              paddingLeft: '0', 
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <li>• Mantén el código centrado en el área verde</li>
              <li>• Asegúrate de tener buena iluminación</li>
              <li>• Mantén distancia de 10-20cm del código</li>
              <li>• Toca la pantalla para enfocar manualmente</li>
            </ul>
          </div>
        </div>
      )}

      {/* Código escaneado */}
      {scannedData && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h4>✅ Código Escaneado: {scannedData}</h4>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
          <p>Buscando información de la placa...</p>
        </div>
      )}

      {/* Datos de la placa */}
      {plateData && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>✅ Información de la Placa</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '15px'
          }}>
            <div>
              <h4>Identificación</h4>
              <p><strong>ID:</strong> {plateData.id}</p>
              <p><strong>ID Visual:</strong> {plateData.id_visual}</p>
              <p><strong>Tema:</strong> {plateData.id_tema} - {plateData.tema?.nombre}</p>
              <p><strong>Subtema:</strong> {plateData.id_subtema} - {plateData.subtema?.nombre}</p>
              <p><strong>Caja:</strong> {plateData.caja}</p>
            </div>

            <div>
              <h4>Detalles</h4>
              <p><strong>Tinción:</strong> {plateData.tincion?.nombre} ({plateData.tincion?.tipo})</p>
              <p><strong>Estado:</strong> {plateData.estado_placa}</p>
              <p><strong>Último Uso:</strong> {formatDate(plateData.ultimo_uso)}</p>
              <p><strong>Creación:</strong> {formatDate(plateData.creacion)}</p>
            </div>
          </div>

          {plateData.observaciones && (
            <div style={{ marginTop: '15px' }}>
              <h4>Observaciones</h4>
              <p>{plateData.observaciones}</p>
            </div>
          )}

          {/* Mostrar imágenes si existen */}
          {(plateData.imagen_macro_url || plateData.imagen_micro_url || plateData.codigo_barra_url) && (
            <div style={{ marginTop: '20px' }}>
              <h4>Imágenes</h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {plateData.imagen_macro_url && (
                  <div>
                    <h5>Imagen Macro</h5>
                    <img 
                      src={plateData.imagen_macro_url} 
                      alt="Imagen macro" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '200px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }} 
                    />
                  </div>
                )}
                
                {plateData.imagen_micro_url && plateData.imagen_micro_url.length > 0 && (
                  <div>
                    <h5>Imágenes Microscópicas ({plateData.imagen_micro_url.length})</h5>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {plateData.imagen_micro_url.map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`Imagen micro ${index + 1}`} 
                          style={{ 
                            width: '100px', 
                            height: '100px',
                            objectFit: 'cover',
                            border: '1px solid #ddd',
                            borderRadius: '5px'
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {plateData.codigo_barra_url && (
                  <div>
                    <h5>Código de Barras</h5>
                    <img 
                      src={plateData.codigo_barra_url} 
                      alt="Código de barras" 
                      style={{ 
                        maxWidth: '200px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }} 
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