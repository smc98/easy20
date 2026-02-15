/**
 * Saves and Skills Module
 * Maneja resistencias, inmunidades, vulnerabilidades, sentidos e idiomas
 */

import { setFieldValue } from '../utils/selectors.js';

export function fillSavesAndSkills(monster) {
    // Helper para procesar arrays de resistencias/inmunidades que pueden contener objetos
    const formatResistances = (resistArray) => {
        if (!Array.isArray(resistArray)) return resistArray;
        
        const parts = [];
        
        resistArray.forEach(item => {
            if (typeof item === 'string') {
                // Simple string: "fire", "cold", etc.
                parts.push(item);
            } else if (typeof item === 'object' && item.resist) {
                // Objeto con condición: {resist: ["slashing", "piercing"], note: "from nonmagical attacks"}
                const subResist = Array.isArray(item.resist) 
                    ? item.resist.join(', ') 
                    : item.resist;
                
                if (item.note) {
                    parts.push(`${subResist} (${item.note})`);
                } else {
                    parts.push(subResist);
                }
            } else if (typeof item === 'object' && item.immune) {
                // Para immune con nota
                const subImmune = Array.isArray(item.immune) 
                    ? item.immune.join(', ') 
                    : item.immune;
                
                if (item.note) {
                    parts.push(`${subImmune} (${item.note})`);
                } else {
                    parts.push(subImmune);
                }
            }
        });
        
        return parts.join('; ');
    };
    
    // Resistencias e inmunidades
    if (monster.vulnerable) {
        const vulnerabilities = formatResistances(
            Array.isArray(monster.vulnerable) ? monster.vulnerable : [monster.vulnerable]
        );
        setFieldValue('#creature_damage_vulnerabilities', vulnerabilities);
        console.log('Vulnerabilities:', vulnerabilities);
    }
    
    if (monster.resist) {
        const resistances = formatResistances(
            Array.isArray(monster.resist) ? monster.resist : [monster.resist]
        );
        setFieldValue('#creature_damage_resistances', resistances);
        console.log('Resistances:', resistances);
    }
    
    if (monster.immune) {
        const immunities = formatResistances(
            Array.isArray(monster.immune) ? monster.immune : [monster.immune]
        );
        setFieldValue('#creature_damage_immunities', immunities);
        console.log('Immunities:', immunities);
    }
    
    if (monster.conditionImmune) {
        const conditionImmunities = Array.isArray(monster.conditionImmune) 
            ? monster.conditionImmune.join(', ') 
            : monster.conditionImmune;
        setFieldValue('#creature_condition_immunities', conditionImmunities);
        console.log('Condition Immunities:', conditionImmunities);
    }
    
    // Sentidos
    if (monster.senses) {
        const senses = Array.isArray(monster.senses) 
            ? monster.senses.join(', ') 
            : monster.senses;
        setFieldValue('#creature_senses', senses);
        console.log('Senses:', senses);
    }
    
    // Idiomas
    if (monster.languages) {
        const languages = Array.isArray(monster.languages) 
            ? monster.languages.join(', ') 
            : monster.languages;
        setFieldValue('#creature_languages', languages);
        console.log('Languages:', languages);
    }
}