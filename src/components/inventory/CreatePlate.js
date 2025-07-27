//a
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SimpleBarcodeGenerator } from '../../utils/simpleBarcodeGenerator';

const CreatePlate = ({ onNavigate }) => {
  // Estados para datos de BD
  const [temas, setTemas] = useState([]);
  const [subtemas, setSubtemas] = useState([]);
  const [tinciones, setTinciones] = useState([]);
  
  // Estados de selección
  const [selectedTema, setSelectedTema] = useState('');
  const [selectedSubtema, setSelectedSubtema] = useState('');
  const [selectedTincion, setSelectedTincion] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  
  // Estados de acordeones
  const [openTemaAccordion, setOpenTemaAccordion] = useState(false);
  const [openSubtemaAccordion, setOpenSubtemaAccordion] = useState(false);
  const [openTincionAccordion, setOpenTincionAccordion] = useState(false);
  const [openEstadoAccordion, setOpenEstadoAccordion] = useState(false);
  
  // Estados del formulario
  const [plateId, setPlateId] = useState('');
  const [idVisual, setIdVisual] = useState('');
  const [idVisualNumber, setIdVisualNumber] = useState('');
  const [caja, setCaja] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [imagenMacro, setImagenMacro] = useState(null);
  const [imagenesMicro, setImagenesMicro] = useState([]);
  
  // Estados de control
  const [isReserved, setIsReserved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const estadosPlaca = ['excelente', 'muy buena', 'buena', 'mala'];

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar usuario
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user);

        // Cargar temas
        const { data: temasData, error: temasError } = await supabase
          .from('temas')
          .select('*')
          .order('nombre');
        if (temasError) throw temasError;
        setTemas(temasData);

        // Cargar tinciones
        const { data: tincionesData, error: tincionesError } = await supabase
          .from('tinciones')
          .select('*')
          .order('tipo')
          .order('nombre');
        if (tincionesError) throw tincionesError;
        setTinciones(tincionesData);

      } catch (error) {
        setError(`Error cargando datos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Cargar subtemas cuando cambia el tema
  useEffect(() => {
    const loadSubtemas = async () => {
      if (!selectedTema) {
        setSubtemas([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subtemas')
          .select('*')
          .eq('id_tema', selectedTema)
          .order('nombre');
        
        if (error) throw error;
        setSubtemas(data);

        // Actualizar caja del tema
        const temaData = temas.find(t => t.id_tema === selectedTema);
        setCaja(temaData?.caja || '');
      } catch (error) {
        setError(`Error cargando subtemas: ${error.message}`);
      }
    };

    loadSubtemas();
  }, [selectedTema, temas]);

  // Generar ID visual cuando cambia tema o subtema
  useEffect(() => {
    const generateIdVisual = async () => {
      if (!selectedTema || !selectedSubtema || isReserved) return;

      try {
        // Buscar placas existentes con el mismo tema-subtema
        const { data, error } = await supabase
          .from('placas')
          .select('id_visual')
          .like('id_visual', `${selectedTema}-${selectedSubtema}-%`);

        if (error) throw error;

        // Extraer números existentes
        const existingNumbers = data
          .map(p => {
            const parts = p.id_visual?.split('-');
            return parts && parts.length === 3 ? parseInt(parts[2]) : null;
          })
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);

        // Encontrar el primer número disponible
        let nextNumber = 1;
        for (const num of existingNumbers) {
          if (num === nextNumber) {
            nextNumber++;
          } else {
            break;
          }
        }

        const numberStr = nextNumber.toString().padStart(3, '0');
        setIdVisualNumber(numberStr);
        setIdVisual(`${selectedTema}-${selectedSubtema}-${numberStr}`);
      } catch (error) {
        setError(`Error generando ID visual: ${error.message}`);
      }
    };

    generateIdVisual();
  }, [selectedTema, selectedSubtema, isReserved]);

  const generateRandomId = () => {
    return Math.floor(100000 + Math.random() * 900000);
  };

  const reservePlateId = async () => {
    if (isReserved) return;

    try {
      let newId;
      let attempts = 0;
      const maxAttempts = 10;

      // Intentar generar ID único
      do {
        newId = generateRandomId();
        const { data } = await supabase
          .from('placas')
          .select('id')
          .eq('id', newId)
          .single();
        
        if (!data) break; // ID disponible
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error('No se pudo generar un ID único');
      }

      // Insertar reserva
      const { error } = await supabase
        .from('placas')
        .insert({
          id: newId,
          id_tema: selectedTema,
          id_subtema: selectedSubtema,
          reserva: 'reservado'
        });

      if (error) throw error;

      setPlateId(newId);
      setIsReserved(true);
      setOpenSubtemaAccordion(false);
      
    } catch (error) {
      setError(`Error reservando ID: ${error.message}`);
    }
  };

  const validateIdVisual = async (newIdVisual) => {
    try {
      const { data, error } = await supabase
        .from('placas')
        .select('id')
        .eq('id_visual', newIdVisual)
        .neq('id', plateId);

      if (error) throw error;
      return data.length === 0;
    } catch (error) {
      console.error('Error validando ID visual:', error);
      return false;
    }
  };

  const handleIdVisualNumberChange = async (e) => {
    const newNumber = e.target.value.padStart(3, '0');
    const newIdVisual = `${selectedTema}-${selectedSubtema}-${newNumber}`;
    
    setIdVisualNumber(newNumber);
    setIdVisual(newIdVisual);

    // Validar disponibilidad
    const isAvailable = await validateIdVisual(newIdVisual);
    if (!isAvailable) {
      setError(`ID visual ${newIdVisual} ya existe`);
    } else {
      setError('');
    }
  };

  const startOver = async () => {
    if (isReserved && plateId) {
      try {
        await supabase
          .from('placas')
          .delete()
          .eq('id', plateId);
      } catch (error) {
        console.error('Error eliminando reserva:', error);
      }
    }

    // Reset todo
    setSelectedTema('');
    setSelectedSubtema('');
    setSelectedTincion('');
    setSelectedEstado('');
    setPlateId('');
    setIdVisual('');
    setIdVisualNumber('');
    setCaja('');
    setObservaciones('');
    setImagenMacro(null);
    setImagenesMicro([]);
    setIsReserved(false);
    setError('');
    
    // Reset acordeones
    setOpenTemaAccordion(false);
    setOpenSubtemaAccordion(false);
    setOpenTincionAccordion(false);
    setOpenEstadoAccordion(false);
  };

  const handleImageMacroChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen macro no debe superar los 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }
      setImagenMacro(file);
      setError('');
    }
  };

  const handleImagenesMicroChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      setError('Máximo 10 imágenes microscópicas');
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Las imágenes no deben superar los 5MB cada una');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }
    }

    setImagenesMicro(files);
    setError('');
  };

  const uploadImage = async (file, imageType) => {
    const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    };

    const base64 = await fileToBase64(file);
    const content = base64.split(',')[1];

    const { data, error } = await supabase.functions.invoke('upload-github-image', {
      body: {
        idTema: selectedTema,
        idSubtema: selectedSubtema,
        plateId: plateId,
        fileName: file.name,
        fileContent: content,
        fileType: file.type,
        imageType: imageType
      }
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Error subiendo imagen');

    return data.downloadUrl;
  };

  // 🚀 REEMPLAZA esta función en CreatePlate.js (busca generateBarcodeImage)

const generateBarcodeImage = async (plateId, idVisual) => {
  try {
    console.log('🚀 Generando código optimizado para portaobjetos...');
    
    // Esperar que el sistema esté listo
    await SimpleBarcodeGenerator.waitForSystem();
    
    // 🎯 GENERAR CÓDIGO OPTIMIZADO:
    // - Código visual (T01-S02-001) ARRIBA en letras grandes
    // - Barras gruesas para impresión pequeña
    // - ID numérico (123456) abajo
    const base64Data = await SimpleBarcodeGenerator.generateBarcode(plateId, idVisual);
    
    console.log('✅ Código optimizado generado exitosamente');
    console.log('🖨️ Configuración: Visual arriba (18px), barras gruesas (4px), perfecto para portaobjetos');
    
    return base64Data;
    
  } catch (error) {
    console.error('❌ Error generando código optimizado:', error);
    throw new Error(`Error generando código de barras: ${error.message}`);
  }
};

  // 🚀 FUNCIÓN SIMPLIFICADA PARA SUBIR CÓDIGOS
  const uploadBarcodeToGitHub = async (plateId, idTema, idSubtema, base64Data) => {
    try {
      console.log('📤 Subiendo código de barras a GitHub...');
      
      const { data, error } = await supabase.functions.invoke('upload-github-image', {
        body: {
          idTema: idTema,
          idSubtema: idSubtema,
          plateId: plateId,
          fileName: `barcode_${plateId}.png`,
          fileContent: base64Data,
          fileType: 'image/png',
          imageType: 'barcode'
        }
      });

      if (error) {
        console.error('❌ Error en función Edge:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.error('❌ Función Edge falló:', data);
        throw new Error(data?.error || 'Error subiendo código de barras a GitHub');
      }

      console.log('✅ Código de barras subido exitosamente:', data.downloadUrl);
      return data.downloadUrl;
      
    } catch (error) {
      console.error('❌ Error completo subiendo código de barras:', error);
      throw new Error(`Error subiendo código de barras: ${error.message}`);
    }
  };

  // 🚀 FUNCIÓN PRINCIPAL SIMPLIFICADA
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReserved || !plateId) {
      setError('Debe seleccionar tema y subtema primero');
      return;
    }

    if (!selectedTincion || !selectedEstado) {
      setError('Debe completar todos los campos obligatorios');
      return;
    }

    try {
      setSaving(true);
      setError('');

      console.log('💾 Iniciando proceso de guardado...');

      // VALIDACIÓN FINAL
      const { data: existingPlates, error: validationError } = await supabase
        .from('placas')
        .select('id, id_visual')
        .eq('id_visual', idVisual)
        .neq('id', plateId);

      if (validationError) {
        throw new Error(`Error verificando ID visual: ${validationError.message}`);
      }

      if (existingPlates && existingPlates.length > 0) {
        setError(`El ID visual "${idVisual}" ya está en uso. Por favor, cambia el número.`);
        setSaving(false);
        return;
      }

      let imagenMacroUrl = null;
      let imagenesMicroUrls = [];
      let codigoBarraUrl = null;

      // GENERAR CÓDIGO DE BARRAS
      try {
        if (!SimpleBarcodeGenerator.isSystemReady()) {
          await SimpleBarcodeGenerator.waitForSystem();
        }
        
        const barcodeBase64 = await generateBarcodeImage(plateId, idVisual);
        codigoBarraUrl = await uploadBarcodeToGitHub(plateId, selectedTema, selectedSubtema, barcodeBase64);
        
        console.log('✅ Código de barras procesado exitosamente');
      } catch (barcodeError) {
        console.error('❌ Error procesando código de barras:', barcodeError);
        const warningMsg = `Advertencia: Código de barras no se pudo crear (${barcodeError.message}). La placa se guardará sin código de barras.`;
        setError(warningMsg);
      }

      // Subir imagen macro
      if (imagenMacro) {
        try {
          imagenMacroUrl = await uploadImage(imagenMacro, 'macro');
        } catch (macroError) {
          console.warn('⚠️ Error subiendo imagen macro:', macroError);
        }
      }

      // Subir imágenes micro
      if (imagenesMicro.length > 0) {
        try {
          for (const imagen of imagenesMicro) {
            const url = await uploadImage(imagen, 'micro');
            imagenesMicroUrls.push(url);
          }
        } catch (microError) {
          console.warn('⚠️ Error subiendo imágenes microscópicas:', microError);
        }
      }

      // GUARDAR EN BASE DE DATOS
      const { error: dbError } = await supabase
        .from('placas')
        .update({
          id_tema: selectedTema,
          id_subtema: selectedSubtema,
          id_tincion: selectedTincion,
          id_visual: idVisual,
          caja: parseInt(caja),
          estado_placa: selectedEstado,
          observaciones: observaciones,
          imagen_macro_url: imagenMacroUrl,
          imagen_micro_url: imagenesMicroUrls,
          codigo_barra_txt: plateId.toString(),
          codigo_barra_url: codigoBarraUrl,
          actividad: 'guardada',
          reserva: 'completada',
          id_responsable: user?.id,
          id_creador: user?.id,
          id_editor: user?.id,
          ultimo_uso: new Date().toISOString(),
          creacion: new Date().toISOString(),
          edicion: new Date().toISOString()
        })
        .eq('id', plateId);

      if (dbError) {
        throw dbError;
      }

      // MENSAJE DE ÉXITO
      if (codigoBarraUrl) {
        alert('✅ Placa creada exitosamente con código de barras');
      } else {
        alert('✅ Placa creada exitosamente (sin código de barras - revisar configuración)');
      }
      
      onNavigate('inventario-placas');

    } catch (error) {
      console.error('❌ Error completo guardando placa:', error);
      setError(`Error guardando placa: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handlers para acordeones
  const handleTemaSelect = (tema) => {
    if (isReserved) return;
    setSelectedTema(tema.id_tema);
    setSelectedSubtema('');
    setSelectedTincion('');
    setOpenTemaAccordion(false);
    setOpenSubtemaAccordion(true);
  };

  const handleSubtemaSelect = async (subtema) => {
    if (isReserved) return;
    setSelectedSubtema(subtema.id_subtema);
    setSelectedTincion('');
    await reservePlateId();
    setOpenTincionAccordion(true);
  };

  const handleTincionSelect = (tincion) => {
    setSelectedTincion(tincion.id_tincion);
    setOpenTincionAccordion(false);
    setOpenEstadoAccordion(true);
  };

  const handleEstadoSelect = (estado) => {
    setSelectedEstado(estado);
    setOpenEstadoAccordion(false);
  };

  // Obtener datos seleccionados
  const getSelectedTemaData = () => temas.find(t => t.id_tema === selectedTema);
  const getSelectedSubtemaData = () => subtemas.find(s => s.id_subtema === selectedSubtema);
  const getSelectedTincionData = () => tinciones.find(t => t.id_tincion === selectedTincion);

  if (loading) {
    return <div>Cargando datos...</div>;
  }

  return (
    <div>
      <button onClick={() => onNavigate('inventario-placas')}>← Volver al Inventario</button>
      
      <h2>Crear Nueva Placa</h2>

      {error && (
        <div style={{
          color: error.includes('Advertencia') ? '#856404' : 'red',
          backgroundColor: error.includes('Advertencia') ? '#fff3cd' : '#f8d7da',
          padding: '10px',
          borderRadius: '5px',
          border: `1px solid ${error.includes('Advertencia') ? '#ffeaa7' : '#f5c6cb'}`,
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      {isReserved && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          <h4>✅ ID Reservado: {plateId}</h4>
          <button 
            onClick={startOver}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Empezar de Nuevo
          </button>
          <p style={{ marginTop: '10px', marginBottom: '0' }}>
            <strong>Nota:</strong> No puedes cambiar tema o subtema. Si necesitas hacerlo, debes empezar de nuevo.
          </p>
        </div>
      )}

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h4>📋 Selección Actual:</h4>
        <p><strong>Tema:</strong> {selectedTema ? `${selectedTema} - ${getSelectedTemaData()?.nombre}` : '❌ No seleccionado'}</p>
        <p><strong>Subtema:</strong> {selectedSubtema ? `${selectedSubtema} - ${getSelectedSubtemaData()?.nombre}` : '❌ No seleccionado'}</p>
        <p><strong>Tinción:</strong> {selectedTincion ? `${selectedTincion} - ${getSelectedTincionData()?.nombre}` : '❌ No seleccionado'}</p>
        <p><strong>Estado:</strong> {selectedEstado || '❌ No seleccionado'}</p>
        {plateId && <p><strong>ID Placa:</strong> {plateId}</p>}
        {idVisual && <p><strong>ID Visual:</strong> {idVisual}</p>}
      </div>

      {/* Acordeón de Temas */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => !isReserved && setOpenTemaAccordion(!openTemaAccordion)}
          disabled={isReserved}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: selectedTema ? '#28a745' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isReserved ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {selectedTema ? `✅ Tema: ${selectedTema} - ${getSelectedTemaData()?.nombre}` : '📂 Seleccionar Tema'}
          {!isReserved && (openTemaAccordion ? ' ▲' : ' ▼')}
        </button>

        {openTemaAccordion && !isReserved && (
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '5px',
            marginTop: '5px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {temas.map((tema) => (
              <div 
                key={tema.id_tema} 
                onClick={() => handleTemaSelect(tema)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                <strong>{tema.id_tema}</strong> - {tema.nombre} (Caja: {tema.caja})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acordeón de Subtemas */}
      {selectedTema && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={() => !isReserved && setOpenSubtemaAccordion(!openSubtemaAccordion)}
            disabled={isReserved}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: selectedSubtema ? '#28a745' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isReserved ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {selectedSubtema ? `✅ Subtema: ${selectedSubtema} - ${getSelectedSubtemaData()?.nombre}` : '📁 Seleccionar Subtema'}
            {!isReserved && (openSubtemaAccordion ? ' ▲' : ' ▼')}
          </button>

          {openSubtemaAccordion && !isReserved && (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '5px',
              marginTop: '5px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {subtemas.map((subtema) => (
                <div 
                  key={`${subtema.id_tema}-${subtema.id_subtema}`} 
                  onClick={() => handleSubtemaSelect(subtema)}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <strong>{subtema.id_subtema}</strong> - {subtema.nombre}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resto del formulario */}
      {isReserved && (
        <>
          {/* Acordeón de Tinciones */}
          <div style={{ marginBottom: '15px' }}>
            <button 
              onClick={() => setOpenTincionAccordion(!openTincionAccordion)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: selectedTincion ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {selectedTincion ? `✅ Tinción: ${getSelectedTincionData()?.nombre}` : '🧪 Seleccionar Tinción'}
              {openTincionAccordion ? ' ▲' : ' ▼'}
            </button>

            {openTincionAccordion && (
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '5px',
                marginTop: '5px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <div style={{ padding: '10px', backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                  Tinciones Normales
                </div>
                {tinciones.filter(t => t.tipo === 'normal').map((tincion) => (
                  <div 
                    key={tincion.id_tincion} 
                    onClick={() => handleTincionSelect(tincion)}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <strong>ID: {tincion.id_tincion}</strong> - {tincion.nombre}
                  </div>
                ))}

                <div style={{ padding: '10px', backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                  Tinciones Especiales
                </div>
                {tinciones.filter(t => t.tipo === 'especial').map((tincion) => (
                  <div 
                    key={tincion.id_tincion} 
                    onClick={() => handleTincionSelect(tincion)}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <strong>ID: {tincion.id_tincion}</strong> - {tincion.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acordeón de Estado */}
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => setOpenEstadoAccordion(!openEstadoAccordion)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: selectedEstado ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {selectedEstado ? `✅ Estado: ${selectedEstado}` : '📊 Seleccionar Estado'}
              {openEstadoAccordion ? ' ▲' : ' ▼'}
            </button>

            {openEstadoAccordion && (
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '5px',
                marginTop: '5px'
              }}>
                {estadosPlaca.map((estado) => (
                  <div 
                    key={estado} 
                    onClick={() => handleEstadoSelect(estado)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    {estado}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campos editables */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              🏷️ ID Visual:
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input 
                type="text" 
                value={`${selectedTema}-${selectedSubtema}-`} 
                disabled 
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }}
              />
              <input 
                type="number" 
                min="1" 
                max="999"
                value={idVisualNumber}
                onChange={handleIdVisualNumberChange}
                placeholder="001"
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  width: '80px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📦 Caja:
            </label>
            <input 
              type="number" 
              value={caja}
              onChange={(e) => setCaja(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📝 Observaciones:
            </label>
            <textarea 
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows="3"
              placeholder="Observaciones opcionales..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              🖼️ Imagen Macro (opcional):
            </label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageMacroChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            {imagenMacro && (
              <p style={{ color: '#28a745', marginTop: '5px' }}>
                ✅ Archivo seleccionado: {imagenMacro.name}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              🔬 Imágenes Microscópicas (máximo 10):
            </label>
            <input 
              type="file" 
              accept="image/*"
              multiple
              onChange={handleImagenesMicroChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            {imagenesMicro.length > 0 && (
              <p style={{ color: '#28a745', marginTop: '5px' }}>
                ✅ Archivos seleccionados: {imagenesMicro.length}
              </p>
            )}
          </div>

          <button 
            onClick={handleSubmit}
            disabled={saving || !selectedTincion || !selectedEstado}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: saving ? '#6c757d' : (!selectedTincion || !selectedEstado) ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: saving || !selectedTincion || !selectedEstado ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? '⏳ Guardando...' : '💾 Crear Placa'}
          </button>
        </>
      )}
    </div>
  );
};

export default CreatePlate;