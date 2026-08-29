import { FETCH_TIMEOUT_MS, OFFICIAL_BASES, DATA_BASES } from './bestiary-config.js';

export async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al cargar ${url}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

/** Intenta varias URLs hasta que una responda (p. ej. CDN 5e.tools → mirror GitHub). */
export async function fetchJsonWithFallback(urls) {
    let lastError = null;
    for (const url of urls) {
        try {
            return await fetchJson(url);
        } catch (err) {
            lastError = err;
            console.warn(`Fetch fallido (${url}):`, err.message);
        }
    }
    throw lastError || new Error('No se pudo cargar el recurso');
}

export function officialUrls(filename) {
    return OFFICIAL_BASES.map(base => `${base}${filename}`);
}

export function dataUrls(filename) {
    return DATA_BASES.map(base => `${base}${filename}`);
}

export function fetchOfficialJson(filename) {
    return fetchJsonWithFallback(officialUrls(filename));
}

export function fetchDataJson(filename) {
    return fetchJsonWithFallback(dataUrls(filename));
}

export function isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
