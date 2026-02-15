/**
 * Easy20 Extension v1.0
 * Content Script - Module Injector
 * 
 * Este script inyecta los módulos ES6 como un script type="module" en la página,
 * evitando las limitaciones de Chrome Extensions con ES6 modules en content scripts.
 */

console.log('Easy20 extension - Module injector loaded');

// Inyectar el código modular como script type="module"
function injectModuleScript() {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = chrome.runtime.getURL('js/content.js');
    
    // Inyectar en el documento
    (document.head || document.documentElement).appendChild(script);
    
    console.log('✓ ES6 modules injected into page');
}

// Listener para mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillMonster') {
        // Serializar el monster a JSON para compatibilidad con Firefox
        // Firefox tiene restricciones más estrictas con CustomEvent detail
        const event = new CustomEvent('nivel20-fill-monster', {
            detail: JSON.stringify({ monster: request.monster })
        });
        document.dispatchEvent(event);
        
        // Escuchar respuesta
        const handleResponse = (e) => {
            document.removeEventListener('nivel20-fill-response', handleResponse);
            sendResponse(e.detail);
        };
        
        document.addEventListener('nivel20-fill-response', handleResponse);
        
        return true; // Keep channel open for async response
    }
});

// Inyectar módulos cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModuleScript);
} else {
    injectModuleScript();
}