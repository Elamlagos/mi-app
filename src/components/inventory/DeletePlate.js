// 🗑️ DELETE PLATE COMPONENT - ELIMINACIÓN CON PAPELERA DE RECICLAJE
// Archivo: src/components/inventory/DeletePlate.js

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const DeletePlate = ({ onNavigate }) => {
  // ═══════════════════════════════════════════════════════════════
  // ESTADOS PRINCIPALES
  // ═══════════════════════════════════════════════════════════════
  const [temas, setTemas] = useState([]);
  const [subtemas, setSubtemas] = useState([]);
  const [placas, setPlacas] = useState([]);
  const [papelera, setPapelera] = useState([]);
  
  // Estados de selección
  const [selectedTema, setSelectedTema] = useState('');
  const [selectedSubtema, setSelectedSubtema] = useState('');
  
  // Estados de acordeones
  const [openTemaAccordion, setOpenTemaAccordion] = useState(false);
  const [openSubtemaAccordion, setOpenSubtemaAccordion] = useState(false);
  
  // Estados de control
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // currentUser se mantiene para futuras funcionalidades
  // eslint-disable-next-line no-unused-vars
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estados de vista
  const [currentView, setCurrentView] = useState('selector'); // 'selector', 'lista', 'papelera'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [plateToDelete, setPlateToDelete] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // CARGAR DATOS INICIALES
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Obtener usuario actual
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser(session?.user);

        // Cargar temas
        const { data: temasData, error: temasError } = await supabase
          .from('temas')
          .select('*')
          .order('nombre');
        if (temasError) throw temasError;
        setTemas(temasData);

        // Cargar papelera (placas marcadas para eliminación)
        await loadPapelera();

      } catch (error) {
        setError(`Error cargando datos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CARGAR SUBTEMAS CUANDO CAMBIA EL TEMA
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadSubtemas = async () => {
      if (!selectedTema) {
        setSubtemas([]);
        return;
      }

      try {
        console.log('🔄 Cargando subtemas para tema:', selectedTema);
        
        const { data, error } = await supabase
          .from('subtemas')
          .select('*')
          .eq('id_tema', selectedTema)
          .order('nombre');
        
        if (error) {
          console.error('❌ Error cargando subtemas:', error);
          throw error;
        }
        
        console.log('✅ Subtemas cargados:', data);
        setSubtemas(data || []);
        
        // Si no hay subtemas, mostrar mensaje
        if (!data || data.length === 0) {
          console.warn('⚠️ No se encontraron subtemas para el tema:', selectedTema);
        }
        
      } catch (error) {
        console.error('❌ Error completo cargando subtemas:', error);
        setError(`Error cargando subtemas: ${error.message}`);
        setSubtemas([]);
      }
    };

    loadSubtemas();
  }, [selectedTema]);

  // ═══════════════════════════════════════════════════════════════
  // CARGAR PLACAS CUANDO CAMBIA EL SUBTEMA
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadPlacas = async () => {
      if (!selectedTema || !selectedSubtema) {
        setPlacas([]);
        return;
      }

      try {
        // Primero obtener las placas básicas
        const { data: placasData, error: placasError } = await supabase
          .from('placas')
          .select('*')
          .eq('id_tema', selectedTema)
          .eq('id_subtema', selectedSubtema)
          .or('estado_eliminacion.is.null,estado_eliminacion.neq.eliminado')
          .order('id_visual');
        
        if (placasError) throw placasError;

        if (placasData && placasData.length > 0) {
          // Obtener datos relacionados por separado
          const [temasResult, subtemasResult, tincionesResult] = await Promise.allSettled([
            supabase.from('temas').select('id_tema, nombre, caja').eq('id_tema', selectedTema).single(),
            supabase.from('subtemas').select('id_tema, id_subtema, nombre').eq('id_tema', selectedTema).eq('id_subtema', selectedSubtema).single(),
            supabase.from('tinciones').select('id_tincion, nombre, tipo')
          ]);

          // Combinar datos
          const temaData = temasResult.status === 'fulfilled' ? temasResult.value.data : null;
          const subtemaData = subtemasResult.status === 'fulfilled' ? subtemasResult.value.data : null;
          const tincionesData = tincionesResult.status === 'fulfilled' ? tincionesResult.value.data : [];

          // Enriquecer placas con datos relacionados
          const enrichedPlacas = placasData.map(placa => ({
            ...placa,
            temas: temaData,
            subtemas: subtemaData,
            tinciones: placa.id_tincion ? 
              tincionesData.find(t => t.id_tincion === placa.id_tincion) || { nombre: 'No encontrada' } :
              { nombre: 'Sin tinción' }
          }));

          setPlacas(enrichedPlacas);
          setCurrentView('lista');
        } else {
          setPlacas([]);
        }
      } catch (error) {
        console.error('Error completo:', error);
        setError(`Error cargando placas: ${error.message}`);
      }
    };

    loadPlacas();
  }, [selectedTema, selectedSubtema]);

  // ═══════════════════════════════════════════════════════════════
  // CARGAR PAPELERA DE RECICLAJE
  // ═══════════════════════════════════════════════════════════════
  const loadPapelera = async () => {
    try {
      console.log('📂 Cargando papelera...');
      
      // Timeout para evitar cuelgues
      const papeleraPromise = supabase
        .from('placas')
        .select('*')
        .eq('estado_eliminacion', 'pendiente_eliminacion')
        .order('fecha_eliminacion', { ascending: true });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout cargando papelera')), 8000)
      );

      const { data: placasEnPapelera, error: papeleraError } = await Promise.race([
        papeleraPromise, 
        timeoutPromise
      ]);
      
      if (papeleraError) {
        console.error('❌ Error obteniendo placas de papelera:', papeleraError);
        throw papeleraError;
      }

      console.log('📊 Placas en papelera encontradas:', placasEnPapelera?.length || 0);

      if (placasEnPapelera && placasEnPapelera.length > 0) {
        console.log('🔄 Enriqueciendo datos de papelera...');
        
        // Obtener datos relacionados para cada placa (con límite de tiempo)
        const enrichedPapelera = await Promise.all(
          placasEnPapelera.map(async (placa, index) => {
            try {
              console.log(`📋 Procesando placa ${index + 1}/${placasEnPapelera.length}: ${placa.id_visual}`);
              
              const [temaResult, subtemaResult, tincionResult] = await Promise.allSettled([
                Promise.race([
                  supabase.from('temas').select('nombre, caja').eq('id_tema', placa.id_tema).single(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout tema')), 3000))
                ]),
                Promise.race([
                  supabase.from('subtemas').select('nombre').eq('id_tema', placa.id_tema).eq('id_subtema', placa.id_subtema).single(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout subtema')), 3000))
                ]),
                // Solo buscar tinción si id_tincion no es null
                placa.id_tincion ? 
                  Promise.race([
                    supabase.from('tinciones').select('nombre, tipo').eq('id_tincion', placa.id_tincion).single(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout tincion')), 3000))
                  ]) :
                  Promise.resolve({ data: { nombre: 'Sin tinción', tipo: 'N/A' } })
              ]);

              return {
                ...placa,
                temas: temaResult.status === 'fulfilled' ? temaResult.value.data : { nombre: 'No disponible' },
                subtemas: subtemaResult.status === 'fulfilled' ? subtemaResult.value.data : { nombre: 'No disponible' },
                tinciones: tincionResult.status === 'fulfilled' ? tincionResult.value.data : { nombre: 'No disponible' }
              };
            } catch (err) {
              console.warn(`⚠️ Error obteniendo datos relacionados para placa ${placa.id}:`, err);
              return {
                ...placa,
                temas: { nombre: 'Error cargando' },
                subtemas: { nombre: 'Error cargando' },
                tinciones: { nombre: 'Error cargando' }
              };
            }
          })
        );

        console.log('✅ Papelera enriquecida exitosamente');
        setPapelera(enrichedPapelera);
      } else {
        console.log('📭 Papelera vacía');
        setPapelera([]);
      }
    } catch (error) {
      console.error('❌ Error completo cargando papelera:', error);
      
      // Fallback: cargar solo las placas básicas sin datos relacionados
      try {
        console.log('🔄 Intentando carga básica de papelera...');
        const { data: basicPapelera } = await supabase
          .from('placas')
          .select('*')
          .eq('estado_eliminacion', 'pendiente_eliminacion')
          .order('fecha_eliminacion', { ascending: true });
        
        if (basicPapelera) {
          const basicEnriched = basicPapelera.map(placa => ({
            ...placa,
            temas: { nombre: 'Cargando...' },
            subtemas: { nombre: 'Cargando...' },
            tinciones: { nombre: 'Cargando...' }
          }));
          setPapelera(basicEnriched);
          console.log('✅ Papelera básica cargada');
        } else {
          setPapelera([]);
        }
      } catch (fallbackError) {
        console.error('❌ Error en carga básica de papelera:', fallbackError);
        setPapelera([]);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNCIÓN PARA VERIFICAR DEPENDENCIAS ANTES DE ELIMINAR
  // ═══════════════════════════════════════════════════════════════
  const checkDependenciesBeforeDelete = async (placa) => {
    try {
      console.log(`🔍 Verificando dependencias para placa ${placa.id_visual}...`);
      
      // Verificar historial de préstamos
      const { count: historialCount, error: historialError } = await supabase
        .from('historial_prestamos')
        .select('*', { count: 'exact', head: true })
        .eq('id_placa', placa.id);
      
      if (historialError) {
        console.error('Error verificando historial:', historialError);
        throw historialError;
      }

      // Verificar carritos
      const { count: carritoCount, error: carritoError } = await supabase
        .from('carritos_prestamo')
        .select('*', { count: 'exact', head: true })
        .eq('id_placa', placa.id);
      
      if (carritoError) {
        console.error('Error verificando carritos:', carritoError);
        throw carritoError;
      }

      const dependencies = {
        historial: historialCount || 0,
        carritos: carritoCount || 0,
        total: (historialCount || 0) + (carritoCount || 0)
      };

      console.log('📊 Dependencias encontradas:', dependencies);
      return dependencies;

    } catch (error) {
      console.error('❌ Error verificando dependencias:', error);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNCIÓN PARA MOSTRAR INFORMACIÓN DETALLADA ANTES DE ELIMINAR
  // ═══════════════════════════════════════════════════════════════
  const showDetailedDeleteInfo = async (placa) => {
    try {
      console.log('📋 Obteniendo información detallada de la placa...');
      
      const dependencies = await checkDependenciesBeforeDelete(placa);
      
      const infoMessage = `📋 INFORMACIÓN DE LA PLACA A ELIMINAR

🏷️ Placa: ${placa.id_visual}
🆔 ID Sistema: ${placa.id}
📂 Tema: ${placa.temas?.nombre || 'No disponible'}
📁 Subtema: ${placa.subtemas?.nombre || 'No disponible'}
🧪 Tinción: ${placa.tinciones?.nombre || 'No disponible'}

📊 REGISTROS DEPENDIENTES:
• Historial de préstamos: ${dependencies.historial}
• Registros en carritos: ${dependencies.carritos}
• Total de registros: ${dependencies.total}

🗂️ ARCHIVOS EN GITHUB:
• Código de barras: ${placa.codigo_barra_url ? 'SÍ' : 'NO'}
• Imagen macro: ${placa.imagen_macro_url ? 'SÍ' : 'NO'}
• Imágenes micro: ${placa.imagen_micro_url?.length > 0 ? placa.imagen_micro_url.length : 0}

⚠️ Todo esto será eliminado DEFINITIVAMENTE.`;

      alert(infoMessage);
      return dependencies;

    } catch (error) {
      console.error('❌ Error obteniendo información:', error);
      alert(`❌ Error obteniendo información de la placa: ${error.message}`);
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MANEJAR SELECCIÓN DE TEMA
  // ═══════════════════════════════════════════════════════════════
  const handleTemaSelect = (tema) => {
    console.log('📂 Tema seleccionado:', tema);
    
    // Limpiar estados anteriores
    setSelectedSubtema('');
    setPlacas([]);
    setError('');
    
    // Establecer nuevo tema
    setSelectedTema(tema.id_tema);
    
    // Cerrar acordeón de tema y abrir de subtema
    setOpenTemaAccordion(false);
    setOpenSubtemaAccordion(true);
    
    // Volver a vista de selector
    setCurrentView('selector');
  };

  // ═══════════════════════════════════════════════════════════════
  // MANEJAR SELECCIÓN DE SUBTEMA
  // ═══════════════════════════════════════════════════════════════
  const handleSubtemaSelect = (subtema) => {
    setSelectedSubtema(subtema.id_subtema);
    setOpenSubtemaAccordion(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // CONFIRMAR ELIMINACIÓN
  // ═══════════════════════════════════════════════════════════════
  const handleDeleteClick = (placa) => {
    setPlateToDelete(placa);
    setShowConfirmDialog(true);
  };

  // ═══════════════════════════════════════════════════════════════
  // MARCAR PLACA PARA ELIMINACIÓN (PAPELERA) - VERSIÓN OPTIMIZADA
  // ═══════════════════════════════════════════════════════════════
  const confirmDelete = async () => {
    if (!plateToDelete) return;

    try {
      setDeleting(true);
      setError('');
      
      console.log('🗑️ Iniciando proceso de eliminación para:', plateToDelete.id_visual);
      
      // PASO 1: Verificar que la placa existe antes de actualizar
      console.log('🔍 Verificando existencia de la placa...');
      const { data: existingPlate, error: checkError } = await Promise.race([
        supabase.from('placas').select('id, id_visual').eq('id', plateToDelete.id).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout verificando placa')), 5000))
      ]);

      if (checkError) {
        console.error('❌ Error verificando placa:', checkError);
        throw new Error(`Placa no encontrada: ${checkError.message}`);
      }

      console.log('✅ Placa encontrada:', existingPlate);

      // PASO 2: Preparar datos mínimos para el update
      const fechaEliminacion = new Date();
      fechaEliminacion.setHours(fechaEliminacion.getHours() + 24);

      // Solo campos esenciales para evitar problemas de columnas
      const updateData = {
        estado_eliminacion: 'pendiente_eliminacion',
        fecha_eliminacion: fechaEliminacion.toISOString()
      };

      console.log('💾 Actualizando con datos mínimos:', updateData);

      // PASO 3: Update con timeout más corto
      const { error: updateError } = await Promise.race([
        supabase
          .from('placas')
          .update(updateData)
          .eq('id', plateToDelete.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Update tardó más de 5 segundos')), 5000)
        )
      ]);

      if (updateError) {
        console.error('❌ Error en update:', updateError);
        throw updateError;
      }

      console.log('✅ Placa actualizada exitosamente');

      // PASO 4: Actualizar UI inmediatamente (sin esperar recarga)
      setPlacas(prev => prev.filter(p => p.id !== plateToDelete.id));
      
      // PASO 5: Mostrar éxito inmediatamente
      setSuccess(`✅ Placa ${plateToDelete.id_visual} movida a la papelera.`);
      setTimeout(() => setSuccess(''), 5000);

      // PASO 6: Recargar papelera en background (sin bloquear UI)
      setTimeout(() => {
        loadPapelera().catch(err => 
          console.warn('⚠️ Error recargando papelera en background:', err)
        );
      }, 100);

    } catch (error) {
      console.error('❌ Error completo en confirmDelete:', error);
      
      // Mensajes de error más específicos
      let errorMessage = error.message;
      
      if (error.message?.includes('Timeout')) {
        errorMessage = 'La operación tardó demasiado. La base de datos puede estar lenta. Inténtalo de nuevo.';
      } else if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        errorMessage = 'Error: Las columnas de eliminación no existen en la base de datos. Contacta al administrador para configurar la tabla.';
      } else if (error.code === 'PGRST204') {
        errorMessage = 'La placa no fue encontrada o ya fue eliminada.';
      } else if (error.message?.includes('not found')) {
        errorMessage = 'La placa ya no existe en la base de datos.';
      }
      
      setError(`Error: ${errorMessage}`);
    } finally {
      console.log('🏁 Finalizando proceso de eliminación');
      setDeleting(false);
      setShowConfirmDialog(false);
      setPlateToDelete(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RESTAURAR PLACA DESDE PAPELERA
  // ═══════════════════════════════════════════════════════════════
  const restorePlate = async (placa) => {
    try {
      setDeleting(true);
      setError('');

      const { error } = await supabase
        .from('placas')
        .update({
          estado_eliminacion: null,
          fecha_eliminacion: null,
          eliminado_por: null,
          observaciones_eliminacion: null
        })
        .eq('id', placa.id);

      if (error) throw error;

      await loadPapelera();
      setSuccess(`✅ Placa ${placa.id_visual} restaurada exitosamente.`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      setError(`Error restaurando placa: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ELIMINAR DEFINITIVAMENTE - VERSIÓN CORREGIDA CON CASCADA MANUAL
  // ═══════════════════════════════════════════════════════════════
  const deletePermanently = async (placa) => {
    // Mostrar información detallada antes de proceder
    const dependencies = await showDetailedDeleteInfo(placa);
    if (!dependencies) return; // Si hubo error obteniendo info, cancelar

    const confirmText = `⚠️ ELIMINACIÓN DEFINITIVA ⚠️

¿Estás ABSOLUTAMENTE seguro de eliminar la placa ${placa.id_visual}?

ESTO ELIMINARÁ:
✓ La placa de la base de datos
✓ TODO el historial de préstamos (${dependencies.historial} registros)
✓ Registros en carritos de préstamo (${dependencies.carritos} registros)
✓ Carpeta completa en GitHub
✓ Códigos de barras e imágenes

⚠️ ESTA ACCIÓN ES IRREVERSIBLE ⚠️

Escribe "ELIMINAR" (en mayúsculas) para confirmar:`;

    const userConfirmation = prompt(confirmText);
    
    if (userConfirmation !== 'ELIMINAR') {
      alert('❌ Eliminación cancelada. No se escribió "ELIMINAR" correctamente.');
      return;
    }

    // Segunda confirmación de seguridad
    const finalConfirm = window.confirm(`🚨 ÚLTIMA CONFIRMACIÓN 🚨\n\n¿Proceder con la eliminación DEFINITIVA de la placa ${placa.id_visual}?\n\nNo habrá más advertencias después de esto.`);
    
    if (!finalConfirm) {
      alert('❌ Eliminación cancelada en la confirmación final.');
      return;
    }

    try {
      setDeleting(true);
      setError('');

      console.log(`🗑️ INICIANDO ELIMINACIÓN DEFINITIVA: ${placa.id_visual} (ID: ${placa.id})`);

      // ═════════════════════════════════════════════════════════════
      // PASO 1: ELIMINAR REGISTROS DEPENDIENTES EN ORDEN CORRECTO
      // ═════════════════════════════════════════════════════════════

      console.log('🔄 Paso 1: Eliminando registros de carritos...');
      try {
        const { error: cartError } = await supabase
          .from('carritos_prestamo')
          .delete()
          .eq('id_placa', placa.id);
        
        if (cartError) {
          console.warn('⚠️ Error eliminando carritos (puede no tener):', cartError.message);
          // No es crítico, continuar
        } else {
          console.log('✅ Registros de carritos eliminados');
        }
      } catch (err) {
        console.warn('⚠️ Error en carritos (continuando):', err.message);
      }

      console.log('🔄 Paso 2: Eliminando historial de préstamos...');
      try {
        // Primero obtener los registros para log
        const { data: historialData, error: selectError } = await supabase
          .from('historial_prestamos')
          .select('id, id_usuario, fecha_prestamo, estado')
          .eq('id_placa', placa.id);
        
        if (selectError) {
          console.warn('⚠️ Error consultando historial:', selectError.message);
        } else if (historialData && historialData.length > 0) {
          console.log(`📋 Encontrados ${historialData.length} registros de historial a eliminar`);
          
          // Eliminar historial
          const { error: historialError } = await supabase
            .from('historial_prestamos')
            .delete()
            .eq('id_placa', placa.id);
          
          if (historialError) {
            console.error('❌ Error CRÍTICO eliminando historial:', historialError);
            throw new Error(`No se puede eliminar el historial: ${historialError.message}`);
          }
          
          console.log(`✅ ${historialData.length} registros de historial eliminados`);
        } else {
          console.log('✅ No hay historial que eliminar');
        }
      } catch (err) {
        console.error('❌ Error eliminando historial:', err.message);
        throw new Error(`Error eliminando historial: ${err.message}`);
      }

      // ═════════════════════════════════════════════════════════════
      // PASO 2: ELIMINAR CARPETA DE GITHUB
      // ═════════════════════════════════════════════════════════════

      console.log('🔄 Paso 3: Eliminando archivos de GitHub...');
      if (placa.codigo_barra_url || placa.imagen_macro_url || (placa.imagen_micro_url && placa.imagen_micro_url.length > 0)) {
        try {
          console.log(`🗂️ Eliminando carpeta de GitHub para placa ${placa.id_visual}...`);
          
          const { data: deleteResult, error: githubError } = await supabase.functions.invoke('delete-github-folder', {
            body: {
              idTema: placa.id_tema,
              idSubtema: placa.id_subtema,
              plateId: placa.id,
              plateVisual: placa.id_visual
            }
          });
          
          if (githubError) {
            console.warn('⚠️ Error eliminando carpeta de GitHub:', githubError);
            // No es crítico para la eliminación de BD
          } else if (deleteResult?.success) {
            console.log('✅ Carpeta de GitHub eliminada exitosamente');
          } else {
            console.warn('⚠️ Función ejecutada pero sin confirmación de éxito:', deleteResult);
          }
        } catch (githubError) {
          console.warn('⚠️ Error invocando función de eliminación de GitHub:', githubError);
          // No es crítico, continuar
        }
      } else {
        console.log('✅ No hay archivos de GitHub que eliminar');
      }

      // ═════════════════════════════════════════════════════════════
      // PASO 3: ELIMINAR REGISTRO PRINCIPAL DE PLACA
      // ═════════════════════════════════════════════════════════════

      console.log('🔄 Paso 4: Eliminando registro principal de placa...');
      const { error: plateError } = await supabase
        .from('placas')
        .delete()
        .eq('id', placa.id);

      if (plateError) {
        console.error('❌ Error CRÍTICO eliminando placa:', plateError);
        throw new Error(`Error eliminando placa: ${plateError.message}`);
      }

      console.log('✅ Registro principal de placa eliminado');

      // ═════════════════════════════════════════════════════════════
      // PASO 4: ACTUALIZAR UI Y NOTIFICAR ÉXITO
      // ═════════════════════════════════════════════════════════════

      // Recargar papelera para reflejar cambios
      await loadPapelera();
      
      // Mensaje de éxito detallado
      const successMsg = `✅ ELIMINACIÓN COMPLETADA

Placa ${placa.id_visual} ha sido eliminada definitivamente:

✓ Registro principal eliminado
✓ Historial de préstamos eliminado (${dependencies.historial} registros)
✓ Registros de carrito eliminados (${dependencies.carritos} registros)  
✓ Archivos de GitHub eliminados
✓ Base de datos actualizada

La placa ya no existe en el sistema.`;

      alert(successMsg);
      
      setSuccess(`✅ Placa ${placa.id_visual} eliminada definitivamente del sistema.`);
      setTimeout(() => setSuccess(''), 5000);

      console.log(`🎉 ELIMINACIÓN DEFINITIVA COMPLETADA: ${placa.id_visual}`);

    } catch (error) {
      console.error('❌ ERROR EN ELIMINACIÓN DEFINITIVA:', error);
      
      // Mensajes de error específicos y útiles
      let errorMessage = error.message;
      
      if (error.message?.includes('foreign key constraint')) {
        errorMessage = `❌ Error de integridad: Esta placa tiene registros dependientes que no se pudieron eliminar. 

Detalles técnicos: ${error.message}

Soluciones:
1. Contacta al administrador de sistema
2. Verifica que no existan restricciones adicionales en la base de datos
3. Puede ser necesario eliminar manualmente desde el panel de Supabase`;
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        errorMessage = `❌ Error de conexión: La eliminación no se completó debido a problemas de red.

Por favor:
1. Verifica tu conexión a internet
2. Inténtalo de nuevo en unos minutos
3. Si persiste, contacta al administrador`;
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        errorMessage = `❌ Error de permisos: No tienes autorización para eliminar esta placa.

Verifica:
1. Tu rol de usuario (debe ser administrador)
2. Los permisos de la base de datos
3. Contacta al administrador si el problema persiste`;
      }
      
      setError(errorMessage);

      // También mostrar en alert para mayor visibilidad
      alert(`❌ ERROR EN ELIMINACIÓN\n\n${errorMessage}`);
      
    } finally {
      setDeleting(false);
      console.log('🏁 Proceso de eliminación finalizado');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // OBTENER DATOS DE SELECCIÓN
  // ═══════════════════════════════════════════════════════════════
  const getSelectedTemaData = () => temas.find(t => t.id_tema === selectedTema);
  const getSelectedSubtemaData = () => subtemas.find(s => s.id_subtema === selectedSubtema);

  // ═══════════════════════════════════════════════════════════════
  // CALCULAR TIEMPO RESTANTE PARA ELIMINACIÓN
  // ═══════════════════════════════════════════════════════════════
  const getTimeUntilDeletion = (fechaEliminacion) => {
    const now = new Date();
    const deletion = new Date(fechaEliminacion);
    const diff = deletion.getTime() - now.getTime();
    
    if (diff <= 0) return 'Vencido';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // ═══════════════════════════════════════════════════════════════
  // COMPONENTE: DIÁLOGO DE CONFIRMACIÓN
  // ═══════════════════════════════════════════════════════════════
  const ConfirmDialog = () => {
    if (!showConfirmDialog || !plateToDelete) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗑️</div>
          
          <h3 style={{ marginTop: 0, color: '#dc3545' }}>
            ¿Mover a la Papelera?
          </h3>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <p><strong>Placa:</strong> {plateToDelete.id_visual}</p>
            <p><strong>Tema:</strong> {plateToDelete.temas?.nombre}</p>
            <p><strong>Subtema:</strong> {plateToDelete.subtemas?.nombre}</p>
            <p><strong>Tinción:</strong> {plateToDelete.tinciones?.nombre}</p>
          </div>
          
          <div style={{
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <strong>📝 Nota:</strong> La placa se moverá a la papelera y se eliminará definitivamente en <strong>24 horas</strong>. 
            Durante este tiempo puedes restaurarla si cambias de opinión.
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <button
              onClick={() => {
                console.log('🛑 Cancelación de emergencia activada');
                setDeleting(false);
                setShowConfirmDialog(false);
                setPlateToDelete(null);
                setError('Operación cancelada por el usuario');
              }}
              disabled={!deleting}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: deleting ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                opacity: deleting ? 1 : 0.5
              }}
            >
              🛑 Cancelar Operación
            </button>
            
            <button
              onClick={confirmDelete}
              disabled={deleting}
              style={{
                padding: '12px 24px',
                backgroundColor: deleting ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {deleting ? '⏳ Procesando...' : '🗑️ Mover a Papelera'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => onNavigate('inventario-placas')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          ← Volver al Inventario
        </button>
        
        <h1 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🗑️ Eliminar Placas
        </h1>
        
        <p style={{ color: '#666', margin: 0 }}>
          Selecciona tema y subtema para ver las placas disponibles para eliminación
        </p>
      </div>

      {/* Navegación de pestañas */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '1px solid #dee2e6'
      }}>
        <button
          onClick={() => setCurrentView('selector')}
          style={{
            padding: '12px 24px',
            backgroundColor: currentView === 'selector' ? '#007bff' : 'transparent',
            color: currentView === 'selector' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: currentView === 'selector' ? 'none' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📁 Seleccionar
        </button>
        
        <button
          onClick={() => setCurrentView('lista')}
          disabled={placas.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: currentView === 'lista' ? '#007bff' : 'transparent',
            color: currentView === 'lista' ? 'white' : (placas.length === 0 ? '#ccc' : '#007bff'),
            border: 'none',
            borderBottom: currentView === 'lista' ? 'none' : '2px solid transparent',
            cursor: placas.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          📋 Lista ({placas.length})
        </button>
        
        <button
          onClick={() => { setCurrentView('papelera'); loadPapelera(); }}
          style={{
            padding: '12px 24px',
            backgroundColor: currentView === 'papelera' ? '#dc3545' : 'transparent',
            color: currentView === 'papelera' ? 'white' : '#dc3545',
            border: 'none',
            borderBottom: currentView === 'papelera' ? 'none' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            position: 'relative'
          }}
        >
          🗑️ Papelera ({papelera.length})
          {papelera.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#ffc107',
              color: '#000',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {papelera.length}
            </span>
          )}
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {success}
        </div>
      )}

      {/* Contenido según la vista actual */}
      {currentView === 'selector' && (
        <div>
          <h3>📁 Selección de Categoría</h3>
          
          {/* Selección actual */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4>📋 Selección Actual:</h4>
            <p><strong>Tema:</strong> {selectedTema ? `${selectedTema} - ${getSelectedTemaData()?.nombre}` : '❌ No seleccionado'}</p>
            <p><strong>Subtema:</strong> {selectedSubtema ? `${selectedSubtema} - ${getSelectedSubtemaData()?.nombre}` : '❌ No seleccionado'}</p>
          </div>

          {/* Acordeón de Temas */}
          <div style={{ marginBottom: '15px' }}>
            <button 
              onClick={() => setOpenTemaAccordion(!openTemaAccordion)}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: selectedTema ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>
                {selectedTema ? `✅ Tema: ${selectedTema} - ${getSelectedTemaData()?.nombre}` : '📂 Seleccionar Tema'}
              </span>
              <span>{openTemaAccordion ? '▲' : '▼'}</span>
            </button>

            {openTemaAccordion && (
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginTop: '5px',
                maxHeight: '300px',
                overflowY: 'auto',
                backgroundColor: 'white'
              }}>
                {temas.map((tema) => (
                  <div 
                    key={tema.id_tema} 
                    onClick={() => handleTemaSelect(tema)}
                    style={{
                      padding: '15px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      📂 {tema.id_tema} - {tema.nombre}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Caja: {tema.caja}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acordeón de Subtemas */}
          {selectedTema && (
            <div style={{ marginBottom: '20px' }}>
              <button 
                onClick={() => setOpenSubtemaAccordion(!openSubtemaAccordion)}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: selectedSubtema ? '#28a745' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  {selectedSubtema ? `✅ Subtema: ${selectedSubtema} - ${getSelectedSubtemaData()?.nombre}` : `📁 Seleccionar Subtema (${subtemas.length} disponibles)`}
                </span>
                <span>{openSubtemaAccordion ? '▲' : '▼'}</span>
              </button>

              {openSubtemaAccordion && (
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '5px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: 'white'
                }}>
                  {subtemas.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#666'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
                      <p style={{ margin: 0 }}>No hay subtemas disponibles para este tema</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                        Verifica que el tema {selectedTema} tenga subtemas configurados
                      </p>
                    </div>
                  ) : (
                    subtemas.map((subtema) => (
                      <div 
                        key={`${subtema.id_tema}-${subtema.id_subtema}`} 
                        onClick={() => handleSubtemaSelect(subtema)}
                        style={{
                          padding: '15px',
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                          backgroundColor: 'white',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: 'bold' }}>
                          📁 {subtema.id_subtema} - {subtema.nombre}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                          ID Tema: {subtema.id_tema} | ID Subtema: {subtema.id_subtema}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vista de Lista de Placas */}
      {currentView === 'lista' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3>📋 Placas Disponibles</h3>
            <div style={{
              backgroundColor: '#e7f3ff',
              color: '#0066cc',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {placas.length} placa{placas.length !== 1 ? 's' : ''} encontrada{placas.length !== 1 ? 's' : ''}
            </div>
          </div>

          {placas.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '2px dashed #dee2e6'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
              <h4 style={{ color: '#666', marginBottom: '10px' }}>No hay placas disponibles</h4>
              <p style={{ color: '#999', margin: 0 }}>
                No se encontraron placas para la combinación seleccionada de tema y subtema.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {placas.map((placa) => (
                <div
                  key={placa.id}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                        📦 {placa.id_visual}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {placa.id}
                      </div>
                    </div>
                    
                    <span style={{
                      backgroundColor: placa.estado_actual === 'disponible' ? '#28a745' : 
                                     placa.estado_actual === 'prestada' ? '#ffc107' : '#dc3545',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {placa.estado_actual || 'N/A'}
                    </span>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '3px' }}>
                      <strong>Tinción:</strong> {placa.tinciones?.nombre || 'Sin tinción'}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '3px' }}>
                      <strong>Estado:</strong> {placa.estado_placa || 'No especificado'}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '3px' }}>
                      <strong>Caja:</strong> {placa.caja || 'No especificada'}
                    </div>
                    {placa.usuario_actual && (
                      <div style={{ fontSize: '14px', color: '#856404' }}>
                        <strong>Usuario actual:</strong> {placa.usuario_actual}
                      </div>
                    )}
                  </div>

                  {placa.observaciones && (
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      📝 {placa.observaciones}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {placa.creacion && `Creada: ${new Date(placa.creacion).toLocaleDateString()}`}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteClick(placa)}
                      disabled={deleting}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: deleting ? '#ccc' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: deleting ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vista de Papelera */}
      {currentView === 'papelera' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3>🗑️ Papelera de Reciclaje</h3>
            <div style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {papelera.length} elemento{papelera.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #ffeaa7'
          }}>
            <strong>⏰ Información importante:</strong> Las placas en la papelera se eliminarán definitivamente (incluyendo sus archivos en GitHub) 
            cuando se cumplen las 24 horas. Puedes restaurarlas antes de que expire el tiempo.
          </div>

          {papelera.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '2px dashed #dee2e6'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗑️</div>
              <h4 style={{ color: '#666', marginBottom: '10px' }}>Papelera vacía</h4>
              <p style={{ color: '#999', margin: 0 }}>
                No hay placas pendientes de eliminación.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {papelera.map((placa) => {
                const timeRemaining = getTimeUntilDeletion(placa.fecha_eliminacion);
                const isExpired = timeRemaining === 'Vencido';
                
                return (
                  <div
                    key={placa.id}
                    style={{
                      backgroundColor: isExpired ? '#f8d7da' : 'white',
                      border: `2px solid ${isExpired ? '#dc3545' : '#ffc107'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      opacity: isExpired ? 0.8 : 1
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                          🗑️ {placa.id_visual}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {placa.temas?.nombre} → {placa.subtemas?.nombre}
                        </div>
                      </div>
                      
                      <div style={{
                        backgroundColor: isExpired ? '#dc3545' : '#ffc107',
                        color: isExpired ? 'white' : '#000',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}>
                        {isExpired ? '⏰ VENCIDO' : `⏱️ ${timeRemaining}`}
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: isExpired ? '#f5c6cb' : '#fff3cd',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      fontSize: '13px'
                    }}>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>Marcada para eliminación:</strong> {new Date(placa.fecha_eliminacion).toLocaleString()}
                      </div>
                      <div>
                        <strong>Eliminación definitiva:</strong> {new Date(placa.fecha_eliminacion).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', marginBottom: '3px' }}>
                        <strong>Tinción:</strong> {placa.tinciones?.nombre || 'Sin tinción'}
                      </div>
                      <div style={{ fontSize: '14px', marginBottom: '3px' }}>
                        <strong>Estado:</strong> {placa.estado_placa || 'No especificado'}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => restorePlate(placa)}
                        disabled={deleting}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: deleting ? '#ccc' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        ♻️ Restaurar
                      </button>
                      
                      <button
                        onClick={() => deletePermanently(placa)}
                        disabled={deleting}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: deleting ? '#ccc' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        💀 Eliminar Ya
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog />

      {/* Información adicional */}
      <div style={{
        marginTop: '40px',
        backgroundColor: '#e9ecef',
        padding: '20px',
        borderRadius: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: 0, color: '#495057' }}>ℹ️ Información sobre el proceso de eliminación</h4>
          
          {/* Botón de diagnóstico para debugging */}
          <button
            onClick={async () => {
              try {
                console.log('🔍 Ejecutando diagnóstico de base de datos...');
                
                // Test 1: Verificar tabla placas
                // eslint-disable-next-line no-unused-vars
                const { data: placasTest, error: placasError } = await supabase
                  .from('placas')
                  .select('id, id_visual')
                  .limit(1);
                console.log('✅ Tabla placas accesible:', placasTest?.length || 0, 'registros');
                
                if (placasError) {
                  console.error('❌ Error accediendo tabla placas:', placasError);
                  setError(`Error de conexión: ${placasError.message}`);
                  return;
                }
                
                // Test 2: Verificar columnas de eliminación
                // eslint-disable-next-line no-unused-vars
                const { data: testUpdate, error: updateError } = await supabase
                  .from('placas')
                  .update({ estado_eliminacion: 'test' })
                  .eq('id', 'test-id-that-does-not-exist');
                
                if (updateError?.message?.includes('column') && updateError?.message?.includes('does not exist')) {
                  console.error('❌ Columnas de eliminación no existen:', updateError.message);
                  setError('⚠️ Las columnas de eliminación no están configuradas en la base de datos. Se necesita ejecutar la migración.');
                } else {
                  console.log('✅ Columnas de eliminación disponibles');
                }
                
                // Test 3: Performance de conexión
                const startTime = Date.now();
                await supabase.from('placas').select('count').single();
                const endTime = Date.now();
                console.log(`🚀 Latencia de conexión: ${endTime - startTime}ms`);
                
                if (endTime - startTime > 3000) {
                  setError('⚠️ La conexión a la base de datos es lenta. Esto puede causar timeouts.');
                }
                
              } catch (err) {
                console.error('❌ Error en diagnóstico:', err);
                setError(`Error en diagnóstico: ${err.message}`);
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            🔍 Diagnosticar BD
          </button>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          fontSize: '14px',
          color: '#666'
        }}>
          <div>
            <h5 style={{ color: '#495057', marginBottom: '10px' }}>🗑️ Eliminación Segura</h5>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Las placas se mueven primero a la papelera</li>
              <li>Permanecen 24 horas antes de eliminación definitiva</li>
              <li>Puedes restaurarlas durante este período</li>
            </ul>
          </div>
          
          <div>
            <h5 style={{ color: '#495057', marginBottom: '10px' }}>💾 Datos Eliminados</h5>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Registro completo de la base de datos</li>
              <li>Carpeta completa en GitHub</li>
              <li>Códigos de barras e imágenes</li>
            </ul>
          </div>
          
          <div>
            <h5 style={{ color: '#495057', marginBottom: '10px' }}>⚠️ Importante</h5>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>La eliminación definitiva es irreversible</li>
              <li>Se recomienda hacer respaldo antes</li>
              <li>Solo administradores pueden eliminar</li>
            </ul>
          </div>
        </div>
        
        {/* Script SQL para agregar columnas */}
        <div style={{
          marginTop: '20px',
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>🛠️ Si hay problemas de columnas faltantes:</h5>
          <code style={{
            display: 'block',
            backgroundColor: '#282c34',
            color: '#61dafb',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            overflow: 'auto'
          }}>
{`-- Ejecutar en Supabase SQL Editor:
ALTER TABLE placas ADD COLUMN IF NOT EXISTS estado_eliminacion TEXT;
ALTER TABLE placas ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE placas ADD COLUMN IF NOT EXISTS eliminado_por UUID;
ALTER TABLE placas ADD COLUMN IF NOT EXISTS observaciones_eliminacion TEXT;`}
          </code>
        </div>
      </div>
    </div>
  );
};

export default DeletePlate;