import React from 'react';

const PlateInventory = ({ onNavigate }) => {
  const handleNavigateToCreate = () => {
    onNavigate('crear-placa');
  };

  const handleNavigateToEdit = () => {
    onNavigate('editar-placa');
  };

  const handleNavigateToDelete = () => {
    onNavigate('eliminar-placa');
  };

  const handleNavigateToView = () => {
    onNavigate('ver-inventario');
  };

  return (
    <div>
      <h2>Inventario de Placas</h2>
      
      <p style={{ marginBottom: '30px', color: '#666' }}>
        Gestión completa del inventario de placas del laboratorio
      </p>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {/* Crear Nueva Placa */}
        <div style={{
          border: '1px solid #007bff',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f0f8ff'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦➕</div>
          <h3 style={{ marginBottom: '10px', color: '#007bff' }}>Crear Nueva Placa</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Registrar una nueva placa en el inventario con código de barras único
          </p>
          <button 
            onClick={handleNavigateToCreate}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Crear Nueva Placa
          </button>
        </div>

        {/* Editar Placa */}
        <div style={{
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#fffbf0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦✏️</div>
          <h3 style={{ marginBottom: '10px', color: '#ffc107' }}>Editar Placa</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Modificar información de placas existentes en el inventario
          </p>
          <button 
            onClick={handleNavigateToEdit}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#ffc107',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Editar Placa
          </button>
        </div>

        {/* Eliminar Placa */}
        <div style={{
          border: '1px solid #dc3545',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#fff5f5'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦🗑️</div>
          <h3 style={{ marginBottom: '10px', color: '#dc3545' }}>Eliminar Placa</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Remover placas del inventario de forma permanente
          </p>
          <button 
            onClick={handleNavigateToDelete}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Eliminar Placa
          </button>
        </div>

        {/* Ver Inventario */}
        <div style={{
          border: '1px solid #28a745',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8fff9'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋👁️</div>
          <h3 style={{ marginBottom: '10px', color: '#28a745' }}>Ver Inventario</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Consultar y filtrar todas las placas del inventario
          </p>
          <button 
            onClick={handleNavigateToView}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Ver Inventario
          </button>
        </div>
      </div>

      {/* Información rápida */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h4 style={{ marginBottom: '15px' }}>Estado del Inventario</h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              --
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total Placas</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              --
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Disponibles</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              --
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>En Uso</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
              --
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Mantenimiento</div>
          </div>
        </div>
        <p style={{ 
          textAlign: 'center', 
          marginTop: '15px', 
          fontSize: '12px', 
          color: '#666',
          fontStyle: 'italic' 
        }}>
          Las estadísticas se mostrarán cuando se implemente la funcionalidad completa
        </p>
      </div>
    </div>
  );
};

export default PlateInventory;