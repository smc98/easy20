/**
 * Establece valor en un campo input
 * @param {string} selector - Selector CSS del campo
 * @param {*} value - Valor a establecer
 * @returns {boolean} - true si exitoso
 */
export function setFieldValue(selector, value) {
    const field = document.querySelector(selector);
    if (field) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    console.warn(`Field not found: ${selector}`);
    return false;
}

/**
 * Establece valor en un campo select normal
 * @param {string} selector - Selector CSS del select
 * @param {*} value - Valor a establecer
 * @returns {boolean} - true si exitoso
 */
export function setSelectValue(selector, value) {
    const select = document.querySelector(selector);
    if (select) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    console.warn(`Select not found: ${selector}`);
    return false;
}

/**
 * Establece valor en un Select2 dropdown
 * @param {string} containerSelector - Selector del contenedor Select2
 * @param {*} value - Valor a establecer
 * @returns {boolean} - true si exitoso
 */
export function setSelect2Value(containerSelector, value) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`Select2 container not found: ${containerSelector}`);
        return false;
    }
    
    const fieldId = containerSelector
        .replace('#select2-', '')
        .replace('-container', '');
    
    const select = document.getElementById(fieldId);
    if (!select) {
        console.warn(`Select2 underlying select not found: #${fieldId}`);
        return false;
    }
    
    const valueStr = String(value);
    
    console.log(`Attempting to set Select2 field ${fieldId} to: ${valueStr}`);
    
    // Buscar opción que coincida
    const options = Array.from(select.options);
    let matchedOption = null;
    
    // Primero: coincidencia exacta de texto
    matchedOption = options.find(opt => opt.text.trim() === valueStr.trim());
    
    // Si no: coincidencia exacta de valor
    if (!matchedOption) {
        matchedOption = options.find(opt => opt.value === valueStr);
    }
    
    // Si no: coincidencia parcial case-insensitive
    if (!matchedOption) {
        const valueLower = valueStr.toLowerCase();
        matchedOption = options.find(opt => 
            opt.text.toLowerCase().includes(valueLower) || 
            opt.value.toLowerCase().includes(valueLower)
        );
    }
    
    if (matchedOption) {
        console.log(`  Found matching option: "${matchedOption.text}" (value: ${matchedOption.value})`);
        
        // Establecer valor
        select.value = matchedOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Actualizar UI de Select2
        container.textContent = matchedOption.text;
        container.setAttribute('title', matchedOption.text);
        
        // Disparar eventos nativos
        const mousedownEvent = new MouseEvent('mousedown', { bubbles: true });
        const mouseupEvent = new MouseEvent('mouseup', { bubbles: true });
        const clickEvent = new MouseEvent('click', { bubbles: true });
        
        container.dispatchEvent(mousedownEvent);
        container.dispatchEvent(mouseupEvent);
        container.dispatchEvent(clickEvent);
        
        console.log('✓ Set using native events and manual UI update');
        return true;
    } else {
        console.warn(`  ⚠️ No matching option found for: ${valueStr}`);
        console.log(`  Available options:`, options.map(o => `"${o.text}" (${o.value})`));
        return false;
    }
}