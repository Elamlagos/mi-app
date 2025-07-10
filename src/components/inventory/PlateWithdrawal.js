import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const PlateWithdrawal = ({ onNavigate }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [plateData, setPlateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup: detener escáner al desmontar componente
      if (scanning) {
        stopScanner();
      }
    };
  }, [scanning]);

  const startScanner = async () => {
    try {
      setError('');
      
      // Verificar que QuaggaJS esté disponible
      if (!window.Quagga) {
        throw new Error('QuaggaJS no está cargado');
      }

      // Solicitar permisos de cámara explícitamente
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        // Detener el stream temporal (QuaggaJS manejará su propio stream)
        stream.getTracks().forEach(track => track.stop());
        console.log('Permisos de cámara concedidos');
        
      } catch (permissionError) {
        console.error('Error de permisos:', permissionError);
        throw new Error(`No se pudo acceder a la cámara. Verifica los permisos. Error: ${permissionError.message}`);
      }

      // Primero cambiar el estado para que se renderice el elemento
      setScanning(true);
      
      // Esperar un poco para que React renderice el elemento
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar que el elemento DOM existe después del render
      if (!scannerRef.current) {
        throw new Error('Elemento del escáner no encontrado después del render');
      }

      // Limpiar el contenido anterior del elemento
      scannerRef.current.innerHTML = '';
      
      const Quagga = window.Quagga;
      
      // Configuración más simple y robusta
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current, // Pasar directamente la referencia
          constraints: {
            width: { min: 320, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 },
            aspectRatio: { min: 1, max: 2 },
            facingMode: "environment" // Usar cámara trasera en móviles
          },
          area: { // Área de escaneo
            top: "10%",
            right: "10%",
            left: "10%",
            bottom: "10%"
          }
        },
        decoder: {
          readers: [{
            format: "code_128_reader",
            config: {}
          }]
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        debug: {
          showCanvas: false,
          showPatches: false,
          showFoundPatches: false,
          showSkeleton: false,
          showLabels: false,
          showPatchLabels: false,
          showRemainingPatchLabels: false,
          boxFromPatches: {
            showTransformed: false,
            showTransformedBox: false,
            showBB: false
          }
        }
      }, (err) => {
        if (err) {
          console.error('Error detallado iniciando Quagga:', err);
          setError(`Error al inicializar el escáner: ${err.message || 'Error desconocido'}`);
          setScanning(false);
          return;
        }
        
        console.log('Quagga iniciado correctamente');
        Quagga.start();
      });

      // Evento cuando se detecta un código
      Quagga.onDetected((data) => {
        const code = data.codeResult.code;
        console.log('Código detectado:', code);
        
        // Detener escáner
        stopScanner();
        
        // Procesar código escaneado
        handleBarcodeDetected(code);
      });

    } catch (error) {
      console.error('Error configurando escáner:', error);
      setError(`Error configurando el escáner: ${error.message}`);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    try {
      if (window.Quagga) {
        window.Quagga.stop();
        window.Quagga.offDetected();
      }
      setScanning(false);
    } catch (error) {
      console.error('Error deteniendo escáner:', error);
    }
  };

  const handleBarcodeDetected = async (barcodeText) => {
    try {
      setLoading(true);
      setScannedData(barcodeText);
      setError('');

      // Buscar la placa en la base de datos usando el código de barras
      const { data, error } = await supabase
        .from('placas')
        .select(`
          *,
          temas!inner(nombre, caja),
          subtemas!inner(nombre),
          tinciones!inner(nombre, tipo)
        `)
        .eq('codigo_barra_txt', barcodeText)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError(`No se encontró ninguna placa con el código: ${barcodeText}`);
        } else {
          setError(`Error buscando placa: ${error.message}`);
        }
        setPlateData(null);
        return;
      }

      setPlateData(data);
      console.log('Datos de la placa:', data);

    } catch (error) {
      console.error('Error procesando código:', error);
      setError(`Error procesando código: ${error.message}`);
      setPlateData(null);
    } finally {
      setLoading(false);
    }
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

      {/* Controles del escáner */}
      <div style={{ marginBottom: '20px' }}>
        {!scanning && !scannedData && (
          <button 
            onClick={startScanner}
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
          <div>
            <button 
              onClick={stopScanner}
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
              Detener Escáner
            </button>
            <p style={{ color: '#666' }}>
              Apunta la cámara hacia el código de barras de la placa
            </p>
          </div>
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
            Escanear Otra Placa
          </button>
        )}
      </div>

      {/* Área del escáner */}
      {scanning && (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '10px',
          padding: '10px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div 
            ref={scannerRef}
            style={{
              width: '100%',
              maxWidth: '640px',
              height: '480px',
              margin: '0 auto'
            }}
          />
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
          <h4>Código Escaneado: {scannedData}</h4>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
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
          <h3>Información de la Placa</h3>
          
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
              <p><strong>Tema:</strong> {plateData.id_tema} - {plateData.temas?.nombre}</p>
              <p><strong>Subtema:</strong> {plateData.id_subtema} - {plateData.subtemas?.nombre}</p>
              <p><strong>Caja:</strong> {plateData.caja}</p>
            </div>

            <div>
              <h4>Detalles</h4>
              <p><strong>Tinción:</strong> {plateData.tinciones?.nombre} ({plateData.tinciones?.tipo})</p>
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
        </div>
      )}
    </div>
  );
};

export default PlateWithdrawal;