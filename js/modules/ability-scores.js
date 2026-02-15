/**
 * Ability Scores Module
 * Maneja las puntuaciones de habilidad (STR, DEX, CON, INT, WIS, CHA)
 */

import { setSelect2Value } from '../utils/selectors.js';

export function fillAbilityScores(monster) {
    const abilities = {
        str: monster.str ?? 10,
        dex: monster.dex ?? 10,
        con: monster.con ?? 10,
        int: monster.int ?? 10,
        wis: monster.wis ?? 10,
        cha: monster.cha ?? 10
    };
    
    console.log('Ability scores:', abilities);
    
    // Mapeo de habilidades inglés -> español
    const abilityMap = {
        'str': 'fue',
        'dex': 'des',
        'con': 'con',
        'int': 'int',
        'wis': 'sab',
        'cha': 'car'
    };
    
    // Establecer cada habilidad
    Object.entries(abilities).forEach(([ability, score]) => {
        const spanishCode = abilityMap[ability];
        const containerSelector = `#select2-creature_abilities_${spanishCode}-container`;
        setSelect2Value(containerSelector, score);
    });
}