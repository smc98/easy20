/**
 * Formatea alineamiento de códigos a español
 * @param {string|Array} alignment - Alineamiento en formato JSON
 * @returns {string} - Alineamiento en español
 */
export function formatAlignment(alignment) {
    const alignmentMap = {
        // Alineamientos específicos
        'LG': 'Legal bueno',
        'LN': 'Legal neutral',
        'LE': 'Legal malvado',
        'NG': 'Neutral bueno',
        'N': 'Neutral',
        'NE': 'Neutral malvado',
        'CG': 'Caótico bueno',
        'CN': 'Caótico neutral',
        'CE': 'Caótico malvado',
        
        // Alineamientos especiales
        'U': 'Sin alineamiento',
        'A': 'Cualquiera',
        
        // Variantes "any"
        'any alignment': 'Cualquiera',
        'any chaotic': 'Cualquiera caótico',
        'any good': 'Cualquiera bueno',
        'any evil': 'Cualquiera malvado',
        'any neutral': 'Cualquiera neutral',
        'any non-good': 'Cualquiera no bueno',
        'any lawful': 'Cualquiera legal',
        'any non-lawful': 'Cualquiera no legal',
        'any non-evil': 'Cualquiera no malvado',
        'good or evil': 'Bueno o malvado'
    };
    
    if (!alignment) return 'Neutral';
    
    // Si es un array de códigos (ej: ["C", "E"])
    if (Array.isArray(alignment)) {
        const code = alignment.join(''); // "C" + "E" = "CE"
        return alignmentMap[code] || 'Neutral';
    }
    
    // Si es string directo
    if (typeof alignment === 'string') {
        return alignmentMap[alignment] || alignmentMap[alignment.toUpperCase()] || 'Neutral';
    }
    
    return 'Neutral';
}

export function formatSize(sizeCode) {
    const sizeMap = {
        'T': 'Diminuto',
        'S': 'Pequeño',
        'M': 'Mediano',
        'L': 'Grande',
        'H': 'Enorme',
        'G': 'Gargantuesco'
    };
    return sizeMap[sizeCode] || 'Mediano';
}

export function formatType(type){
        const typeMap = {
        'aberration': 'Aberración',
        'beast': 'Bestia',
        'celestial': 'Celestial',
        'construct': 'Constructo',
        'dragon': 'Dragón',
        'elemental': 'Elemental',
        'fey': 'Feérico',
        'fiend': 'Infernal',
        'giant': 'Gigante',
        'humanoid': 'Humanoide',
        'monstrosity': 'Monstruosidad',
        'ooze': 'Cieno',
        'plant': 'Planta',
        'undead': 'No Muerto',
        'swarm': 'Enjambre de bestias pequeñas'
    };
    
    return typeMap[type.toLowerCase()] || 'Otro';
}

/**
 * Calcula modificador de habilidad
 * @param {number} score - Puntuación de habilidad
 * @returns {number} - Modificador
 */
export function getModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Formatea modificador con signo
 * @param {number} modifier - Modificador
 * @returns {string} - Modificador formateado
 */
export function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Extrae AC del JSON
 * @param {Object} monster - Datos del monstruo
 * @returns {Array} - [ac, acFrom]
 */
export function extractAC(monster) {
    if (!monster.ac) return [10, ''];
    
    const acData = Array.isArray(monster.ac) ? monster.ac[0] : monster.ac;
    
    if (typeof acData === 'number') {
        return [acData, ''];
    }
    
    if (typeof acData === 'object') {
        const ac = acData.ac || 10;
        const from = acData.from ? acData.from.join(', ') : '';
        return [ac, from];
    }
    
    return [10, ''];
}

/**
 * Extrae CR del JSON
 * @param {Object} monster - Datos del monstruo
 * @returns {string|number} - CR formateado
 */
export function extractCR(monster) {
    if (!monster.cr) return '0';
    
    if (typeof monster.cr === 'object') {
        return monster.cr.cr || '0';
    }
    
    return monster.cr;
}

/**
 * Calcula el bono de competencia basado en CR
 * @param {number|string} cr - Challenge Rating
 * @returns {number} - Bono de competencia
 */
function getProficiencyBonus(cr) {
    // Convertir CR a número si es string
    const crNum = typeof cr === 'string' ? parseFloat(cr) : cr;
    
    // Tabla de bono de competencia por CR
    if (crNum < 5) return 2;
    if (crNum < 9) return 3;
    if (crNum < 13) return 4;
    if (crNum < 17) return 5;
    if (crNum < 21) return 6;
    if (crNum < 25) return 7;
    if (crNum < 29) return 8;
    return 9;
}

/**
 * Extrae iniciativa del JSON
 * @param {Object} monster - Datos del monstruo
 * @returns {string|null} - Modificador de iniciativa
 */
export function extractInitiative(monster) {
    // Si no hay campo initiative, retornar null (usará DEX por defecto)
    if (!monster.initiative) {
        return null;
    }
    
    // Caso 1: Valor numérico directo (ya calculado)
    if (typeof monster.initiative === 'number') {
        return formatModifier(monster.initiative);
    }
    
    // Caso 2: String directo (formato "+X")
    if (typeof monster.initiative === 'string') {
        return monster.initiative;
    }
    
    // Caso 3: Objeto con proficiency o expertise
    if (typeof monster.initiative === 'object') {
        // Calcular modificador base de destreza
        const dexMod = getModifier(monster.dex || 10);
        
        // Obtener bono de competencia
        const profBonus = getProficiencyBonus(extractCR(monster));
        
        let totalBonus = dexMod;
        
        // Proficiency: multiplier 1 (competente)
        if (monster.initiative.proficiency === 1) {
            totalBonus += profBonus;
        }
        // Expertise: multiplier 2 (pericia/experto)
        else if (monster.initiative.proficiency === 2) {
            totalBonus += profBonus * 2;
        }
        // Otros multiplicadores posibles
        else if (typeof monster.initiative.proficiency === 'number') {
            totalBonus += profBonus * monster.initiative.proficiency;
        }
        
        return formatModifier(totalBonus);
    }
    
    return null;
}


/**
 * Formatea lista de habilidades (lair actions, regional effects, etc.)
 * @param {Array} abilities - Array de habilidades
 * @returns {string} - Texto formateado
 */
export function formatAbilityList(abilities) {
    if (!abilities || !Array.isArray(abilities)) return '';
    
    return abilities
        .map(ability => {
            if (typeof ability === 'string') return ability;
            if (ability.entries) return ability.entries.join(' ');
            return '';
        })
        .filter(Boolean)
        .join('\n\n');
}