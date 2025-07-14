// 🔍 VALIDATION SERVICE - VALIDACIONES CRÍTICAS DEL SISTEMA
// Archivo: src/services/validationService.js

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════
// CLASES DE ERROR PERSONALIZADAS
// ═══════════════════════════════════════════════════════════════

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class LimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LimitError';
  }
}

// ═══════════════════════════════════════════════════════════════
// SERVICIO PRINCIPAL DE VALIDACIONES
// ═══════════════════════════════════════════════════════════════

export const validationService = {
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALIDAR DISPONIBILIDAD DE PLACA (CRÍTICO PARA CONCURRENCIA)
  // └─────────────────────────────────────────────────────────────
  async validatePlateAvailability(plateId, excludeUserId = null) {
    console.log(`🔍 Validando disponibilidad de placa ${plateId}`);
    
    try {
      // 1. Verificar que la placa existe
      const { data: plate, error: plateError } = await supabase
        .from('placas')
        .select('id, estado_actual, usuario_actual, actividad, id_visual')
        .eq('id', plateId)
        .single();
      
      if (plateError || !plate) {
        throw new ValidationError(`Placa ${plateId} no encontrada en el sistema`);
      }
      
      console.log(`📋 Placa ${plate.id_visual}: estado_actual=${plate.estado_actual}, usuario_actual=${plate.usuario_actual}`);
      
      // 2. Verificar estado operacional
      if (plate.estado_actual !== 'disponible') {
        throw new ConflictError(`Placa ${plate.id_visual} no está disponible (estado: ${plate.estado_actual})`);
      }
      
      // 3. Verificar que no tenga usuario asignado
      if (plate.usuario_actual && plate.usuario_actual !== excludeUserId) {
        throw new ConflictError(`Placa ${plate.id_visual} ya está asignada a otro usuario`);
      }
      
      // 4. Verificar que no esté en carrito activo de otro usuario
      const { data: cartItem, error: cartError } = await supabase
        .from('carritos_prestamo')
        .select('id_usuario')
        .eq('id_placa', plateId)
        .eq('estado', 'activo')
        .gt('expira_en', new Date().toISOString())
        .maybeSingle();
      
      if (cartError) {
        console.error('Error verificando carrito:', cartError);
        throw new ValidationError('Error verificando disponibilidad en carrito');
      }
      
      if (cartItem && cartItem.id_usuario !== excludeUserId) {
        throw new ConflictError(`Placa ${plate.id_visual} está en el carrito de otro usuario`);
      }
      
      // 5. Verificar que no esté en historial activo de otro usuario
      const { data: activeHistory, error: historyError } = await supabase
        .from('historial_prestamos')
        .select('id_usuario')
        .eq('id_placa', plateId)
        .eq('estado', 'prestado')
        .maybeSingle();
      
      if (historyError) {
        console.error('Error verificando historial:', historyError);
        throw new ValidationError('Error verificando historial de préstamos');
      }
      
      if (activeHistory && activeHistory.id_usuario !== excludeUserId) {
        throw new ConflictError(`Placa ${plate.id_visual} ya está prestada a otro usuario`);
      }
      
      console.log(`✅ Placa ${plate.id_visual} disponible para préstamo`);
      return plate;
      
    } catch (error) {
      console.error(`❌ Error validando placa ${plateId}:`, error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALIDAR LÍMITES DE USUARIO
  // └─────────────────────────────────────────────────────────────
  async validateUserLimits(userId) {
    console.log(`📊 Validando límites para usuario ${userId}`);
    
    try {
      // Configuración por defecto (más tarde vendrá de tabla config)
      const config = {
        prestamo_max_placas_usuario: 100,
        carrito_max_placas: 20
      };
      
      // Contar placas prestadas actualmente
      const { count: activePlates, error: platesError } = await supabase
        .from('historial_prestamos')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', userId)
        .eq('estado', 'prestado');
      
      if (platesError) {
        throw new ValidationError('Error verificando placas prestadas');
      }
      
      if (config.prestamo_max_placas_usuario > 0 && activePlates >= config.prestamo_max_placas_usuario) {
        throw new LimitError(`Límite de placas prestadas alcanzado (${activePlates}/${config.prestamo_max_placas_usuario})`);
      }
      
      // Contar placas en carrito
      const { count: cartItems, error: cartError } = await supabase
        .from('carritos_prestamo')
        .select('*', { count: 'exact', head: true })
        .eq('id_usuario', userId)
        .eq('estado', 'activo')
        .gt('expira_en', new Date().toISOString());
      
      if (cartError) {
        throw new ValidationError('Error verificando carrito');
      }
      
      if (cartItems >= config.carrito_max_placas) {
        throw new LimitError(`Carrito lleno (${cartItems}/${config.carrito_max_placas})`);
      }
      
      console.log(`✅ Límites OK: ${activePlates} prestadas, ${cartItems} en carrito`);
      return {
        activePlates,
        cartItems,
        limits: config
      };
      
    } catch (error) {
      console.error(`❌ Error validando límites:`, error.message);
      throw error;
    }
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALIDAR CÓDIGO DE BARRAS
  // └─────────────────────────────────────────────────────────────
  validateBarcode(code) {
    if (!code) {
      throw new ValidationError('Código de barras requerido');
    }
    
    // Limpiar espacios y caracteres extraños
    const cleanCode = code.toString().trim();
    
    // Debe ser exactamente 6 dígitos
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new ValidationError('Código debe tener exactamente 6 dígitos numéricos');
    }
    
    console.log(`✅ Código de barras válido: ${cleanCode}`);
    return cleanCode;
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALIDAR FOTO
  // └─────────────────────────────────────────────────────────────
  validatePhoto(file) {
    if (!file) {
      throw new ValidationError('Archivo de foto requerido');
    }
    
    // Tamaño máximo: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new ValidationError(`Foto muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 10MB`);
    }
    
    // Tipos permitidos
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ValidationError(`Tipo de archivo no permitido (${file.type}). Use JPG, PNG o WebP`);
    }
    
    // Extensiones permitidas (doble validación)
    const fileName = file.name.toLowerCase();
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      throw new ValidationError('Extensión de archivo no permitida. Use .jpg, .png o .webp');
    }
    
    console.log(`✅ Foto válida: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
    return true;
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALIDAR COMENTARIO DE TEXTO
  // └─────────────────────────────────────────────────────────────
  validateComment(text) {
    if (!text) {
      return true; // Comentario es opcional
    }
    
    // Longitud máxima
    const MAX_LENGTH = 1000;
    if (text.length > MAX_LENGTH) {
      throw new ValidationError(`Comentario muy largo (${text.length} caracteres). Máximo ${MAX_LENGTH}`);
    }
    
    // Detectar contenido peligroso básico
    const DANGEROUS_PATTERNS = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];
    
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(text)) {
        throw new ValidationError('Comentario contiene contenido no permitido');
      }
    }
    
    console.log(`✅ Comentario válido (${text.length} caracteres)`);
    return true;
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ SANITIZAR TEXTO DE ENTRADA
  // └─────────────────────────────────────────────────────────────
  sanitizeInput(input) {
    if (!input) return input;
    
    return input
      .toString()
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ VALIDAR MÚLTIPLES PLACAS (para carrito)
  // └─────────────────────────────────────────────────────────────
  async validateMultiplePlates(plateIds, userId) {
    console.log(`🔍 Validando ${plateIds.length} placas para usuario ${userId}`);
    
    const results = {
      valid: [],
      invalid: [],
      errors: []
    };
    
    // Validar límites generales primero
    try {
      await this.validateUserLimits(userId);
    } catch (error) {
      throw error; // Parar aquí si excede límites generales
    }
    
    // Validar cada placa individualmente
    for (const plateId of plateIds) {
      try {
        const plate = await this.validatePlateAvailability(plateId, userId);
        results.valid.push({
          id: plateId,
          plate: plate
        });
      } catch (error) {
        results.invalid.push(plateId);
        results.errors.push({
          plateId: plateId,
          error: error.message,
          type: error.name
        });
      }
    }
    
    console.log(`✅ Validación completa: ${results.valid.length} válidas, ${results.invalid.length} inválidas`);
    return results;
  },
  
  // ┌─────────────────────────────────────────────────────────────
  // │ OBTENER CONFIGURACIÓN DEL SISTEMA (placeholder)
  // └─────────────────────────────────────────────────────────────
  async getSystemConfig() {
    // Por ahora valores por defecto, más tarde vendrá de tabla configuracion_sistema
    return {
      carrito_expiracion_horas: 24,
      carrito_max_placas: 20,
      prestamo_max_placas_usuario: 100,
      reporte_max_fotos: 5,
      reporte_max_size_mb: 10
    };
  }
};

console.log('🔍 ValidationService cargado y listo');