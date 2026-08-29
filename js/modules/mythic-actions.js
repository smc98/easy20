/**
 * Mythic Actions Module
 * Maneja acciones míticas en el cuadro de notas
 */

import { cleanText } from '../utils/text-cleaner.js';

export function fillMythicActions(mythicActions) {
    console.log('--- fillMythicActions ---');
    
    // Buscar el campo de título de notas
    const notesTitleInput = document.querySelector('#creature_notes_title');
    
    if (!notesTitleInput) {
        console.warn('⚠️ Notes title field not found');
        return;
    }
    
    // Establecer el título
    notesTitleInput.value = 'Acciones Míticas';
    notesTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✓ Notes title set to: Acciones Míticas');
    
    // Formatear las acciones míticas
    let mythicText = '';
    
    mythicActions.forEach((action, index) => {
        if (index > 0) mythicText += '\n\n';
        
        // Nombre de la acción
        mythicText += `**${cleanText(action.name)}**\n`;
        
        // Descripción
        if (action.entries) {
            const description = action.entries
                .map(entry => cleanText(entry))
                .join(' ');
            mythicText += description;
        }
    });
    
    console.log(`Formatted ${mythicActions.length} mythic actions (${mythicText.length} chars)`);
    
    // Buscar el textarea de notas
    const notesTextarea = document.querySelector('textarea#creature_notes');
    
    if (!notesTextarea) {
        console.warn('⚠️ Notes textarea not found');
        return;
    }
    
    notesTextarea.value = mythicText;
    notesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    notesTextarea.dispatchEvent(new Event('change', { bubbles: true }));

    const cm = notesTextarea.closest('.form-group')?.querySelector('.CodeMirror')?.CodeMirror
        || document.querySelector('#creature_notes')?.nextElementSibling?.querySelector?.('.CodeMirror')?.CodeMirror
        || notesTextarea.parentElement?.querySelector('.CodeMirror')?.CodeMirror;

    let editorFilled = false;
    if (cm) {
        cm.setValue(mythicText);
        if (typeof cm.save === 'function') cm.save();
        else notesTextarea.value = mythicText;
        cm.refresh?.();
        editorFilled = cm.getValue() === mythicText;
        console.log(editorFilled ? '✓ Mythic text set via CodeMirror' : '⚠️ CodeMirror set with mismatch');
    } else {
        console.log('✓ Mythic actions text set in textarea (no CodeMirror yet)');
    }

    // Buscar el contenedor EasyMDE / form-group para el respaldo copy-paste
    const formGroup = notesTextarea.closest('.form-group');

    if (formGroup && !formGroup.querySelector('.auto-fill-mythic')) {
        const mythicBox = document.createElement('div');
        mythicBox.className = editorFilled
            ? 'alert alert-secondary auto-fill-mythic'
            : 'alert alert-info auto-fill-mythic';
        mythicBox.style.marginTop = '10px';
        mythicBox.style.fontSize = '0.9em';
        const title = editorFilled
            ? '📜 Respaldo (si el editor de notas no se actualizó):'
            : '📜 Acciones Míticas para copiar:';
        mythicBox.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>${title}</strong>
                    <button type="button" class="btn btn-sm btn-secondary float-right copy-mythic-btn" style="padding: 2px 8px;">
                        Copiar
                    </button>
                </div>
                <div style="background: #f8f9fa; padding: 8px; border: 1px solid #ddd; border-radius: 4px; max-height: 300px; overflow-y: auto; font-family: monospace; white-space: pre-wrap; color: #212529 !important;">${mythicText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <small style="display: block; margin-top: 5px;">
                    Haz click en el editor de arriba y pega (Ctrl+V) si hace falta
                </small>
            `;

        const copyBtn = mythicBox.querySelector('.copy-mythic-btn');
        copyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            navigator.clipboard.writeText(mythicText).then(() => {
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

        formGroup.appendChild(mythicBox);
        console.log('✓ Added copy-paste fallback for mythic actions');
    }
    
    console.log('--- fillMythicActions completed ---');
}