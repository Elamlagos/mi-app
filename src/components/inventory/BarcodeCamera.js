import React, { useRef, useEffect, useState, useCallback } from 'react';

const BarcodeCamera = ({ onCodeDetected, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle, starting, ready, error

  // Detección de códigos usando QuaggaJS
  const startDetection = useCallback(() => {
    if (!window.Quagga || !videoRef.current) {
      onError('Librería de escaneo no disponible');
      return;
    }

    window.Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: videoRef.current,
        constraints: {
          width: 1280,
          height: 720,
          facingMode: "environment"
        }
      },
      decoder: {
        readers: ["code_128_reader"] // Solo CODE128 para simplificar
      },
      locate: true,
      locator: {
        patchSize: "medium",
        halfSample: true
      }
    }, (err) => {
      if (err) {
        console.error('Error inicializando Quagga:', err);
        onError('Error inicializando el escáner');
        return;
      }
      
      window.Quagga.start();
      
      // Configurar detección de códigos
      window.Quagga.onDetected((data) => {
        const code = data.codeResult.code;
        
        // Validar que sea un código de 6 dígitos
        if (/^\d{6}$/.test(code)) {
          console.log('Código detectado:', code);
          onCodeDetected(code);
          
          // Opcional: detener detección después de encontrar código
          window.Quagga.stop();
        }
      });
    });
  }, [onError, onCodeDetected]);

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    if (!isActive) return;
    
    try {
      setStatus('starting');
      
      // Solicitar acceso a la cámara trasera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Cámara trasera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus('ready');
        
        // Iniciar detección cuando el video esté listo
        videoRef.current.addEventListener('loadedmetadata', () => {
          startDetection();
        });
      }
      
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      setStatus('error');
      onError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, [isActive, onError, startDetection]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  // Mostrar indicador de enfoque
  const showFocusIndicator = useCallback((x, y) => {
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
    
    const container = videoRef.current.parentElement;
    container.style.position = 'relative';
    container.appendChild(indicator);
    
    setTimeout(() => {
      if (indicator.parentElement) {
        indicator.parentElement.removeChild(indicator);
      }
    }, 1000);
  }, []);

  // Autoenfoque al tocar la pantalla
  const handleTouch = useCallback(async (event) => {
    if (!streamRef.current || status !== 'ready') return;
    
    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      // Intentar autoenfoque si está disponible
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        await videoTrack.applyConstraints({
          focusMode: 'continuous'
        });
      }
      
      // Indicador visual del toque
      const rect = videoRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      showFocusIndicator(x, y);
      
    } catch (error) {
      console.warn('Autoenfoque no disponible:', error);
    }
  }, [status, showFocusIndicator]);

  // Efectos
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
      if (window.Quagga) {
        window.Quagga.stop();
      }
    };
  }, [isActive, startCamera, stopCamera]);

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