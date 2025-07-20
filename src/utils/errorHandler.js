// 🛡️ ERROR HANDLER - MANEJO GLOBAL DE ERRORES
// Archivo: src/utils/errorHandler.js

// ═══════════════════════════════════════════════════════════════
// MANEJO GLOBAL DE ERRORES DE CHROME EXTENSIONS Y ASYNC
// ═══════════════════════════════════════════════════════════════

export const initializeErrorHandling = () => {
  // Manejar errores de extensiones de Chrome
  window.addEventListener('error', (event) => {
    // Ignorar errores específicos de extensiones
    const ignoredErrors = [
      'A listener indicated an asynchronous response by returning true',
      'Extension context invalidated',
      'message channel closed',
      'chrome-extension://',
      'moz-extension://',
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded'
    ];

    const shouldIgnore = ignoredErrors.some(errorText => 
      event.message?.includes(errorText) || 
      event.error?.message?.includes(errorText)
    );

    if (shouldIgnore) {
      console.warn('🛡️ Error de extensión ignorado:', event.message);
      event.preventDefault();
      return false;
    }

    // Log de errores reales para debugging
    console.error('❌ Error real detectado:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  // Manejar promesas rechazadas
  window.addEventListener('unhandledrejection', (event) => {
    const ignoredRejections = [
      'A listener indicated an asynchronous response',
      'message channel closed',
      'Extension context invalidated'
    ];

    const shouldIgnore = ignoredRejections.some(errorText => 
      event.reason?.message?.includes(errorText) ||
      String(event.reason)?.includes(errorText)
    );

    if (shouldIgnore) {
      console.warn('🛡️ Promise rejection de extensión ignorada:', event.reason);
      event.preventDefault();
      return false;
    }

    // Log de rechazos reales
    console.error('❌ Promise rejection real:', event.reason);
  });

  // Wrapper para fetch con mejor manejo de errores
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      return response;
    } catch (error) {
      // Ignorar errores de extensiones en fetch
      if (error.message?.includes('Failed to fetch') && 
          args[0]?.includes('chrome-extension://')) {
        console.warn('🛡️ Fetch de extensión ignorado:', args[0]);
        throw new Error('Extension fetch ignored');
      }
      throw error;
    }
  };

  console.log('🛡️ Error handler inicializado - Ignorando errores de extensiones');
};

// Función para limpiar listeners específicos de extensiones
export const cleanupExtensionListeners = () => {
  // Remover listeners que pueden estar causando problemas
  if (window.chrome?.runtime?.onMessage) {
    try {
      window.chrome.runtime.onMessage.removeListener(() => {});
    } catch (e) {
      // Silently ignore
    }
  }
};

// Función para detectar si hay extensiones problemáticas
export const detectProblematicExtensions = () => {
  const problematicExtensions = [];
  
  // Verificar extensiones comunes que causan problemas
  const extensionIndicators = [
    'chrome-extension',
    'moz-extension',
    '__REACT_DEVTOOLS_GLOBAL_HOOK__',
    '__REDUX_DEVTOOLS_EXTENSION__'
  ];

  extensionIndicators.forEach(indicator => {
    if (window[indicator] || document.querySelector(`script[src*="${indicator}"]`)) {
      problematicExtensions.push(indicator);
    }
  });

  if (problematicExtensions.length > 0) {
    console.warn('⚠️ Extensiones detectadas que pueden causar errores:', problematicExtensions);
  }

  return problematicExtensions;
};

// Función para modo seguro (sin extensiones)
export const enableSafeMode = () => {
  // Deshabilitar ciertos APIs que las extensiones suelen usar
  if (window.chrome?.runtime) {
    window.chrome.runtime.onMessage = {
      addListener: () => {},
      removeListener: () => {},
      hasListener: () => false
    };
  }

  // Bloquear modificaciones del DOM por extensiones
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const element = node;
          // Remover scripts de extensiones
          if (element.src && (
            element.src.includes('chrome-extension://') ||
            element.src.includes('moz-extension://')
          )) {
            element.remove();
            console.warn('🛡️ Script de extensión removido:', element.src);
          }
        }
      });
    });
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true
  });

  console.log('🛡️ Modo seguro activado - Bloqueando modificaciones de extensiones');
};

// Auto-inicialización si se importa el módulo
if (typeof window !== 'undefined') {
  // Inicializar automáticamente en desarrollo
  if (process.env.NODE_ENV === 'development') {
    initializeErrorHandling();
    detectProblematicExtensions();
  }
}