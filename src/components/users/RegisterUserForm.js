import React, { useState } from 'react';

const RegisterUserForm = ({ onBack, onUserCreated, loading, error }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellidos: '',
    rol: '',
    comite: ''
  });
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño de archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setValidationErrors(['La imagen no debe superar los 5MB']);
        return;
      }
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setValidationErrors(['Solo se permiten archivos de imagen']);
        return;
      }
    }
    
    setPhoto(file);
  };

  const validateForm = () => {
    const errors = [];

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.push('Email inválido');
    }

    // Validar contraseña
    if (!formData.password || formData.password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar confirmación de contraseña
    if (formData.password !== formData.confirmPassword) {
      errors.push('Las contraseñas no coinciden');
    }

    // Validar nombre
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    // Validar apellidos
    if (!formData.apellidos || formData.apellidos.trim().length < 2) {
      errors.push('Los apellidos deben tener al menos 2 caracteres');
    }

    // Validar rol
    if (!formData.rol || !['administrador', 'instructor'].includes(formData.rol)) {
      errors.push('Debe seleccionar un rol válido');
    }

    // Validar comité
    if (!formData.comite || !['microscopia', 'redes', 'decoracion'].includes(formData.comite)) {
      errors.push('Debe seleccionar un comité válido');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setValidationErrors([]);

    // Validar formulario
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const result = await onUserCreated(formData, photo);
      
      if (result.success) {
        setMessage(result.message);
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          nombre: '',
          apellidos: '',
          rol: '',
          comite: ''
        });
        setPhoto(null);
        e.target.reset();
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMessage(''), 3000);
      } else {
        setValidationErrors([result.message]);
      }
    } catch (err) {
      setValidationErrors([`Error inesperado: ${err.message}`]);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={onBack}>← Volver</button>
      </div>
      
      <h2>Registrar Nuevo Usuario</h2>
      
      {/* Mostrar errores de validación */}
      {validationErrors.length > 0 && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mensaje de éxito */}
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
      
      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label>Correo Electrónico: *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Contraseña: *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label>Nombre: *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              autoComplete="off"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Confirmar Contraseña: *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Repetir contraseña"
              required
            />
          </div>

          <div>
            <label>Apellidos: *</label>
            <input
              type="text"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
              autoComplete="off"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>

          <div>
            <label>Rol: *</label>
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
            <label>Comité: *</label>
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
            <label>Foto del Usuario (máximo 5MB):</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
            {photo && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Archivo seleccionado: {photo.name}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
            * Campos obligatorios
          </p>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {loading ? 'Registrando...' : 'Registrar Usuario'}
          </button>
        </div>
      </form>
      
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

export default RegisterUserForm;