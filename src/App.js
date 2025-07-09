import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/users/UserManagement';
import Sidebar from './components/Sidebar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
      case 'inventario-lentes': return 'Inventario de Lentes';
      case 'edicion-bd': return 'Edición de Base de Datos';
      default: return 'Dashboard';
    }
  };

  const renderCurrentPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'registrar-usuario': return <UserManagement />;
      default: return <div><h2>{getPageName()}</h2><p>Página en desarrollo</p></div>;
    }
  };

  if (loading) {
    return <div>Verificando sesión...</div>;
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