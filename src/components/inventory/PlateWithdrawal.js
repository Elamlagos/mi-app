// 🔄 FUNCIÓN handleCodeScanned CON LOCK
// Reemplaza SOLO esta función en PlateWithdrawal.js (línea ~55)

// 🆕 AGREGAR ESTE ESTADO AL INICIO DEL COMPONENTE (línea ~18)
const [isProcessing, setIsProcessing] = useState(false);

// 🔄 FUNCIÓN MODIFICADA handleCodeScanned (línea ~55)
const handleCodeScanned = async (code) => {
  // 🔒 LOCK: Evitar escaneos múltiples
  if (isProcessing) {
    console.log('⏸️ Ignorando escaneo - ya procesando:', code);
    return;
  }

  try {
    setIsProcessing(true); // 🔒 Activar lock
    setLoading(true);
    setError('');
    setScannedCode(code);
    setIsScanning(false);
    
    console.log('🔍 Procesando código:', code);
    
    // 🆕 MODO CARRITO
    if (cartMode && currentUser) {
      try {
        // Limpiar errores anteriores del carrito
        if (setCartError) setCartError('');
        
        const result = await addToCart(code);
        
        console.log('✅ Placa agregada al carrito:', result);
        
        // Limpiar la vista de placa individual cuando se agrega al carrito
        setPlateData(null);
        
        // ✅ Mostrar mensaje de éxito
        console.log(`✅ ${result.plate?.id_visual || 'Placa'} agregada al carrito`);
        
        return;
        
      } catch (cartError) {
        console.error('❌ Error agregando al carrito:', cartError);
        setError(`❌ ${cartError.message}`);
        setPlateData(null);
        return;
      }
    }
    
    // MODO ACTUAL: Búsqueda directa (MANTENER IGUAL - NO MODIFICAR)
    const { data: plate, error: plateError } = await supabase
      .from('placas')
      .select('*')
      .eq('codigo_barra_txt', code)
      .maybeSingle();
    
    if (plateError) {
      console.error('Error buscando placa:', plateError);
      setError(`Error en base de datos: ${plateError.message}`);
      setPlateData(null);
      return;
    }
    
    if (!plate) {
      setError(`No se encontró ninguna placa con el código: ${code}`);
      setPlateData(null);
      return;
    }
    
    console.log('✅ Placa encontrada:', plate);
    
    // Buscar datos relacionados en paralelo
    const [temaResult, subtemaResult, tincionResult] = await Promise.allSettled([
      supabase.from('temas').select('nombre, caja').eq('id_tema', plate.id_tema).maybeSingle(),
      supabase.from('subtemas').select('nombre').eq('id_tema', plate.id_tema).eq('id_subtema', plate.id_subtema).maybeSingle(),
      supabase.from('tinciones').select('nombre, tipo').eq('id_tincion', plate.id_tincion).maybeSingle()
    ]);
    
    // Procesar resultados con fallbacks
    const temaData = temaResult.status === 'fulfilled' && temaResult.value.data 
      ? temaResult.value.data 
      : { nombre: 'No disponible', caja: 'N/A' };
    
    const subtemaData = subtemaResult.status === 'fulfilled' && subtemaResult.value.data
      ? subtemaResult.value.data
      : { nombre: 'No disponible' };
    
    const tincionData = tincionResult.status === 'fulfilled' && tincionResult.value.data
      ? tincionResult.value.data
      : { nombre: 'No disponible', tipo: 'N/A' };
    
    // Combinar todos los datos
    const completeData = {
      ...plate,
      temas: temaData,
      subtemas: subtemaData,
      tinciones: tincionData
    };
    
    console.log('✅ Datos completos obtenidos');
    setPlateData(completeData);
    
  } catch (error) {
    console.error('Error procesando código:', error);
    setError(`Error: ${error.message}`);
    setPlateData(null);
  } finally {
    setLoading(false);
    setIsProcessing(false); // 🔓 Liberar lock
  }
};