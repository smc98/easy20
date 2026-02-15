/**
 * Basic Info Module
 * Maneja información básica del monstruo (nombre, tipo, tamaño, alineamiento)
 */

import { setFieldValue, setSelect2Value } from '../utils/selectors.js';
import { formatAlignment, formatSize, formatType } from '../utils/formatters.js';

export function fillBasicInfo(monster) {
    console.log('--- fillBasicInfo ---');
    
    const name = monster.name;
    const type = monster.type?.type || monster.type || '';
    const sizeCode = monster.size?.[0] || 'M';
    const alignmentRaw = monster.alignment;
    
    const size = formatSize(sizeCode);
    const typeInSpanish = formatType(type);
    
    console.log('Values to set:', { name, type, size: `${sizeCode} -> ${size}`, alignment: alignmentRaw });
    
    // Name
    console.log('Setting name...');
    if (setFieldValue('#creature_name', name)) {
        console.log('✓ Name set successfully');
    }
    
    // Size - usando Select2 con nombre en español
    console.log('Setting size...');
    if (setSelect2Value('#select2-creature_size-container', size)) {
        console.log('✓ Size set successfully');
    }
    
    console.log(`Type: ${type} -> ${typeInSpanish}`);
    
    if (setSelect2Value('#select2-creature_creature_type-container', typeInSpanish)) {
        console.log('✓ Type set successfully');
    }
    
    // Alignment - mapear alineamientos
    console.log('Setting alignment...');
    const alignmentInSpanish = formatAlignment(alignmentRaw);
    console.log(`Alignment: ${JSON.stringify(alignmentRaw)} -> ${alignmentInSpanish}`);
    
    if (setSelect2Value('#select2-creature_alignment-container', alignmentInSpanish)) {
        console.log('✓ Alignment set successfully');
    }
    
    console.log('--- fillBasicInfo completed ---');
}

