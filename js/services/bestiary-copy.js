/**
 * Resolución de stubs 5etools `_copy` / `_mod` (p. ej. ToFW → MM/MPP).
 * Subconjunto de DataUtil.generic.copyApplier orientado al relleno de fichas.
 */

const COPY_ENTRY_PROPS = [
    'action', 'bonus', 'reaction', 'trait', 'legendary', 'mythic', 'variant', 'spellcasting',
    'actionHeader', 'bonusHeader', 'reactionHeader', 'legendaryHeader', 'mythicHeader',
];

/** Claves del base que solo se copian si `_copy._preserve` lo permite. */
const MERGE_REQUIRES_PRESERVE = {
    page: true,
    otherSources: true,
    referenceSources: true,
    srd: true,
    srd52: true,
    basicRules: true,
    basicRules2024: true,
    reprintedAs: true,
    hasFluff: true,
    hasFluffImages: true,
    hasToken: true,
    tokenCredit: true,
    tokenCustom: true,
    foundryTokenScale: true,
    altArt: true,
    _versions: true,
    legendaryGroup: true,
    environment: true,
    soundClip: true,
    variant: true,
    dragonCastingColor: true,
    familiar: true,
};

const MAX_COPY_DEPTH = 8;

function deepClone(value) {
    return structuredClone(value);
}

function ensureArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
}

function getByPath(obj, path) {
    let cur = obj;
    for (const key of path) {
        if (cur == null) return undefined;
        cur = cur[key];
    }
    return cur;
}

function setByPath(obj, path, value) {
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
        cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
}

function splitByTags(str) {
    if (typeof str !== 'string' || !str.includes('{@')) return [str];
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{' && str[i + 1] === '@') {
            if (depth === 0 && i > start) parts.push(str.slice(start, i));
            if (depth === 0) start = i;
            depth++;
        } else if (str[i] === '}' && depth > 0) {
            depth--;
            if (depth === 0) {
                parts.push(str.slice(start, i + 1));
                start = i + 1;
            }
        }
    }
    if (start < str.length) parts.push(str.slice(start));
    return parts;
}

function replaceInString(str, re, withStr, { tagInsensitive = false } = {}) {
    if (typeof str !== 'string') return str;
    if (tagInsensitive) return str.replace(re, withStr);

    return splitByTags(str)
        .map(part => (part.startsWith('{@') ? part : part.replace(re, withStr)))
        .join('');
}

function walkStrings(value, fn) {
    if (typeof value === 'string') return fn(value);
    if (Array.isArray(value)) return value.map(item => walkStrings(item, fn));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = walkStrings(v, fn);
        }
        return out;
    }
    return value;
}

function normalizeMods(copyMeta) {
    if (!copyMeta._mod) return;
    for (const [k, v] of Object.entries(copyMeta._mod)) {
        if (!Array.isArray(v)) copyMeta._mod[k] = [v];
    }
}

function buildReplaceRegex(replace, flags) {
    return new RegExp(replace, `g${flags || ''}`);
}

function applyReplaceTxt(copyTo, propPath, modInfo) {
    const ents = getByPath(copyTo, propPath);
    if (!ents) return;

    const re = buildReplaceRegex(modInfo.replace, modInfo.flags);
    const replaceFn = str => replaceInString(str, re, modInfo.with, { tagInsensitive: modInfo.tagInsensitive });
    const props = modInfo.props || [null, 'entries', 'headerEntries', 'footerEntries'];
    if (!props.length) return;

    if (Array.isArray(ents) && props.includes(null)) {
        setByPath(copyTo, propPath, ents.map(it => (typeof it === 'string' ? replaceFn(it) : it)));
    }

    const list = getByPath(copyTo, propPath);
    if (!Array.isArray(list)) return;

    for (const ent of list) {
        if (!ent || typeof ent !== 'object') continue;
        for (const prop of props) {
            if (prop == null || ent[prop] == null) continue;
            ent[prop] = walkStrings(ent[prop], replaceFn);
        }
    }
}

function applyReplaceArr(copyTo, propPath, modInfo) {
    const items = ensureArray(modInfo.items);
    const valExisting = getByPath(copyTo, propPath);
    if (!Array.isArray(valExisting)) return false;

    let ixOld = -1;
    if (modInfo.replace?.regex) {
        const re = new RegExp(modInfo.replace.regex, modInfo.replace.flags || '');
        ixOld = valExisting.findIndex(it => (
            it?.name ? re.test(it.name) : typeof it === 'string' ? re.test(it) : false
        ));
    } else if (modInfo.replace?.index != null) {
        ixOld = modInfo.replace.index;
    } else {
        ixOld = valExisting.findIndex(it => (
            it?.name ? it.name === modInfo.replace : it === modInfo.replace
        ));
    }

    if (ixOld >= 0) {
        valExisting.splice(ixOld, 1, ...items);
        return true;
    }
    return false;
}

function applyRemoveArr(copyTo, propPath, modInfo) {
    const valExisting = getByPath(copyTo, propPath);
    if (!Array.isArray(valExisting)) return;

    if (modInfo.names != null) {
        for (const nameToRemove of ensureArray(modInfo.names)) {
            const ix = valExisting.findIndex(it => it?.name === nameToRemove);
            if (ix >= 0) valExisting.splice(ix, 1);
        }
        return;
    }

    if (modInfo.items != null) {
        for (const itemToRemove of ensureArray(modInfo.items)) {
            const ix = valExisting.findIndex(it => it === itemToRemove);
            if (ix >= 0) valExisting.splice(ix, 1);
        }
    }
}

function applyAppendArr(copyTo, propPath, modInfo) {
    const items = ensureArray(modInfo.items);
    const valExisting = getByPath(copyTo, propPath);
    setByPath(copyTo, propPath, valExisting ? valExisting.concat(items) : items);
}

function applyPrependArr(copyTo, propPath, modInfo) {
    const items = ensureArray(modInfo.items);
    const valExisting = getByPath(copyTo, propPath);
    setByPath(copyTo, propPath, valExisting ? items.concat(valExisting) : items);
}

function applyModInfo(copyTo, propPath, modInfo) {
    if (typeof modInfo === 'string') {
        if (modInfo === 'remove' && propPath) {
            const parentPath = propPath.slice(0, -1);
            const key = propPath[propPath.length - 1];
            const parent = parentPath.length ? getByPath(copyTo, parentPath) : copyTo;
            if (parent && key in parent) delete parent[key];
        }
        return;
    }

    switch (modInfo.mode) {
        case 'replaceTxt':
            applyReplaceTxt(copyTo, propPath, modInfo);
            break;
        case 'replaceArr':
            applyReplaceArr(copyTo, propPath, modInfo);
            break;
        case 'removeArr':
            applyRemoveArr(copyTo, propPath, modInfo);
            break;
        case 'appendArr':
            applyAppendArr(copyTo, propPath, modInfo);
            break;
        case 'prependArr':
            applyPrependArr(copyTo, propPath, modInfo);
            break;
        case 'replaceOrAppendArr': {
            if (!applyReplaceArr(copyTo, propPath, modInfo)) {
                applyAppendArr(copyTo, propPath, modInfo);
            }
            break;
        }
        default:
            // Modos avanzados (spells, scalars, templates…) no usados por ToFW; se ignoran.
            break;
    }
}

function applyMods(copyTo, copyMeta) {
    if (!copyMeta._mod) return;
    normalizeMods(copyMeta);

    const entries = Object.entries(copyMeta._mod)
        .sort(([a], [b]) => {
            const order = prop => (prop === '_' || prop === '*' ? 1 : 0);
            return order(a) - order(b);
        });

    for (const [prop, modInfos] of entries) {
        const props = prop === '*'
            ? COPY_ENTRY_PROPS
            : prop === '_'
                ? [null]
                : [prop];

        for (const targetProp of props) {
            const propPath = targetProp == null ? null : targetProp.split('.');
            for (const modInfo of modInfos) {
                if (propPath == null && modInfo?.mode === 'replaceTxt') continue;
                applyModInfo(copyTo, propPath, modInfo);
            }
        }
    }
}

function mergeCopyFromBase(copyTo, copyFrom) {
    const preserve = copyTo._copy?._preserve || {};

    for (const [k, v] of Object.entries(copyFrom)) {
        if (copyTo[k] === null) {
            delete copyTo[k];
            continue;
        }
        if (copyTo[k] != null) continue;

        if (MERGE_REQUIRES_PRESERVE[k]) {
            if (preserve['*'] || preserve[k]) copyTo[k] = deepClone(v);
            continue;
        }

        copyTo[k] = deepClone(v);
    }
}

/**
 * Fusiona un stub con su base y aplica `_mod`.
 * @param {object} baseMonster Monstruo base ya resuelto (sin `_copy` pendiente idealmente)
 * @param {object} stubMonster Stub con `_copy`
 */
export function applyMonsterCopy(baseMonster, stubMonster) {
    const copyTo = deepClone(stubMonster);
    const copyFrom = deepClone(baseMonster);
    const copyMeta = copyTo._copy || {};

    mergeCopyFromBase(copyTo, copyFrom);
    applyMods(copyTo, copyMeta);

    delete copyTo._copy;
    copyTo._isCopy = true;
    return copyTo;
}

/**
 * Resuelve recursivamente `_copy` usando un lookup async `(name, source) => monster|null`.
 */
export async function resolveMonsterCopy(monster, lookupMonster, depth = 0, stack = []) {
    if (!monster?._copy?.name || !monster._copy.source) {
        return monster;
    }

    if (depth >= MAX_COPY_DEPTH) {
        console.warn('[Easy20] Profundidad máxima de _copy alcanzada', monster.name, monster.source);
        return monster;
    }

    const refKey = `${monster._copy.source}|${monster._copy.name}`;
    if (stack.includes(refKey)) {
        console.warn('[Easy20] Ciclo de _copy detectado', refKey);
        return monster;
    }

    const baseRaw = await lookupMonster(monster._copy.name, monster._copy.source);
    if (!baseRaw) {
        console.warn(
            `[Easy20] No se encontró base _copy "${monster._copy.name}" (${monster._copy.source}) para "${monster.name}" (${monster.source})`,
        );
        return monster;
    }

    const baseResolved = await resolveMonsterCopy(baseRaw, lookupMonster, depth + 1, [...stack, refKey]);
    return applyMonsterCopy(baseResolved, monster);
}
