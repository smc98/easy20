/**
 * Easy20 Extension
 * Content Script - Main Entry Point
 * 
 * Esta extensión rellena automáticamente formularios de criaturas en nivel20.com
 * utilizando datos del bestiario de D&D 5e.
 */

// Import modules
import { fillBasicInfo } from './modules/basic-info.js';
import { fillAbilityScores } from './modules/ability-scores.js';
import { fillCombatStats } from './modules/combat-stats.js';
import { fillSpeeds } from './modules/speeds.js';
import { fillSavesAndSkills } from './modules/saves-skills.js';
import { fillSavingThrows } from './modules/saving-throws.js';
import { fillSkills } from './modules/skills.js';
import { fillTraitsAndAbilities } from './modules/traits.js';

console.log('Easy20 extension loaded');

// Listen for custom events from the injector (instead of chrome.runtime)
document.addEventListener('nivel20-fill-monster', (event) => {
    try {
        // Deserializar el JSON (compatibilidad con Firefox)
        const data = typeof event.detail === 'string' 
            ? JSON.parse(event.detail) 
            : event.detail;
        
        const monster = data.monster;
        console.log('Module received fill request for:', monster.name);
        
        fillMonsterForm(monster);
        
        // Send response back to injector
        const responseEvent = new CustomEvent('nivel20-fill-response', {
            detail: { success: true }
        });
        document.dispatchEvent(responseEvent);
        
    } catch (error) {
        console.error('Error filling form:', error);
        
        const responseEvent = new CustomEvent('nivel20-fill-response', {
            detail: { success: false, error: error.message }
        });
        document.dispatchEvent(responseEvent);
    }
});

/**
 * Función principal que coordina el llenado del formulario
 * @param {Object} monster - Datos del monstruo del JSON
 */
function fillMonsterForm(monster) {
    console.log('==================================================');
    console.log('Filling form with monster:', monster.name);
    console.log('==================================================');
    
    let successCount = 0;
    let failCount = 0;
    
    // Definir secciones a rellenar en orden
    const sections = [
        { fn: () => fillBasicInfo(monster), name: 'fillBasicInfo' },
        { fn: () => fillAbilityScores(monster), name: 'fillAbilityScores' },
        { fn: () => fillCombatStats(monster), name: 'fillCombatStats' },
        { fn: () => fillSpeeds(monster), name: 'fillSpeeds' },
        { fn: () => fillSavesAndSkills(monster), name: 'fillSavesAndSkills' },
        { fn: () => fillSavingThrows(monster), name: 'fillSavingThrows' },
        { fn: () => fillSkills(monster), name: 'fillSkills' },
        { fn: () => fillTraitsAndAbilities(monster), name: 'fillTraitsAndAbilities' }
    ];
    
    // Ejecutar cada sección con manejo de errores individual
    sections.forEach(({ fn, name }) => {
        try {
            fn();
            successCount++;
        } catch (error) {
            console.error(`❌ Error in ${name}:`, error.message);
            failCount++;
        }
    });
    
    console.log('==================================================');
    console.log(`✅ Form filling completed: ${successCount} sections succeeded, ${failCount} sections failed`);
    console.log('==================================================');
}