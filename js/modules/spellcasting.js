/**
 * Spellcasting Module
 * Convierte datos de spellcasting en formato de rasgo
 */

import { cleanText } from '../utils/text-cleaner.js';

export function formatSpellcastingAsTrait(spellcasting) {
    // Convertir un objeto spellcasting en un trait con nombre y descripción formateada
    
    const trait = {
        name: spellcasting.name || 'Spellcasting',
        entries: []
    };
    
    let description = '';
    
    // Añadir header entries (descripción inicial)
    if (spellcasting.headerEntries) {
        description += spellcasting.headerEntries.map(e => cleanText(e)).join(' ') + '\n\n';
    }
    
    // FORMATO 1: Conjuros por nivel (spells con slots)
    if (spellcasting.spells) {
        const spellLevels = Object.keys(spellcasting.spells).sort((a, b) => parseInt(a) - parseInt(b));
        
        spellLevels.forEach(level => {
            const levelData = spellcasting.spells[level];
            
            if (level === '0') {
                // Cantrips
                description += '**Trucos (a voluntad):** ';
            } else {
                // Leveled spells
                const slots = levelData.slots ? ` (${levelData.slots} espacios)` : '';
                description += `**Nivel ${level}${slots}:** `;
            }
            
            // Limpiar nombres de conjuros
            const spellNames = levelData.spells.map(spell => cleanText(spell)).join(', ');
            description += spellNames + '\n\n';
        });
    }
    
    // FORMATO 2: Conjuros por usos (will, daily, etc.)
    
    // At will
    if (spellcasting.will) {
        description += '**A voluntad:** ';
        description += spellcasting.will.map(spell => cleanText(spell)).join(', ') + '\n\n';
    }
    
    // Daily uses
    if (spellcasting.daily) {
        Object.keys(spellcasting.daily).sort().reverse().forEach(frequency => {
            // frequency puede ser "1e", "2e", "3e" (each), "1", "2", etc.
            const spells = spellcasting.daily[frequency];
            
            let label = '';
            if (frequency.endsWith('e')) {
                // "3e" = "3/día cada uno"
                const num = frequency.replace('e', '');
                label = `**${num}/día cada uno:** `;
            } else {
                // "1" = "1/día"
                label = `**${frequency}/día:** `;
            }
            
            description += label;
            description += spells.map(spell => cleanText(spell)).join(', ') + '\n\n';
        });
    }
    
    // Weekly uses
    if (spellcasting.weekly) {
        Object.keys(spellcasting.weekly).sort().reverse().forEach(frequency => {
            const spells = spellcasting.weekly[frequency];
            
            let label = '';
            if (frequency.endsWith('e')) {
                const num = frequency.replace('e', '');
                label = `**${num}/semana cada uno:** `;
            } else {
                label = `**${frequency}/semana:** `;
            }
            
            description += label;
            description += spells.map(spell => cleanText(spell)).join(', ') + '\n\n';
        });
    }
    
    // Añadir footer entries si existen
    if (spellcasting.footerEntries) {
        description += '\n' + spellcasting.footerEntries.map(e => cleanText(e)).join(' ');
    }
    
    // Convertir la descripción en el formato entries que espera fillTraitFields
    trait.entries = [description.trim()];
    
    return trait;
}