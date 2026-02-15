/**
 * Saving Throws Module
 * Maneja tiradas de salvación dinámicas (nested fields)
 */

export function fillSavingThrows(monster) {
    if (!monster.save || Object.keys(monster.save).length === 0) {
        console.log('No saving throws to add');
        return;
    }
    
    console.log('--- fillSavingThrows ---');
    console.log('Saves:', monster.save);
    
    // Mapeo de códigos de habilidad a español
    const abilityMap = {
        'str': 'fue',  // Fuerza
        'dex': 'des',  // Destreza
        'con': 'con',  // Constitución
        'int': 'int',  // Inteligencia
        'wis': 'sab',  // Sabiduría
        'cha': 'car'   // Carisma
    };
    
    // Buscar el botón "Añadir"
    const addButton = document.querySelector('button.add-nested[type="button"]');
    
    if (!addButton) {
        console.warn('⚠️ Add saving throw button not found');
        return;
    }
    
    console.log(`Found add button, adding ${Object.keys(monster.save).length} saving throws`);
    
    // Añadir cada saving throw
    const saves = Object.entries(monster.save);
    
    saves.forEach(([ability, modifier], index) => {
        setTimeout(() => {
            console.log(`  Adding save #${index + 1}: ${ability} ${modifier}`);
            
            // Capturar elementos antes del click
            const beforeFields = Array.from(document.querySelectorAll('.slug-value-form'));
            
            // Click en añadir
            addButton.click();
            
            // Esperar a que se cree el nuevo campo
            setTimeout(() => {
                const afterFields = Array.from(document.querySelectorAll('.slug-value-form'));
                const newField = afterFields.find(field => !beforeFields.includes(field));
                
                if (newField) {
                    console.log(`    New field created (${beforeFields.length} -> ${afterFields.length})`);
                    
                    // Buscar el select de habilidad (no template)
                    const select = newField.querySelector('select[name*="saving_throws_attributes"]:not([name*="nested_field_template"])');
                    
                    // Buscar el input de valor (no template)
                    const valueInput = newField.querySelector('input[name*="[value]"]:not([name*="nested_field_template"])');
                    
                    if (select && valueInput) {
                        // Establecer la habilidad (mapear de inglés a código español)
                        const abilityCode = abilityMap[ability.toLowerCase()] || ability;
                        select.value = abilityCode;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`    ✓ Ability set to: ${ability} -> ${abilityCode}`);
                        
                        // Establecer el modificador (quitar el signo +)
                        const cleanModifier = modifier.replace('+', '');
                        valueInput.value = cleanModifier;
                        valueInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log(`    ✓ Modifier set to: ${cleanModifier}`);
                    } else {
                        console.warn(`    ⚠️ Could not find select or input in new field`);
                    }
                } else {
                    console.warn(`    ⚠️ Could not identify new field`);
                }
            }, 500); // Esperar 500ms para que se cree el campo
            
        }, index * 1000); // 1 segundo entre cada saving throw
    });
    
    console.log('--- fillSavingThrows completed ---');
}