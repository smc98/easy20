import {
    CREATURE_CATEGORY_ID,
    DISCOVERY_INDEX_AUX_KEY,
    DISCOVERY_INDEX_TTL_MS,
    DISCOVERY_RESULT_LIMIT,
    SEARCH_INDEX_URLS,
} from './bestiary-config.js';
import * as cache from './bestiary-cache.js';
import { fetchJsonWithFallback, isOnline } from './bestiary-fetch.js';
import { getOfficialIndex } from './brew-catalog.js';

let memoryEntries = null;

function buildSourceLookup(officialIndex) {
    const lookup = new Map();
    for (const code of Object.keys(officialIndex)) {
        lookup.set(code.toLowerCase(), code);
    }
    return lookup;
}

function parseSourceFromSlug(slug, sourceLookup) {
    const normalized = slug.toLowerCase();
    if (sourceLookup.has(normalized)) {
        return sourceLookup.get(normalized);
    }
    return slug.toUpperCase();
}

function parseCreatureEntry(raw, sourceLookup) {
    if (raw.c !== CREATURE_CATEGORY_ID || !raw.n || !raw.u) {
        return null;
    }

    const decoded = decodeURIComponent(raw.u);
    const separator = decoded.lastIndexOf('_');
    if (separator === -1) {
        return null;
    }

    const sourceSlug = decoded.slice(separator + 1);
    const source = parseSourceFromSlug(sourceSlug, sourceLookup);
    const name = raw.n;

    return {
        name,
        nameLower: name.toLowerCase(),
        source,
        page: raw.p ?? null,
    };
}

function parseSearchIndexPayload(payload, sourceLookup) {
    const rows = Array.isArray(payload.x) ? payload.x : [];
    const entries = [];

    for (const row of rows) {
        const entry = parseCreatureEntry(row, sourceLookup);
        if (entry) {
            entries.push(entry);
        }
    }
    return entries;
}

async function downloadAndParseIndex() {
    const [payload, officialIndex] = await Promise.all([
        fetchJsonWithFallback(SEARCH_INDEX_URLS),
        getOfficialIndex(),
    ]);

    const sourceLookup = buildSourceLookup(officialIndex);
    return parseSearchIndexPayload(payload, sourceLookup);
}

async function loadEntries() {
    if (memoryEntries) {
        return memoryEntries;
    }

    const cached = await cache.getAuxData(DISCOVERY_INDEX_AUX_KEY);
    if (cached && cache.isCacheFresh(cached.fetchedAt, DISCOVERY_INDEX_TTL_MS)) {
        memoryEntries = cached.payload;
        return memoryEntries;
    }

    if (!isOnline()) {
        memoryEntries = cached?.payload ?? [];
        return memoryEntries;
    }

    const entries = await downloadAndParseIndex();
    memoryEntries = entries;
    await cache.setAuxData(DISCOVERY_INDEX_AUX_KEY, entries);
    return entries;
}

export const discoveryIndexService = {
    /** Carga el índice si hace falta (>24h o sin caché). No bloquea la UI si falla. */
    async ensureLoaded() {
        try {
            await loadEntries();
            return true;
        } catch (err) {
            console.warn('No se pudo cargar el índice de descubrimiento:', err);
            return false;
        }
    },

    invalidateMemoryCache() {
        memoryEntries = null;
    },

    /**
     * Busca criaturas en fuentes oficiales no activadas.
     * @param {string} query
     * @param {string[]} enabledOfficialSources
     */
    async searchInactiveSources(query, enabledOfficialSources = []) {
        const term = query.trim().toLowerCase();
        if (!term) {
            return [];
        }

        await this.ensureLoaded();
        const entries = memoryEntries ?? [];
        const enabled = new Set(enabledOfficialSources);

        const matches = entries.filter(entry =>
            entry.nameLower.includes(term) && !enabled.has(entry.source)
        );

        matches.sort((a, b) => a.name.localeCompare(b.name));
        return matches.slice(0, DISCOVERY_RESULT_LIMIT);
    },
};
