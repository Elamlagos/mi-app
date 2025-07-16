import React, { useState } from 'react';
import './RegisterUserForm.css'; // 🎨 Importar estilos específicos

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
    <div className="register-user-form">
      {/* Header */}
      <div className="register-form-header">
        <button 
          onClick={onBack}
          className="register-form-back-button"
        >
          ← Volver
        </button>
        <h2 className="register-form-title">
          👤 Registrar Nuevo Usuario
        </h2>
      </div>
      
      {/* Errores de validación */}
      {validationErrors.length > 0 && (
        <div className="register-form-errors">
          <strong>⚠️ Errores encontrados:</strong>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mensaje de éxito */}
      {message && (
        <div className="register-form-success">
          ✅ {message}
        </div>
      )}
      
      {/* Formulario principal */}
      <form onSubmit={handleSubmit} className="register-form" autoComplete="off">
        <div className="register-form-grid">
          {/* Email */}
          <div className="register-form-field">
            <label className="register-form-label">
              📧 Correo Electrónico <span className="register-form-required">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
              className="register-form-input"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          {/* Contraseña */}
          <div className="register-form-field">
            <label className="register-form-label">
              🔒 Contraseña <span className="register-form-required">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              className="register-form-input"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          {/* Nombre */}
          <div className="register-form-field">
            <label className="register-form-label">
              👤 Nombre <span className="register-form-required">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              autoComplete="off"
              className="register-form-input"
              placeholder="Nombre del usuario"
              required
            />
          </div>

          {/* Confirmar Contraseña */}
          <div className="register-form-field">
            <label className="register-form-label">
              🔒 Confirmar Contraseña <span className="register-form-required">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="register-form-input"
              placeholder="Repetir contraseña"
              required
            />
          </div>

          {/* Apellidos */}
          <div className="register-form-field">
            <label className="register-form-label">
              👥 Apellidos <span className="register-form-required">*</span>
            </label>
            <input
              type="text"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
              autoComplete="off"
              className="register-form-input"
              placeholder="Apellidos del usuario"
              required
            />
          </div>

          {/* Rol */}
          <div className="register-form-field">
            <label className="register-form-label">
              🎭 Rol <span className="register-form-required">*</span>
            </label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleChange}
              className="register-form-select"
              required
            >
              <option value="">Seleccionar Rol</option>
              <option value="administrador">🔑 Administrador</option>
              <option value="instructor">👨‍🏫 Instructor</option>
            </select>
          </div>

          {/* Comité */}
          <div className="register-form-field">
            <label className="register-form-label">
              🏢 Comité <span className="register-form-required">*</span>
            </label>
            <select
              name="comite"
              value={formData.comite}
              onChange={handleChange}
              className="register-form-select"
              required
            >
              <option value="">Seleccionar Comité</option>
              <option value="microscopia">🔬 Microscopía</option>
              <option value="redes">🌐 Redes</option>
              <option value="decoracion">🎨 Decoración</option>
            </select>
          </div>

          {/* Foto del usuario */}
          <div className="register-form-field register-form-file-field">
            <label className="register-form-label">
              📸 Foto del Usuario (máximo 5MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="register-form-file-input"
            />
            {photo && (
              <div className="register-form-file-selected">
                ✅ Archivo seleccionado: {photo.name}
              </div>
            )}
          </div>
        </div>

        {/* Sección de ayuda */}
        <div className="register-form-help">
          <p className="register-form-help-text">
            <span className="register-form-required">*</span> Campos obligatorios
          </p>
          
          <button 
            type="submit" 
            disabled={loading}
            className="register-form-submit"
          >
            {loading ? '⏳ Registrando...' : '✅ Registrar Usuario'}
          </button>
        </div>
      </form>
      
      {/* Error global */}
      {error && (
        <div className="register-form-global-error">
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default RegisterUserForm;