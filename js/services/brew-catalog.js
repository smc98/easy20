import {
    OFFICIAL_INDEX_PATH,
    BOOKS_PATH,
    ADVENTURES_PATH,
    SOURCE_NAMES_AUX_KEY,
    DISCOVERY_INDEX_TTL_MS,
    BREW_INDEX_SOURCES_URL,
    BREW_INDEX_META_URL,
    BREW_INDEX_PROPS_URL,
    BREW_BASE,
} from './bestiary-config.js';
import { fetchOfficialJson, fetchDataJson, fetchJson } from './bestiary-fetch.js';
import * as cache from './bestiary-cache.js';

/** Nombres para fuentes de bestiario que no salen en books/adventures.json */
const SOURCE_NAME_FALLBACKS = {
    ESK: 'Essentials Kit',
    MCV2DC: 'Monstrous Compendium Vol. 2: Dragonlance Creatures',
    MCV3MC: 'Monstrous Compendium Vol. 3: Minecraft Creatures',
    MisMV1: 'Misplaced Monsters: Volume 1',
    MFF: "Mordenkainen's Fiendish Folio",
    PSA: 'Plane Shift: Amonkhet',
    PSD: 'Plane Shift: Dominaria',
    PSI: 'Plane Shift: Innistrad',
    PSK: 'Plane Shift: Kaladesh',
    PSX: 'Plane Shift: Ixalan',
    PSZ: 'Plane Shift: Zendikar',
    SADS: 'Sapphire Anniversary Dice Set',
    TftYP: 'Tales from the Yawning Portal',
    VD: 'Vecna Dossier',
};

let officialIndexCache = null;
let sourceNamesCache = null;
let brewSourcesCache = null;
let brewMetaCache = null;
let brewMonsterPathsCache = null;

export async function getOfficialIndex() {
    if (officialIndexCache) return officialIndexCache;
    officialIndexCache = await fetchOfficialJson(OFFICIAL_INDEX_PATH);
    return officialIndexCache;
}

async function buildSourceNamesMap() {
    const [books, adventures] = await Promise.all([
        fetchDataJson(BOOKS_PATH),
        fetchDataJson(ADVENTURES_PATH),
    ]);

    const map = { ...SOURCE_NAME_FALLBACKS };

    for (const book of books.book || []) {
        const code = book.id || book.source;
        if (code && book.name) {
            map[code] = book.name;
        }
    }

    for (const adventure of adventures.adventure || []) {
        const code = adventure.id || adventure.source;
        if (code && adventure.name) {
            map[code] = adventure.name;
        }
    }

    return map;
}

export async function getOfficialSourceNames() {
    if (sourceNamesCache) return sourceNamesCache;

    const cached = await cache.getAuxData(SOURCE_NAMES_AUX_KEY);
    if (cached && cache.isCacheFresh(cached.fetchedAt, DISCOVERY_INDEX_TTL_MS)) {
        sourceNamesCache = cached.payload;
        return sourceNamesCache;
    }

    try {
        const map = await buildSourceNamesMap();
        sourceNamesCache = map;
        await cache.setAuxData(SOURCE_NAMES_AUX_KEY, map);
        return map;
    } catch (err) {
        console.warn('No se pudieron cargar nombres de fuentes:', err);
        sourceNamesCache = cached?.payload || { ...SOURCE_NAME_FALLBACKS };
        return sourceNamesCache;
    }
}

export async function getOfficialSourcesList() {
    const [index, names] = await Promise.all([
        getOfficialIndex(),
        getOfficialSourceNames(),
    ]);

    return Object.keys(index)
        .sort((a, b) => {
            const nameA = names[a] || a;
            const nameB = names[b] || b;
            return nameA.localeCompare(nameB) || a.localeCompare(b);
        })
        .map(code => ({
            code,
            filename: index[code],
            name: names[code] || code,
            label: names[code] ? `${names[code]} (${code})` : code,
        }));
}

export async function getBrewSourcesIndex() {
    if (brewSourcesCache) return brewSourcesCache;
    brewSourcesCache = await fetchJson(BREW_INDEX_SOURCES_URL);
    return brewSourcesCache;
}

export async function getBrewMetaIndex() {
    if (brewMetaCache) return brewMetaCache;
    brewMetaCache = await fetchJson(BREW_INDEX_META_URL);
    return brewMetaCache;
}

/** Set de rutas de homebrew que incluyen entradas `monster`. */
export async function getBrewMonsterPaths() {
    if (brewMonsterPathsCache) return brewMonsterPathsCache;
    const props = await fetchJson(BREW_INDEX_PROPS_URL);
    brewMonsterPathsCache = new Set(Object.keys(props.monster || {}));
    return brewMonsterPathsCache;
}

export async function searchBrewCatalog(query, limit = 50) {
    const [sourcesIndex, metaIndex, monsterPaths] = await Promise.all([
        getBrewSourcesIndex(),
        getBrewMetaIndex(),
        getBrewMonsterPaths(),
    ]);

    const term = query.trim().toLowerCase();
    const results = [];

    for (const [sourceCode, relativePath] of Object.entries(sourcesIndex)) {
        if (!monsterPaths.has(relativePath)) {
            continue;
        }

        const meta = metaIndex[relativePath];
        const label = meta?.n || relativePath.split('/').pop()?.replace('.json', '') || sourceCode;
        const haystack = `${sourceCode} ${label} ${relativePath}`.toLowerCase();

        if (!term || haystack.includes(term)) {
            results.push({
                sourceCode,
                relativePath,
                label,
                url: `${BREW_BASE}${relativePath}`,
            });
        }
    }

    return results.sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
}

export function getBrewFileUrl(relativePath) {
    return `${BREW_BASE}${relativePath}`;
}
