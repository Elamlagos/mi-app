// 🛒 LOAN CART COMPONENT - CARRITO VISUAL DE PRÉSTAMOS
// Archivo: src/components/loan/LoanCart.js

import React, { useState, useEffect } from 'react';
import { useCart } from '../../hooks/useCart';

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL DEL CARRITO
// ═══════════════════════════════════════════════════════════════

const LoanCart = ({ userId, onLoanConfirmed = null }) => {
  const {
    cartItems,
    totalItems,
    isEmpty,
    loading,
    error,
    confirming,
    expirationTime,
    isExpired,
    minutesUntilExpiration,
    removeFromCart,
    clearCart,
    confirmLoan,
    setError
  } = useCart(userId);

  // Estados locales para UI
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingItems, setProcessingItems] = useState(new Set());

  // ┌─────────────────────────────────────────────────────────────
  // │ MANEJAR REMOCIÓN DE PLACA
  // └─────────────────────────────────────────────────────────────
  const handleRemovePlate = async (plateId, plateVisual) => {
    try {
      setProcessingItems(prev => new Set(prev).add(plateId));
      setError('');
      
      await removeFromCart(plateId);
      
      console.log(`✅ Placa ${plateVisual} removida del carrito`);
      
    } catch (error) {
      console.error('Error removiendo placa:', error);
      setError(`Error removiendo placa ${plateVisual}: ${error.message}`);
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(plateId);
        return newSet;
      });
    }
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ MANEJAR CONFIRMACIÓN DE PRÉSTAMO
  // └─────────────────────────────────────────────────────────────
  const handleConfirmLoan = async () => {
    try {
      setError('');
      
      const result = await confirmLoan();
      
      // Callback opcional para el componente padre
      if (onLoanConfirmed) {
        onLoanConfirmed(result);
      }
      
      setShowConfirmDialog(false);
      
    } catch (error) {
      console.error('Error confirmando préstamo:', error);
      setError(`Error confirmando préstamo: ${error.message}`);
    }
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ MANEJAR LIMPIAR CARRITO
  // └─────────────────────────────────────────────────────────────
  const handleClearCart = async () => {
    try {
      setError('');
      await clearCart();
    } catch (error) {
      console.error('Error limpiando carrito:', error);
      setError(`Error limpiando carrito: ${error.message}`);
    }
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ FORMATEAR TIEMPO RESTANTE
  // └─────────────────────────────────────────────────────────────
  const formatTimeRemaining = () => {
    if (!expirationTime || isExpired) return 'Expirado';
    
    const hours = Math.floor(minutesUntilExpiration / 60);
    const minutes = minutesUntilExpiration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ COMPONENTE: TIMER DE EXPIRACIÓN
  // └─────────────────────────────────────────────────────────────
  const ExpirationTimer = () => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
      if (!expirationTime || isEmpty) return;

      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000); // Actualizar cada segundo

      return () => clearInterval(timer);
    }, [expirationTime, isEmpty]);

    if (isEmpty || !expirationTime) return null;

    const timeLeft = new Date(expirationTime).getTime() - currentTime;
    const isUrgent = timeLeft < 5 * 60 * 1000; // Menos de 5 minutos
    const expired = timeLeft <= 0;

    return (
      <div style={{
        padding: '10px 15px',
        borderRadius: '8px',
        backgroundColor: expired ? '#f8d7da' : isUrgent ? '#fff3cd' : '#d4edda',
        border: `1px solid ${expired ? '#f5c6cb' : isUrgent ? '#ffeaa7' : '#c3e6cb'}`,
        color: expired ? '#721c24' : isUrgent ? '#856404' : '#155724',
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '15px'
      }}>
        {expired ? (
          <span>⏰ Carrito Expirado</span>
        ) : (
          <span>
            ⏳ Expira en: {formatTimeRemaining()}
            {isUrgent && ' ⚠️'}
          </span>
        )}
      </div>
    );
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ COMPONENTE: ITEM DEL CARRITO
  // └─────────────────────────────────────────────────────────────
  const CartItem = ({ item }) => {
    const isProcessing = processingItems.has(item.id_placa);
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        marginBottom: '8px',
        opacity: isProcessing ? 0.6 : 1
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: '#495057' }}>
            📦 {item.placas?.id_visual || `Placa ${item.id_placa}`}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
            {item.placas?.temas?.nombre || 'Tema no disponible'} → {item.placas?.subtemas?.nombre || 'Subtema no disponible'}
          </div>
          <div style={{ fontSize: '11px', color: '#adb5bd', marginTop: '2px' }}>
            Agregado: {new Date(item.fecha_agregado).toLocaleTimeString()}
          </div>
        </div>
        
        <button
          onClick={() => handleRemovePlate(item.id_placa, item.placas?.id_visual)}
          disabled={isProcessing || confirming}
          style={{
            padding: '6px 12px',
            backgroundColor: isProcessing ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            marginLeft: '10px'
          }}
        >
          {isProcessing ? '⏳' : '❌'}
        </button>
      </div>
    );
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ COMPONENTE: DIÁLOGO DE CONFIRMACIÓN
  // └─────────────────────────────────────────────────────────────
  const ConfirmDialog = () => {
    if (!showConfirmDialog) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>
            🔒 Confirmar Préstamo
          </h3>
          
          <p style={{ textAlign: 'center', color: '#6c757d', lineHeight: '1.5' }}>
            ¿Confirmas que quieres tomar prestadas estas <strong>{totalItems} placas</strong>?
            <br />
            <small>Esta acción registrará oficialmente el préstamo.</small>
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
            marginTop: '20px'
          }}>
            <button
              onClick={() => setShowConfirmDialog(false)}
              disabled={confirming}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: confirming ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancelar
            </button>
            
            <button
              onClick={handleConfirmLoan}
              disabled={confirming}
              style={{
                padding: '10px 20px',
                backgroundColor: confirming ? '#ffc107' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: confirming ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {confirming ? '⏳ Procesando...' : '✅ Sí, Confirmar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ┌─────────────────────────────────────────────────────────────
  // │ RENDER PRINCIPAL
  // └─────────────────────────────────────────────────────────────

  // No mostrar nada si no hay usuario
  if (!userId) return null;

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #dee2e6'
    }}>
      {/* Header del carrito */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '15px'
      }}>
        <h3 style={{ 
          margin: '0 0 5px 0', 
          color: '#495057',
          fontSize: '22px'
        }}>
          🛒 Carrito de Placas
        </h3>
        <div style={{ 
          fontSize: '16px', 
          color: '#6c757d',
          fontWeight: 'bold'
        }}>
          {isEmpty ? 'Vacío' : `${totalItems} placa${totalItems === 1 ? '' : 's'}`}
        </div>
      </div>

      {/* Timer de expiración */}
      <ExpirationTimer />

      {/* Errores */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '15px',
          border: '1px solid #f5c6cb',
          fontSize: '14px'
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#6c757d'
        }}>
          ⏳ Cargando carrito...
        </div>
      )}

      {/* Carrito vacío */}
      {isEmpty && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
          <p style={{ fontSize: '16px', margin: '0' }}>
            Tu carrito está vacío
          </p>
          <p style={{ fontSize: '14px', margin: '5px 0 0 0' }}>
            Escanea placas para agregarlas
          </p>
        </div>
      )}

      {/* Items del carrito */}
      {!isEmpty && !loading && (
        <div style={{ marginBottom: '20px' }}>
          {cartItems.map((item) => (
            <CartItem key={`${item.id_usuario}-${item.id_placa}`} item={item} />
          ))}
        </div>
      )}

      {/* Botones de acción */}
      {!isEmpty && !loading && !isExpired && (
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '20px'
        }}>
          <button
            onClick={handleClearCart}
            disabled={confirming}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: confirming ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            🗑️ Limpiar Carrito
          </button>
          
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={confirming || isExpired}
            style={{
              flex: 2,
              padding: '12px',
              backgroundColor: confirming ? '#ffc107' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (confirming || isExpired) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)'
            }}
          >
            {confirming ? '⏳ Procesando...' : '✅ Tomar Prestadas'}
          </button>
        </div>
      )}

      {/* Carrito expirado */}
      {isExpired && !isEmpty && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          color: '#721c24',
          border: '1px solid #f5c6cb'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏰</div>
          <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>
            Carrito Expirado
          </p>
          <p style={{ fontSize: '14px', margin: '0' }}>
            Las placas han sido liberadas automáticamente. Vuelve a escanearlas si las necesitas.
          </p>
        </div>
      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog />
    </div>
  );
};

export default LoanCart;

console.log('🛒 LoanCart component cargado y listo');