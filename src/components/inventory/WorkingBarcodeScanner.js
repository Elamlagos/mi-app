import React, { useRef, useEffect, useState, useCallback } from 'react';

const WorkingBarcodeScanner = ({ onCodeDetected, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState('idle');

  // Limpiar recursos
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando escáner...');
    
    try {
      if (window.Quagga) {
        window.Quagga.stop();
        window.Quagga.offDetected();
      }
    } catch (error) {
      console.warn('Error deteniendo Quagga:', error);
    }
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    } catch (error) {
      console.warn('Error deteniendo stream:', error);
    }
    
    try {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.warn('Error limpiando video:', error);
    }
    
    setStatus('idle');
  }, []);

  // Inicializar escáner simple
  const initializeScanner = useCallback(async () => {
    if (!isActive || !mountedRef.current) return;
    
    try {
      setStatus('starting');
      console.log('📷 Iniciando escáner simple...');
      
      // Obtener cámara con configuración básica
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Esperar que el video esté listo
        await new Promise(resolve => {
          const checkReady = () => {
            if (videoRef.current.readyState >= 2) {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
        
        console.log('📹 Video listo, configurando Quagga...');
        
        // Configuración simple que funciona
        const config = {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current,
            constraints: {
              width: 1280,
              height: 720,
              facingMode: "environment"
            },
            area: {
              top: "20%",
              right: "20%", 
              left: "20%",
              bottom: "20%"
            }
          },
          frequency: 10, // 10 FPS - más conservador
          numOfWorkers: 2,
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader"
            ]
          },
          locate: true, // Activar localización
          locator: {
            patchSize: "medium",
            halfSample: true
          }
        };
        
        // Inicializar Quagga
        window.Quagga.init(config, (err) => {
          if (err) {
            console.error('Error inicializando Quagga:', err);
            setStatus('error');
            onError('Error inicializando escáner: ' + err.message);
            return;
          }
          
          if (!mountedRef.current) return;
          
          // Configurar detección SIMPLE
          window.Quagga.onDetected((data) => {
            const code = data.codeResult.code;
            console.log('🔍 Código detectado:', code, 'Confianza:', data.codeResult.confidence);
            
            // Validación simple: solo verificar que sea 6 dígitos
            if (/^\d{6}$/.test(code)) {
              console.log('✅ Código válido de 6 dígitos:', code);
              
              // Detener escáner
              window.Quagga.stop();
              onCodeDetected(code);
            }
          });
          
          window.Quagga.start();
          setStatus('ready');
          console.log('✅ Escáner simple listo');
        });
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setStatus('error');
      
      let message = 'Error iniciando escáner';
      if (error.name === 'NotAllowedError') {
        message = 'Permiso de cámara denegado';
      } else if (error.name === 'NotFoundError') {
        message = 'No se encontró cámara';
      }
      
      onError(message);
    }
  }, [isActive, onError, onCodeDetected]);

  // Effect principal
  useEffect(() => {
    mountedRef.current = true;
    
    if (isActive) {
      initializeScanner();
    } else {
      cleanup();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [isActive, initializeScanner, cleanup]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block'
        }}
        playsInline
        muted
        autoPlay
      />
      
      {/* Área de escaneo simple */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          right: '20%',
          bottom: '20%',
          border: '2px solid #00ff00',
          borderRadius: '5px',
          pointerEvents: 'none'
        }}>
          {/* Esquinas */}
          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid #00ff00', borderLeft: '4px solid #00ff00' }} />
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid #00ff00', borderRight: '4px solid #00ff00' }} />
          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #00ff00', borderLeft: '4px solid #00ff00' }} />
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #00ff00', borderRight: '4px solid #00ff00' }} />
        </div>
      )}
      
      {/* Estado simple */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 
          status === 'starting' ? 'rgba(255, 193, 7, 0.9)' :
          status === 'ready' ? 'rgba(40, 167, 69, 0.9)' :
          'rgba(220, 53, 69, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px'
      }}>
        {status === 'starting' && '⏳ Iniciando...'}
        {status === 'ready' && '✅ Listo'}
        {status === 'error' && '❌ Error'}
      </div>
      
      {/* Instrucciones */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '15px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Centra el código de 6 dígitos en el área verde
        </div>
      )}
    </div>
  );
};

export default WorkingBarcodeScanner;