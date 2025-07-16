import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Sidebar.css'; // 🎨 Importar estilos específicos

const Sidebar = ({ user, children, currentPage = 'Dashboard', onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false); // Mobile-first: cerrado por defecto
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop: estado colapsado
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
    if (window.innerWidth >= 1024) {
      // Desktop: toggle colapso
      setIsCollapsed(!isCollapsed);
    } else {
      // Mobile/Tablet: toggle visibilidad
      setIsOpen(!isOpen);
    }
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const handleNavigation = (page) => {
    onNavigate(page);
    // Cerrar sidebar en mobile después de navegar
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  // Manejar resize de ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false); // Cerrar drawer mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        height: '100vh',
        background: '#fafafa'
      }}>
        <div style={{ 
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          color: '#374151'
        }}>
          ⏳ Cargando permisos...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 📱 MOBILE NAV BAR */}
      <div className="mobile-nav-bar">
        <button 
          onClick={toggleSidebar}
          className="mobile-menu-button"
          aria-label="Abrir menú"
        >
          ☰
        </button>
        <h1 className="mobile-page-title">{currentPage}</h1>
      </div>

      {/* 🌫️ OVERLAY PARA MOBILE */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* 🎯 SIDEBAR PRINCIPAL */}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        
        {/* 👤 HEADER CON INFO DE USUARIO */}
        <div className="sidebar-header">
          <button 
            onClick={toggleSidebar}
            className="sidebar-toggle"
            aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {window.innerWidth >= 1024 ? (isCollapsed ? '→' : '←') : (isOpen ? '✕' : '☰')}
          </button>
          
          {/* Solo mostrar en mobile o desktop expandido */}
          {(isOpen || (window.innerWidth >= 1024 && !isCollapsed)) && (
            <>
              <h2 className="sidebar-page-title">{currentPage}</h2>
              
              {userProfile && (
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">
                    {userProfile.nombre} {userProfile.apellidos}
                  </div>
                  
                  <div className={`sidebar-user-role ${userProfile.rol === 'administrador' ? 'admin' : 'instructor'}`}>
                    {userProfile.rol === 'administrador' ? '🔑 Admin' : '👨‍🏫 Instructor'}
                  </div>
                  
                  {userProfile.comite && (
                    <div className="sidebar-user-committee">
                      📋 Comité: {userProfile.comite}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 🧭 NAVEGACIÓN PRINCIPAL */}
        {(isOpen || (window.innerWidth >= 1024)) && (
          <nav className="sidebar-nav">
            
            {/* 📤 SECCIÓN RETIROS */}
            {visibleSections.retiros && (
              <div className="sidebar-nav-section">
                {!isCollapsed && <h3 className="sidebar-nav-title">📤 Retiros</h3>}
                <ul className="sidebar-nav-list">
                  <li className="sidebar-nav-item">
                    <button 
                      onClick={() => handleNavigation('retiro-placas')}
                      className="sidebar-nav-button"
                      title="Retiro de Placas"
                    >
                      <span>🔬</span>
                      <span>Retiro de Placas</span>
                    </button>
                  </li>
                  <li className="sidebar-nav-item">
                    <button 
                      onClick={() => handleNavigation('retiro-lentes')}
                      className="sidebar-nav-button"
                      title="Retiro de Lentes"
                    >
                      <span>🔍</span>
                      <span>Retiro de Lentes</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* 📦 SECCIÓN INVENTARIO */}
            {visibleSections.inventario && (
              <div className="sidebar-nav-section">
                {!isCollapsed && <h3 className="sidebar-nav-title">📦 Inventario</h3>}
                <ul className="sidebar-nav-list">
                  <li className="sidebar-nav-item">
                    <button 
                      onClick={() => handleNavigation('inventario-placas')}
                      className="sidebar-nav-button"
                      title="Inventario de Placas"
                    >
                      <span>🧫</span>
                      <span>Inventario de Placas</span>
                    </button>
                  </li>
                  <li className="sidebar-nav-item">
                    <button 
                      onClick={() => handleNavigation('inventario-lentes')}
                      className="sidebar-nav-button"
                      title="Inventario de Lentes"
                    >
                      <span>🔭</span>
                      <span>Inventario de Lentes</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* ⚙️ SECCIÓN ADMINISTRACIÓN */}
            {visibleSections.administracion && (
              <div className="sidebar-nav-section">
                {!isCollapsed && <h3 className="sidebar-nav-title">⚙️ Administración</h3>}
                <ul className="sidebar-nav-list">
                  <li className="sidebar-nav-item">
                    <button 
                      onClick={() => handleNavigation('registrar-usuario')}
                      className="sidebar-nav-button"
                      title="Registrar Usuario"
                    >
                      <span>👤</span>
                      <span>Registrar Usuario</span>
                    </button>
                  </li>
                  <li className="sidebar-nav-item">
                    <button 
                      onClick={() => handleNavigation('edicion-bd')}
                      className="sidebar-nav-button"
                      title="Edición de BD"
                    >
                      <span>🗄️</span>
                      <span>Edición de BD</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* 📝 MENSAJE SI NO HAY SECCIONES */}
            {!visibleSections.retiros && !visibleSections.inventario && !visibleSections.administracion && !isCollapsed && (
              <div className="sidebar-nav-section">
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
                  <p>No tienes permisos para acceder a ninguna sección.</p>
                  <p style={{ fontSize: '12px', marginTop: '10px' }}>
                    Contacta al administrador si crees que esto es un error.
                  </p>
                </div>
              </div>
            )}
          </nav>
        )}

        {/* 🚪 FOOTER CON LOGOUT */}
        {(isOpen || (window.innerWidth >= 1024)) && (
          <div className="sidebar-footer">
            {!isCollapsed && (
              <div className="sidebar-user-email">
                📧 {user?.email}
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="sidebar-logout-button"
              title="Cerrar Sesión"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </aside>
      
      {/* 📄 CONTENIDO PRINCIPAL */}
      <main className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </>
  );
};

export default Sidebar;