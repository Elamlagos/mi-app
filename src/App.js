import React, { useState, useEffect, useCallback } from 'react';
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
  const [error, setError] = useState(null);

  // Función para obtener perfil de usuario
  const fetchUserProfile = useCallback(async (userId) => {
    try {
      console.log('Obteniendo perfil para usuario:', userId);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol, comite, nombre, apellidos')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error obteniendo perfil:', error);
        if (error.code === 'PGRST116') {
          // Usuario no existe en tabla usuarios
          await supabase.auth.signOut();
          throw new Error('Usuario no encontrado en el sistema');
        }
        throw error;
      }

      console.log('Perfil obtenido:', data);
      return data;
    } catch (error) {
      console.error('Error en fetchUserProfile:', error);
      throw error;
    }
  }, []);

  // Función para manejar cambios de autenticación
  const handleAuthStateChange = useCallback(async (currentUser) => {
    try {
      console.log('Procesando cambio de usuario:', currentUser?.id);
      
      setUser(currentUser);
      setError(null);

      if (currentUser) {
        // Usuario autenticado - obtener perfil
        const profile = await fetchUserProfile(currentUser.id);
        setUserProfile(profile);
      } else {
        // Usuario no autenticado - limpiar estado
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error manejando auth state:', error);
      setError(error.message);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // Efecto principal para manejar autenticación
  useEffect(() => {
    console.log('Inicializando sistema de autenticación');
    
    let mounted = true;
    let authListener = null;

    const initAuth = async () => {
      try {
        // 1. Obtener sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw new Error(`Error obteniendo sesión: ${error.message}`);
        }

        // 2. Procesar sesión inicial si el componente sigue montado
        if (mounted) {
          await handleAuthStateChange(session?.user || null);
        }

        // 3. Configurar listener para cambios futuros
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log(`Auth event: ${event}`, session?.user?.id);
            
            // Solo procesar eventos reales de cambio, no la sesión inicial
            if (event !== 'INITIAL_SESSION' && mounted) {
              await handleAuthStateChange(session?.user || null);
            }
          }
        );

        authListener = subscription;

      } catch (error) {
        console.error('Error en inicialización:', error);
        if (mounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Cleanup
    return () => {
      mounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [handleAuthStateChange]);

  // Navegación entre páginas
  const handleNavigation = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Obtener nombre de página actual
  const getPageName = useCallback(() => {
    const pageNames = {
      'dashboard': 'Dashboard',
      'registrar-usuario': 'Gestión de Usuarios',
      'retiro-placas': 'Retiro de Placas',
      'retiro-lentes': 'Retiro de Lentes',
      'inventario-placas': 'Inventario de Placas',
      'crear-placa': 'Crear Nueva Placa',
      'editar-placa': 'Editar Placa',
      'eliminar-placa': 'Eliminar Placa',
      'ver-inventario': 'Ver Inventario',
      'inventario-lentes': 'Inventario de Lentes',
      'edicion-bd': 'Edición de Base de Datos'
    };
    return pageNames[currentPage] || 'Dashboard';
  }, [currentPage]);

  // Verificar permisos de usuario
  const hasPermission = useCallback((page) => {
    if (!userProfile) return false;

    const { rol, comite } = userProfile;
    
    const permissions = {
      'dashboard': () => true,
      'retiro-placas': () => true,
      'retiro-lentes': () => true,
      'inventario-placas': () => rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      'crear-placa': () => rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      'editar-placa': () => rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      'eliminar-placa': () => rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      'ver-inventario': () => rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      'inventario-lentes': () => rol === 'administrador' || (rol === 'instructor' && comite === 'microscopia'),
      'registrar-usuario': () => rol === 'administrador',
      'edicion-bd': () => rol === 'administrador'
    };

    return permissions[page] ? permissions[page]() : false;
  }, [userProfile]);

  // Obtener tipo de acceso requerido
  const getRequiredAccess = useCallback((page) => {
    const accessTypes = {
      'retiro-placas': 'retiros',
      'retiro-lentes': 'retiros',
      'inventario-placas': 'inventario',
      'crear-placa': 'inventario',
      'editar-placa': 'inventario',
      'eliminar-placa': 'inventario',
      'ver-inventario': 'inventario',
      'inventario-lentes': 'inventario',
      'registrar-usuario': 'administracion',
      'edicion-bd': 'administracion'
    };
    return accessTypes[page] || 'unknown';
  }, []);

  // Renderizar página actual
  const renderCurrentPage = useCallback(() => {
    // Error state
    if (error) {
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
          <div style={{ fontSize: '48px', marginBottom: '20px', color: '#dc3545' }}>⚠️</div>
          <h2 style={{ color: '#dc3545', marginBottom: '15px' }}>Error de Aplicación</h2>
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Recargar Página
          </button>
        </div>
      );
    }

    // Loading state
    if (!userProfile) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          fontSize: '18px'
        }}>
          Cargando perfil de usuario...
        </div>
      );
    }

    // Access denied
    if (!hasPermission(currentPage)) {
      return (
        <AccessDenied 
          userRole={userProfile.rol}
          userComite={userProfile.comite}
          requiredAccess={getRequiredAccess(currentPage)}
        />
      );
    }

    // Page routing
    const pages = {
      'dashboard': () => <Dashboard userProfile={userProfile} />,
      'registrar-usuario': () => <UserManagement />,
      'inventario-placas': () => <PlateInventory onNavigate={handleNavigation} />,
      'crear-placa': () => <CreatePlate onNavigate={handleNavigation} />,
      'editar-placa': () => <EditPlate onNavigate={handleNavigation} />,
      'eliminar-placa': () => <DeletePlate onNavigate={handleNavigation} />,
      'ver-inventario': () => <ViewInventory onNavigate={handleNavigation} />,
      'retiro-placas': () => <PlateWithdrawal onNavigate={handleNavigation} />
    };

    if (pages[currentPage]) {
      return pages[currentPage]();
    }

    // Default page
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
  }, [error, userProfile, currentPage, hasPermission, getRequiredAccess, handleNavigation, getPageName]);

  // Loading inicial
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '15px', fontSize: '32px' }}>⚡</div>
        <div>Iniciando aplicación...</div>
      </div>
    );
  }

  // Renderizado principal
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
