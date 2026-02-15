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
 * Extrae iniciativa del JSON
 * @param {Object} monster - Datos del monstruo
 * @returns {string|null} - Modificador de iniciativa
 */
export function extractInitiative(monster) {
    // Algunos monstruos tienen initiative específica
    if (monster.initiative) {
        return typeof monster.initiative === 'number' 
            ? formatModifier(monster.initiative)
            : monster.initiative;
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