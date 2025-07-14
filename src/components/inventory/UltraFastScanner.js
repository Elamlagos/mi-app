import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 🚀 ESCÁNER ULTRA RÁPIDO - VERSIÓN OPTIMIZADA
 * Mejoras: Control de video, reducción de logs, mejor gestión de errores
 */
const UltraFastScanner = ({ onCodeDetected, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const selectedCameraRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false); // 🔒 Control de estado de escaneo
  
  const [status, setStatus] = useState('idle');
  const [detectionCount, setDetectionCount] = useState(0);
  const [lastCode, setLastCode] = useState('');
  const [errorCount, setErrorCount] = useState(0);

  // 🧹 Cleanup mejorado
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando escáner...');
    
    try {
      // Marcar como no escaneando
      scanningRef.current = false;
      
      // Detener el stream de video primero
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        streamRef.current = null;
      }
      
      // Limpiar el video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Forzar reset
      }
      
      // Reset del code reader
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (error) {
          // Silenciar errores de cleanup
        }
        codeReaderRef.current = null;
      }
    } catch (error) {
      // Silenciar errores de cleanup
    }
    
    setStatus('idle');
    setDetectionCount(0);
    setLastCode('');
    setErrorCount(0);
  }, []);

  // 🚀 Inicializador optimizado
  const initScanner = useCallback(async () => {
    if (!isActive || scanningRef.current) return;
    
    try {
      setStatus('starting');
      console.log('🚀 Iniciando escáner optimizado...');

      // PASO 1: Verificar ZXing
      if (!window.ZXing || !window.BARCODE_SYSTEM_READY) {
        throw new Error('ZXing no disponible. Recarga la página.');
      }

      // PASO 2: Crear lector optimizado
      const codeReader = new window.ZXing.BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // PASO 3: Configurar formatos específicos
      const hints = new Map();
      hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        window.ZXing.BarcodeFormat.CODE_128,
        window.ZXing.BarcodeFormat.CODE_39,
        window.ZXing.BarcodeFormat.EAN_13,
        window.ZXing.BarcodeFormat.EAN_8
      ]);
      hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);

      // PASO 4: Obtener cámaras disponibles
      const videoInputDevices = await codeReader.getVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No se encontraron cámaras en tu dispositivo');
      }

      // PASO 5: Seleccionar cámara (usar la recordada o buscar la trasera)
      let selectedCamera = selectedCameraRef.current;
      
      if (!selectedCamera) {
        selectedCamera = videoInputDevices.find(device => {
          const label = device.label.toLowerCase();
          return label.includes('back') || 
                 label.includes('rear') ||
                 label.includes('environment') ||
                 label.includes('facing back');
        }) || videoInputDevices[0];
        
        selectedCameraRef.current = selectedCamera;
        console.log('📱 Cámara seleccionada:', selectedCamera.label || 'Cámara por defecto');
      }

      // PASO 6: Configurar stream con mejores parámetros
      const constraints = {
        video: { 
          deviceId: selectedCamera.deviceId,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'environment'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Configurar video con manejo de errores
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 🔧 Configurar eventos de video
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => {
            console.warn('Video no pudo reproducirse automáticamente');
          });
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Error de video:', e);
          onError('Error de reproducción de video');
        };
      }

      // Marcar como escaneando
      scanningRef.current = true;

      // PASO 7: Iniciar decodificación con throttling
      let lastDecodeTime = 0;
      const DECODE_THROTTLE = 100; // ms entre intentos de decodificación

      await codeReader.decodeFromVideoDevice(
        selectedCamera.deviceId,
        videoRef.current,
        (result, error) => {
          // ⏰ THROTTLING: Limitar frecuencia de procesamiento
          const now = Date.now();
          if (now - lastDecodeTime < DECODE_THROTTLE) {
            return;
          }
          lastDecodeTime = now;

          if (result && scanningRef.current) {
            const code = result.getText().trim();
            setDetectionCount(prev => prev + 1);
            setLastCode(code);
            
            // VALIDACIÓN: Solo aceptar códigos de 6 dígitos
            if (/^\d{6}$/.test(code)) {
              console.log('✅ CÓDIGO VÁLIDO ENCONTRADO:', code);
              
              // Detener escáner inmediatamente
              scanningRef.current = false;
              cleanup();
              
              // Reportar código
              setTimeout(() => {
                onCodeDetected(code);
              }, 100);
              
              return;
            }
          }
          
          // 🔇 REDUCIR SPAM DE ERRORES
          if (error && scanningRef.current) {
            // Solo contar errores, no loggear cada uno
            setErrorCount(prev => {
              const newCount = prev + 1;
              // Solo loggear cada 1000 errores
              if (newCount % 1000 === 0) {
                console.log(`📊 ${newCount} intentos de decodificación realizados`);
              }
              return newCount;
            });
            
            // Solo loggear errores importantes (no NotFoundException)
            if (error.name !== 'NotFoundException' && 
                error.name !== 'ChecksumException' &&
                error.name !== 'FormatException') {
              console.warn('⚠️ Error de decodificación importante:', error.name);
            }
          }
        }
      );

      setStatus('ready');
      console.log('✅ Escáner activo y optimizado');

    } catch (error) {
      console.error('❌ Error iniciando escáner:', error);
      setStatus('error');
      
      // Cleanup en caso de error
      cleanup();
      
      // Mensajes de error más amigables
      let message = 'Error iniciando escáner';
      if (error.name === 'NotAllowedError') {
        message = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        message = 'No se encontró cámara en tu dispositivo.';
      } else if (error.name === 'NotSupportedError') {
        message = 'Tu navegador no soporta el escáner. Usa Chrome o Safari.';
      } else if (error.message) {
        message = error.message;
      }
      
      onError(message);
    }
  }, [isActive, onError, onCodeDetected, cleanup]);

  // 🎯 Effect principal con mejor control
  useEffect(() => {
    if (isActive && !scanningRef.current) {
      // Delay para evitar inicializaciones múltiples
      const timer = setTimeout(() => {
        initScanner();
      }, 100);
      
      return () => clearTimeout(timer);
    } else if (!isActive && scanningRef.current) {
      cleanup();
    }

    // Cleanup al desmontar
    return () => {
      if (scanningRef.current) {
        cleanup();
      }
    };
  }, [isActive, initScanner, cleanup]);

  // 🔧 Función para resetear cámara
  const resetCamera = useCallback(() => {
    console.log('🔄 Reseteando selección de cámara...');
    selectedCameraRef.current = null;
    if (isActive && scanningRef.current) {
      cleanup();
      setTimeout(() => {
        initScanner();
      }, 500);
    }
  }, [isActive, cleanup, initScanner]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '450px',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 6px 25px rgba(0,0,0,0.3)'
    }}>
      {/* 📹 Video principal */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: '12px'
        }}
        playsInline
        muted
        autoPlay={false} // Cambiar a false para evitar errores
      />
      
      {/* 🎯 Overlay de escaneo */}
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
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          animation: 'scannerPulse 2s ease-in-out infinite'
        }}>
          {/* Esquinas dinámicas */}
          <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '25px', height: '25px', borderTop: '5px solid #00ff00', borderLeft: '5px solid #00ff00', borderRadius: '5px 0 0 0' }} />
          <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '25px', height: '25px', borderTop: '5px solid #00ff00', borderRight: '5px solid #00ff00', borderRadius: '0 5px 0 0' }} />
          <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '25px', height: '25px', borderBottom: '5px solid #00ff00', borderLeft: '5px solid #00ff00', borderRadius: '0 0 0 5px' }} />
          <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '25px', height: '25px', borderBottom: '5px solid #00ff00', borderRight: '5px solid #00ff00', borderRadius: '0 0 5px 0' }} />
          
          {/* Línea de escaneo */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '5%',
            right: '5%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
            animation: 'scanLine 1.5s ease-in-out infinite',
            transform: 'translateY(-50%)'
          }} />
        </div>
      )}
      
      {/* 📊 Indicador de estado */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 
          status === 'starting' ? 'rgba(255, 193, 7, 0.95)' :
          status === 'ready' ? 'rgba(40, 167, 69, 0.95)' :
          status === 'error' ? 'rgba(220, 53, 69, 0.95)' : 'rgba(108, 117, 125, 0.95)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 'bold',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        {status === 'starting' && '⚡ Iniciando...'}
        {status === 'ready' && `🎯 Activo | Códigos: ${detectionCount}`}
        {status === 'error' && '❌ Error de Cámara'}
        {status === 'idle' && '⏸️ Inactivo'}
      </div>
      
      {/* 🔧 Botón para resetear cámara */}
      {status === 'ready' && (
        <button
          onClick={resetCamera}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '15px',
            padding: '5px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          🔄 Cambiar
        </button>
      )}
      
      {/* 📱 Instrucciones */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '12px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '90%'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
            🔍 Centra el código de 6 dígitos
          </div>
          {lastCode && (
            <div style={{ fontSize: '10px', opacity: 0.8 }}>
              Último: {lastCode}
            </div>
          )}
          {errorCount > 0 && (
            <div style={{ fontSize: '9px', opacity: 0.6 }}>
              Intentos: {errorCount}
            </div>
          )}
        </div>
      )}
      
      {/* 🎨 Animaciones CSS */}
      <style jsx>{`
        @keyframes scannerPulse {
          0%, 100% { 
            border-color: #00ff00; 
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.2);
          }
          50% { 
            border-color: #00cc00; 
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4), inset 0 0 25px rgba(0, 255, 0, 0.3);
          }
        }
        @keyframes scanLine {
          0% { transform: translateY(-50%) translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-50%) translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default UltraFastScanner;

console.log('📦 UltraFastScanner OPTIMIZADO - Control de errores y video mejorado');