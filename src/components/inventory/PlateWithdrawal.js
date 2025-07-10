import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const PlateWithdrawalEnhanced = ({ onNavigate }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [plateData, setPlateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [cameraCapabilities, setCameraCapabilities] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  
  const scannerRef = useRef(null);
  const streamRef = useRef(null);
  const quaggaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scanning) {
        stopScanner();
      }
    };
  }, [scanning]);

  // Función para obtener capacidades de la cámara
  const getCameraCapabilities = async (stream) => {
    try {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      const settings = videoTrack.getSettings();
      
      console.log('Capacidades de cámara:', capabilities);
      console.log('Configuración actual:', settings);
      
      setCameraCapabilities({
        focusMode: capabilities.focusMode || [],
        zoom: capabilities.zoom || null,
        torch: capabilities.torch || false,
        currentSettings: settings
      });
      
      return { capabilities, settings, videoTrack };
    } catch (error) {
      console.warn('No se pudieron obtener capacidades de cámara:', error);
      return null;
    }
  };

  // Función para configurar autoenfoque
  const setupAutoFocus = async (videoTrack) => {
    try {
      if (!videoTrack) return;
      
      const capabilities = videoTrack.getCapabilities();
      
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        await videoTrack.applyConstraints({
          advanced: [{
            focusMode: 'continuous',
            focusDistance: 0.1 // Enfoque para objetos cercanos (10cm)
          }]
        });
        console.log('Autoenfoque continuo activado');
      } else if (capabilities.focusMode && capabilities.focusMode.includes('single-shot')) {
        await videoTrack.applyConstraints({
          advanced: [{
            focusMode: 'single-shot'
          }]
        });
        console.log('Autoenfoque single-shot activado');
      }
    } catch (error) {
      console.warn('No se pudo configurar autoenfoque:', error);
    }
  };

  // Función para enfoque manual
  const triggerManualFocus = async () => {
    try {
      if (!streamRef.current) return;
      
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      if (capabilities.focusMode && capabilities.focusMode.includes('single-shot')) {
        await videoTrack.applyConstraints({
          advanced: [{
            focusMode: 'single-shot'
          }]
        });
        console.log('Enfoque manual ejecutado');
        
        // Feedback visual
        if (scannerRef.current) {
          scannerRef.current.style.border = '3px solid #00ff00';
          setTimeout(() => {
            if (scannerRef.current) {
              scannerRef.current.style.border = '2px solid #28a745';
            }
          }, 200);
        }
      }
    } catch (error) {
      console.warn('Error en enfoque manual:', error);
    }
  };

  // Función para ajustar zoom
  const adjustZoom = async (zoomLevel) => {
    try {
      if (!streamRef.current) return;
      
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      if (capabilities.zoom) {
        const maxZoom = capabilities.zoom.max || 3;
        const minZoom = capabilities.zoom.min || 1;
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
        
        await videoTrack.applyConstraints({
          advanced: [{
            zoom: clampedZoom
          }]
        });
        
        setCurrentZoom(clampedZoom);
        console.log('Zoom ajustado a:', clampedZoom);
      }
    } catch (error) {
      console.warn('Error ajustando zoom:', error);
    }
  };

  const startScanner = async () => {
    try {
      setError('');
      
      if (!window.Quagga) {
        throw new Error('QuaggaJS no está cargado');
      }

      // Configuración avanzada de cámara
      const constraints = {
        video: { 
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          // Configuraciones para mejor enfoque
          focusMode: autoFocusEnabled ? "continuous" : "manual",
          focusDistance: 0.1, // 10cm para códigos de barras
          // Configuraciones para mejor calidad
          frameRate: { ideal: 30, max: 60 },
          exposureMode: "continuous",
          whiteBalanceMode: "continuous"
        } 
      };

      console.log('Solicitando permisos de cámara con configuración avanzada...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Obtener capacidades y configurar autoenfoque
      const cameraInfo = await getCameraCapabilities(stream);
      if (cameraInfo && autoFocusEnabled) {
        await setupAutoFocus(cameraInfo.videoTrack);
      }

      setScanning(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!scannerRef.current) {
        throw new Error('Elemento del escáner no encontrado');
      }

      scannerRef.current.innerHTML = '';
      
      const Quagga = window.Quagga;
      quaggaRef.current = Quagga;
      
      // Configuración optimizada de Quagga
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: constraints.video,
          area: { // Área de escaneo optimizada
            top: "20%",
            right: "15%",
            left: "15%",
            bottom: "20%"
          },
          singleChannel: false // Usar todos los canales de color
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader"
          ],
          multiple: false // Solo un código a la vez
        },
        locate: true,
        locator: {
          patchSize: "large", // Parches más grandes para mejor detección
          halfSample: false,  // Usar resolución completa
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
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 20, // Mayor frecuencia de escaneo
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
          console.error('Error iniciando Quagga:', err);
          setError(`Error al inicializar el escáner: ${err.message}`);
          setScanning(false);
          return;
        }
        
        console.log('Quagga iniciado correctamente');
        Quagga.start();
        
        // Configurar autoenfoque periódico
        if (autoFocusEnabled) {
          setupPeriodicAutoFocus();
        }
      });

      // Evento de detección con validación
      let lastDetection = 0;
      Quagga.onDetected((data) => {
        const now = Date.now();
        // Evitar detecciones múltiples muy rápidas
        if (now - lastDetection < 1000) return;
        lastDetection = now;
        
        const code = data.codeResult.code;
        console.log('Código detectado:', code);
        
        // Validar que el código tenga formato esperado (6 dígitos)
        if (/^\d{6}$/.test(code)) {
          stopScanner();
          handleBarcodeDetected(code);
        } else {
          console.log('Código no válido (no son 6 dígitos):', code);
        }
      });

    } catch (error) {
      console.error('Error configurando escáner:', error);
      setError(`Error configurando el escáner: ${error.message}`);
      setScanning(false);
    }
  };

  // Autoenfoque periódico
  const setupPeriodicAutoFocus = () => {
    const focusInterval = setInterval(() => {
      if (!scanning || !autoFocusEnabled) {
        clearInterval(focusInterval);
        return;
      }
      triggerManualFocus();
    }, 3000); // Reenfoque cada 3 segundos
  };

  const stopScanner = () => {
    try {
      if (quaggaRef.current) {
        quaggaRef.current.stop();
        quaggaRef.current.offDetected();
        quaggaRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setScanning(false);
      setCameraCapabilities(null);
      setCurrentZoom(1);
    } catch (error) {
      console.error('Error deteniendo escáner:', error);
    }
  };

  const handleBarcodeDetected = async (barcodeText) => {
    try {
      setLoading(true);
      setScannedData(barcodeText);
      setError('');

      console.log('Buscando placa con código:', barcodeText);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout - La consulta tardó más de 15 segundos')), 15000);
      });

      const platePromise = supabase
        .from('placas')
        .select('*')
        .eq('codigo_barra_txt', barcodeText)
        .single();

      const { data: plateData, error: plateError } = await Promise.race([platePromise, timeoutPromise]);

      if (plateError) {
        if (plateError.code === 'PGRST116') {
          setError(`No se encontró ninguna placa con el código: ${barcodeText}`);
        } else {
          setError(`Error buscando placa: ${plateError.message}`);
        }
        setPlateData(null);
        return;
      }

      console.log('Placa encontrada:', plateData);
      
      // Buscar datos relacionados (simplificado por ahora)
      const completeData = {
        ...plateData,
        tema: { nombre: 'Cargando...', caja: 'N/A' },
        subtema: { nombre: 'Cargando...' },
        tincion: { nombre: 'Cargando...', tipo: 'N/A' }
      };

      setPlateData(completeData);

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
      
      <h2>Retiro de Placas - Scanner Mejorado</h2>
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
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ marginRight: '10px' }}>
                <input
                  type="checkbox"
                  checked={autoFocusEnabled}
                  onChange={(e) => setAutoFocusEnabled(e.target.checked)}
                  style={{ marginRight: '5px' }}
                />
                Autoenfoque automático
              </label>
            </div>
            
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
              📷 Iniciar Escáner Mejorado
            </button>
          </div>
        )}

        {scanning && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={stopScanner}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ⏹️ Detener
              </button>
              
              <button 
                onClick={triggerManualFocus}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🎯 Enfocar
              </button>
              
              {cameraCapabilities?.zoom && (
                <>
                  <button 
                    onClick={() => adjustZoom(currentZoom + 0.5)}
                    disabled={currentZoom >= (cameraCapabilities.zoom.max || 3)}
                    style={{
                      padding: '10px 15px',
                      backgroundColor: '#ffc107',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    🔍+ Zoom In
                  </button>
                  
                  <button 
                    onClick={() => adjustZoom(currentZoom - 0.5)}
                    disabled={currentZoom <= (cameraCapabilities.zoom.min || 1)}
                    style={{
                      padding: '10px 15px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    🔍- Zoom Out
                  </button>
                </>
              )}
            </div>
            
            <div style={{ fontSize: '14px', color: '#666' }}>
              <p>💡 <strong>Tips para mejor detección:</strong></p>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Mantén el código de barras centrado en el área verde</li>
                <li>Asegúrate de tener buena iluminación</li>
                <li>Mantén distancia de 10-20cm del código</li>
                <li>Usa el botón "Enfocar" si la imagen se ve borrosa</li>
                <li>Si tienes zoom, úsalo para códigos pequeños</li>
              </ul>
              {cameraCapabilities?.zoom && (
                <p>🔍 Zoom actual: {currentZoom.toFixed(1)}x</p>
              )}
            </div>
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
            📱 Escanear Otra Placa
          </button>
        )}
      </div>

      {/* Área del escáner mejorada */}
      {scanning && (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '10px',
          padding: '10px',
          marginBottom: '20px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div 
            ref={scannerRef}
            onClick={triggerManualFocus} // Click para enfocar
            style={{
              width: '100%',
              maxWidth: '640px',
              height: '480px',
              margin: '0 auto',
              cursor: 'crosshair',
              position: 'relative'
            }}
          />
          
          {/* Overlay de área de escaneo */}
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '20%',
            right: '20%',
            bottom: '25%',
            border: '2px solid #00ff00',
            borderRadius: '5px',
            pointerEvents: 'none',
            backgroundColor: 'rgba(0, 255, 0, 0.1)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-25px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#00ff00',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '3px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              ÁREA DE ESCANEO
            </div>
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

      {/* Datos de la placa (simplificados por ahora) */}
      {plateData && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>✅ Placa Encontrada</h3>
          
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
              <p><strong>Tema:</strong> {plateData.id_tema}</p>
              <p><strong>Subtema:</strong> {plateData.id_subtema}</p>
              <p><strong>Caja:</strong> {plateData.caja}</p>
            </div>

            <div>
              <h4>Detalles</h4>
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
        </div>
      )}
    </div>
  );
};

export default PlateWithdrawalEnhanced;