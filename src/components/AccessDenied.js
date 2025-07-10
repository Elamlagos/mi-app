import React from 'react';

const AccessDenied = ({ userRole, userComite, requiredAccess }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '40px'
    }}>
      <div style={{ 
        fontSize: '72px', 
        marginBottom: '20px',
        color: '#dc3545'
      }}>
        🚫
      </div>
      
      <h2 style={{ 
        color: '#dc3545', 
        marginBottom: '15px',
        fontSize: '24px'
      }}>
        Acceso Denegado
      </h2>
      
      <p style={{ 
        fontSize: '16px', 
        color: '#666',
        marginBottom: '20px',
        maxWidth: '500px'
      }}>
        No tienes permisos para acceder a esta sección del sistema.
      </p>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginBottom: '30px'
      }}>
        <h4 style={{ marginBottom: '15px', color: '#333' }}>Tu perfil actual:</h4>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p><strong>Rol:</strong> {userRole || 'No definido'}</p>
          <p><strong>Comité:</strong> {userComite || 'No definido'}</p>
        </div>
      </div>
      
      <div style={{
        backgroundColor: '#e9ecef',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h4 style={{ marginBottom: '15px', color: '#333' }}>Requisitos de acceso:</h4>
        <div style={{ fontSize: '14px', color: '#666', textAlign: 'left' }}>
          {requiredAccess === 'administracion' && (
            <p>• Se requiere rol de <strong>Administrador</strong></p>
          )}
          {requiredAccess === 'inventario' && (
            <div>
              <p>• Rol de <strong>Administrador</strong>, o</p>
              <p>• Rol de <strong>Instructor</strong> con comité de <strong>Microscopía</strong></p>
            </div>
          )}
          {requiredAccess === 'retiros' && (
            <p>• Acceso disponible para todos los usuarios registrados</p>
          )}
        </div>
      </div>
      
      <p style={{ 
        fontSize: '14px', 
        color: '#666',
        marginTop: '30px',
        fontStyle: 'italic'
      }}>
        Si crees que esto es un error, contacta al administrador del sistema.
      </p>
    </div>
  );
};

export default AccessDenied;