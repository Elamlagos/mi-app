import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberUser, setRememberUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cargar email recordado al iniciar
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberUser(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Guardar o eliminar email según la preferencia
    if (rememberUser) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Fondo animado */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
          zIndex: -2
        }}
      />
      
      {/* Partículas flotantes */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: -1
        }}
      >
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 20 + 10 + 'px',
              height: Math.random() * 20 + 10 + 'px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      {/* Overlay semitransparente */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          zIndex: -1
        }}
      />

      {/* Contenido principal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          animation: 'slideInUp 0.6s ease-out'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '10px',
              animation: 'bounce 2s ease-in-out infinite'
            }}>
              🔬
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Sistema de Inventario
            </h1>
            <p style={{
              color: '#666',
              fontSize: '16px',
              margin: 0
            }}>
              Iniciar Sesión
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#666',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Checkbox para recordar usuario */}
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                id="rememberUser"
                checked={rememberUser}
                onChange={(e) => setRememberUser(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#2b5f8a'
                }}
              />
              <label 
                htmlFor="rememberUser"
                style={{
                  fontSize: '14px',
                  color: '#555',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                💾 Recordar mi usuario
              </label>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                border: '1px solid #fcc'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 
                  'linear-gradient(135deg, #ccc 0%, #aaa 100%)' : 
                  'linear-gradient(135deg, #2b5f8a 0%, #4a90b8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(43, 95, 138, 0.3)',
                transform: loading ? 'none' : 'translateY(0px)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {loading ? (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    animation: 'spin 1s linear infinite'
                  }}>
                    ⏳
                  </span>
                  Iniciando...
                </span>
              ) : (
                '🚀 Iniciar Sesión'
              )}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #eee'
          }}>
            {rememberUser && (
              <div style={{
                backgroundColor: '#e7f3ff',
                color: '#0066cc',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '15px',
                border: '1px solid #b3d7ff'
              }}>
                ✅ Tu usuario será recordado en este dispositivo
              </div>
            )}
            <p style={{
              fontSize: '12px',
              color: '#999',
              margin: 0
            }}>
              Sistema de Gestión de Inventario v1.0
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          33% {
            transform: translateY(-30px) rotate(120deg);
            opacity: 1;
          }
          66% {
            transform: translateY(-60px) rotate(240deg);
            opacity: 0.4;
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        input:focus {
          border-color: #2b5f8a !important;
          box-shadow: 0 0 0 3px rgba(43, 95, 138, 0.1);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(43, 95, 138, 0.4) !important;
        }
      `}</style>
    </div>
  );
};

export default Login;