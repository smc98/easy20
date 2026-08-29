/** URLs y constantes del bestiario dinámico */

export const OFFICIAL_MIRROR_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/';
export const OFFICIAL_CDN_BASE = 'https://5e.tools/data/bestiary/';
export const DATA_MIRROR_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
export const DATA_CDN_BASE = 'https://5e.tools/data/';

export const OFFICIAL_BASES = [OFFICIAL_CDN_BASE, OFFICIAL_MIRROR_BASE];
export const DATA_BASES = [DATA_CDN_BASE, DATA_MIRROR_BASE];
export const OFFICIAL_INDEX_PATH = 'index.json';
export const LEGENDARY_GROUPS_PATH = 'legendarygroups.json';
export const BOOKS_PATH = 'books.json';
export const ADVENTURES_PATH = 'adventures.json';
export const SOURCE_NAMES_AUX_KEY = 'official-source-names';

export const BREW_BASE = 'https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/';
export const BREW_INDEX_SOURCES_URL = `${BREW_BASE}_generated/index-sources.json`;
export const BREW_INDEX_META_URL = `${BREW_BASE}_generated/index-meta.json`;
export const BREW_INDEX_PROPS_URL = `${BREW_BASE}_generated/index-props.json`;

export const BUNDLED_SOURCE_KEY = '__bundled__';
export const BUNDLED_GZ_PATH = 'js/data/bestiary-data.json.gz';

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DISCOVERY_INDEX_TTL_MS = 24 * 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 30000;
export const SEARCH_RESULT_LIMIT = 200;
export const DISCOVERY_RESULT_LIMIT = 15;

export const SEARCH_INDEX_CDN = 'https://5e.tools/search/index.json';
export const SEARCH_INDEX_MIRROR = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/search/index.json';
export const SEARCH_INDEX_URLS = [SEARCH_INDEX_CDN, SEARCH_INDEX_MIRROR];

/** Parser.CAT_ID_CREATURE en 5etools */
export const CREATURE_CATEGORY_ID = 1;

export const DISCOVERY_INDEX_AUX_KEY = 'discovery-creature-index';

export const DEFAULT_OFFICIAL_SOURCES = ['MM', 'XMM'];

export const STORAGE_KEYS = {
    enabledOfficial: 'enabledOfficialSources',
    enabledBrew: 'enabledBrewFiles',
    customBrewUrls: 'customBrewUrls',
};

export function officialSourceKey(sourceCode) {
    return `official:${sourceCode}`;
}

export function brewSourceKey(relativePath) {
    return `brew:${relativePath}`;
}

export function customBrewSourceKey(url) {
    return `custom:${url}`;
}

export function monsterId(source, name) {
    return `${source}|${name}`;
}

export function parseMonsterId(id) {
    const sep = id.indexOf('|');
    if (sep === -1) return { source: '', name: id };
    return { source: id.slice(0, sep), name: id.slice(sep + 1) };
}
