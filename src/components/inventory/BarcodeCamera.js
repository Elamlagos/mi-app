import React, { useRef, useEffect, useState, useCallback } from 'react';

// Configuración estable fuera del componente
const CAMERA_CONFIG = {
  video: {
    facingMode: { ideal: "environment" },
    width: { min: 480, ideal: 720, max: 1280 },
    height: { min: 360, ideal: 540, max: 720 },
    frameRate: { ideal: 30, max: 30 }
  }
};

const BarcodeCamera = ({ 
  onCodeDetected, 
  onError, 
  isActive = false,
  className = "",
  style = {}
}) => {
  // Referencias DOM y estado
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const quaggaRef = useRef(null);
  const mountedRef = useRef(true);
  const isInitializingRef = useRef(false);
  
  // Estados simples
  const [status, setStatus] = useState('idle'); // idle, initializing, ready, error
  const [focusState, setFocusState] = useState('idle');

  // Función de limpieza estable
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando recursos...');
    
    if (quaggaRef.current) {
      try {
        quaggaRef.current.stop();
        quaggaRef.current.offDetected();
        quaggaRef.current = null;
      } catch (error) {
        console.warn('Error deteniendo Quagga:', error);
      }
    }
    
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      } catch (error) {
        console.warn('Error deteniendo stream:', error);
      }
    }
    
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (error) {
        console.warn('Error limpiando video:', error);
      }
    }
    
    setStatus('idle');
    setFocusState('idle');
    isInitializingRef.current = false;
  }, []);

  // Configuración de detección
  const setupDetection = useCallback(() => {
    if (!quaggaRef.current) return;
    
    let lastDetection = 0;
    const detectionHistory = new Map();
    
    const handleDetected = (data) => {
      const now = Date.now();
      const code = data.codeResult.code;
      
      if (now - lastDetection < 1000) return;
      if (data.codeResult.confidence < 75) return;
      if (!/^\d{6}$/.test(code)) return;
      
      const count = (detectionHistory.get(code) || 0) + 1;
      detectionHistory.set(code, count);
      
      setTimeout(() => detectionHistory.clear(), 3000);
      
      if (count >= 2) {
        lastDetection = now;
        detectionHistory.clear();
        
        console.log('✅ Código confirmado:', code);
        
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 300);
        }
        
        onCodeDetected(code);
      }
    };
    
    quaggaRef.current.onDetected(handleDetected);
  }, [onCodeDetected]);

  // Inicialización completa
  const initializeCamera = useCallback(async () => {
    if (isInitializingRef.current || !mountedRef.current) {
      return;
    }
    
    try {
      isInitializingRef.current = true;
      setStatus('initializing');
      
      console.log('📷 Iniciando cámara...');
      
      // Obtener stream
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONFIG);
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      // Configurar video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar que el video esté listo
        await new Promise((resolve) => {
          const checkVideo = () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              resolve();
            } else {
              setTimeout(checkVideo, 100);
            }
          };
          checkVideo();
        });
        
        console.log('📹 Video listo');
      }
      
      // Inicializar Quagga si hay video
      if (window.Quagga && videoRef.current && mountedRef.current) {
        console.log('🔍 Iniciando detector...');
        
        const Quagga = window.Quagga;
        
        const config = {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current,
            constraints: CAMERA_CONFIG.video,
            area: { top: "25%", right: "15%", left: "15%", bottom: "25%" }
          },
          decoder: {
            readers: ["code_128_reader", "ean_reader", "code_39_reader"]
          },
          locate: true,
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 2,
          frequency: 10,
          debug: false
        };
        
        await new Promise((resolve, reject) => {
          Quagga.init(config, (err) => {
            if (err) {
              console.error('Error Quagga:', err);
              reject(err);
              return;
            }
            
            if (!mountedRef.current) {
              reject(new Error('Desmontado'));
              return;
            }
            
            quaggaRef.current = Quagga;
            Quagga.start();
            setupDetection();
            resolve();
          });
        });
      }
      
      if (mountedRef.current) {
        setStatus('ready');
        console.log('✅ Todo listo');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      if (mountedRef.current) {
        setStatus('error');
        onError(`Error: ${error.message}`);
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [setupDetection, onError]);

  // Enfoque manual
  const handleFocus = useCallback(async (event) => {
    if (!streamRef.current || focusState === 'focusing') return;
    
    try {
      setFocusState('focusing');
      
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      if (capabilities.focusDistance) {
        await videoTrack.applyConstraints({
          advanced: [{ focusDistance: 0.1 }]
        });
      }
      
      // Indicador visual
      if (event && videoRef.current) {
        const rect = videoRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
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
          animation: focusPulse 0.6s ease-out;
          z-index: 1000;
        `;
        
        if (!document.getElementById('focus-style')) {
          const style = document.createElement('style');
          style.id = 'focus-style';
          style.textContent = `
            @keyframes focusPulse {
              0% { transform: scale(1.5); opacity: 0; }
              50% { transform: scale(1); opacity: 1; }
              100% { transform: scale(0.8); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }
        
        const container = videoRef.current.parentElement;
        if (container) {
          container.style.position = 'relative';
          container.appendChild(indicator);
          setTimeout(() => {
            if (indicator.parentElement) {
              indicator.parentElement.removeChild(indicator);
            }
          }, 600);
        }
      }
      
      setTimeout(() => setFocusState('idle'), 2000);
      
    } catch (error) {
      console.warn('Error enfoque:', error);
      setFocusState('idle');
    }
  }, [focusState]);

  // Efecto principal - Con todas las dependencias necesarias
  useEffect(() => {
    mountedRef.current = true;
    
    if (isActive && status === 'idle') {
      // Solo inicializar si estamos en idle y se activa
      initializeCamera();
    } else if (!isActive && status !== 'idle') {
      // Solo limpiar si no está activo y no estamos en idle
      cleanup();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [isActive, status, initializeCamera, cleanup]);

  // Efecto separado para inicialización cuando el status cambia a idle
  useEffect(() => {
    if (isActive && status === 'idle' && !isInitializingRef.current) {
      const timer = setTimeout(() => {
        initializeCamera();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [status, isActive, initializeCamera]);

  return (
    <div 
      className={`barcode-camera ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        ...style
      }}
    >
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
      
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
      
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '15%',
          right: '15%',
          bottom: '25%',
          border: '2px solid #00ff00',
          borderRadius: '8px',
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '20px', height: '20px', borderTop: '4px solid #00ff00', borderLeft: '4px solid #00ff00' }} />
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderTop: '4px solid #00ff00', borderRight: '4px solid #00ff00' }} />
          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '20px', height: '20px', borderBottom: '4px solid #00ff00', borderLeft: '4px solid #00ff00' }} />
          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', borderBottom: '4px solid #00ff00', borderRight: '4px solid #00ff00' }} />
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px'
      }}>
        {status === 'initializing' && (
          <div style={{
            backgroundColor: 'rgba(255, 193, 7, 0.9)',
            color: 'white',
            padding: '5px 15px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📷 Inicializando...
          </div>
        )}
        
        {focusState === 'focusing' && (
          <div style={{
            backgroundColor: 'rgba(0, 123, 255, 0.9)',
            color: 'white',
            padding: '5px 15px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            🎯 Enfocando...
          </div>
        )}
        
        {status === 'ready' && (
          <div style={{
            backgroundColor: 'rgba(40, 167, 69, 0.9)',
            color: 'white',
            padding: '5px 15px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            ✅ Listo para escanear
          </div>
        )}
      </div>
      
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 15px',
          borderRadius: '15px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Centra el código en el área verde • Toca para enfocar
        </div>
      )}
      
      {status === 'error' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(220, 53, 69, 0.9)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          ❌ Error con la cámara
        </div>
      )}
    </div>
  );
};

export default BarcodeCamera;