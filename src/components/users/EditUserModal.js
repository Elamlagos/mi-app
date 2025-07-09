import React, { useState } from 'react';
import Modal from '../common/Modal';

const EditUserModal = ({ user, onClose, onSave, loading, error }) => {
  const [formData, setFormData] = useState({
    email: user.email || '',
    nombre: user.nombre || '',
    apellidos: user.apellidos || '',
    rol: user.rol || '',
    comite: user.comite || '',
    estado_placa: user.estado_placa || '',
    estado_lente: user.estado_lente || '',
    foto_url: user.foto_url || ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    setNewPhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const success = await onSave(formData, newPhoto);
    
    if (success) {
      setMessage('Usuario actualizado exitosamente');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Editar Usuario" size="large">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Nueva Contraseña (opcional):</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Dejar vacío para no cambiar"
            />
          </div>

          <div>
            <label>Nombre:</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Apellidos:</label>
            <input
              type="text"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Rol:</label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            >
              <option value="">Seleccionar Rol</option>
              <option value="administrador">Administrador</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>

          <div>
            <label>Comité:</label>
            <select
              name="comite"
              value={formData.comite}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            >
              <option value="">Seleccionar Comité</option>
              <option value="microscopia">Microscopía</option>
              <option value="redes">Redes</option>
              <option value="decoracion">Decoración</option>
            </select>
          </div>

          <div>
            <label>Estado Placa:</label>
            <select
              name="estado_placa"
              value={formData.estado_placa}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="Sin usos">Sin usos</option>
              <option value="En uso">En uso</option>
              <option value="Devuelto">Devuelto</option>
              <option value="Perdido">Perdido</option>
            </select>
          </div>

          <div>
            <label>Estado Lente:</label>
            <select
              name="estado_lente"
              value={formData.estado_lente}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="Sin usos">Sin usos</option>
              <option value="En uso">En uso</option>
              <option value="Devuelto">Devuelto</option>
              <option value="Perdido">Perdido</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <label>Foto Actual:</label>
          {formData.foto_url ? (
            <div style={{ marginTop: '5px' }}>
              <img 
                src={formData.foto_url} 
                alt="Foto actual" 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  objectFit: 'cover'
                }} 
              />
            </div>
          ) : (
            <p>Sin foto</p>
          )}
        </div>

        <div style={{ marginTop: '15px' }}>
          <label>Nueva Foto (opcional):</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '10px', 
          marginTop: '20px' 
        }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
      
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </Modal>
  );
};

export default EditUserModal;