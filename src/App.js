import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/users/UserManagement';
import PlateInventory from './components/inventory/PlateInventory';
import CreatePlate from './components/inventory/CreatePlate';
import EditPlate from './components/inventory/EditPlate';
import DeletePlate from './components/inventory/DeletePlate';
import ViewInventory from './components/inventory/ViewInventory';
import PlateWithdrawal from './components/inventory/PlateWithdrawal';
import AccessDenied from './components/AccessDenied';
import Sidebar from './components/Sidebar';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await getUserProfile(currentUser.id);
      }
      
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await getUserProfile(currentUser.id);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol, comite, nombre, apellidos')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error obteniendo perfil:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleNavigation = (page) => {
    setCurrentPage(page);
  };

  const getPageName = () => {
    switch(currentPage) {
      case 'dashboard': return 'Dashboard';
      case 'registrar-usuario': return 'Gestión de Usuarios';
      case 'retiro-placas': return 'Retiro de Placas';
      case 'retiro-lentes': return 'Retiro de Lentes';
      case 'inventario-placas': return 'Inventario de Placas';
      case 'crear-placa': return 'Crear Nueva Placa';
      case 'editar-placa': return 'Editar Placa';
      case 'eliminar-placa': return 'Eliminar Placa';
      case 'ver-inventario': return 'Ver Inventario';
      case 'inventario-lentes': return 'Inventario de Lentes';
      case 'edicion-bd': return 'Edición de Base de Datos';
      default: return 'Dashboard';
    }
  };

  // Función para verificar permisos
  const hasPermission = (page) => {
    if (!userProfile) return false;

    const { rol, comite } = userProfile;

    switch(page) {
      case 'dashboard':
        return true; // Todos pueden ver el dashboard
      
      case 'retiro-placas':
      case 'retiro-lentes':
        return true; // Todos los usuarios pueden ver retiros
      
      case 'inventario-placas':
      case 'crear-placa':
      case 'editar-placa':
      case 'eliminar-placa':
      case 'ver-inventario':
      case 'inventario-lentes':
        return rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia');
      
      case 'registrar-usuario':
      case 'edicion-bd':
        return rol === 'administrador'; // Solo administradores
      
      default:
        return false;
    }
  };

  // Función para obtener el tipo de acceso requerido (para mostrar en AccessDenied)
  const getRequiredAccess = (page) => {
    switch(page) {
      case 'retiro-placas':
      case 'retiro-lentes':
        return 'retiros';
      
      case 'inventario-placas':
      case 'crear-placa':
      case 'editar-placa':
      case 'eliminar-placa':
      case 'ver-inventario':
      case 'inventario-lentes':
        return 'inventario';
      
      case 'registrar-usuario':
      case 'edicion-bd':
        return 'administracion';
      
      default:
        return 'unknown';
    }
  };

  const renderCurrentPage = () => {
    // Si no tenemos el perfil del usuario aún, mostrar loading
    if (!userProfile) {
      return <div>Cargando perfil de usuario...</div>;
    }

    // Verificar permisos para la página actual
    if (!hasPermission(currentPage)) {
      return (
        <AccessDenied 
          userRole={userProfile.rol}
          userComite={userProfile.comite}
          requiredAccess={getRequiredAccess(currentPage)}
        />
      );
    }

    // Renderizar la página correspondiente
    switch(currentPage) {
      case 'dashboard': 
        return <Dashboard userProfile={userProfile} />;
      case 'registrar-usuario': 
        return <UserManagement />;
      case 'inventario-placas':
        return <PlateInventory onNavigate={handleNavigation} />;
      case 'crear-placa':
        return <CreatePlate onNavigate={handleNavigation} />;
      case 'editar-placa':
        return <EditPlate onNavigate={handleNavigation} />;
      case 'eliminar-placa':
        return <DeletePlate onNavigate={handleNavigation} />;
      case 'ver-inventario':
        return <ViewInventory onNavigate={handleNavigation} />;
      case 'retiro-placas':
        return <PlateWithdrawal onNavigate={handleNavigation} />;
      default: 
        return (
          <div>
            <h2>{getPageName()}</h2>
            <p>Página en desarrollo</p>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '5px',
              marginTop: '20px'
            }}>
              <p><strong>Tu perfil:</strong></p>
              <p>Rol: {userProfile.rol}</p>
              <p>Comité: {userProfile.comite}</p>
              <p>Tienes acceso a esta sección ✅</p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Verificando sesión...
      </div>
    );
  }

  return (
    <div>
      {user ? (
        <Sidebar 
          user={user} 
          currentPage={getPageName()}
          onNavigate={handleNavigation}
        >
          {renderCurrentPage()}
        </Sidebar>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;