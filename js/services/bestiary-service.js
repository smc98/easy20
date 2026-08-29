import {
    BUNDLED_SOURCE_KEY,
    DEFAULT_OFFICIAL_SOURCES,
    SEARCH_RESULT_LIMIT,
    STORAGE_KEYS,
    officialSourceKey,
    brewSourceKey,
    customBrewSourceKey,
} from './bestiary-config.js';
import * as cache from './bestiary-cache.js';
import { isOnline } from './bestiary-fetch.js';
import {
    loadOfficialSource,
    loadBrewSource,
    loadCustomBrewUrl,
    loadBundledSource,
    unloadSource,
    getMonsterFromSource,
} from './bestiary-loader.js';
import { resolveMonsterForFill } from './bestiary-resolver.js';
import {
    getOfficialSourcesList,
    searchBrewCatalog,
} from './brew-catalog.js';

const DEFAULT_PREFS = {
    [STORAGE_KEYS.enabledOfficial]: DEFAULT_OFFICIAL_SOURCES,
    [STORAGE_KEYS.enabledBrew]: [],
    [STORAGE_KEYS.customBrewUrls]: [],
};

let activeSourceKeys = [];
let usingBundledFallback = false;
let inflateGzFn = null;

async function ensureActiveSources() {
    if (activeSourceKeys.length > 0) return;

    if (inflateGzFn) {
        await loadBundledSource(inflateGzFn);
        activeSourceKeys = [BUNDLED_SOURCE_KEY];
        usingBundledFallback = true;
    }
}

async function refreshActiveSourceKeys(prefs) {
    const resolved = [];
    for (const key of prefsToSourceKeys(prefs)) {
        if (await cache.getSourceMeta(key)) resolved.push(key);
    }
    activeSourceKeys = resolved;
    usingBundledFallback = false;
    await ensureActiveSources();
}

async function getPrefs() {
    const stored = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    return {
        enabledOfficial: stored[STORAGE_KEYS.enabledOfficial] ?? DEFAULT_PREFS[STORAGE_KEYS.enabledOfficial],
        enabledBrew: stored[STORAGE_KEYS.enabledBrew] ?? [],
        customBrewUrls: stored[STORAGE_KEYS.customBrewUrls] ?? [],
    };
}

async function savePrefs(partial) {
    const payload = {};
    if (partial.enabledOfficial !== undefined) {
        payload[STORAGE_KEYS.enabledOfficial] = partial.enabledOfficial;
    }
    if (partial.enabledBrew !== undefined) {
        payload[STORAGE_KEYS.enabledBrew] = partial.enabledBrew;
    }
    if (partial.customBrewUrls !== undefined) {
        payload[STORAGE_KEYS.customBrewUrls] = partial.customBrewUrls;
    }
    await chrome.storage.local.set(payload);
}

function prefsToSourceKeys(prefs) {
    const keys = [
        ...prefs.enabledOfficial.map(officialSourceKey),
        ...prefs.enabledBrew.map(brewSourceKey),
        ...prefs.customBrewUrls.map(customBrewSourceKey),
    ];
    return [...new Set(keys)];
}

async function loadAllEnabledSources(prefs, inflateGz) {
    const errors = [];
    const hasEnabledRemote = prefs.enabledOfficial.length > 0
        || prefs.enabledBrew.length > 0
        || prefs.customBrewUrls.length > 0;

    if (hasEnabledRemote && isOnline()) {
        for (const code of prefs.enabledOfficial) {
            try {
                await loadOfficialSource(code);
            } catch (err) {
                errors.push({ source: code, error: err.message });
            }
        }

        for (const path of prefs.enabledBrew) {
            try {
                await loadBrewSource(path);
            } catch (err) {
                errors.push({ source: path, error: err.message });
            }
        }

        for (const url of prefs.customBrewUrls) {
            try {
                await loadCustomBrewUrl(url);
            } catch (err) {
                errors.push({ source: url, error: err.message });
            }
        }
    }

    const resolvedKeys = [];
    for (const key of prefsToSourceKeys(prefs)) {
        const meta = await cache.getSourceMeta(key);
        if (meta) resolvedKeys.push(key);
    }

    if (resolvedKeys.length === 0) {
        await loadBundledSource(inflateGz);
        activeSourceKeys = [BUNDLED_SOURCE_KEY];
        usingBundledFallback = true;
    } else {
        activeSourceKeys = resolvedKeys;
        usingBundledFallback = false;
    }

    return { errors, usingBundledFallback };
}

export const bestiaryService = {
    async init(inflateGz) {
        inflateGzFn = inflateGz;
        const prefs = await getPrefs();
        return loadAllEnabledSources(prefs, inflateGz);
    },

    async getPrefs() {
        return getPrefs();
    },

    isUsingBundledFallback() {
        return usingBundledFallback;
    },

    getActiveSourceKeys() {
        return [...activeSourceKeys];
    },

    async search(query) {
        const term = query.trim().toLowerCase();
        const entries = await cache.getSearchEntriesForSources(activeSourceKeys);

        const filtered = term
            ? entries.filter(e => e.nameLower.includes(term))
            : entries;

        filtered.sort((a, b) => a.name.localeCompare(b.name));
        return filtered.slice(0, SEARCH_RESULT_LIMIT);
    },

    async getMonster(entry) {
        const { monster, legendaryGroups } = await getMonsterFromSource(entry.sourceKey, entry.monsterIndex);
        return resolveMonsterForFill(monster, { brewLegendaryGroups: legendaryGroups });
    },

    async enableOfficialSource(sourceCode) {
        const prefs = await getPrefs();
        if (!prefs.enabledOfficial.includes(sourceCode)) {
            prefs.enabledOfficial = [...prefs.enabledOfficial, sourceCode];
            await savePrefs({ enabledOfficial: prefs.enabledOfficial });
        }
        await loadOfficialSource(sourceCode);
        activeSourceKeys = prefsToSourceKeys(prefs);
        usingBundledFallback = false;
        return prefs;
    },

    async disableOfficialSource(sourceCode) {
        const prefs = await getPrefs();
        prefs.enabledOfficial = prefs.enabledOfficial.filter(c => c !== sourceCode);
        await savePrefs({ enabledOfficial: prefs.enabledOfficial });
        await unloadSource(officialSourceKey(sourceCode));
        await refreshActiveSourceKeys(prefs);
        return prefs;
    },

    async enableBrewSource(relativePath) {
        const prefs = await getPrefs();
        if (!prefs.enabledBrew.includes(relativePath)) {
            prefs.enabledBrew = [...prefs.enabledBrew, relativePath];
            await savePrefs({ enabledBrew: prefs.enabledBrew });
        }
        await loadBrewSource(relativePath);
        activeSourceKeys = prefsToSourceKeys(prefs);
        usingBundledFallback = false;
        return prefs;
    },

    async disableBrewSource(relativePath) {
        const prefs = await getPrefs();
        prefs.enabledBrew = prefs.enabledBrew.filter(p => p !== relativePath);
        await savePrefs({ enabledBrew: prefs.enabledBrew });
        await unloadSource(brewSourceKey(relativePath));
        await refreshActiveSourceKeys(prefs);
        return prefs;
    },

    async addCustomBrewUrl(url) {
        const prefs = await getPrefs();
        if (!prefs.customBrewUrls.includes(url)) {
            prefs.customBrewUrls = [...prefs.customBrewUrls, url];
            await savePrefs({ customBrewUrls: prefs.customBrewUrls });
        }
        await loadCustomBrewUrl(url);
        activeSourceKeys = prefsToSourceKeys(prefs);
        usingBundledFallback = false;
        return prefs;
    },

    async removeCustomBrewUrl(url) {
        const prefs = await getPrefs();
        prefs.customBrewUrls = prefs.customBrewUrls.filter(u => u !== url);
        await savePrefs({ customBrewUrls: prefs.customBrewUrls });
        await unloadSource(customBrewSourceKey(url));
        await refreshActiveSourceKeys(prefs);
        return prefs;
    },

    async getOfficialSourcesList() {
        return getOfficialSourcesList();
    },

    async searchBrewCatalog(query) {
        return searchBrewCatalog(query);
    },

    async getInstalledBrew() {
        const prefs = await getPrefs();
        const installed = [];

        for (const relativePath of prefs.enabledBrew) {
            const meta = await cache.getSourceMeta(brewSourceKey(relativePath));
            const fileName = relativePath.split('/').pop()?.replace('.json', '') || relativePath;
            installed.push({
                kind: 'catalog',
                id: relativePath,
                label: meta?.label || fileName,
                detail: relativePath,
                monsterCount: meta?.monsterCount ?? null,
            });
        }

        for (const url of prefs.customBrewUrls) {
            const meta = await cache.getSourceMeta(customBrewSourceKey(url));
            installed.push({
                kind: 'custom',
                id: url,
                label: meta?.label || url,
                detail: url,
                monsterCount: meta?.monsterCount ?? null,
            });
        }

        return installed;
    },

    async clearCache() {
        await cache.clearAllCache();
        activeSourceKeys = [];
        usingBundledFallback = false;
    },

    async reload(inflateGz) {
        return this.init(inflateGz);
    },
};
