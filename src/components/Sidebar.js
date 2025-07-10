import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const Sidebar = ({ user, children, currentPage = 'Dashboard', onNavigate }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('usuarios')
            .select('rol, comite, nombre, apellidos')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error obteniendo perfil:', error);
          } else {
            setUserProfile(data);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    getUserProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Función para determinar qué secciones puede ver el usuario
  const getVisibleSections = () => {
    if (!userProfile) return { retiros: false, inventario: false, administracion: false };

    const { rol, comite } = userProfile;

    return {
      retiros: true, // Todos pueden ver retiros
      inventario: rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      administracion: rol === 'administrador' // Solo administradores
    };
  };

  const visibleSections = getVisibleSections();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Cargando permisos...
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        width: isOpen ? '250px' : '60px', 
        height: '100vh', 
        position: 'fixed', 
        left: 0, 
        top: 0,
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #ddd',
        transition: 'width 0.3s',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        <div style={{ 
          padding: '20px',
          borderBottom: '1px solid #ddd',
          flexShrink: 0
        }}>
          <button onClick={toggleSidebar} style={{ marginBottom: '15px' }}>
            {isOpen ? '←' : '→'}
          </button>
          {isOpen && (
            <div>
              <h3>{currentPage}</h3>
              {userProfile && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  <div>
                    <strong>{userProfile.nombre} {userProfile.apellidos}</strong>
                  </div>
                  <div style={{ 
                    backgroundColor: userProfile.rol === 'administrador' ? '#dc3545' : '#28a745',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    display: 'inline-block',
                    marginTop: '3px',
                    fontSize: '10px'
                  }}>
                    {userProfile.rol.toUpperCase()}
                  </div>
                  {userProfile.comite && (
                    <div style={{ marginTop: '2px' }}>
                      Comité: {userProfile.comite}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ 
          flex: 1, 
          padding: '20px',
          overflowY: 'auto'
        }}>
          {isOpen && (
            <nav>
              {/* Sección Retiros - Visible para todos */}
              {visibleSections.retiros && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ 
                    color: '#333',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    paddingLeft: '5px'
                  }}>
                    Retiros
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, marginLeft: '10px' }}>
                    <li style={{ marginBottom: '8px' }}>
                      <button 
                        onClick={() => onNavigate('retiro-placas')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          padding: '5px 0',
                          width: '100%'
                        }}
                      >
                        Retiro de Placas
                      </button>
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      <button 
                        onClick={() => onNavigate('retiro-lentes')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          padding: '5px 0',
                          width: '100%'
                        }}
                      >
                        Retiro de Lentes
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {/* Sección Inventario - Solo administradores o instructores de microscopía */}
              {visibleSections.inventario && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ 
                    color: '#333',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    paddingLeft: '5px'
                  }}>
                    Inventario
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, marginLeft: '10px' }}>
                    <li style={{ marginBottom: '8px' }}>
                      <button 
                        onClick={() => onNavigate('inventario-placas')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          padding: '5px 0',
                          width: '100%'
                        }}
                      >
                        Inventario de Placas
                      </button>
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      <button 
                        onClick={() => onNavigate('inventario-lentes')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          padding: '5px 0',
                          width: '100%'
                        }}
                      >
                        Inventario de Lentes
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {/* Sección Administración - Solo administradores */}
              {visibleSections.administracion && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ 
                    color: '#333',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    paddingLeft: '5px'
                  }}>
                    Administración
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, marginLeft: '10px' }}>
                    <li style={{ marginBottom: '8px' }}>
                      <button 
                        onClick={() => onNavigate('registrar-usuario')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          padding: '5px 0',
                          width: '100%'
                        }}
                      >
                        Registrar Usuario
                      </button>
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      <button 
                        onClick={() => onNavigate('edicion-bd')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          padding: '5px 0',
                          width: '100%'
                        }}
                      >
                        Edición de Base de Datos
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {/* Mensaje si no hay secciones disponibles */}
              {!visibleSections.retiros && !visibleSections.inventario && !visibleSections.administracion && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  fontSize: '14px',
                  padding: '20px 0'
                }}>
                  No tienes permisos para acceder a ninguna sección.
                </div>
              )}
            </nav>
          )}
        </div>

        <div style={{ 
          padding: '20px',
          borderTop: '1px solid #ddd',
          flexShrink: 0
        }}>
          {isOpen && (
            <div>
              <p style={{ fontSize: '12px', marginBottom: '10px' }}>
                {user?.email}
              </p>
              <button 
                onClick={handleLogout} 
                style={{ 
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ 
        marginLeft: isOpen ? '250px' : '60px', 
        transition: 'margin-left 0.3s',
        minHeight: '100vh',
        padding: '20px'
      }}>
        {children}
      </div>
    </div>
  );
};

export default Sidebar;