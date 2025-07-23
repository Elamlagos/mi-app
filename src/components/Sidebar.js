import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Sidebar.css';

const Sidebar = ({ user, children, currentPage = 'Dashboard', onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const handleNavigation = (page) => {
    if (typeof onNavigate === 'function') {
      onNavigate(page);
    }
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getVisibleSections = () => {
    if (!userProfile) return { retiros: false, inventario: false, administracion: false };

    const { rol, comite } = userProfile;

    return {
      retiros: true,
      inventario: rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      administracion: rol === 'administrador'
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
          padding: '32px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
          color: '#1f2937',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Cargando permisos del usuario...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* MOBILE NAV BAR */}
      <div className="mobile-nav-bar">
        <button
          onClick={toggleSidebar}
          className="mobile-menu-button"
          aria-label="Abrir menú de navegación"
        />
        <h1 className="mobile-page-title">{currentPage}</h1>
      </div>

      {/* OVERLAY PARA MOBILE */}
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* SIDEBAR PRINCIPAL */}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>

        {/* HEADER EJECUTIVO */}
        <div className="sidebar-header">
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle"
            aria-label={isCollapsed ? 'Expandir menú de navegación' : 'Colapsar menú de navegación'}
          />

          {/* Información del usuario */}
          {userProfile && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {userProfile.nombre} {userProfile.apellidos}
              </div>

              <div className={`sidebar-user-role ${userProfile.rol === 'administrador' ? 'admin' : 'instructor'}`}>
                {userProfile.rol === 'administrador' ? 'Administrador' : 'Instructor'}
              </div>

              {userProfile.comite && (
                <div className="sidebar-user-committee">
                  Comité de {userProfile.comite}
                </div>
              )}
            </div>
          )}

          {/* Título de página */}
          <h2 className="sidebar-page-title">{currentPage}</h2>
        </div>

        {/* NAVEGACIÓN CORPORATIVA */}
        <nav className="sidebar-nav">

          {/* SECCIÓN RETIROS */}
          {visibleSections.retiros && (
            <div className="sidebar-nav-section">
              <h3 className="sidebar-nav-title">Retiros</h3>
              <ul className="sidebar-nav-list">
                <li className="sidebar-nav-item">
                  <button
                    onClick={() => handleNavigation('retiro-placas')}
                    className="sidebar-nav-button"
                    title="Retiro de Placas"
                  >
                    <div className="nav-icon plates"></div>
                    <span>Retiro de Placas</span>
                  </button>
                </li>
                <li className="sidebar-nav-item">
                  <button
                    onClick={() => handleNavigation('retiro-lentes')}
                    className="sidebar-nav-button"
                    title="Retiro de Lentes"
                  >
                    <div className="nav-icon lenses"></div>
                    <span>Retiro de Lentes</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* SECCIÓN INVENTARIO */}
          {visibleSections.inventario && (
            <div className="sidebar-nav-section">
              <h3 className="sidebar-nav-title">Inventario</h3>
              <ul className="sidebar-nav-list">
                <li className="sidebar-nav-item">
                  <button
                    onClick={() => handleNavigation('inventario-placas')}
                    className="sidebar-nav-button"
                    title="Inventario de Placas"
                  >
                    <div className="nav-icon inventory-plates"></div>
                    <span>Inventario de Placas</span>
                  </button>
                </li>
                <li className="sidebar-nav-item">
                  <button
                    onClick={() => handleNavigation('inventario-lentes')}
                    className="sidebar-nav-button"
                    title="Inventario de Lentes"
                  >
                    <div className="nav-icon inventory-lenses"></div>
                    <span>Inventario de Lentes</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* SECCIÓN ADMINISTRACIÓN */}
          {visibleSections.administracion && (
            <div className="sidebar-nav-section">
              <h3 className="sidebar-nav-title">Administración</h3>
              <ul className="sidebar-nav-list">
                <li className="sidebar-nav-item">
                  <button
                    onClick={() => handleNavigation('registrar-usuario')}
                    className="sidebar-nav-button"
                    title="Registrar Usuario"
                  >
                    <div className="nav-icon user"></div>
                    <span>Registrar Usuario</span>
                  </button>
                </li>
                <li className="sidebar-nav-item">
                  <button
                    onClick={() => handleNavigation('edicion-bd')}
                    className="sidebar-nav-button"
                    title="Edición de Base de Datos"
                  >
                    <div className="nav-icon database"></div>
                    <span>Edición de Base de Datos</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* MENSAJE SIN PERMISOS */}
          {!visibleSections.retiros && !visibleSections.inventario && !visibleSections.administracion && (
            <div className="sidebar-nav-section">
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  margin: '0 auto 16px',
                  background: '#f3f4f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #ef4444',
                    borderRadius: '50%',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '2px',
                      height: '8px',
                      background: '#ef4444'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '2px',
                      height: '2px',
                      background: '#ef4444',
                      borderRadius: '50%'
                    }}></div>
                  </div>
                </div>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
                  Acceso Restringido
                </p>
                <p style={{ margin: '0', fontSize: '13px', lineHeight: '1.4' }}>
                  No tienes permisos para acceder a ninguna sección.
                  Contacta al administrador del sistema.
                </p>
              </div>
            </div>
          )}
        </nav>

        {/* FOOTER CORPORATIVO */}
        <div className="sidebar-footer">
          <div className="sidebar-user-email">
            {user?.email}
          </div>

          <button
            onClick={handleLogout}
            className="sidebar-logout-button"
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
            disabled={loggingOut}
          >
            {loggingOut ? 'Cerrando...' : <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </>
  );
};

export default Sidebar;
