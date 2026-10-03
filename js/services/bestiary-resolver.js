import { LEGENDARY_GROUPS_PATH } from './bestiary-config.js';
import * as cache from './bestiary-cache.js';
import { fetchOfficialJson } from './bestiary-fetch.js';
import { findMonsterByRef } from './bestiary-loader.js';
import { resolveMonsterCopy } from './bestiary-copy.js';

const AUX_LEGENDARY_KEY = 'legendarygroups';

function hasInlineLegendaryData(group) {
    if (!group) return false;
    return Boolean(group.lairActions?.length || group.regionalEffects?.length);
}

function findLegendaryGroup(groups, name, source) {
    if (!Array.isArray(groups)) return null;
    return groups.find(g => g.name === name && g.source === source) || null;
}

async function getOfficialLegendaryGroups() {
    const cached = await cache.getAuxData(AUX_LEGENDARY_KEY);
    if (cached && cache.isCacheFresh(cached.fetchedAt)) {
        return cached.payload;
    }

    const payload = await fetchOfficialJson(LEGENDARY_GROUPS_PATH);
    await cache.setAuxData(AUX_LEGENDARY_KEY, payload);
    return payload;
}

async function resolveLegendaryGroup(monster, sourceContext = {}) {
    const group = monster.legendaryGroup;
    if (!group || hasInlineLegendaryData(group) || !group.name) {
        return monster;
    }

    const { name, source } = group;
    let resolved = null;

    if (sourceContext.brewLegendaryGroups) {
        resolved = findLegendaryGroup(sourceContext.brewLegendaryGroups, name, source);
    }

    if (!resolved) {
        const official = await getOfficialLegendaryGroups();
        resolved = findLegendaryGroup(official.legendaryGroup, name, source);
    }

    if (!resolved) {
        return monster;
    }

    return { ...monster, legendaryGroup: resolved };
}

/** Completa `_copy`/`_mod` y guarida/regional antes del relleno. */
export async function resolveMonsterForFill(monster, sourceContext = {}) {
    const withCopy = await resolveMonsterCopy(monster, findMonsterByRef);
    return resolveLegendaryGroup(withCopy, sourceContext);
}
