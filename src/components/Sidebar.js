import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Sidebar = ({ user, children, currentPage = 'Dashboard', onNavigate }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

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
              <div style={{ marginBottom: '25px' }}>
                <h4>Retiros</h4>
                <ul style={{ listStyle: 'none', padding: 0, marginLeft: '10px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <button onClick={() => onNavigate('retiro-placas')}>Retiro de Placas</button>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <button onClick={() => onNavigate('retiro-lentes')}>Retiro de Lentes</button>
                  </li>
                </ul>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4>Inventario</h4>
                <ul style={{ listStyle: 'none', padding: 0, marginLeft: '10px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <button onClick={() => onNavigate('inventario-placas')}>Inventario de Placas</button>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <button onClick={() => onNavigate('inventario-lentes')}>Inventario de Lentes</button>
                  </li>
                </ul>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4>Administración</h4>
                <ul style={{ listStyle: 'none', padding: 0, marginLeft: '10px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <button onClick={() => onNavigate('registrar-usuario')}>Registrar Usuario</button>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <button onClick={() => onNavigate('edicion-bd')}>Edición de Base de Datos</button>
                  </li>
                </ul>
              </div>
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
              <button onClick={handleLogout} style={{ width: '100%' }}>
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