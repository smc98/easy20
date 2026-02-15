/**
 * Text Cleaner Utility
 * Limpia tags especiales de formato 5etools del texto
 */

/**
 * Limpia texto de tags especiales ({@spell}, {@dc}, etc.)
 * @param {string} text - Texto a limpiar
 * @returns {string} - Texto limpiado
 */
export function cleanText(text) {
    if (!text) return '';
    
    return text
        // Item tags: {@item name||alias|source} o {@item name|source}
        .replace(/\{@item([^}]*)\}/g, (match, inner) => {
            const parts = inner.split('|').map(s => s.trim());
            // parts[0] lleva el espacio inicial, lo quitamos
            const first = parts[0].replace(/^\s+/, '');
            
            // Si hay alias con "||", úsalo; si no, usa el nombre tal cual
            const [namePart] = first.split('||').map(s => s.trim());
            const aliasPart = first.includes('||')
                ? first.split('||')[1].trim()
                : null;
            
            return aliasPart || namePart || '';
        })
        
        // Action Save tags - {@actSave str} {@dc 27}
        .replace(/\{@actSave\s+(\w+)\}/g, (match, stat) => {
            const statMap = {
                'str': 'Fuerza',
                'dex': 'Destreza',
                'con': 'Constitución',
                'int': 'Inteligencia',
                'wis': 'Sabiduría',
                'cha': 'Carisma'
            };
            return `Tirada de Salvación de ${statMap[stat.toLowerCase()] || stat}`;
        })
        
        // Action Save Fail tag
        .replace(/\{@actSaveFail\}/g, 'Al fallar:')
        .replace(/\{@actSaveSuccess\}/g, 'Al acertar:')
        
        
        // Recharge tags
        .replace(/\{@recharge (\d+)\}/g, '(Recarga $1-6)')
        .replace(/\{@recharge\}/g, '(Recarga 6)')
        // Attack tags
        .replace(/\{@atk mw,rw\}/g, 'Ataque de arma cuerpo a cuerpo o a distancia:')
        .replace(/\{@atk mw, rw\}/g, 'Ataque de arma cuerpo a cuerpo o a distancia:')
        .replace(/\{@atk ms,rs\}/g, 'Ataque de conjuro cuerpo a cuerpo o a distancia:')
        .replace(/\{@atk mw\}/g, 'Ataque de arma cuerpo a cuerpo:')
        .replace(/\{@atk rw\}/g, 'Ataque de arma a distancia:')
        .replace(/\{@atk ms\}/g, 'Ataque de conjuro cuerpo a cuerpo:')
        .replace(/\{@atk rs\}/g, 'Ataque de conjuro a distancia:')
        .replace(/\{@atk m\}/g, 'Ataque cuerpo a cuerpo:')
        .replace(/\{@atk r\}/g, 'Ataque a distancia:')
        .replace(/\{@atkr m\}/g, 'Ataque cuerpo a cuerpo:')
        .replace(/\{@atkr r\}/g, 'Ataque a distancia:')
        .replace(/\{@atkr m,r\}/g, 'Ataque de arma cuerpo a cuerpo o a distancia:')
        .replace(/\{@atkr m, r\}/g, 'Ataque de arma cuerpo a cuerpo o a distancia:')
        .replace(/\{@atkr r, m\}/g, 'Ataque de arma cuerpo a cuerpo o a distancia:')
        .replace(/\{@atkr r,m\}/g, 'Ataque de arma cuerpo a cuerpo o a distancia:')
        // Hit tags
        .replace(/\{@h\}/g, 'Impacto:')
        .replace(/\{@hit (\d+)\}/g, '+$1 al ataque')
        // Damage / dice tags
        .replace(/\{@damage ([^}]+)\}/g, '$1')
        .replace(/\{@dice ([^}]+)\}/g, '$1')
        // Condition tags - con source opcional
        .replace(/\{@condition ([^}|]+)(?:\|[^}]*)?\}/g, '$1')
        // Skill tags
        .replace(/\{@skill ([^}]+)\}/g, '$1')
        // Spell tags - IMPORTANTE: antes del cleanup general
        .replace(/\{@spell ([^}]+)\}/g, '$1')
        // Creature tags
        .replace(/\{@creature ([^}|]+)(?:\|[^}]*)?\}/g, '$1')
        // DC (Difficulty Class) tags
        .replace(/\{@dc (\d+)\}/g, 'DC $1')
        // Variant rule tags - formato: {@variantrule name|source|displayName}
        .replace(/\{@variantrule ([^}|]+)\|[^}|]*\|([^}]+)\}/g, '$2')  // Con display name
        .replace(/\{@variantrule ([^}|]+)(?:\|[^}]*)?\}/g, '$1')       // Sin display name
        // General cleanup (otras tags que queden)
        .replace(/\{@[^}]+\s+([^}]+)\}/g, '$1')
        .replace(/\{@[^}]+\}/g, '');
}
