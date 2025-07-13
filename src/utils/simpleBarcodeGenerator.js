/**
 * 🚀 GENERADOR OPTIMIZADO PARA PORTAOBJETOS
 * Configurado para impresión pequeña con máxima legibilidad
 */

export class SimpleBarcodeGenerator {
  
  /**
   * Genera un código de barras optimizado para portaobjetos
   * @param {string|number} plateId - ID numérico de la placa (6 dígitos)
   * @param {string} visualId - ID visual para mostrar (ej: T01-S02-001)
   * @returns {Promise<string>} Base64 del código generado
   */
  static async generateBarcode(plateId, visualId) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Generando código optimizado para portaobjetos...');
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

        // PASO 3: Crear canvas optimizado para portaobjetos
        const canvas = document.createElement('canvas');
        canvas.width = 400;   // Ancho optimizado
        canvas.height = 120;  // Altura compacta

        // PASO 4: 🎯 CONFIGURACIÓN OPTIMIZADA PARA PORTAOBJETOS
        const config = {
          format: "CODE128",           // Formato más denso y confiable
          width: 4,                    // ✅ BARRAS MÁS GRUESAS (antes 2.5, ahora 4)
          height: 50,                  // ✅ Altura perfecta para portaobjetos
          displayValue: true,          // Mostrar número legible
          text: visualId,              // ✅ CÓDIGO VISUAL ARRIBA
          fontSize: 40,                // ✅ LETRAS MÁS GRANDES (antes 12, ahora 18)
          fontOptions: "bold",         // ✅ NEGRITA para mejor legibilidad
          textAlign: "center",         // Texto centrado
          textPosition: "top",         // ✅ TEXTO ARRIBA de las barras
          textMargin: 3,              // Espacio entre texto y barras
          background: "#ffffff",       // Fondo blanco puro
          lineColor: "#000000",        // Líneas negras puras para máximo contraste
          margin: 12,                  // Márgenes para impresión
          marginTop: 5,                // Margen superior reducido
          marginBottom: 10             // Margen inferior para ID numérico
        };

        console.log('⚙️ Configuración optimizada aplicada:', config);

        // PASO 5: Generar el código principal
        window.JsBarcode(canvas, plateIdStr, config);

        // PASO 6: Agregar el ID numérico DEBAJO del código
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        
        // Posicionar el ID numérico en la parte inferior
        const textY = canvas.height - 6;
        ctx.fillText(plateIdStr, canvas.width / 2, textY);

        // PASO 7: Convertir a base64 con máxima calidad
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const base64Data = dataUrl.split(',')[1];

        // PASO 8: Validar resultado
        if (!base64Data || base64Data.length < 100) {
          throw new Error('Código generado inválido o vacío');
        }

        console.log('✅ Código optimizado para portaobjetos generado exitosamente');
        console.log('🖨️ Listo para imprimir pequeño y ser legible');
        
        resolve(base64Data);

      } catch (error) {
        console.error('❌ Error en generación:', error);
        reject(new Error(`Error generando código: ${error.message}`));
      }
    });
  }

  /**
   * Espera a que el sistema esté listo
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
    console.log('🧪 Generando código de prueba optimizado...');
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
      optimizedFor: 'Portaobjetos - Impresión pequeña',
      features: [
        'Código visual arriba en letras grandes',
        'Barras gruesas para mejor lectura',
        'ID numérico abajo',
        'Optimizado para 70x20mm'
      ],
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar también como default para flexibilidad
export default SimpleBarcodeGenerator;

console.log('📦 SimpleBarcodeGenerator OPTIMIZADO cargado');
console.log('🎯 Configuración: Código visual arriba (18px bold), barras gruesas (4px), ID abajo');
console.log('🖨️ Perfecto para portaobjetos de ~70x20mm');