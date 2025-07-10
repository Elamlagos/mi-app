import React, { useRef, useEffect, useState, useCallback } from 'react';

const BarcodeCamera = ({ onCodeDetected, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const quaggaRef = useRef(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState('idle'); // idle, starting, ready, error

  // Limpiar recursos
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando recursos...');
    
    try {
      // Detener Quagga
      if (quaggaRef.current && window.Quagga) {
        window.Quagga.stop();
        window.Quagga.offDetected();
        quaggaRef.current = null;
      }
    } catch (error) {
      console.warn('Error deteniendo Quagga:', error);
    }
    
    try {
      // Detener stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        streamRef.current = null;
      }
    } catch (error) {
      console.warn('Error deteniendo stream:', error);
    }
    
    try {
      // Limpiar video
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.removeEventListener('loadedmetadata', () => {});
      }
    } catch (error) {
      console.warn('Error limpiando video:', error);
    }
    
    setStatus('idle');
  }, []);

  // Detección de códigos usando QuaggaJS
  const startDetection = useCallback(() => {
    if (!window.Quagga) {
      console.error('QuaggaJS no está disponible');
      onError('Librería de escaneo no disponible. Asegúrate de que QuaggaJS esté cargado.');
      return;
    }

    if (!videoRef.current) {
      console.error('Video ref no disponible');
      onError('Error inicializando video para escaneo');
      return;
    }

    try {
      window.Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment"
          }
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "code_39_reader"]
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        frequency: 10,
        debug: false
      }, (err) => {
        if (err) {
          console.error('Error inicializando Quagga:', err);
          onError('Error inicializando el escáner de códigos');
          return;
        }
        
        if (!mountedRef.current) {
          console.log('Componente desmontado, no iniciando Quagga');
          return;
        }
        
        try {
          window.Quagga.start();
          quaggaRef.current = true;
          
          // Configurar detección de códigos
          window.Quagga.onDetected((data) => {
            try {
              const code = data.codeResult.code;
              
              // Validar que sea un código de 6 dígitos
              if (/^\d{6}$/.test(code) && data.codeResult.confidence > 75) {
                console.log('Código detectado:', code, 'Confianza:', data.codeResult.confidence);
                
                // Detener escáner después de detectar
                if (window.Quagga && quaggaRef.current) {
                  window.Quagga.stop();
                  quaggaRef.current = null;
                }
                
                onCodeDetected(code);
              }
            } catch (detectionError) {
              console.error('Error procesando detección:', detectionError);
            }
          });
          
        } catch (startError) {
          console.error('Error iniciando Quagga:', startError);
          onError('Error iniciando el escáner');
        }
      });
    } catch (initError) {
      console.error('Error configurando Quagga:', initError);
      onError('Error configurando el escáner de códigos');
    }
  }, [onError, onCodeDetected]);

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    if (!isActive || !mountedRef.current) return;
    
    try {
      setStatus('starting');
      console.log('📷 Solicitando acceso a la cámara...');
      
      // Verificar si getUserMedia está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }
      
      // Solicitar acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        },
        audio: false
      });
      
      if (!mountedRef.current) {
        // Componente desmontado mientras esperábamos la cámara
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté listo
        const handleLoadedMetadata = () => {
          if (mountedRef.current) {
            console.log('📹 Video listo, iniciando detección...');
            setStatus('ready');
            
            // Pequeño delay antes de iniciar detección
            setTimeout(() => {
              if (mountedRef.current) {
                startDetection();
              }
            }, 500);
          }
        };
        
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Error reproduciendo video:', playError);
          // Continuar anyway, a veces funciona sin play()
        }
      }
      
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en tu dispositivo.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta acceso a la cámara.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus('error');
      onError(errorMessage);
    }
  }, [isActive, onError, startDetection]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Mostrar indicador de enfoque
  const showFocusIndicator = useCallback((x, y) => {
    try {
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: absolute;
        left: ${x - 25}px;
        top: ${y - 25}px;
        width: 50px;
        height: 50px;
        border: 2px solid #00ff00;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        animation: focusRing 1s ease-out forwards;
      `;
      
      // Agregar animación CSS si no existe
      if (!document.getElementById('focus-animation')) {
        const style = document.createElement('style');
        style.id = 'focus-animation';
        style.textContent = `
          @keyframes focusRing {
            0% { transform: scale(1.5); opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      const container = videoRef.current?.parentElement;
      if (container) {
        container.style.position = 'relative';
        container.appendChild(indicator);
        
        setTimeout(() => {
          if (indicator.parentElement) {
            indicator.parentElement.removeChild(indicator);
          }
        }, 1000);
      }
    } catch (error) {
      console.warn('Error mostrando indicador de enfoque:', error);
    }
  }, []);

  // Autoenfoque al tocar la pantalla
  const handleTouch = useCallback(async (event) => {
    if (!streamRef.current || status !== 'ready') return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;
      
      const capabilities = videoTrack.getCapabilities();
      
      // Intentar autoenfoque si está disponible
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        await videoTrack.applyConstraints({
          focusMode: 'continuous'
        });
      }
      
      // Indicador visual del toque
      if (videoRef.current) {
        const rect = videoRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        showFocusIndicator(x, y);
      }
      
    } catch (error) {
      console.warn('Autoenfoque no disponible:', error);
    }
  }, [status, showFocusIndicator]);

  // Efectos
  useEffect(() => {
    mountedRef.current = true;
    
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [isActive, startCamera, stopCamera, cleanup]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        onClick={handleTouch}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          cursor: status === 'ready' ? 'crosshair' : 'default'
        }}
        playsInline
        muted
      />
      
      {/* Overlay de escaneo */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          right: '10%',
          bottom: '20%',
          border: '3px solid #00ff00',
          borderRadius: '10px',
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Esquinas del área de escaneo */}
          <div style={{
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            width: '30px',
            height: '30px',
            borderTop: '6px solid #00ff00',
            borderLeft: '6px solid #00ff00'
          }} />
          <div style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '30px',
            height: '30px',
            borderTop: '6px solid #00ff00',
            borderRight: '6px solid #00ff00'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-3px',
            left: '-3px',
            width: '30px',
            height: '30px',
            borderBottom: '6px solid #00ff00',
            borderLeft: '6px solid #00ff00'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-3px',
            right: '-3px',
            width: '30px',
            height: '30px',
            borderBottom: '6px solid #00ff00',
            borderRight: '6px solid #00ff00'
          }} />
        </div>
      )}
      
      {/* Indicador de estado */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 
          status === 'starting' ? 'rgba(255, 193, 7, 0.9)' :
          status === 'ready' ? 'rgba(40, 167, 69, 0.9)' :
          status === 'error' ? 'rgba(220, 53, 69, 0.9)' : 'rgba(108, 117, 125, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {status === 'starting' && '📷 Iniciando cámara...'}
        {status === 'ready' && '✅ Listo para escanear'}
        {status === 'error' && '❌ Error de cámara'}
        {status === 'idle' && '⏸️ Cámara inactiva'}
      </div>
      
      {/* Instrucciones */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '12px',
          textAlign: 'center',
          maxWidth: '90%'
        }}>
          Centra el código de barras en el área verde<br />
          <span style={{ fontSize: '10px', opacity: 0.8 }}>Toca para enfocar</span>
        </div>
      )}
    </div>
  );
};

export default BarcodeCamera;