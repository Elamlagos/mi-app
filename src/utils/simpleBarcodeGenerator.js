/**
 * 🚀 GENERADOR SIMPLE DE CÓDIGOS DE BARRAS
 * Sistema optimizado para generar códigos rápido y sin errores
 */

export class SimpleBarcodeGenerator {
  
  /**
   * Genera un código de barras simple y efectivo
   * @param {string|number} plateId - ID numérico de la placa (6 dígitos)
   * @param {string} visualId - ID visual para mostrar (ej: T01-S02-001)
   * @returns {Promise<string>} Base64 del código generado
   */
  static async generateBarcode(plateId, visualId) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Iniciando generación de código...');
        console.log('📋 Datos:', { plateId, visualId });

        // PASO 1: Verificar que JsBarcode esté disponible
        if (!window.JsBarcode || !window.BARCODE_SYSTEM_READY) {
          throw new Error('Sistema de códigos no disponible. Recarga la página.');
        }

        // PASO 2: Validar datos de entrada
        const plateIdStr = plateId.toString();
        if (!/^\d{6}$/.test(plateIdStr)) {
          throw new Error(`ID de placa inválido: ${plateIdStr}. Debe ser de 6 dígitos.`);
        }

        // PASO 3: Crear canvas con dimensiones optimizadas
        const canvas = document.createElement('canvas');
        canvas.width = 350;
        canvas.height = 100;

        // PASO 4: Configuración simple pero efectiva
        const config = {
          format: "CODE128",           // Formato estándar más compatible
          width: 2.5,                  // Ancho de barras óptimo
          height: 50,                  // Altura perfecta para lectura
          displayValue: true,          // Mostrar número legible
          text: visualId,              // Mostrar ID visual arriba
          fontSize: 12,                // Tamaño de texto legible
          textMargin: 8,               // Espaciado del texto
          background: "#ffffff",       // Fondo blanco puro
          lineColor: "#000000",        // Líneas negras puras
          margin: 10                   // Margen para escaneado
        };

        console.log('⚙️ Configuración aplicada:', config);

        // PASO 5: Generar el código
        window.JsBarcode(canvas, plateIdStr, config);

        // PASO 6: Convertir a base64
        const dataUrl = canvas.toDataURL('image/png', 1.0); // Máxima calidad
        const base64Data = dataUrl.split(',')[1];

        // PASO 7: Validar resultado
        if (!base64Data || base64Data.length < 100) {
          throw new Error('Código generado inválido o vacío');
        }

        console.log('✅ Código generado exitosamente');
        console.log('📊 Tamaño del código:', base64Data.length, 'caracteres');
        
        resolve(base64Data);

      } catch (error) {
        console.error('❌ Error en generación:', error);
        reject(new Error(`Error generando código: ${error.message}`));
      }
    });
  }

  /**
   * Espera a que el sistema de códigos esté listo
   * @param {number} maxWait - Tiempo máximo de espera en ms
   * @returns {Promise<boolean>}
   */
  static async waitForSystem(maxWait = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      console.log('⏳ Esperando sistema de códigos...');
      
      const checkSystem = () => {
        if (window.JsBarcode && window.BARCODE_SYSTEM_READY) {
          console.log('✅ Sistema listo');
          resolve(true);
        } else if (Date.now() - startTime > maxWait) {
          console.error('❌ Timeout esperando sistema');
          reject(new Error('Timeout: Sistema de códigos no disponible'));
        } else {
          setTimeout(checkSystem, 100);
        }
      };
      
      checkSystem();
    });
  }

  /**
   * Verifica si el sistema está listo sin esperar
   * @returns {boolean}
   */
  static isSystemReady() {
    return !!(window.JsBarcode && window.BARCODE_SYSTEM_READY);
  }

  /**
   * Genera un código de prueba para verificar funcionamiento
   * @returns {Promise<string>}
   */
  static async generateTestCode() {
    console.log('🧪 Generando código de prueba...');
    return this.generateBarcode('123456', 'TEST-001');
  }

  /**
   * Información del sistema
   * @returns {object}
   */
  static getSystemInfo() {
    return {
      jsBarcode: !!window.JsBarcode,
      version: window.JsBarcode?.VERSION || 'Desconocida',
      systemReady: !!window.BARCODE_SYSTEM_READY,
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar también como default para flexibilidad
export default SimpleBarcodeGenerator;

console.log('📦 SimpleBarcodeGenerator cargado y listo');