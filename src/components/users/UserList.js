import React, { useState, useMemo } from 'react';
import EditUserModal from './EditUserModal';
import DeleteUserConfirm from './DeleteUserConfirm';

const UserList = ({ onBack, users, onUpdateUser, onDeleteUser, loading, error }) => {
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [filterComite, setFilterComite] = useState('');
  const [message, setMessage] = useState('');

  // Filtrar usuarios basado en búsqueda y filtros
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRol = filterRol === '' || user.rol === filterRol;
      const matchesComite = filterComite === '' || user.comite === filterComite;
      
      return matchesSearch && matchesRol && matchesComite;
    });
  }, [users, searchTerm, filterRol, filterComite]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setMessage('');
  };

  const handleDelete = (user) => {
    setDeletingUser(user);
    setMessage('');
  };

  const handleEditSave = async (userData, newPhoto, newPassword) => {
    const result = await onUpdateUser(editingUser.id, userData, newPhoto, newPassword);
    if (result.success) {
      setEditingUser(null);
      setMessage(result.message);
      setTimeout(() => setMessage(''), 3000);
    }
    return result.success;
  };

  const handleDeleteConfirm = async () => {
    const result = await onDeleteUser(deletingUser.id);
    if (result.success) {
      setDeletingUser(null);
      setMessage(result.message);
      setTimeout(() => setMessage(''), 3000);
    }
    return result.success;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRol('');
    setFilterComite('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={onBack}>← Volver</button>
      </div>
      
      <h2>Lista de Usuarios ({filteredUsers.length} de {users.length})</h2>
      
      {/* Mensajes */}
      {message && (
        <div style={{ 
          backgroundColor: '#d4edda', 
          color: '#155724',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          {message}
        </div>
      )}
      
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}
      
      {/* Filtros y búsqueda */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '5px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr auto',
        gap: '10px',
        alignItems: 'center'
      }}>
        <div>
          <label>Buscar:</label>
          <input
            type="text"
            placeholder="Nombre, apellidos o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div>
          <label>Filtrar por Rol:</label>
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>
        
        <div>
          <label>Filtrar por Comité:</label>
          <select
            value={filterComite}
            onChange={(e) => setFilterComite(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Todos</option>
            <option value="microscopia">Microscopía</option>
            <option value="redes">Redes</option>
            <option value="decoracion">Decoración</option>
          </select>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={clearFilters}
            style={{
              padding: '8px 15px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Limpiar
          </button>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Foto</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Nombre</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Apellidos</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Rol</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Comité</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Estado Placa</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Estado Lente</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Última Placa</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Último Lente</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Creación</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ 
                  border: '1px solid #ddd', 
                  padding: '20px', 
                  textAlign: 'center' 
                }}>
                  {searchTerm || filterRol || filterComite ? 
                    'No se encontraron usuarios con los filtros aplicados' : 
                    'No hay usuarios registrados'
                  }
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {user.foto_url ? (
                      <img 
                        src={user.foto_url} 
                        alt="Foto usuario" 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%',
                        backgroundColor: '#ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}>
                        Sin foto
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.nombre}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.apellidos}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <span style={{
                      backgroundColor: user.rol === 'administrador' ? '#dc3545' : '#28a745',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}>
                      {user.rol}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.comite}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <span style={{
                      backgroundColor: 
                        user.estado_placa === 'Sin usos' ? '#6c757d' :
                        user.estado_placa === 'En uso' ? '#ffc107' :
                        user.estado_placa === 'Devuelto' ? '#28a745' : '#dc3545',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px'
                    }}>
                      {user.estado_placa || 'N/A'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <span style={{
                      backgroundColor: 
                        user.estado_lente === 'Sin usos' ? '#6c757d' :
                        user.estado_lente === 'En uso' ? '#ffc107' :
                        user.estado_lente === 'Devuelto' ? '#28a745' : '#dc3545',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px'
                    }}>
                      {user.estado_lente || 'N/A'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(user.ultima_placa)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(user.ultimo_lente)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(user.creacion)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleEdit(user)}
                        disabled={loading}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: loading ? '#ccc' : '#ffc107',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={loading}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: loading ? '#ccc' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditSave}
          loading={loading}
          error={error}
        />
      )}

      {deletingUser && (
        <DeleteUserConfirm
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteConfirm}
          loading={loading}
        />
      )}
    </div>
  );
};

export default UserList;