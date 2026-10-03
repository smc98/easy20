import {
    BUNDLED_SOURCE_KEY,
    BUNDLED_GZ_PATH,
    officialSourceKey,
    brewSourceKey,
    customBrewSourceKey,
    monsterId,
} from './bestiary-config.js';
import { extractCR } from '../utils/formatters.js';
import * as cache from './bestiary-cache.js';
import { fetchOfficialJson, fetchJson } from './bestiary-fetch.js';
import { getOfficialIndex, getBrewFileUrl } from './brew-catalog.js';

function normalizePayload(payload) {
    if (Array.isArray(payload)) {
        return { monsters: payload, legendaryGroups: [] };
    }

    return {
        monsters: payload.monster || [],
        legendaryGroups: payload.legendaryGroup || [],
        meta: payload._meta || null,
    };
}

function buildSearchEntries(sourceKey, monsters) {
    return monsters.map((monster, monsterIndex) => {
        const source = monster.source || 'Unknown';
        const name = monster.name || 'Unknown';
        const cr = extractCR(monster);

        return {
            id: monsterId(source, name),
            name,
            nameLower: name.toLowerCase(),
            source,
            cr,
            sourceKey,
            monsterIndex,
        };
    });
}

async function indexSource(sourceKey, payload, meta) {
    const { monsters, legendaryGroups } = normalizePayload(payload);
    const entries = buildSearchEntries(sourceKey, monsters);

    await cache.setSourceData(sourceKey, { monsters, legendaryGroups });
    await cache.setSourceMeta({
        sourceKey,
        ...meta,
        monsterCount: monsters.length,
        fetchedAt: Date.now(),
    });
    await cache.putSearchEntries(entries);

    return { monsterCount: monsters.length };
}

export async function loadOfficialSource(sourceCode) {
    const sourceKey = officialSourceKey(sourceCode);
    const existing = await cache.getSourceMeta(sourceKey);
    if (existing && cache.isCacheFresh(existing.fetchedAt)) {
        return existing;
    }

    const index = await getOfficialIndex();
    const filename = index[sourceCode];
    if (!filename) {
        throw new Error(`Fuente oficial desconocida: ${sourceCode}`);
    }

    const payload = await fetchOfficialJson(filename);
    return indexSource(sourceKey, payload, {
        type: 'official',
        label: sourceCode,
        sourceCode,
        url: filename,
    });
}

export async function loadBrewSource(relativePath) {
    const sourceKey = brewSourceKey(relativePath);
    const existing = await cache.getSourceMeta(sourceKey);
    if (existing && cache.isCacheFresh(existing.fetchedAt)) {
        return existing;
    }

    const url = getBrewFileUrl(relativePath);
    const payload = await fetchJson(url);
    const label = relativePath.split('/').pop()?.replace('.json', '') || relativePath;

    return indexSource(sourceKey, payload, {
        type: 'brew',
        label,
        relativePath,
        url,
    });
}

export async function loadCustomBrewUrl(url) {
    const sourceKey = customBrewSourceKey(url);
    const existing = await cache.getSourceMeta(sourceKey);
    if (existing && cache.isCacheFresh(existing.fetchedAt)) {
        return existing;
    }

    const payload = await fetchJson(url);
    const label = payload._meta?.sources?.[0]?.full || url;

    return indexSource(sourceKey, payload, {
        type: 'custom',
        label,
        url,
    });
}

export async function loadBundledSource(inflateGz) {
    const sourceKey = BUNDLED_SOURCE_KEY;
    const existing = await cache.getSourceMeta(sourceKey);
    if (existing && cache.isCacheFresh(existing.fetchedAt)) {
        return existing;
    }

    const gzUrl = chrome.runtime.getURL(BUNDLED_GZ_PATH);
    const response = await fetch(gzUrl);
    const buffer = await response.arrayBuffer();
    const decompressed = inflateGz(new Uint8Array(buffer));
    const payload = JSON.parse(decompressed);

    return indexSource(sourceKey, payload, {
        type: 'bundled',
        label: 'Bestiario embebido (offline)',
        url: gzUrl,
    });
}

export async function unloadSource(sourceKey) {
    await cache.deleteSourceData(sourceKey);
}

export async function getMonsterFromSource(sourceKey, monsterIndex) {
    const data = await cache.getSourceData(sourceKey);
    if (!data) {
        throw new Error(`Fuente no cargada: ${sourceKey}`);
    }

    const monster = data.monsters[monsterIndex];
    if (!monster) {
        throw new Error(`Monstruo no encontrado en índice ${monsterIndex}`);
    }

    return { monster, legendaryGroups: data.legendaryGroups || [] };
}

/**
 * Busca un monstruo por nombre+fuente (p. ej. destino de `_copy`).
 * Carga la fuente oficial bajo demanda si hace falta.
 */
export async function findMonsterByRef(name, sourceCode) {
    if (!name || !sourceCode) return null;

    const sourceKey = officialSourceKey(sourceCode);
    let data = await cache.getSourceData(sourceKey);

    if (!data) {
        try {
            await loadOfficialSource(sourceCode);
            data = await cache.getSourceData(sourceKey);
        } catch (err) {
            console.warn(`[Easy20] No se pudo cargar dependencia ${sourceCode}:`, err.message);
            return null;
        }
    }

    if (!data?.monsters?.length) return null;

    return data.monsters.find(m => m.name === name && m.source === sourceCode)
        || data.monsters.find(m => m.name === name)
        || null;
}
