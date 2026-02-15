/**
 * Popup Script - ES6 Module
 * Interfaz de selección de monstruos
 */

// Import shared utilities
import { formatAlignment, formatSize, formatType,extractCR, extractAC } from './js/utils/formatters.js';
import  * as pako from './js/lib/pako.esm.mjs';

// ============================================================================
// STATE
// ============================================================================

let bestiaryData = [];
let selectedMonster = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load JSON compressed data
fetch(chrome.runtime.getURL('js/data/bestiary-data.json.gz'))
    .then(response => response.arrayBuffer())
    .then(buffer => {
        // Descomprimir con pako
        const decompressed = pako.inflate(new Uint8Array(buffer), { to: 'string' });
        return JSON.parse(decompressed);
    })
    .then(data => {
        bestiaryData = data;
        populateMonsterSelect();
    })
    .catch(error => {
        console.error('Error loading bestiary:', error);
        showStatus('Error cargando el bestiario', 'error');
    });

// ============================================================================
// MONSTER LIST
// ============================================================================

function populateMonsterSelect() {
    const select = document.getElementById('monsterSelect');
    
    bestiaryData.forEach(monster => {
        const option = document.createElement('option');
        const cr = extractCR(monster);
        const source = monster.source || '';
        option.value = monster.name;
        option.textContent = `${monster.name} (CR ${cr})${source ? ' - ' + source : ''}`;
        option.dataset.monsterData = JSON.stringify(monster);
        select.appendChild(option);
    });
}

// ============================================================================
// SEARCH
// ============================================================================

document.getElementById('monsterSearch').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const select = document.getElementById('monsterSelect');
    const options = select.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === '') return;
        
        const monsterName = option.value.toLowerCase();
        if (monsterName.includes(searchTerm)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    });
});

// ============================================================================
// MONSTER SELECTION
// ============================================================================

document.getElementById('monsterSelect').addEventListener('change', function(e) {
    const selectedOption = e.target.selectedOptions[0];
    
    if (selectedOption && selectedOption.dataset.monsterData) {
        selectedMonster = JSON.parse(selectedOption.dataset.monsterData);
        displayMonsterInfo(selectedMonster);
        document.getElementById('fillButton').disabled = false;
    } else {
        selectedMonster = null;
        document.getElementById('monsterInfo').style.display = 'none';
        document.getElementById('fillButton').disabled = true;
    }
});

// ============================================================================
// MONSTER INFO DISPLAY
// ============================================================================

function displayMonsterInfo(monster) {
    const infoDiv = document.getElementById('monsterInfo');
    const nameEl = document.getElementById('monsterName');
    const crEl = document.getElementById('monsterCR');
    const detailsEl = document.getElementById('monsterDetails');
    
    nameEl.textContent = monster.name;
    
    const cr = extractCR(monster);
    crEl.textContent = `CR ${cr}`;
    crEl.className = 'cr-badge ' + getCRClass(cr);
    
    const type = monster.type?.type || monster.type || 'Unknown';
    const typeInSpanish = formatType(type);
    const size = formatSize(monster.size?.[0] || 'M');
    const alignment = formatAlignment(monster.alignment);
    const [ac] = extractAC(monster);
    const hp = monster.hp?.average || 0;
    
    detailsEl.innerHTML = `
        <p><strong>Tipo:</strong> ${size} ${typeInSpanish}</p>
        <p><strong>Alineamiento:</strong> ${alignment}</p>
        <p><strong>CA:</strong> ${ac}</p>
        <p><strong>PG:</strong> ${hp}</p>
    `;
    
    infoDiv.style.display = 'block';
}

// ============================================================================
// LOCAL UTILITIES (popup-specific)
// ============================================================================


function getCRClass(cr) {
    const crNum = cr === '1/8' ? 0.125 : cr === '1/4' ? 0.25 : cr === '1/2' ? 0.5 : parseFloat(cr);
    if (crNum === 0) return 'cr-0';
    if (crNum < 5) return 'cr-low';
    if (crNum < 11) return 'cr-medium';
    if (crNum < 17) return 'cr-high';
    return 'cr-deadly';
}

// ============================================================================
// FILL BUTTON
// ============================================================================

document.getElementById('fillButton').addEventListener('click', async function() {
    if (!selectedMonster) {
        showStatus('No hay monstruo seleccionado', 'error');
        return;
    }
    
    showStatus('Rellenando formulario...', 'info');
    
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on nivel20.com
        if (!tab.url.includes('nivel20.com')) {
            showStatus('Debes estar en nivel20.com para usar esta función', 'error');
            return;
        }
        
        // Send monster data to content script
        chrome.tabs.sendMessage(tab.id, {
            action: 'fillMonster',
            monster: selectedMonster
        }, response => {
            if (chrome.runtime.lastError) {
                showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
            } else if (response && response.success) {
                showStatus('✓ Formulario rellenado correctamente', 'success');
            } else {
                showStatus('Error al rellenar el formulario', 'error');
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error: ' + error.message, 'error');
    }
});

// ============================================================================
// STATUS DISPLAY
// ============================================================================

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    statusEl.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}