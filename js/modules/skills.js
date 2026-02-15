/**
 * Skills Module
 * Maneja habilidades dinámicas (nested fields)
 */

export function fillSkills(monster) {
    if (!monster.skill || Object.keys(monster.skill).length === 0) {
        console.log('No skills to add');
        return;
    }
    
    console.log('--- fillSkills ---');
    console.log('Skills:', monster.skill);
    
    // Mapeo completo de skills de inglés a español (valores del select)
    const skillMap = {
        'acrobatics': 'acrobacias',
        'animal handling': 'trato_con_animales',
        'arcana': 'arcanos',
        'athletics': 'atletismo',
        'deception': 'enganar',
        'history': 'historia',
        'insight': 'perspicacia',
        'intimidation': 'intimidar',
        'investigation': 'investigacion',
        'medicine': 'medicina',
        'nature': 'naturaleza',
        'perception': 'percepcion',
        'performance': 'interpretacion',
        'persuasion': 'persuasion',
        'religion': 'religion',
        'sleight of hand': 'juego_de_manos',
        'stealth': 'sigilo',
        'survival': 'supervivencia'
    };
    
    // Buscar TODOS los botones "Añadir" de tipo add-nested
    const addButtons = document.querySelectorAll('button.add-nested[type="button"]');
    
    // El segundo botón debería ser el de skills (el primero es saving throws)
    const skillsAddButton = addButtons[1];
    
    if (!skillsAddButton) {
        console.warn('⚠️ Add skills button not found');
        return;
    }
    
    console.log(`Found add button, adding ${Object.keys(monster.skill).length} skills`);
    
    // Añadir cada skill
    const skills = Object.entries(monster.skill);
    
    skills.forEach(([skill, modifier], index) => {
        setTimeout(() => {
            console.log(`  Adding skill #${index + 1}: ${skill} ${modifier}`);
            
            // Capturar elementos antes del click
            const beforeFields = Array.from(document.querySelectorAll('.slug-value-form'));
            
            // Click en añadir
            skillsAddButton.click();
            
            // Esperar a que se cree el nuevo campo
            setTimeout(() => {
                const afterFields = Array.from(document.querySelectorAll('.slug-value-form'));
                const newField = afterFields.find(field => !beforeFields.includes(field));
                
                if (newField) {
                    console.log(`    New field created (${beforeFields.length} -> ${afterFields.length})`);
                    
                    // Buscar el select de skill (no template)
                    const select = newField.querySelector('select[name*="skills_attributes"]:not([name*="nested_field_template"])');
                    
                    // Buscar el input de valor (no template)
                    const valueInput = newField.querySelector('input[name*="[value]"]:not([name*="nested_field_template"])');
                    
                    if (select && valueInput) {
                        // Mapear skill de inglés a español
                        const skillCode = skillMap[skill.toLowerCase()] || skill.toLowerCase().replace(/ /g, '_');
                        select.value = skillCode;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`    ✓ Skill set to: ${skill} -> ${skillCode}`);
                        
                        // Establecer el modificador
                        valueInput.value = modifier;
                        valueInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log(`    ✓ Modifier set to: ${modifier}`);
                    } else {
                        console.warn(`    ⚠️ Could not find select or input in new field`);
                    }
                } else {
                    console.warn(`    ⚠️ Could not identify new field`);
                }
            }, 500); // Esperar 500ms para que se cree el campo
            
        }, index * 1000); // 1 segundo entre cada skill
    });
    
    console.log('--- fillSkills completed ---');
}