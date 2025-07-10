import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 🚀 ESCÁNER ULTRA RÁPIDO
 * Usa ZXing (librería de Google) para escaneo en milisegundos
 * Simple, eficiente y sin complicaciones
 */
const UltraFastScanner = ({ onCodeDetected, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [detectionCount, setDetectionCount] = useState(0);
  const [lastCode, setLastCode] = useState('');

  // 🧹 Cleanup súper simple
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando escáner...');
    
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    } catch (error) {
      console.warn('Warning cleanup reader:', error);
    }
    
    setStatus('idle');
    setDetectionCount(0);
    setLastCode('');
  }, []);

  // 🚀 Inicializador súper rápido
  const initScanner = useCallback(async () => {
    if (!isActive) return;
    
    try {
      setStatus('starting');
      console.log('🚀 Iniciando escáner ultra rápido...');

      // PASO 1: Verificar ZXing
      if (!window.ZXing || !window.BARCODE_SYSTEM_READY) {
        throw new Error('ZXing no disponible. Recarga la página.');
      }

      // PASO 2: Crear lector optimizado
      const codeReader = new window.ZXing.BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // PASO 3: Configurar formatos (solo los que necesitamos)
      const hints = new Map();
      hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        window.ZXing.BarcodeFormat.CODE_128,  // Principal para nuestros códigos
        window.ZXing.BarcodeFormat.CODE_39,   // Backup común
        window.ZXing.BarcodeFormat.EAN_8,     // Para códigos de 8 dígitos
        window.ZXing.BarcodeFormat.EAN_13     // Estándar universal
      ]);

      // PASO 4: Buscar cámaras disponibles
      console.log('📷 Buscando cámaras...');
      const videoInputDevices = await codeReader.getVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No se encontraron cámaras en tu dispositivo');
      }

      // PASO 5: Seleccionar la mejor cámara (trasera si está disponible)
      const backCamera = videoInputDevices.find(device => {
        const label = device.label.toLowerCase();
        return label.includes('back') || 
               label.includes('rear') ||
               label.includes('environment') ||
               label.includes('facing back');
      }) || videoInputDevices[0];

      console.log('📱 Cámara seleccionada:', backCamera.label || 'Cámara por defecto');

      // PASO 6: Iniciar decodificación continua ULTRA RÁPIDA
      await codeReader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText().trim();
            setDetectionCount(prev => prev + 1);
            setLastCode(code);
            
            console.log('🔍 Código detectado:', code, '| Intento:', detectionCount + 1);
            
            // VALIDACIÓN SÚPER SIMPLE: Solo aceptar códigos de 6 dígitos
            if (/^\d{6}$/.test(code)) {
              console.log('✅ CÓDIGO VÁLIDO ENCONTRADO:', code);
              
              // Detener escáner inmediatamente
              cleanup();
              
              // Reportar código con pequeño delay para UX
              setTimeout(() => {
                onCodeDetected(code);
              }, 100);
              
              return; // Salir de la función
            } else {
              console.log('⚠️ Código ignorado (no es de 6 dígitos):', code);
            }
          }
          
          // Solo logear errores importantes (no NotFoundException que es normal)
          if (error && error.name !== 'NotFoundException' && error.name !== 'ChecksumException') {
            console.warn('⚠️ Error menor de decodificación:', error.name);
          }
        }
      );

      setStatus('ready');
      console.log('✅ Escáner activo y buscando códigos...');

    } catch (error) {
      console.error('❌ Error iniciando escáner:', error);
      setStatus('error');
      
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
  }, [isActive, onError, onCodeDetected, cleanup, detectionCount]);

  // 🎯 Effect principal - súper simple
  useEffect(() => {
    if (isActive) {
      initScanner();
    } else {
      cleanup();
    }

    // Cleanup al desmontar
    return cleanup;
  }, [isActive, initScanner, cleanup]);

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
        autoPlay
      />
      
      {/* 🎯 Overlay de escaneo (solo cuando está activo) */}
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
        {status === 'starting' && '⚡ Iniciando Escáner...'}
        {status === 'ready' && `🎯 Activo | Códigos: ${detectionCount}`}
        {status === 'error' && '❌ Error de Cámara'}
        {status === 'idle' && '⏸️ Escáner Inactivo'}
      </div>
      
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
        </div>
      )}
      
      {/* 🎨 Animaciones CSS */}
      <style>{`
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

console.log('📦 UltraFastScanner cargado y optimizado');