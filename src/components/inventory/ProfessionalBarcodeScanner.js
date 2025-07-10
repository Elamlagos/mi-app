import React, { useRef, useEffect, useState, useCallback } from 'react';

const ProfessionalBarcodeScanner = ({ onCodeDetected, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const detectionHistoryRef = useRef(new Map());
  const lastDetectionRef = useRef(0);
  const [status, setStatus] = useState('idle');
  const [confidence, setConfidence] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Configuración optimizada para códigos de 6 dígitos
  const SCANNER_CONFIG = {
    // Múltiples workers para paralelización
    numOfWorkers: navigator.hardwareConcurrency || 4,
    
    // Frecuencia alta para tiempo real (25-30 FPS)
    frequency: 30,
    
    // Área de detección optimizada - pequeña y centrada
    area: {
      top: "35%",    // Área más pequeña
      right: "25%",
      left: "25%", 
      bottom: "35%"
    },
    
    inputStream: {
      name: "Live",
      type: "LiveStream",
      constraints: {
        // Resolución optimizada
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        facingMode: "environment",
        // Optimizaciones de cámara
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous"
      },
      area: {
        top: "35%",
        right: "25%", 
        left: "25%",
        bottom: "35%"
      },
      singleChannel: false // Usar todos los canales de color
    },
    
    // Localización optimizada
    locator: {
      patchSize: "x-small", // Optimizado para códigos pequeños/lejanos
      halfSample: true       // Optimización de rendimiento
    },
    
    // Múltiples decoders para códigos de 6 dígitos
    decoder: {
      readers: [
        "ean_8_reader",     // EAN-8 (códigos de 8 dígitos, incluye 6)
        "code_128_reader",   // CODE128 (puede manejar cualquier longitud)
        "code_39_reader",    // CODE39 (común en inventarios)
        "upc_e_reader",      // UPC-E (códigos compactos)
        "ean_reader"         // EAN-13 (por si el código es parte de uno mayor)
      ],
      multiple: false // Solo un código a la vez para mejor precisión
    },
    
    // Sin localización si sabemos la posición (mejor rendimiento)
    locate: false, // Desactivamos para mejor rendimiento ya que guiamos al usuario
    
    debug: false
  };

  // Limpiar recursos de forma segura
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando escáner profesional...');
    
    try {
      if (window.Quagga) {
        window.Quagga.stop();
        window.Quagga.offDetected();
        window.Quagga.offProcessed();
      }
    } catch (error) {
      console.warn('Error deteniendo Quagga:', error);
    }
    
    try {
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
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.warn('Error limpiando video:', error);
    }
    
    // Limpiar historial de detección
    detectionHistoryRef.current.clear();
    lastDetectionRef.current = 0;
    
    setStatus('idle');
    setConfidence(0);
    setAttempts(0);
  }, []);

  // Sistema de consenso para validación de códigos
  const validateCodeByConsensus = useCallback((code, confidence) => {
    const now = Date.now();
    const history = detectionHistoryRef.current;
    
    // Incrementar contador para este código
    const current = history.get(code) || { count: 0, firstSeen: now, lastSeen: now, avgConfidence: 0 };
    current.count++;
    current.lastSeen = now;
    current.avgConfidence = ((current.avgConfidence * (current.count - 1)) + confidence) / current.count;
    
    history.set(code, current);
    
    // Limpiar códigos antiguos (>3 segundos)
    for (const [key, value] of history.entries()) {
      if (now - value.lastSeen > 3000) {
        history.delete(key);
      }
    }
    
    // Criterios de validación profesional:
    // 1. Código debe verse al menos 2 veces
    // 2. Confianza promedio > 50%
    // 3. Último avistamiento reciente (< 1 segundo)
    // 4. Debe ser exactamente 6 dígitos
    const isValid = 
      current.count >= 2 &&
      current.avgConfidence > 50 &&
      (now - current.lastSeen) < 1000 &&
      /^\d{6}$/.test(code);
    
    if (isValid) {
      console.log(`✅ Código validado: ${code} (${current.count} detecciones, ${current.avgConfidence.toFixed(1)}% confianza promedio)`);
      return true;
    }
    
    return false;
  }, []);

  // Configurar detección con procesamiento optimizado
  const setupDetection = useCallback(() => {
    if (!window.Quagga) {
      onError('QuaggaJS no disponible');
      return;
    }

    let frameCount = 0;
    const startTime = Date.now();

    // Manejo de detección
    window.Quagga.onDetected((data) => {
      try {
        const code = data.codeResult.code;
        const confidence = data.codeResult.confidence || 0;
        
        setAttempts(prev => prev + 1);
        setConfidence(confidence);
        
        console.log(`🔍 Código detectado: ${code} (confianza: ${confidence.toFixed(1)}%)`);
        
        // Validar mediante consenso
        if (validateCodeByConsensus(code, confidence)) {
          // Limpiar historial después de detección exitosa
          detectionHistoryRef.current.clear();
          
          // Detener escáner
          window.Quagga.stop();
          
          onCodeDetected(code);
        }
        
      } catch (error) {
        console.error('Error procesando detección:', error);
      }
    });

    // Monitorear rendimiento (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      window.Quagga.onProcessed((result) => {
        frameCount++;
        if (frameCount % 30 === 0) { // Cada 30 frames
          const elapsed = Date.now() - startTime;
          const fps = (frameCount / elapsed) * 1000;
          console.log(`📊 Rendimiento: ${fps.toFixed(1)} FPS`);
        }
      });
    }
    
  }, [onCodeDetected, onError, validateCodeByConsensus]);

  // Inicialización de cámara con optimizaciones avanzadas
  const initializeCamera = useCallback(async () => {
    if (!isActive || !mountedRef.current) return;
    
    try {
      setStatus('initializing');
      console.log('📷 Iniciando escáner profesional...');
      
      // Verificar soporte de APIs modernas
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no soportado en este navegador');
      }
      
      // Obtener stream con configuración optimizada
      const stream = await navigator.mediaDevices.getUserMedia(SCANNER_CONFIG.inputStream.constraints);
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      // Aplicar optimizaciones avanzadas de cámara
      if (stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();
        
        // Configurar autoenfoque si está disponible
        if (capabilities.focusMode) {
          try {
            await videoTrack.applyConstraints({
              focusMode: 'continuous'
            });
            console.log('✅ Autoenfoque continuo activado');
          } catch (e) {
            console.warn('⚠️ Autoenfoque continuo no disponible');
          }
        }
        
        // Configurar zoom óptimo si está disponible
        if (capabilities.zoom) {
          try {
            await videoTrack.applyConstraints({
              zoom: 1.5 // Ligero zoom para mejor detección
            });
            console.log('✅ Zoom optimizado aplicado');
          } catch (e) {
            console.warn('⚠️ Control de zoom no disponible');
          }
        }
      }
      
      // Configurar video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout cargando video')), 10000);
          
          videoRef.current.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
          
          videoRef.current.addEventListener('error', (e) => {
            clearTimeout(timeout);
            reject(new Error('Error cargando video'));
          }, { once: true });
        });
        
        await videoRef.current.play();
        console.log('📹 Video inicializado correctamente');
      }
      
      // Inicializar QuaggaJS con configuración optimizada
      await new Promise((resolve, reject) => {
        const config = {
          ...SCANNER_CONFIG,
          inputStream: {
            ...SCANNER_CONFIG.inputStream,
            target: videoRef.current
          }
        };
        
        window.Quagga.init(config, (err) => {
          if (err) {
            console.error('Error inicializando Quagga:', err);
            reject(err);
            return;
          }
          
          if (!mountedRef.current) {
            reject(new Error('Componente desmontado'));
            return;
          }
          
          console.log('🔍 Detector inicializado con configuración profesional');
          setupDetection();
          window.Quagga.start();
          resolve();
        });
      });
      
      if (mountedRef.current) {
        setStatus('ready');
        console.log('✅ Escáner profesional listo');
      }
      
    } catch (error) {
      console.error('❌ Error inicializando escáner:', error);
      
      let errorMessage = 'Error inicializando el escáner profesional.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Permite el acceso para continuar.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró cámara en tu dispositivo.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'La cámara no cumple con los requisitos técnicos.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus('error');
      onError(errorMessage);
    }
  }, [isActive, onError, setupDetection]);

  // Autoenfoque inteligente
  const handleFocus = useCallback(async (event) => {
    if (!streamRef.current || status !== 'ready') return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      // Aplicar enfoque puntual si está disponible
      if (capabilities.focusDistance) {
        await videoTrack.applyConstraints({
          focusDistance: 0.1 // Enfoque cercano
        });
      }
      
      // Mostrar indicador visual
      if (videoRef.current && event) {
        const rect = videoRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const indicator = document.createElement('div');
        indicator.style.cssText = `
          position: absolute;
          left: ${x - 30}px;
          top: ${y - 30}px;
          width: 60px;
          height: 60px;
          border: 3px solid #00ff00;
          border-radius: 50%;
          pointer-events: none;
          z-index: 1000;
          animation: focusPulse 1s ease-out forwards;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        `;
        
        // Agregar animación si no existe
        if (!document.getElementById('focus-pulse-animation')) {
          const style = document.createElement('style');
          style.id = 'focus-pulse-animation';
          style.textContent = `
            @keyframes focusPulse {
              0% { transform: scale(1.5); opacity: 1; }
              50% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(0.8); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }
        
        const container = videoRef.current.parentElement;
        if (container) {
          container.style.position = 'relative';
          container.appendChild(indicator);
          setTimeout(() => indicator.remove(), 1000);
        }
      }
      
    } catch (error) {
      console.warn('Error en autoenfoque:', error);
    }
  }, [status]);

  // Efectos
  useEffect(() => {
    mountedRef.current = true;
    
    if (isActive) {
      initializeCamera();
    } else {
      cleanup();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [isActive, initializeCamera, cleanup]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <video
        ref={videoRef}
        onClick={handleFocus}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          cursor: status === 'ready' ? 'crosshair' : 'default'
        }}
        playsInline
        muted
        autoPlay
      />
      
      {/* Overlay de escaneo optimizado */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '25%',
          right: '25%',
          bottom: '35%',
          border: '3px solid #00ff00',
          borderRadius: '8px',
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          animation: 'scannerPulse 2s ease-in-out infinite'
        }}>
          {/* Esquinas dinámicas */}
          {[
            { top: '-3px', left: '-3px', borderTop: '6px solid #00ff00', borderLeft: '6px solid #00ff00' },
            { top: '-3px', right: '-3px', borderTop: '6px solid #00ff00', borderRight: '6px solid #00ff00' },
            { bottom: '-3px', left: '-3px', borderBottom: '6px solid #00ff00', borderLeft: '6px solid #00ff00' },
            { bottom: '-3px', right: '-3px', borderBottom: '6px solid #00ff00', borderRight: '6px solid #00ff00' }
          ].map((corner, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '25px',
              height: '25px',
              ...corner
            }} />
          ))}
          
          {/* Línea de escaneo */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '10%',
            right: '10%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
            animation: 'scanLine 2s ease-in-out infinite',
            transform: 'translateY(-50%)'
          }} />
        </div>
      )}
      
      {/* Indicadores de estado */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          backgroundColor: 
            status === 'initializing' ? 'rgba(255, 193, 7, 0.95)' :
            status === 'ready' ? 'rgba(40, 167, 69, 0.95)' :
            status === 'error' ? 'rgba(220, 53, 69, 0.95)' : 'rgba(108, 117, 125, 0.95)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          backdropFilter: 'blur(10px)'
        }}>
          {status === 'initializing' && '⚡ Inicializando Escáner Pro...'}
          {status === 'ready' && `🎯 Profesional Activo`}
          {status === 'error' && '❌ Error de Sistema'}
          {status === 'idle' && '⏸️ Escáner Inactivo'}
        </div>
        
        {status === 'ready' && (attempts > 0 || confidence > 0) && (
          <div style={{
            backgroundColor: 'rgba(0, 123, 255, 0.9)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📊 Intentos: {attempts} | Confianza: {confidence.toFixed(1)}%
          </div>
        )}
      </div>
      
      {/* Instrucciones profesionales */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '20px',
          fontSize: '13px',
          textAlign: 'center',
          maxWidth: '90%',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            📱 Escáner Profesional Activo
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>
            Centra el código • Mantén estable • Toca para enfocar
          </div>
        </div>
      )}
      
      {/* Animaciones CSS */}
      <style>{`
        @keyframes scannerPulse {
          0%, 100% { border-color: #00ff00; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6); }
          50% { border-color: #00cc00; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-50%) translateX(-100%); }
          100% { transform: translateY(-50%) translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ProfessionalBarcodeScanner;