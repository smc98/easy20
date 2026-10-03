# Guía de Desarrollo - Easy20

## Índice

- [Introducción](#introducción)
- [Arquitectura General](#arquitectura-general)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Servicios de Bestiario](#servicios-de-bestiario)
- [Módulos y Responsabilidades](#módulos-y-responsabilidades)
- [Guía de Modificación](#guía-de-modificación)
- [Workflow de Desarrollo](#workflow-de-desarrollo)
- [Testing](#testing)
- [Build y Distribución](#build-y-distribución)

---

## Introducción

Esta guía está diseñada para desarrolladores que quieran:

- Modificar funcionalidades existentes
- Añadir nuevos campos automatizados
- Corregir bugs
- Contribuir al proyecto

### Requisitos Previos

- Conocimientos de **JavaScript ES6+** (modules, async/await)
- Familiaridad con **Chrome Extensions API** (MV3)
- Comprensión básica de **DOM manipulation**
- Editor de código (VS Code, Cursor, etc.)

Versión actual del producto: ver `manifest.json` y [CHANGELOG.md](CHANGELOG.md).

---

## Arquitectura General

### Script Injection Pattern

La extensión usa **inyección de scripts** para ejecutar ES6 modules en el contexto de la página:

```
┌─────────────────────────────────────────────────────────────┐
│ Popup (popup.js)                                            │
│ ├─ BestiaryService (fuentes dinámicas + IndexedDB)          │
│ ├─ DiscoveryIndex (sugerir fuentes no activas)              │
│ ├─ UI: pestañas Buscar / Fuentes                            │
│ └─ Envía mensaje a content script                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ chrome.runtime.sendMessage
┌─────────────────────────────────────────────────────────────┐
│ Content Script - Injector (content.js - ROOT)               │
│ ├─ Recibe mensaje del popup                                 │
│ ├─ Serializa datos a JSON                                   │
│ ├─ Envía CustomEvent a script inyectado                     │
│ └─ Inyecta js/content.js como <script type="module">        │
└─────────────────────────────────────────────────────────────┘
                            ↓ CustomEvent
┌─────────────────────────────────────────────────────────────┐
│ Injected Module (js/content.js)                             │
│ ├─ Escucha CustomEvent                                      │
│ ├─ Deserializa JSON                                         │
│ ├─ Orquesta todos los módulos                               │
│ └─ Rellena formulario secuencialmente                       │
└─────────────────────────────────────────────────────────────┘
                            ↓ import modules
┌─────────────────────────────────────────────────────────────┐
│ Functional Modules (js/modules/*)                           │
│ ├─ basic-info, ability-scores, combat-stats, speeds         │
│ ├─ saves-skills, saving-throws, skills                      │
│ ├─ traits.js → EasyMDE/CodeMirror + copy-paste respaldo     │
│ ├─ spellcasting.js, mythic-actions.js                       │
└─────────────────────────────────────────────────────────────┘
```

### ¿Por Qué Script Injection?

Chrome Extensions Manifest V3 **no soporta** `type="module"` en content scripts directamente.

**Solución:** inyectar un `<script type="module">` en el DOM de la página.

**Ventajas:** ES6 nativo, sin bundler, debugging por archivo.

---

## Estructura del Proyecto

```
easy20/
├── manifest.json              # MV3 (Chrome + gecko)
├── content.js                 # Injector (ROOT)
├── popup.html / popup.js / style.css
├── icons/                     # Iconos de la extensión
├── img/                       # Screenshots para README
├── js/
│   ├── content.js             # Orchestrator
│   ├── data/
│   │   └── bestiary-data.json.gz   # Fallback offline (__bundled__)
│   ├── lib/
│   │   └── pako.esm.mjs       # Decompresión gzip
│   ├── services/              # Carga dinámica 5etools + homebrew
│   │   ├── bestiary-config.js
│   │   ├── bestiary-fetch.js
│   │   ├── bestiary-cache.js
│   │   ├── bestiary-loader.js
│   │   ├── bestiary-resolver.js
│   │   ├── bestiary-service.js
│   │   ├── brew-catalog.js
│   │   └── discovery-index.js
│   ├── modules/               # Relleno de ficha
│   │   ├── basic-info.js
│   │   ├── ability-scores.js
│   │   ├── combat-stats.js
│   │   ├── speeds.js
│   │   ├── saves-skills.js
│   │   ├── saving-throws.js
│   │   ├── skills.js
│   │   ├── traits.js
│   │   ├── spellcasting.js
│   │   └── mythic-actions.js
│   └── utils/
│       ├── text-cleaner.js
│       ├── formatters.js
│       └── selectors.js
├── README.md
├── BUILD.md                   # Este archivo
├── CHANGELOG.md
├── DISCLAIMER.md
└── LICENSE
```

---

## Servicios de Bestiario

Capa del popup: no corre en la página de Nivel20.

| Archivo | Rol |
|---------|-----|
| `bestiary-config.js` | URLs CDN/mirror, TTL, claves de storage, defaults (`MM`, `XMM`) |
| `bestiary-fetch.js` | `fetch` con timeout; prueba CDN y luego mirror GitHub |
| `bestiary-cache.js` | IndexedDB (metas + payloads por fuente) |
| `bestiary-loader.js` | Descarga e indexación oficial / brew / custom / bundled |
| `bestiary-copy.js` | Resolución de stubs `_copy` / `_mod` (herencia MM/MPP, replaceTxt/Arr…) |
| `bestiary-resolver.js` | `_copy` + inline de `legendaryGroup` desde `legendarygroups.json` |
| `bestiary-service.js` | API del popup: prefs, search, get monster, toggle fuentes |
| `brew-catalog.js` | Índice oficial + catálogo Giddy (solo props con `monster`) |
| `discovery-index.js` | `search/index.json` filtrado a criaturas (`c === 1`), TTL 24 h |

### Flujo de datos

1. Al abrir el popup se restauran preferencias (`chrome.storage.local`) y fuentes en caché.
2. Si no hay fuentes remotas disponibles → carga `__bundled__` desde el gzip.
3. La búsqueda trabaja sobre un **índice ligero** (nombre + fuente + id).
4. Al seleccionar monstruo se resuelve el JSON completo (lazy) y se aplica `resolveMonsterForFill` (`_copy`/`_mod` + `legendaryGroup`).
5. Si el stub apunta a otra fuente oficial (p. ej. ToFW → MM), esa dependencia se carga bajo demanda.
6. El monstruo se envía al content script para rellenar la ficha.

### Permisos de red

En `manifest.json`:

- `https://nivel20.com/*`
- `https://5e.tools/*`
- `https://raw.githubusercontent.com/*`

---

## Módulos y Responsabilidades

### Content Scripts

#### `content.js` (ROOT - Injector)

**Ubicación:** `/content.js`  
**Responsabilidad:** Inyectar módulos ES6 en la página

**¿Cuándo modificar?**

- Comunicación popup ↔ content
- Nuevos eventos CustomEvent
- Serialización de datos

```javascript
const event = new CustomEvent('nivel20-fill-monster', {
    detail: JSON.stringify({ monster: request.monster })
});
```

---

#### `js/content.js` (Orchestrator)

**Responsabilidad:** Orquestar módulos y errores

**Para añadir un módulo:**

```javascript
import { fillNewFeature } from './modules/new-feature.js';
// En fillMonsterForm:
fillNewFeature(monster);
```

---

### Popup

#### `popup.js` / `popup.html`

**Responsabilidad:** UI (Buscar / Fuentes), búsqueda, discovery, envío al content script.

**No** carga ya el gzip directamente como única fuente; usa `bestiaryService` y `discoveryIndexService`.

**¿Cuándo modificar?**

- Diseño del popup
- Filtros (CR, tipo, fuente)
- Flujo de activación de fuentes

---

### Módulos Funcionales

#### `basic-info.js`

Nombre, tipo, tamaño, alineamiento. Mapas `sizeMap` / `alignmentMap`.

#### `ability-scores.js`

STR–CHA vía Select2.

#### `combat-stats.js`

AC, HP, CR, iniciativa, percepción pasiva.

#### `speeds.js`

Walk, fly, swim, burrow, climb (incl. hover).

#### `saves-skills.js`

Resistencias, inmunidades, vulnerabilidades, sentidos. Idiomas aún no automatizados.

#### `saving-throws.js` / `skills.js`

Campos dinámicos y mapeo en→es.

#### `traits.js` (importante en v1.2)

Rasgos, acciones, bonus, reacciones, legendary.

1. Click en `a.add_fields` con la categoría correcta del template.
2. Espera el nuevo `.creature-trait-fields`.
3. Rellena el nombre.
4. Espera CodeMirror y escribe con `cm.setValue(desc)` + `cm.save()`.
5. Añade caja copy-paste (estilo “Respaldo” si el editor OK; aviso fuerte si falló).

```javascript
async function addNextTrait(index) {
    const beforeFields = Array.from(document.querySelectorAll('.creature-trait-fields'));
    addButton.click();
    const newField = await waitForNewTraitField(beforeFields);
    await fillTraitFields(trait, category, index, newField);
    setTimeout(() => addNextTrait(index + 1), 400);
}
```

**¿Cuándo modificar?**

- Si Nivel20 cambia EasyMDE / estructura del form
- Nuevas categorías de rasgo
- Timing si la web va más lenta

#### `spellcasting.js`

JSON de spellcasting → rasgo de texto.

#### `mythic-actions.js`

Acciones míticas → notas; mismo patrón CodeMirror + copy-paste de respaldo.

---

### Utilidades

#### `text-cleaner.js`

Limpia 25+ tags `{@...}` de 5etools.

#### `formatters.js`

Alineamiento, CR, AC, modificadores, iniciativa, etc.

#### `selectors.js`

`setFieldValue`, `setSelectValue`, `setSelect2Value`.

---

## Guía de Modificación

### Caso 1: Añadir un campo simple

1. Elegir módulo (`combat-stats.js`, etc.).
2. Inspeccionar selector en Nivel20.
3. Usar `setFieldValue` / `setSelect2Value`.
4. Recargar extensión y probar.

### Caso 2: Nuevo tag en text-cleaner

Añadir un `.replace(/\{@item ...\}/g, ...)` en `cleanText`.

### Caso 3: Nueva fuente oficial por defecto

Editar `DEFAULT_OFFICIAL_SOURCES` en `bestiary-config.js` (códigos tipo `MM`, `FTD`).

### Caso 4: Filtro por CR en el popup

Añadir control en `popup.html` y filtrar el resultado de `bestiaryService.search(...)` en `popup.js`.

---

## Workflow de Desarrollo

### Setup

```bash
git clone https://github.com/smc98/easy20.git
cd easy20
git checkout -b feature/mi-mejora
```

Cargar descomprimida en Chrome (`chrome://extensions`) o temporal en Firefox (`about:debugging`).

### Ciclo

1. Editar código
2. Recargar la extensión
3. Probar en `nivel20.com` → crear criatura
4. Consola (F12) para logs de módulos / servicios
5. Repetir

### Git

```bash
git add js/modules/traits.js
git commit -m "fix: wait for CodeMirror before filling traits"
git push origin feature/mi-mejora
```

---

## Testing

### Checklist manual

```
[ ] Offline / sin fuentes remotas
    [ ] Carga fallback __bundled__
[ ] Fuentes oficiales
    [ ] Activar FTD (u otra), buscar dragón, rellenar
[ ] Homebrew
    [ ] Buscar en catálogo Giddy, añadir, buscar monstruo
    [ ] URL custom (si aplica)
[ ] Discovery
    [ ] Buscar criatura de fuente no activa → sugerencia → Activar
[ ] Monstruo simple (Goblin)
    [ ] Campos básicos + rasgos en el editor
[ ] Legendary (Ancient Red Dragon)
    [ ] Acciones legendarias; guarida/regional si aplica
[ ] Spellcasting (Archmage)
[ ] Mythic (si hay en fuentes activas)
[ ] Copy-paste de respaldo visible junto al editor
```

### Debugging

Los módulos usan logs estructurados (`✓`, `⚠️`, `❌`). En traits, verificar en consola mensajes de CodeMirror.

```javascript
debugger; // en fillTraitFields o setDescriptionInEditor
```

---

## Build y Distribución

### Fallback gzip

Solo si actualizas el bestiario embebido:

```bash
gzip -9 -k js/data/bestiary-data.json
# → js/data/bestiary-data.json.gz
```

Asegura que la ruta coincida con `BUNDLED_GZ_PATH` en `bestiary-config.js`.

### Empaquetado sugerido

```
easy20.zip
├── manifest.json
├── content.js
├── popup.html / popup.js / style.css
├── icons/
├── js/
│   ├── content.js
│   ├── data/bestiary-data.json.gz
│   ├── lib/
│   ├── services/
│   ├── modules/
│   └── utils/
└── (opcional) README.md, LICENSE, DISCLAIMER.md
```

Subir versión en `manifest.json` y entrada en [CHANGELOG.md](CHANGELOG.md) antes de publicar la release.

---

## Próximos pasos / prioridades

1. Campo de idiomas
2. Conjuros enlazados a Nivel20
3. Filtros avanzados (CR, tipo, fuente)
4. XPI Firefox firmado
5. Tests automatizados

---

## Recursos

- [README.md](README.md)
- [CHANGELOG.md](CHANGELOG.md)
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [5etools data](https://github.com/5etools-mirror-3/5etools-src)
- [Giddy homebrew](https://github.com/TheGiddyLimit/homebrew)

**¿Preguntas?** [Discussions](../../discussions) o [Issues](../../issues).
