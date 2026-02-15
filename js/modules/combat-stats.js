/**
 * Combat Stats Module
 * Maneja estadísticas de combate (AC, HP, CR, Initiative, Passive Perception)
 */

import { setFieldValue, setSelect2Value } from '../utils/selectors.js';
import { extractAC, extractCR, extractInitiative, getModifier } from '../utils/formatters.js';

export function fillCombatStats(monster) {
    const [ac, acFrom] = extractAC(monster);
    const passive = monster.passive ?? 10;
    const initiativeRaw = extractInitiative(monster);
    const hp = monster.hp?.average ?? 0;
    const formula = monster.hp?.formula ?? '';
    const cr = extractCR(monster);

    // Si extractInitiative devuelve algo, usarlo; si no, calcular desde DEX
    const initiative = initiativeRaw ?? getModifier(monster.dex);
    
    // Limpiar el signo + si existe (el formulario espera solo el número)
    const initiativeClean = typeof initiative === 'string' 
        ? initiative.replace('+', '') 
        : initiative;
    
    console.log('Combat stats:', { ac, acFrom, hp, formula, cr, passive, initiativeClean });
    
    // AC y HP son campos normales
    setFieldValue('#creature_armor_class', ac);
    setFieldValue('#creature_armor_class_type', acFrom);
    setFieldValue('#creature_hit_points', hp);
    setFieldValue('#creature_hit_dice', formula);
    setFieldValue('#creature_passive_perception', passive);
    setFieldValue('#creature_initiative', initiative);
    
    // CR - es un Select2
    console.log('Setting CR...');
    if (setSelect2Value('#select2-creature_challenge_rating-container', cr)) {
        console.log('✓ CR set successfully');
    }
}