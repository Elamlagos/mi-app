import React, { useState } from 'react';
import RegisterUserForm from './RegisterUserForm';
import UserList from './UserList';
import { useUsers } from '../../hooks/useUsers';

const UserManagement = () => {
  const [currentView, setCurrentView] = useState('menu'); // 'menu', 'register', 'list'
  const { users, loading, error, createUser, updateUser, deleteUser, clearError } = useUsers();

  const handleBackToMenu = () => {
    setCurrentView('menu');
    clearError(); // Limpiar errores al volver al menú
  };

  const handleNavigateToRegister = () => {
    setCurrentView('register');
    clearError();
  };

  const handleNavigateToList = () => {
    setCurrentView('list');
    clearError();
  };

  const handleUserCreated = async (userData, photoFile) => {
    const result = await createUser(userData, photoFile);
    return result;
  };

  const handleUserUpdated = async (userId, userData, newPhotoFile, newPassword) => {
    const result = await updateUser(userId, userData, newPhotoFile, newPassword);
    return result;
  };

  const handleUserDeleted = async (userId) => {
    const result = await deleteUser(userId);
    return result;
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'register':
        return (
          <RegisterUserForm 
            onBack={handleBackToMenu}
            onUserCreated={handleUserCreated}
            loading={loading}
            error={error}
          />
        );
      case 'list':
        return (
          <UserList 
            onBack={handleBackToMenu}
            users={users}
            onUpdateUser={handleUserUpdated}
            onDeleteUser={handleUserDeleted}
            loading={loading}
            error={error}
          />
        );
      default:
        return (
          <div>
            <h2>Gestión de Usuarios</h2>
            
            {error && (
              <div style={{ 
                backgroundColor: '#f8d7da', 
                color: '#721c24',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '20px'
              }}>
                <strong>Error:</strong> {error}
                <button 
                  onClick={clearError}
                  style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    backgroundColor: '#721c24',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}

            <p style={{ marginBottom: '30px', color: '#666' }}>
              Selecciona una opción para gestionar los usuarios del sistema:
            </p>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '30px'
            }}>
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>👤➕</div>
                <h3 style={{ marginBottom: '10px' }}>Registrar Usuario</h3>
                <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                  Crear una nueva cuenta de usuario con todos los datos necesarios
                </p>
                <button 
                  onClick={handleNavigateToRegister}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: loading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                >
                  {loading ? 'Cargando...' : 'Registrar Usuario'}
                </button>
              </div>

              <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋✏️</div>
                <h3 style={{ marginBottom: '10px' }}>Editar Usuarios</h3>
                <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                  Ver, editar y eliminar usuarios existentes en el sistema
                </p>
                <button 
                  onClick={handleNavigateToList}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: loading ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                >
                  {loading ? 'Cargando...' : 'Gestionar Usuarios'}
                </button>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            {users.length > 0 && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '30px'
              }}>
                <h4 style={{ marginBottom: '15px' }}>Estadísticas del Sistema</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {users.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Total Usuarios</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      {users.filter(u => u.rol === 'administrador').length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Administradores</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      {users.filter(u => u.rol === 'instructor').length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Instructores</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                      {users.filter(u => u.foto_url).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Con Foto</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div>
      {renderCurrentView()}
    </div>
  );
};

export default UserManagement;