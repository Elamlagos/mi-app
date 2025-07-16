// 📷 ULTRA FAST SCANNER - VERSIÓN MEJORADA CON GESTIÓN PROFESIONAL DE CÁMARAS
// Archivo: src/components/inventory/UltraFastScanner.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const UltraFastScanner = ({ 
  onCodeDetected, 
  onError, 
  isActive = true,
  scanDelay = 100 
}) => {
  // ═══════════════════════════════════════════════════════════════
  // ESTADOS Y REFERENCIAS
  // ═══════════════════════════════════════════════════════════════
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const currentStreamRef = useRef(null);
  const scanningRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const mountedRef = useRef(true);

  // Estados del componente
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [error, setError] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');

  // ═══════════════════════════════════════════════════════════════
  // FUNCIONES DE GESTIÓN DE CÁMARAS
  // ═══════════════════════════════════════════════════════════════

  // 🔄 FUNCIÓN PARA LIBERAR COMPLETAMENTE LOS RECURSOS DE CÁMARA
  const releaseCamera = useCallback(async () => {
    console.log('🔄 Liberando recursos de cámara...');
    
    try {
      // Detener el reader de ZXing
      if (readerRef.current) {
        try {
          await readerRef.current.reset();
        } catch (err) {
          console.warn('Error al resetear reader:', err);
        }
      }

      // Detener el stream actual
      if (currentStreamRef.current) {
        const tracks = currentStreamRef.current.getTracks();
        tracks.forEach(track => {
          console.log(`🛑 Deteniendo track: ${track.kind} - ${track.label}`);
          track.stop();
        });
        currentStreamRef.current = null;
      }

      // Limpiar el video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }

      scanningRef.current = false;
      setScannerReady(false);
      
      // Pequeña pausa para asegurar que los recursos se liberen
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Error liberando cámara:', error);
    }
  }, []);

  // 📷 FUNCIÓN PARA OBTENER LISTA DE CÁMARAS DISPONIBLES
  const getCameraDevices = useCallback(async () => {
    try {
      // Solicitar permisos primero
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      // Obtener lista de dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('📷 Cámaras disponibles:', videoDevices.length);
      videoDevices.forEach((device, index) => {
        console.log(`  ${index}: ${device.label || `Cámara ${index + 1}`}`);
      });

      return videoDevices;
    } catch (error) {
      console.error('Error obteniendo cámaras:', error);
      onError?.('Error al acceder a las cámaras');
      return [];
    }
  }, [onError]);

  // 🚀 FUNCIÓN PRINCIPAL PARA INICIALIZAR EL ESCÁNER
  const initializeScanner = useCallback(async (cameraIndex = 0) => {
    if (!mountedRef.current || isInitializing) {
      console.log('⏸️ Inicialización cancelada - componente desmontado o ya inicializando');
      return;
    }

    console.log(`🚀 Inicializando escáner con cámara ${cameraIndex}...`);
    setIsInitializing(true);
    setError('');

    try {
      // 1. Liberar recursos anteriores
      await releaseCamera();

      // 2. Obtener lista de cámaras
      const cameras = await getCameraDevices();
      if (cameras.length === 0) {
        throw new Error('No se encontraron cámaras disponibles');
      }

      setAvailableCameras(cameras);

      // 3. Seleccionar cámara válida
      const validIndex = Math.max(0, Math.min(cameraIndex, cameras.length - 1));
      const selectedCamera = cameras[validIndex];
      setCurrentCameraIndex(validIndex);

      console.log(`📱 Usando cámara: ${selectedCamera.label || `Cámara ${validIndex + 1}`}`);

      // 4. Configurar constraints de video optimizadas
      const constraints = {
        video: {
          deviceId: selectedCamera.deviceId ? { exact: selectedCamera.deviceId } : undefined,
          facingMode: cameraIndex === 0 ? 'environment' : 'user', // Trasera por defecto
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      };

      // 5. Obtener stream de video
      console.log('📹 Obteniendo stream de video...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStreamRef.current = stream;

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // 6. Configurar video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn('Error reproduciendo video:', err);
        });
      }

      // 7. Inicializar reader de ZXing
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
        
        // Configurar hints para mejor rendimiento
        const hints = new Map();
        hints.set(2, true); // TRY_HARDER
        hints.set(3, true); // PURE_BARCODE
        readerRef.current.hints = hints;
      }

      // 8. Pequeña pausa para que el video se estabilice
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!mountedRef.current) return;

      // 9. Iniciar escaneo
      console.log('✅ Escáner inicializado, comenzando escaneo...');
      setScannerReady(true);
      startScanning();

    } catch (error) {
      console.error('❌ Error inicializando escáner:', error);
      
      let errorMessage = 'Error inicializando escáner';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Acceso a cámara denegado. Por favor, permite el acceso.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Cámara en uso por otra aplicación.';
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, releaseCamera, getCameraDevices, onError]);

  // 🔍 FUNCIÓN DE ESCANEO CONTINUO
  const startScanning = useCallback(() => {
    if (!readerRef.current || !videoRef.current || scanningRef.current) {
      return;
    }

    scanningRef.current = true;
    console.log('🔍 Iniciando escaneo continuo...');

    const scanFrame = async () => {
      if (!scanningRef.current || !mountedRef.current || !videoRef.current) {
        return;
      }

      try {
        const now = Date.now();
        
        // Control de velocidad de escaneo
        if (now - lastScanTimeRef.current < scanDelay) {
          requestAnimationFrame(scanFrame);
          return;
        }

        // Verificar que el video esté listo
        if (videoRef.current.readyState >= 2) {
          try {
            const result = await readerRef.current.decodeOnceFromVideoDevice(
              undefined, 
              videoRef.current
            );

            if (result && result.text) {
              const scannedText = result.text.trim();
              
              // Evitar códigos duplicados consecutivos
              if (scannedText !== lastScannedCode) {
                console.log('✅ Código detectado:', scannedText);
                setLastScannedCode(scannedText);
                lastScanTimeRef.current = now;
                
                // Enviar código detectado
                onCodeDetected?.(scannedText);
                
                // Pequeña pausa tras detección exitosa
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
          } catch (scanError) {
            // Los errores de "No QR code found" son normales, no los reportamos
            if (!scanError.message?.includes('No MultiFormat Readers were able to detect the code')) {
              console.warn('Error de escaneo menor:', scanError.message);
            }
          }
        }

        // Continuar escaneando
        if (scanningRef.current) {
          requestAnimationFrame(scanFrame);
        }

      } catch (error) {
        console.error('Error en frame de escaneo:', error);
        if (scanningRef.current) {
          setTimeout(scanFrame, 100); // Reintentar tras error
        }
      }
    };

    // Iniciar el bucle de escaneo
    scanFrame();
  }, [scanDelay, onCodeDetected]);

  // 🔄 FUNCIÓN PARA CAMBIAR DE CÁMARA
  const switchCamera = useCallback(async () => {
    if (isInitializing || availableCameras.length <= 1) {
      console.log('⏸️ No se puede cambiar cámara - solo hay una disponible o inicializando');
      return;
    }

    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    console.log(`🔄 Cambiando a cámara ${nextIndex}: ${availableCameras[nextIndex]?.label || 'Sin nombre'}`);
    
    await initializeScanner(nextIndex);
  }, [isInitializing, availableCameras, currentCameraIndex, initializeScanner]);

  // ═══════════════════════════════════════════════════════════════
  // EFECTOS DE CICLO DE VIDA
  // ═══════════════════════════════════════════════════════════════

  // 🎬 EFECTO: Inicializar cuando se activa el escáner
  useEffect(() => {
    mountedRef.current = true;

    if (isActive && !scannerReady && !isInitializing) {
      console.log('🎬 Componente activado - inicializando...');
      initializeScanner(currentCameraIndex);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [isActive, scannerReady, isInitializing, initializeScanner, currentCameraIndex]);

  // 🛑 EFECTO: Limpiar al desactivar o desmontar
  useEffect(() => {
    if (!isActive) {
      console.log('🛑 Escáner desactivado - liberando recursos...');
      scanningRef.current = false;
      releaseCamera();
    }

    return () => {
      console.log('🧹 Desmontando UltraFastScanner...');
      mountedRef.current = false;
      scanningRef.current = false;
      releaseCamera();
    };
  }, [isActive, releaseCamera]);

  // ═══════════════════════════════════════════════════════════════
  // RENDERIZADO
  // ═══════════════════════════════════════════════════════════════

  if (!isActive) {
    return null;
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      {/* VIDEO ELEMENT */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '300px',
          objectFit: 'cover',
          display: 'block'
        }}
        playsInline
        muted
        autoPlay
      />

      {/* OVERLAY DE ESCANEO */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        {/* MARCO DE ESCANEO */}
        <div style={{
          width: '250px',
          height: '250px',
          border: scannerReady ? '3px solid #00ff00' : '3px solid #ffff00',
          borderRadius: '12px',
          background: scannerReady 
            ? 'rgba(0, 255, 0, 0.1)' 
            : 'rgba(255, 255, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          animation: scannerReady ? 'pulse 2s infinite' : 'none'
        }}>
          {/* ESQUINAS DEL MARCO */}
          {[0, 1, 2, 3].map(corner => (
            <div
              key={corner}
              style={{
                position: 'absolute',
                width: '20px',
                height: '20px',
                border: `3px solid ${scannerReady ? '#00ff00' : '#ffff00'}`,
                ...(corner === 0 && { top: '-3px', left: '-3px', borderRight: 'none', borderBottom: 'none' }),
                ...(corner === 1 && { top: '-3px', right: '-3px', borderLeft: 'none', borderBottom: 'none' }),
                ...(corner === 2 && { bottom: '-3px', left: '-3px', borderRight: 'none', borderTop: 'none' }),
                ...(corner === 3 && { bottom: '-3px', right: '-3px', borderLeft: 'none', borderTop: 'none' })
              }}
            />
          ))}
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        right: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px'
      }}>
        {/* ESTADO DEL ESCÁNER */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          flex: 1,
          textAlign: 'center'
        }}>
          {isInitializing ? '⏳ Iniciando...' :
           scannerReady ? '✅ Escaneando' : '❌ Desconectado'}
        </div>

        {/* BOTÓN CAMBIAR CÁMARA */}
        {availableCameras.length > 1 && (
          <button
            onClick={switchCamera}
            disabled={isInitializing}
            style={{
              backgroundColor: isInitializing ? 'rgba(108, 117, 125, 0.8)' : 'rgba(0, 123, 255, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '45px',
              height: '45px',
              cursor: isInitializing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              pointerEvents: 'auto'
            }}
            title={`Cambiar a ${availableCameras[currentCameraIndex]?.label || 'otra cámara'}`}
          >
            🔄
          </button>
        )}
      </div>

      {/* INFORMACIÓN DE CÁMARA ACTUAL */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        📷 {availableCameras[currentCameraIndex]?.label || `Cámara ${currentCameraIndex + 1}`}
        {availableCameras.length > 1 && ` (${currentCameraIndex + 1}/${availableCameras.length})`}
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10px',
          right: '10px',
          backgroundColor: 'rgba(220, 53, 69, 0.9)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          transform: 'translateY(-50%)',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* CSS ANIMATIONS */}
      <style jsx>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default UltraFastScanner;

console.log('📷 UltraFastScanner v3.0 - GESTIÓN PROFESIONAL DE CÁMARAS');
console.log('✅ Liberación completa de recursos entre cambios');
console.log('✅ Detección automática de cámaras disponibles');
console.log('✅ Cambio suave entre cámaras sin reinicio');
console.log('✅ Gestión de permisos y errores mejorada');
console.log('✅ UI moderna con controles intuitivos');