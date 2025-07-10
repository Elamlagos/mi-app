import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const DebugSupabase = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test 1: Verificar configuración de Supabase
      results.config = {
        url: process.env.REACT_APP_SUPABASE_URL ? 'Configurado' : 'NO CONFIGURADO',
        key: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Configurado' : 'NO CONFIGURADO',
        supabaseInstance: supabase ? 'Creado' : 'NO CREADO'
      };

      // Test 2: Verificar conexión básica
      try {
        const { data, error } = await supabase.auth.getSession();
        results.connection = {
          status: error ? 'ERROR' : 'OK',
          error: error?.message,
          hasSession: !!data.session,
          userId: data.session?.user?.id
        };
      } catch (error) {
        results.connection = {
          status: 'EXCEPCIÓN',
          error: error.message
        };
      }

      // Test 3: Verificar tabla usuarios (sin filtros)
      try {
        const { data, error, count } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true });
        
        results.tableUsuarios = {
          status: error ? 'ERROR' : 'OK',
          error: error?.message,
          errorCode: error?.code,
          totalRecords: count
        };
      } catch (error) {
        results.tableUsuarios = {
          status: 'EXCEPCIÓN',
          error: error.message
        };
      }

      // Test 4: Verificar tabla usuarios con el usuario actual
      if (results.connection.userId) {
        try {
          const { data, error } = await supabase
            .from('usuarios')
            .select('rol, comite, nombre, apellidos')
            .eq('id', results.connection.userId)
            .single();
          
          results.currentUserProfile = {
            status: error ? 'ERROR' : 'OK',
            error: error?.message,
            errorCode: error?.code,
            data: data
          };
        } catch (error) {
          results.currentUserProfile = {
            status: 'EXCEPCIÓN',
            error: error.message
          };
        }
      }

      // Test 5: Verificar políticas RLS
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id')
          .limit(1);
        
        results.rlsPolicies = {
          status: error ? 'ERROR' : 'OK',
          error: error?.message,
          canReadTable: !error
        };
      } catch (error) {
        results.rlsPolicies = {
          status: 'EXCEPCIÓN',
          error: error.message
        };
      }

    } catch (error) {
      results.generalError = error.message;
    }

    setTestResults(results);
    setLoading(false);
  };

  const renderResult = (test, result) => {
    const isError = result.status === 'ERROR' || result.status === 'EXCEPCIÓN';
    
    return (
      <div key={test} style={{
        marginBottom: '15px',
        padding: '10px',
        border: `1px solid ${isError ? '#dc3545' : '#28a745'}`,
        borderRadius: '5px',
        backgroundColor: isError ? '#f8d7da' : '#d4edda'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: isError ? '#721c24' : '#155724' }}>
          {test.toUpperCase()}
        </h4>
        <pre style={{
          margin: 0,
          fontSize: '12px',
          color: isError ? '#721c24' : '#155724',
          whiteSpace: 'pre-wrap'
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔍 Debug Supabase</h2>
      <p>Esta herramienta te ayudará a diagnosticar problemas de conexión con Supabase.</p>
      
      <button 
        onClick={runTests}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Ejecutando Tests...' : 'Ejecutar Diagnóstico'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div>
          <h3>Resultados del Diagnóstico:</h3>
          {Object.entries(testResults).map(([test, result]) => 
            renderResult(test, result)
          )}
          
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e9ecef',
            borderRadius: '5px'
          }}>
            <h4>💡 Interpretación de Resultados:</h4>
            <ul style={{ fontSize: '14px' }}>
              <li><strong>config:</strong> Verifica si las variables de entorno están configuradas</li>
              <li><strong>connection:</strong> Prueba la conexión básica a Supabase</li>
              <li><strong>tableUsuarios:</strong> Verifica si puedes acceder a la tabla usuarios</li>
              <li><strong>currentUserProfile:</strong> Intenta obtener tu perfil específico</li>
              <li><strong>rlsPolicies:</strong> Verifica las políticas de seguridad (RLS)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugSupabase;