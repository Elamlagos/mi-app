import React from 'react';

const Dashboard = ({ userProfile }) => {
  if (!userProfile) {
    return <div>Cargando información del dashboard...</div>;
  }

  const { rol, comite, nombre, apellidos } = userProfile;

  // Determinar qué secciones puede ver el usuario
  const canSeeInventario = rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia');
  const canSeeAdministracion = rol === 'administrador';

  return (
    <div>
      <h1>Dashboard - Sistema de Gestión de Inventario</h1>
      
      {/* Bienvenida personalizada */}
      <div style={{
        backgroundColor: '#e7f3ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #b3d7ff'
      }}>
        <h2 style={{ marginBottom: '10px', color: '#0066cc' }}>
          ¡Bienvenido/a, {nombre} {apellidos}!
        </h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <span style={{
              backgroundColor: rol === 'administrador' ? '#dc3545' : '#28a745',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {rol.toUpperCase()}
            </span>
          </div>
          <div style={{ color: '#666' }}>
            <strong>Comité:</strong> {comite}
          </div>
        </div>
      </div>

      {/* Secciones disponibles */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Secciones Disponibles para Ti</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          {/* Retiros - Siempre disponible */}
          <div style={{
            border: '1px solid #28a745',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#f8fff9'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📤</div>
            <h4 style={{ color: '#28a745', marginBottom: '10px' }}>Retiros</h4>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Gestión de retiros de placas y lentes del laboratorio
            </p>
            <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '20px' }}>
              <li>Retiro de Placas</li>
              <li>Retiro de Lentes</li>
            </ul>
            <div style={{ 
              backgroundColor: '#28a745', 
              color: 'white', 
              padding: '5px 10px', 
              borderRadius: '3px', 
              fontSize: '12px',
              marginTop: '10px',
              display: 'inline-block'
            }}>
              ✅ ACCESO COMPLETO
            </div>
          </div>

          {/* Inventario - Condicional */}
          <div style={{
            border: canSeeInventario ? '1px solid #ffc107' : '1px solid #ccc',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: canSeeInventario ? '#fffbf0' : '#f8f9fa',
            opacity: canSeeInventario ? 1 : 0.6
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <h4 style={{ 
              color: canSeeInventario ? '#ffc107' : '#666', 
              marginBottom: '10px' 
            }}>
              Inventario
            </h4>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Control completo del inventario de equipos
            </p>
            <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '20px' }}>
              <li>Inventario de Placas</li>
              <li>Inventario de Lentes</li>
            </ul>
            <div style={{ 
              backgroundColor: canSeeInventario ? '#ffc107' : '#6c757d', 
              color: 'white', 
              padding: '5px 10px', 
              borderRadius: '3px', 
              fontSize: '12px',
              marginTop: '10px',
              display: 'inline-block'
            }}>
              {canSeeInventario ? '✅ ACCESO COMPLETO' : '❌ ACCESO RESTRINGIDO'}
            </div>
            {!canSeeInventario && (
              <p style={{ 
                fontSize: '12px', 
                color: '#999', 
                marginTop: '10px',
                fontStyle: 'italic'
              }}>
                Requiere rol de Administrador o ser Instructor del comité de Microscopía
              </p>
            )}
          </div>

          {/* Administración - Solo administradores */}
          <div style={{
            border: canSeeAdministracion ? '1px solid #dc3545' : '1px solid #ccc',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: canSeeAdministracion ? '#fff5f5' : '#f8f9fa',
            opacity: canSeeAdministracion ? 1 : 0.6
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚙️</div>
            <h4 style={{ 
              color: canSeeAdministracion ? '#dc3545' : '#666', 
              marginBottom: '10px' 
            }}>
              Administración
            </h4>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Gestión de usuarios y configuración del sistema
            </p>
            <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '20px' }}>
              <li>Registrar Usuario</li>
              <li>Edición de Base de Datos</li>
            </ul>
            <div style={{ 
              backgroundColor: canSeeAdministracion ? '#dc3545' : '#6c757d', 
              color: 'white', 
              padding: '5px 10px', 
              borderRadius: '3px', 
              fontSize: '12px',
              marginTop: '10px',
              display: 'inline-block'
            }}>
              {canSeeAdministracion ? '✅ ACCESO COMPLETO' : '❌ ACCESO RESTRINGIDO'}
            </div>
            {!canSeeAdministracion && (
              <p style={{ 
                fontSize: '12px', 
                color: '#999', 
                marginTop: '10px',
                fontStyle: 'italic'
              }}>
                Requiere rol de Administrador
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Información del sistema */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginBottom: '15px' }}>Información del Sistema</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              🔧
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Estado del Sistema</div>
            <div style={{ fontSize: '14px', color: '#28a745', fontWeight: 'bold' }}>
              Operativo
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffc107' }}>
              📊
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Módulos Activos</div>
            <div style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
              Usuarios: ✅
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
              👤
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Tu Sesión</div>
            <div style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
              Activa
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6c757d' }}>
              🚀
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Próximamente</div>
            <div style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>
              Inventario
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Acciones Rápidas</h3>
        <div style={{
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          {canSeeAdministracion && (
            <button style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              👤 Gestionar Usuarios
            </button>
          )}
          
          <button style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            📤 Nuevo Retiro
          </button>
          
          {canSeeInventario && (
            <button style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              📦 Ver Inventario
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de estado para instructores */}
      {rol === 'instructor' && comite !== 'microscopia' && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '15px',
          borderRadius: '5px',
          border: '1px solid #ffeaa7',
          marginTop: '30px'
        }}>
          <strong>📝 Nota:</strong> Como instructor del comité de {comite}, tienes acceso a las funciones de retiros. 
          Para acceder al inventario, necesitas estar asignado al comité de microscopía o tener rol de administrador.
        </div>
      )}
    </div>
  );
};

export default Dashboard;