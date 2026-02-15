/**
 * Traits Module
 * Maneja rasgos, acciones, reacciones, acciones legendarias y de bonificación
 */

import { setFieldValue } from '../utils/selectors.js';
import { formatAbilityList } from '../utils/formatters.js';
import { cleanText } from '../utils/text-cleaner.js';
import { formatSpellcastingAsTrait } from './spellcasting.js';
import { fillMythicActions } from './mythic-actions.js';

export function fillTraitsAndAbilities(monster) {
    console.log('--- fillTraitsAndAbilities ---');
    
    // Acciones de guarida
    if (monster.legendaryGroup?.lairActions) {
        const lairActions = formatAbilityList(monster.legendaryGroup.lairActions);
        setFieldValue('#creature_lair_actions', lairActions);
        console.log('✓ Lair actions filled');
    }
    
    // Efectos regionales
    if (monster.legendaryGroup?.regionalEffects) {
        const regionalEffects = formatAbilityList(monster.legendaryGroup.regionalEffects);
        setFieldValue('#creature_lair_regional_effects', regionalEffects);
        console.log('✓ Regional effects filled');
    }
    
    // Crear una cola de trabajos para procesar SECUENCIALMENTE
    const traitJobs = [];
    
    // Spellcasting - convertir a rasgo formateado
    if (monster.spellcasting && monster.spellcasting.length > 0) {
        console.log(`Processing ${monster.spellcasting.length} spellcasting entries...`);
        const spellcastingTraits = monster.spellcasting.map(sc => formatSpellcastingAsTrait(sc));
        traitJobs.push({ traits: spellcastingTraits, category: 'traits', name: 'spellcasting' });
    }
    
    // Rasgos (traits)
    if (monster.trait && monster.trait.length > 0) {
        console.log(`Adding ${monster.trait.length} traits...`);
        traitJobs.push({ traits: monster.trait, category: 'traits', name: 'traits' });
    }
    
    // Acciones (actions)
    if (monster.action && monster.action.length > 0) {
        console.log(`Adding ${monster.action.length} actions...`);
        traitJobs.push({ traits: monster.action, category: 'actions', name: 'actions' });
    }
    
    // Reacciones (reactions)
    if (monster.reaction && monster.reaction.length > 0) {
        console.log(`Adding ${monster.reaction.length} reactions...`);
        traitJobs.push({ traits: monster.reaction, category: 'reactions', name: 'reactions' });
    }
    
    // Acciones legendarias
    if (monster.legendary && monster.legendary.length > 0) {
        console.log(`Adding ${monster.legendary.length} legendary actions...`);
        traitJobs.push({ traits: monster.legendary, category: 'legendary_actions', name: 'legendary' });
    }
    
    // Acciones de bonificación
    if (monster.bonus && monster.bonus.length > 0) {
        console.log(`Adding ${monster.bonus.length} bonus actions...`);
        traitJobs.push({ traits: monster.bonus, category: 'bonus_actions', name: 'bonus' });
    }
    
    // Procesar trabajos SECUENCIALMENTE - uno completa antes de empezar el siguiente
    function processNextJob(index) {
        if (index >= traitJobs.length) {
            console.log('--- fillTraitsAndAbilities completed ---');
            
            // Acciones míticas al final (van en el cuadro de notas)
            if (monster.mythic && monster.mythic.length > 0) {
                console.log(`Adding mythic actions to notes...`);
                fillMythicActions(monster.mythic);
            }
            return;
        }
        
        const job = traitJobs[index];
        console.log(`  → Processing ${job.name} (${job.traits.length} items)...`);
        
        // Llamar a addTraits con un callback para cuando termine
        addTraitsWithCallback(job.traits, job.category, () => {
            console.log(`  ✓ ${job.name} completed, proceeding to next...`);
            // Procesar el siguiente trabajo
            processNextJob(index + 1);
        });
    }
    
    // Iniciar procesamiento
    processNextJob(0);
}

// Función para añadir rasgos/acciones dinámicamente con callback
function addTraitsWithCallback(traits, category, onComplete) {
    // Buscar todos los botones de añadir rasgo
    const addButtons = document.querySelectorAll('a.add_fields[data-association="creature_trait"]');
    
    if (addButtons.length === 0) {
        console.warn(`⚠️ No add buttons found for ${category}`);
        if (onComplete) onComplete();
        return;
    }
    
    console.log(`  Found ${addButtons.length} add buttons`);
    
    // Buscar el botón correcto leyendo el trait_category del template HTML
    let addButton = null;
    
    for (const button of addButtons) {
        const template = button.getAttribute('data-association-insertion-template');
        if (template) {
            const match = template.match(/trait_category.*?value="([^"]*)"/);
            if (match && match[1] === category) {
                addButton = button;
                console.log(`  ✓ Found correct button for ${category}: "${button.textContent.trim()}"`);
                break;
            }
        }
    }
    
    if (!addButton) {
        console.warn(`⚠️ Add button not found for category: ${category}`);
        if (onComplete) onComplete();
        return;
    }
    
    // Función recursiva para añadir rasgos UNO POR UNO esperando que termine el anterior
    function addNextTrait(index) {
        if (index >= traits.length) {
            console.log(`  ✓ All ${traits.length} ${category} added successfully`);
            // Llamar al callback cuando todos los rasgos de esta categoría estén completos
            if (onComplete) onComplete();
            return;
        }
        
        const trait = traits[index];
        console.log(`  Adding ${category} #${index + 1}: ${trait.name}`);
        
        // CAPTURAR los elementos ANTES del click
        const beforeFields = Array.from(document.querySelectorAll('.creature-trait-fields'));
        const beforeCount = beforeFields.length;
        
        // Simular click
        addButton.click();
        
        // Esperar a que se cree el campo y se inicialice SimpleMDE
        setTimeout(() => {
            // CAPTURAR los elementos DESPUÉS del click
            const afterFields = Array.from(document.querySelectorAll('.creature-trait-fields'));
            const afterCount = afterFields.length;
            
            console.log(`    Fields before: ${beforeCount}, after: ${afterCount}`);
            
            // Encontrar el elemento NUEVO (el que no estaba antes)
            const newField = afterFields.find(field => !beforeFields.includes(field));
            
            if (newField) {
                console.log(`    ✓ New trait field identified`);
                fillTraitFields(trait, category, index, newField);
                
                // Esperar 1 segundo más para asegurar que todo se procesó
                setTimeout(() => {
                    // Procesar el SIGUIENTE rasgo
                    addNextTrait(index + 1);
                }, 1000);
            } else {
                console.warn(`    ⚠️ Could not identify new trait field`);
                console.log(`    Trying fallback: using last field`);
                // Fallback: usar el último field
                if (afterFields.length > 0) {
                    fillTraitFields(trait, category, index, afterFields[afterFields.length - 1]);
                    setTimeout(() => addNextTrait(index + 1), 1000);
                } else {
                    // Si falla completamente, continuar con el siguiente
                    addNextTrait(index + 1);
                }
            }
        }, 3000); // 3 segundos de espera para que se cree el field
    }
    
    // Iniciar el proceso con el primer rasgo
    addNextTrait(0);
}

// Versión legacy sin callback (por compatibilidad, aunque ya no se usa)
export function addTraits(traits, category) {
    addTraitsWithCallback(traits, category, null);
}

// Función para rellenar campos de un rasgo individual
export function fillTraitFields(trait, category, index, traitField) {
    console.log(`  Filling fields for: ${trait.name}`);
    
    try {
        // Nombre - buscar el PRIMER input de nombre dentro de este traitField
        // Excluimos solo los de actionbar_actions (botones personalizados)
        const nameInputs = traitField.querySelectorAll('input[name*="[name]"]');
        let nameInput = null;
        
        for (let input of nameInputs) {
            if (!input.name.includes('actionbar_actions')) {
                nameInput = input;
                break;
            }
        }
        
        if (nameInput) {
            const cleanName = cleanText(trait.name || 'Sin nombre');
            nameInput.value = cleanName;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            nameInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`    ✓ Name set to: ${cleanName}`);
        } else {
            console.warn(`    ⚠️ Name input not found`);
        }
        
        // Descripción - buscar el PRIMER textarea dentro de este traitField
        const textareas = traitField.querySelectorAll('textarea[name*="[description]"]');
        let descriptionTextarea = null;
        
        if (textareas.length > 0) {
            descriptionTextarea = textareas[0];
        }
        
        if (!descriptionTextarea) {
            console.warn(`    ⚠️ Description textarea not found`);
            return;
        }
        
        const description = formatTraitDescription(trait);
        console.log(`    Setting description (${description.length} chars)...`);
        
        // Establecer en el textarea
        descriptionTextarea.value = description;
        descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`    ✓ Set in textarea`);
        
        // Añadir cuadro de copy-paste para SimpleMDE
        const fieldContainer = traitField.querySelector('.col-12');
        if (fieldContainer && !fieldContainer.querySelector('.auto-fill-description')) {
            const descBox = document.createElement('div');
            descBox.className = 'alert alert-warning auto-fill-description';
            descBox.style.marginTop = '10px';
            descBox.style.fontSize = '0.9em';
            descBox.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>📋 Descripción para copiar:</strong>
                    <button type="button" class="btn btn-sm btn-secondary float-right copy-desc-btn" style="padding: 2px 8px;">
                        Copiar
                    </button>
                </div>
                <div style="background: #f8f9fa; padding: 8px; border: 1px solid #ddd; border-radius: 4px; max-height: 150px; overflow-y: auto; font-family: monospace; white-space: pre-wrap; color: #212529 !important;">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <small style="display: block; margin-top: 5px; color: #ffffff !important;">
                    Haz click en el editor de arriba y pega (Ctrl+V)
                </small>
            `;
            
            const copyBtn = descBox.querySelector('.copy-desc-btn');
            copyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                navigator.clipboard.writeText(description).then(() => {
                    copyBtn.textContent = '✓ Copiado';
                    copyBtn.classList.remove('btn-secondary');
                    copyBtn.classList.add('btn-success');
                    
                    setTimeout(() => {
                        copyBtn.textContent = 'Copiar';
                        copyBtn.classList.remove('btn-success');
                        copyBtn.classList.add('btn-secondary');
                    }, 2000);
                }).catch(err => {
                    console.error('Error copying:', err);
                });
            });
            
            fieldContainer.appendChild(descBox);
            console.log(`    ✓ Added copy-paste box`);
        }
        
        // Intentar rellenar campos de ataque si es una acción
        if (category === 'actions') {
            fillAttackFields(traitField, trait);
        }
        
        console.log(`  ✓ ${trait.name} completed`);
        
    } catch (error) {
        console.error(`  ❌ Error filling trait fields:`, error.message);
    }
}

// Función para formatear descripción de rasgo
export function formatTraitDescription(trait) {
    if (!trait.entries) return '';
    
    let description = '';
    
    trait.entries.forEach(entry => {
        if (typeof entry === 'string') {
            // Texto simple
            description += cleanText(entry) + '\n\n';
        } else if (entry.type === 'list') {
            // Lista de items
            entry.items.forEach(item => {
                if (typeof item === 'string') {
                    // Item de texto simple
                    description += '• ' + cleanText(item) + '\n';
                } else if (item.type === 'itemSub') {
                    // Item con nombre y descripción (como Eye Rays del Beholder)
                    if (item.name) {
                        description += `**${cleanText(item.name)}:** `;
                    }
                    
                    // El contenido puede estar en "entry" o "entries"
                    if (item.entry) {
                        description += cleanText(item.entry) + '\n';
                    } else if (item.entries) {
                        // Múltiples párrafos
                        item.entries.forEach(subEntry => {
                            description += cleanText(subEntry) + ' ';
                        });
                        description += '\n';
                    }
                } else if (item.entries) {
                    // Item con entries (formato antiguo)
                    description += '• ' + cleanText(item.entries.join(' ')) + '\n';
                }
            });
            description += '\n';
        } else if (entry.type === 'entries' && entry.entries) {
            // Sección con nombre
            if (entry.name) {
                description += `**${entry.name}:** `;
            }
            description += cleanText(entry.entries.join(' ')) + '\n\n';
        }
    });
    
    return description.trim();
}

// Función para intentar rellenar campos de ataque
export function fillAttackFields(traitField, trait) {
    // Buscar si la acción tiene información de ataque
    const entryText = trait.entries?.join(' ') || '';
    
    // Buscar bonificador de ataque: "+X to hit" o "+X al ataque"
    const hitMatch = entryText.match(/\+(\d+)\s+(?:to hit|al ataque)/i);
    if (hitMatch) {
        const attackBonusInput = traitField.querySelector('input[name*="[attack_bonus]"]');
        if (attackBonusInput) {
            attackBonusInput.value = `+${hitMatch[1]}`;
            attackBonusInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    // Buscar tipo de ataque
    if (entryText.match(/melee.*attack/i)) {
        const attackRangeSelect = traitField.querySelector('select[name*="[attack_range]"]');
        if (attackRangeSelect) {
            attackRangeSelect.value = 'melee';
            attackRangeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    } else if (entryText.match(/ranged.*attack/i)) {
        const attackRangeSelect = traitField.querySelector('select[name*="[attack_range]"]');
        if (attackRangeSelect) {
            attackRangeSelect.value = 'ranged';
            attackRangeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}