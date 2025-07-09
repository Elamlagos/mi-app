import React, { useState } from 'react';
import Modal from '../common/Modal';

const DeleteUserConfirm = ({ user, onClose, onConfirm, loading }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError('');
      
      const success = await onConfirm();
      
      if (success) {
        onClose();
      } else {
        setError('Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error en confirmación:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Confirmar Eliminación" size="small">
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '48px', 
          color: '#dc3545', 
          marginBottom: '20px' 
        }}>
          ⚠️
        </div>
        
        <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>
          ¿Estás seguro?
        </h3>
        
        <p style={{ marginBottom: '20px' }}>
          Vas a eliminar permanentemente al usuario:
        </p>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>{user.nombre} {user.apellidos}</strong><br />
          <span style={{ color: '#666' }}>{user.email}</span><br />
          <span style={{ color: '#666' }}>{user.rol} - {user.comite}</span>
        </div>
        
        <p style={{ 
          color: '#dc3545', 
          fontSize: '14px',
          marginBottom: '20px'
        }}>
          Esta acción no se puede deshacer.
        </p>
        
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          marginTop: '20px'
        }}>
          <button 
            onClick={handleClose}
            disabled={isDeleting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isDeleting ? 'not-allowed' : 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isDeleting || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: (isDeleting || loading) ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: (isDeleting || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {(isDeleting || loading) ? 'Eliminando...' : 'Sí, Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteUserConfirm;