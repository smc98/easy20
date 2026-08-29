/**
 * Popup Script - ES6 Module
 * Interfaz de selección de monstruos con fuentes dinámicas 5etools
 */

import { formatAlignment, formatSize, formatType, extractCR, extractAC } from './js/utils/formatters.js';
import * as pako from './js/lib/pako.esm.mjs';
import { bestiaryService } from './js/services/bestiary-service.js';
import { discoveryIndexService } from './js/services/discovery-index.js';
import { SEARCH_RESULT_LIMIT } from './js/services/bestiary-config.js';

let searchResults = [];
let selectedEntry = null;
let selectedMonster = null;
let officialSources = [];

function inflateGz(buffer) {
    return pako.inflate(buffer, { to: 'string' });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    showDataStatus('Cargando bestiario...', 'info');
    disableSearch(true);

    try {
        const { errors, usingBundledFallback } = await bestiaryService.init(inflateGz);
        await refreshSourcesUI();
        renderMonsterPlaceholder('Escribe un nombre para buscar criaturas');

        if (usingBundledFallback) {
            showDataStatus('Usando bestiario embebido (offline o sin fuentes activas)', 'warn');
        } else {
            showDataStatus('Bestiario remoto listo', 'ok');
        }

        if (errors.length > 0) {
            console.warn('Errores cargando fuentes:', errors);
            showDataStatus(`Algunas fuentes fallaron (${errors.length}). Revisa la consola.`, 'warn');
        }

        discoveryIndexService.ensureLoaded().catch(() => {});
    } catch (error) {
        console.error('Error loading bestiary:', error);
        showDataStatus('Error cargando el bestiario', 'error');
        showStatus('Error cargando el bestiario', 'error');
    } finally {
        disableSearch(false);
    }
}

init();

// ============================================================================
// SEARCH
// ============================================================================

async function runSearch(query) {
    const term = query.trim();
    hideDiscoveryPanel();

    if (!term) {
        searchResults = [];
        renderMonsterPlaceholder('Escribe un nombre para buscar criaturas');
        return;
    }

    searchResults = await bestiaryService.search(term);
    renderMonsterSelect();

    if (searchResults.length === 0) {
        await showDiscoverySuggestions(term);
    }
}

async function showDiscoverySuggestions(term) {
    const panel = document.getElementById('discoveryPanel');
    panel.hidden = false;
    panel.innerHTML = '<p class="hint">Buscando en otras fuentes oficiales...</p>';

    try {
        const prefs = await bestiaryService.getPrefs();
        const hits = await discoveryIndexService.searchInactiveSources(term, prefs.enabledOfficial);

        if (hits.length === 0) {
            panel.innerHTML = '<p class="hint">No aparece en otras fuentes oficiales de 5etools. Prueba otro nombre o añade homebrew.</p>';
            return;
        }

        panel.innerHTML = '<p class="discovery-title">Encontrada en fuentes no activas:</p>';
        const list = document.createElement('div');
        list.className = 'discovery-list';

        for (const hit of hits) {
            const row = document.createElement('div');
            row.className = 'discovery-item';

            const label = document.createElement('span');
            label.textContent = `${hit.name} — ${hit.source}`;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'secondary-btn small-btn';
            btn.textContent = 'Activar fuente';
            btn.addEventListener('click', async () => {
                showDataStatus(`Activando ${hit.source}...`, 'info');
                try {
                    await bestiaryService.enableOfficialSource(hit.source);
                    await refreshSourcesUI();
                    await runSearch(term);
                    showDataStatus(`Fuente ${hit.source} activada`, 'ok');
                } catch (err) {
                    showDataStatus(err.message, 'error');
                }
            });

            row.appendChild(label);
            row.appendChild(btn);
            list.appendChild(row);
        }

        panel.appendChild(list);
    } catch (err) {
        panel.innerHTML = `<p class="hint error-text">${err.message}</p>`;
    }
}

function hideDiscoveryPanel() {
    const panel = document.getElementById('discoveryPanel');
    panel.hidden = true;
    panel.innerHTML = '';
}

function renderMonsterPlaceholder(message) {
    hideDiscoveryPanel();
    const select = document.getElementById('monsterSelect');
    select.innerHTML = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = `-- ${message} --`;
    select.appendChild(option);
    selectedEntry = null;
    selectedMonster = null;
    document.getElementById('monsterInfo').hidden = true;
    document.getElementById('fillButton').disabled = true;
}

function renderMonsterSelect() {
    const select = document.getElementById('monsterSelect');
    select.innerHTML = '';

    if (searchResults.length === 0) {
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '-- Sin resultados --';
        select.appendChild(empty);
        return;
    }

    for (const entry of searchResults) {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = `${entry.name} (CR ${entry.cr}) - ${entry.source}`;
        option.dataset.entryId = entry.id;
        select.appendChild(option);
    }

    if (searchResults.length >= SEARCH_RESULT_LIMIT) {
        const note = document.createElement('option');
        note.value = '';
        note.disabled = true;
        note.textContent = `-- Primeros ${SEARCH_RESULT_LIMIT} resultados; afina la búsqueda --`;
        select.appendChild(note);
    }
}

document.getElementById('monsterSearch').addEventListener('input', (e) => {
    runSearch(e.target.value);
});

// ============================================================================
// MONSTER SELECTION
// ============================================================================

document.getElementById('monsterSelect').addEventListener('change', async (e) => {
    const selectedOption = e.target.selectedOptions[0];
    selectedEntry = searchResults.find(r => r.id === selectedOption?.value) || null;

    if (!selectedEntry) {
        selectedMonster = null;
        document.getElementById('monsterInfo').hidden = true;
        document.getElementById('fillButton').disabled = true;
        return;
    }

    try {
        showStatus('Cargando monstruo...', 'info');
        selectedMonster = await bestiaryService.getMonster(selectedEntry);
        displayMonsterInfo(selectedMonster);
        document.getElementById('fillButton').disabled = false;
        document.getElementById('status').style.display = 'none';
    } catch (error) {
        console.error(error);
        selectedMonster = null;
        showStatus('Error cargando el monstruo', 'error');
        document.getElementById('fillButton').disabled = true;
    }
});

// ============================================================================
// SOURCES UI
// ============================================================================

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => {
            const active = t.dataset.tab === target;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            const active = panel.id === `tab-${target}`;
            panel.classList.toggle('active', active);
            panel.hidden = !active;
        });
    });
});

async function refreshSourcesUI() {
    const prefs = await bestiaryService.getPrefs();
    officialSources = await bestiaryService.getOfficialSourcesList();
    renderOfficialSources(prefs.enabledOfficial);
    await renderInstalledBrewList();
}

function renderOfficialSources(enabledCodes) {
    const container = document.getElementById('officialSourcesList');
    const filter = document.getElementById('officialSearch').value.toLowerCase().trim();
    container.innerHTML = '';

    const filtered = officialSources.filter(s => {
        if (!filter) return true;
        const haystack = `${s.code} ${s.name || ''} ${s.label || ''}`.toLowerCase();
        return haystack.includes(filter);
    });

    if (!filter && filtered.length > 0) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = `${filtered.length} fuentes — busca por nombre o sigla`;
        container.appendChild(hint);
    }

    for (const source of filtered) {
        const label = document.createElement('label');
        label.className = 'source-item';
        label.title = source.code;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = enabledCodes.includes(source.code);
        checkbox.addEventListener('change', async () => {
            showDataStatus(`Actualizando ${source.code}...`, 'info');
            try {
                if (checkbox.checked) {
                    await bestiaryService.enableOfficialSource(source.code);
                } else {
                    await bestiaryService.disableOfficialSource(source.code);
                }
                await runSearch(document.getElementById('monsterSearch').value);
                showDataStatus('Fuentes actualizadas', 'ok');
            } catch (err) {
                checkbox.checked = !checkbox.checked;
                showDataStatus(err.message, 'error');
            }
        });

        const text = document.createElement('span');
        text.className = 'source-item-text';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'source-item-name';
        nameSpan.textContent = source.name && source.name !== source.code
            ? source.name
            : source.code;

        const codeSpan = document.createElement('span');
        codeSpan.className = 'source-item-code';
        codeSpan.textContent = source.code;

        text.appendChild(nameSpan);
        if (source.name && source.name !== source.code) {
            text.appendChild(codeSpan);
        }

        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
    }

    if (filter && filtered.length === 0) {
        container.innerHTML = '<p class="hint">Sin fuentes que coincidan</p>';
    }
}

document.getElementById('officialSearch').addEventListener('input', async () => {
    const prefs = await bestiaryService.getPrefs();
    renderOfficialSources(prefs.enabledOfficial);
});

let brewSearchTimeout;
document.getElementById('brewSearch').addEventListener('input', (e) => {
    clearTimeout(brewSearchTimeout);
    brewSearchTimeout = setTimeout(() => searchBrew(e.target.value), 300);
});

async function searchBrew(query) {
    const container = document.getElementById('brewResultsList');
    if (!query.trim()) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<p class="hint">Buscando...</p>';
    try {
        const results = await bestiaryService.searchBrewCatalog(query);
        const prefs = await bestiaryService.getPrefs();
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = '<p class="hint">Sin resultados con criaturas</p>';
            return;
        }

        for (const brew of results) {
            const row = document.createElement('div');
            row.className = 'brew-item';

            const label = document.createElement('span');
            label.textContent = brew.label;
            label.title = brew.relativePath;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'secondary-btn small-btn';
            const isEnabled = prefs.enabledBrew.includes(brew.relativePath);
            btn.textContent = isEnabled ? 'Quitar' : 'Añadir';

            btn.addEventListener('click', async () => {
                showDataStatus(`Procesando ${brew.label}...`, 'info');
                try {
                    const currentPrefs = await bestiaryService.getPrefs();
                    const enabled = currentPrefs.enabledBrew.includes(brew.relativePath);
                    if (enabled) {
                        await bestiaryService.disableBrewSource(brew.relativePath);
                    } else {
                        await bestiaryService.enableBrewSource(brew.relativePath);
                    }
                    await searchBrew(query);
                    await refreshSourcesUI();
                    await runSearch(document.getElementById('monsterSearch').value);
                    showDataStatus('Homebrew actualizado', 'ok');
                } catch (err) {
                    showDataStatus(err.message, 'error');
                }
            });

            row.appendChild(label);
            row.appendChild(btn);
            container.appendChild(row);
        }
    } catch (err) {
        container.innerHTML = `<p class="hint error-text">${err.message}</p>`;
    }
}

async function renderInstalledBrewList() {
    const container = document.getElementById('installedBrewList');
    const installed = await bestiaryService.getInstalledBrew();
    container.innerHTML = '';

    if (installed.length === 0) {
        container.innerHTML = '<p class="hint">Ningún homebrew instalado. Búscalo abajo o añade una URL.</p>';
        return;
    }

    for (const item of installed) {
        const row = document.createElement('div');
        row.className = 'brew-item';

        const text = document.createElement('div');
        text.className = 'installed-brew-text';

        const title = document.createElement('span');
        title.className = 'installed-brew-title';
        title.textContent = item.label;
        title.title = item.detail;

        const meta = document.createElement('span');
        meta.className = 'installed-brew-meta';
        const kindLabel = item.kind === 'custom' ? 'URL' : 'Catálogo';
        const countLabel = item.monsterCount != null ? ` · ${item.monsterCount} criaturas` : '';
        meta.textContent = `${kindLabel}${countLabel}`;

        text.appendChild(title);
        text.appendChild(meta);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'secondary-btn small-btn';
        btn.textContent = 'Quitar';
        btn.addEventListener('click', async () => {
            showDataStatus(`Quitando ${item.label}...`, 'info');
            try {
                if (item.kind === 'custom') {
                    await bestiaryService.removeCustomBrewUrl(item.id);
                } else {
                    await bestiaryService.disableBrewSource(item.id);
                }
                await refreshSourcesUI();
                const brewQuery = document.getElementById('brewSearch').value;
                if (brewQuery.trim()) {
                    await searchBrew(brewQuery);
                }
                await runSearch(document.getElementById('monsterSearch').value);
                showDataStatus('Homebrew quitado', 'ok');
            } catch (err) {
                showDataStatus(err.message, 'error');
            }
        });

        row.appendChild(text);
        row.appendChild(btn);
        container.appendChild(row);
    }
}

document.getElementById('addCustomBrewBtn').addEventListener('click', async () => {
    const input = document.getElementById('customBrewUrl');
    const url = input.value.trim();
    if (!url) return;

    showDataStatus('Cargando homebrew...', 'info');
    try {
        await bestiaryService.addCustomBrewUrl(url);
        input.value = '';
        await refreshSourcesUI();
        await runSearch(document.getElementById('monsterSearch').value);
        showDataStatus('Homebrew añadido', 'ok');
    } catch (err) {
        showDataStatus(err.message, 'error');
    }
});

document.getElementById('clearCacheBtn').addEventListener('click', async () => {
    await bestiaryService.clearCache();
    discoveryIndexService.invalidateMemoryCache();
    await bestiaryService.reload(inflateGz);
    await discoveryIndexService.ensureLoaded();
    await refreshSourcesUI();
    await runSearch(document.getElementById('monsterSearch').value);
    showDataStatus('Caché limpiada y bestiario recargado', 'ok');
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
        <p><strong>Fuente:</strong> ${monster.source || '—'}</p>
    `;

    infoDiv.hidden = false;
}

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

document.getElementById('fillButton').addEventListener('click', async () => {
    if (!selectedMonster) {
        showStatus('No hay monstruo seleccionado', 'error');
        return;
    }

    showStatus('Rellenando formulario...', 'info');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url.includes('nivel20.com')) {
            showStatus('Debes estar en nivel20.com para usar esta función', 'error');
            return;
        }

        chrome.tabs.sendMessage(tab.id, {
            action: 'fillMonster',
            monster: selectedMonster,
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
// UI HELPERS
// ============================================================================

function disableSearch(disabled) {
    document.getElementById('monsterSearch').disabled = disabled;
    document.getElementById('monsterSelect').disabled = disabled;
}

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

function showDataStatus(message, type) {
    const el = document.getElementById('dataStatus');
    el.textContent = message;
    el.className = 'data-status ' + type;
    el.hidden = false;
}
