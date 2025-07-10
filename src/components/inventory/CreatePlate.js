import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

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

  const generateBarcodeImage = (plateId, idVisual) => {
    return new Promise((resolve, reject) => {
      try {
        // Crear canvas temporal
        const canvas = document.createElement('canvas');
        
        // Generar código de barras CODE128 basado en el ID de 6 dígitos
        window.JsBarcode(canvas, plateId.toString(), {
          format: "CODE128",
          width: 2,
          height: 60, // Altura más corta (antes era 100)
          displayValue: false, // No mostrar el número automáticamente
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10
        });

        // Crear un nuevo canvas más grande para incluir el ID visual arriba
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        
        // Configurar el canvas final
        const padding = 20;
        const textHeight = 25; // Espacio para el texto arriba
        finalCanvas.width = canvas.width + (padding * 2);
        finalCanvas.height = canvas.height + textHeight + (padding * 2);
        
        // Fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Agregar el ID visual ARRIBA del código de barras
        ctx.fillStyle = '#000000';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          idVisual, 
          finalCanvas.width / 2, 
          padding + 15 // Posición arriba del código
        );
        
        // Dibujar el código de barras debajo del texto
        ctx.drawImage(canvas, padding, padding + textHeight);
        
        // Convertir a base64
        const base64Data = finalCanvas.toDataURL('image/png').split(',')[1];
        resolve(base64Data);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const uploadBarcodeToGitHub = async (plateId, idTema, idSubtema, base64Data) => {
    try {
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

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error subiendo código de barras');

      return data.downloadUrl;
    } catch (error) {
      throw new Error(`Error subiendo código de barras: ${error.message}`);
    }
  };

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

      // VALIDACIÓN FINAL: Verificar que el ID visual sigue disponible
      console.log('Verificando disponibilidad final del ID visual:', idVisual);
      const { data: existingPlates, error: validationError } = await supabase
        .from('placas')
        .select('id, id_visual')
        .eq('id_visual', idVisual)
        .neq('id', plateId); // Excluir la placa actual

      if (validationError) {
        throw new Error(`Error verificando ID visual: ${validationError.message}`);
      }

      if (existingPlates && existingPlates.length > 0) {
        setError(`El ID visual "${idVisual}" ya está en uso por otra placa. Por favor, cambia el número y vuelve a intentar.`);
        setSaving(false);
        return; // NO continuar con el guardado
      }

      console.log('ID visual disponible, continuando con el guardado...');

      let imagenMacroUrl = null;
      let imagenesMicroUrls = [];
      let codigoBarraUrl = null;

      // Generar y subir código de barras
      try {
        const barcodeBase64 = await generateBarcodeImage(plateId, idVisual);
        codigoBarraUrl = await uploadBarcodeToGitHub(plateId, selectedTema, selectedSubtema, barcodeBase64);
      } catch (error) {
        console.error('Error generando código de barras:', error);
        // Continuar sin código de barras si falla
      }

      // Subir imagen macro si existe
      if (imagenMacro) {
        imagenMacroUrl = await uploadImage(imagenMacro, 'macro');
      }

      // Subir imágenes micro si existen
      if (imagenesMicro.length > 0) {
        for (const imagen of imagenesMicro) {
          const url = await uploadImage(imagen, 'micro');
          imagenesMicroUrls.push(url);
        }
      }

      // Actualizar la placa reservada con todos los datos
      const { error } = await supabase
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
          codigo_barra_txt: plateId.toString(), // Guardar el ID como texto del código
          codigo_barra_url: codigoBarraUrl, // Guardar la URL de la imagen
          actividad: 'guardada', // Nueva columna actividad
          reserva: 'completada', // Cambiar de 'reservado' a 'completada'
          id_responsable: user?.id,
          id_creador: user?.id,
          id_editor: user?.id,
          ultimo_uso: new Date().toISOString(),
          creacion: new Date().toISOString(),
          edicion: new Date().toISOString()
        })
        .eq('id', plateId);

      if (error) throw error;

      alert('Placa creada exitosamente con código de barras');
      onNavigate('inventario-placas');

    } catch (error) {
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

      {error && <div style={{color: 'red'}}>{error}</div>}

      {isReserved && (
        <div>
          <h4>ID Reservado: {plateId}</h4>
          <button onClick={startOver}>Empezar de Nuevo</button>
          <p><strong>Nota:</strong> No puedes cambiar tema o subtema. Si necesitas hacerlo, debes empezar de nuevo.</p>
        </div>
      )}

      <div>
        <h4>Selección Actual:</h4>
        <p>Tema: {selectedTema ? `${selectedTema} - ${getSelectedTemaData()?.nombre}` : 'No seleccionado'}</p>
        <p>Subtema: {selectedSubtema ? `${selectedSubtema} - ${getSelectedSubtemaData()?.nombre}` : 'No seleccionado'}</p>
        <p>Tinción: {selectedTincion ? `${selectedTincion} - ${getSelectedTincionData()?.nombre}` : 'No seleccionado'}</p>
        <p>Estado: {selectedEstado || 'No seleccionado'}</p>
        {plateId && <p>ID Placa: {plateId}</p>}
        {idVisual && <p>ID Visual: {idVisual}</p>}
      </div>

      {/* Acordeón de Temas */}
      <div>
        <button 
          onClick={() => !isReserved && setOpenTemaAccordion(!openTemaAccordion)}
          disabled={isReserved}
        >
          {selectedTema ? `Tema: ${selectedTema} - ${getSelectedTemaData()?.nombre}` : 'Seleccionar Tema'}
          {!isReserved && (openTemaAccordion ? ' ▲' : ' ▼')}
        </button>

        {openTemaAccordion && !isReserved && (
          <div>
            {temas.map((tema) => (
              <div key={tema.id_tema} onClick={() => handleTemaSelect(tema)}>
                <strong>{tema.id_tema}</strong> - {tema.nombre} (Caja: {tema.caja})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acordeón de Subtemas */}
      {selectedTema && (
        <div>
          <button 
            onClick={() => !isReserved && setOpenSubtemaAccordion(!openSubtemaAccordion)}
            disabled={isReserved}
          >
            {selectedSubtema ? `Subtema: ${selectedSubtema} - ${getSelectedSubtemaData()?.nombre}` : 'Seleccionar Subtema'}
            {!isReserved && (openSubtemaAccordion ? ' ▲' : ' ▼')}
          </button>

          {openSubtemaAccordion && !isReserved && (
            <div>
              {subtemas.map((subtema) => (
                <div key={`${subtema.id_tema}-${subtema.id_subtema}`} onClick={() => handleSubtemaSelect(subtema)}>
                  <strong>{subtema.id_subtema}</strong> - {subtema.nombre}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resto del formulario solo visible después de reservar */}
      {isReserved && (
        <>
          {/* Acordeón de Tinciones */}
          <div>
            <button onClick={() => setOpenTincionAccordion(!openTincionAccordion)}>
              {selectedTincion ? `Tinción: ${getSelectedTincionData()?.nombre}` : 'Seleccionar Tinción'}
              {openTincionAccordion ? ' ▲' : ' ▼'}
            </button>

            {openTincionAccordion && (
              <div>
                <h5>Tinciones Normales</h5>
                {tinciones.filter(t => t.tipo === 'normal').map((tincion) => (
                  <div key={tincion.id_tincion} onClick={() => handleTincionSelect(tincion)}>
                    <strong>ID: {tincion.id_tincion}</strong> - {tincion.nombre}
                  </div>
                ))}

                <h5>Tinciones Especiales</h5>
                {tinciones.filter(t => t.tipo === 'especial').map((tincion) => (
                  <div key={tincion.id_tincion} onClick={() => handleTincionSelect(tincion)}>
                    <strong>ID: {tincion.id_tincion}</strong> - {tincion.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acordeón de Estado */}
          <div>
            <button onClick={() => setOpenEstadoAccordion(!openEstadoAccordion)}>
              {selectedEstado ? `Estado: ${selectedEstado}` : 'Seleccionar Estado'}
              {openEstadoAccordion ? ' ▲' : ' ▼'}
            </button>

            {openEstadoAccordion && (
              <div>
                {estadosPlaca.map((estado) => (
                  <div key={estado} onClick={() => handleEstadoSelect(estado)}>
                    {estado}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campos editables */}
          <div>
            <label>ID Visual:</label>
            <input 
              type="text" 
              value={`${selectedTema}-${selectedSubtema}-`} 
              disabled 
            />
            <input 
              type="number" 
              min="1" 
              max="999"
              value={idVisualNumber}
              onChange={handleIdVisualNumberChange}
              placeholder="001"
            />
          </div>

          <div>
            <label>Caja:</label>
            <input 
              type="number" 
              value={caja}
              onChange={(e) => setCaja(e.target.value)}
            />
          </div>

          <div>
            <label>Observaciones:</label>
            <textarea 
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows="3"
              placeholder="Observaciones opcionales..."
            />
          </div>

          <div>
            <label>Imagen Macro (opcional):</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageMacroChange}
            />
            {imagenMacro && <p>Archivo seleccionado: {imagenMacro.name}</p>}
          </div>

          <div>
            <label>Imágenes Microscópicas (máximo 10):</label>
            <input 
              type="file" 
              accept="image/*"
              multiple
              onChange={handleImagenesMicroChange}
            />
            {imagenesMicro.length > 0 && (
              <p>Archivos seleccionados: {imagenesMicro.length}</p>
            )}
          </div>

          <button 
            onClick={handleSubmit}
            disabled={saving || !selectedTincion || !selectedEstado}
          >
            {saving ? 'Guardando...' : 'Crear Placa'}
          </button>
        </>
      )}
    </div>
  );
};

export default CreatePlate;