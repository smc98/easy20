# Guía de Desarrollo - Easy20

## Índice

- [Introducción](#introducción)
- [Arquitectura General](#arquitectura-general)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Módulos y Responsabilidades](#módulos-y-responsabilidades)
- [Guía de Modificación](#guía-de-modificación)
- [Añadir Nuevas Funcionalidades](#añadir-nuevas-funcionalidades)
- [Workflow de Desarrollo](#workflow-de-desarrollo)
- [Testing](#testing)
- [Build y Distribución](#build-y-distribución)

---

## Introducción

Esta guía está diseñada para desarrolladores que quieran:
-  Modificar funcionalidades existentes
-  Añadir nuevos campos automatizados
-  Corregir bugs
-  Contribuir al proyecto

### Requisitos Previos

- Conocimientos de **JavaScript ES6+** (modules, async/await)
- Familiaridad con **Chrome Extensions API**
- Comprensión básica de **DOM manipulation**
- Editor de código (personalmente utilizo Visual Studio Code)

---

## Arquitectura General

### Script Injection Pattern

La extensión usa un patrón de **inyección de scripts** para ejecutar ES6 modules en el contexto de la página:

```
┌─────────────────────────────────────────────────────────────┐
│ Popup (popup.js)                                            │
│ ├─ Carga JSON comprimido                                    │
│ ├─ Muestra lista de monstruos                               │
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
│ ├─ basic-info.js    → Nombre, tipo, tamaño, alineamiento   │
│ ├─ ability-scores.js → STR, DEX, CON, INT, WIS, CHA        │
│ ├─ combat-stats.js  → AC, HP, CR, iniciativa               │
│ ├─ speeds.js        → Velocidades con condiciones          │
│ ├─ saves-skills.js  → Sentidos, inmunidades                │
│ ├─ saving-throws.js → Tiradas de salvación                 │
│ ├─ skills.js        → 18 habilidades                       │
│ ├─ traits.js        → Rasgos, acciones                     │
│ ├─ spellcasting.js  → Conversión spellcasting → rasgo      │
│ └─ mythic-actions.js → Acciones míticas → notas            │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses utilities
┌─────────────────────────────────────────────────────────────┐
│ Utilities (js/utils/*)                                      │
│ ├─ text-cleaner.js  →  Limpia 25+ tags de 5etools           │
│ ├─ formatters.js    →  Formateo español, extractors         │
│ └─ selectors.js     →  Manejo Select2, campos dinámicos     │
└─────────────────────────────────────────────────────────────┘
```

### ¿Por Qué Script Injection?

Chrome Extensions Manifest V3 **NO soporta** `type="module"` en content scripts directamente. 

**Solución:** Inyectar un `<script type="module">` en el DOM de la página, permitiendo usar ES6 modules nativamente.

**Ventajas:**
-  ES6 modules nativos (import/export)
-  Sin bundler necesario
-  Código limpio y modular
-  Fácil debugging (archivos separados)

---

##  Estructura del Proyecto

```
nivel20-extension/
├── manifest.json              # Configuración principal (Chrome)
├── manifest-firefox.json      # Configuración Firefox
├── content.js                 # Injector (ROOT)
├── popup.html/css/js          # UI del popup
├── icons/                     # Iconos de la extensión
├── img/                       # Screenshots para README
├── data/
│   ├── bestiary-data.json     # Original 21MB (dev only)
│   └── bestiary-data.json.gz  # Comprimido 3.3MB (producción)
├── lib/                       # Librerías externas (vacío, usa CDN)
├── js/
│   ├── content.js             # Orchestrator
│   ├── modules/               # 10 módulos funcionales
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
│   └── utils/                 # 3 utilidades compartidas
│       ├── text-cleaner.js    # Limpia tags 5etools
│       ├── formatters.js      # Formateo y extractores
│       └── selectors.js       # Select2, campos dinámicos
└── docs/                      # Documentación técnica
    ├── README.md
    ├── BUILD.md              # Este archivo
    ├── CONTRIBUTING.md
    ├── LICENSE
    ├── DISCLAIMER.md
    └── otros...
```

---

## Módulos y Responsabilidades

### Content Scripts

#### `content.js` (ROOT - Injector)

**Ubicación:** `/content.js`  
**Responsabilidad:** Inyectar módulos ES6 en la página

**¿Cuándo modificar?**
- Cambiar comunicación popup ↔ content
- Añadir nuevos eventos CustomEvent
- Modificar serialización de datos

**Código clave:**
```javascript
// Serializar para Firefox
const event = new CustomEvent('nivel20-fill-monster', {
    detail: JSON.stringify({ monster: request.monster })
});
```

---

#### `js/content.js` (Orchestrator)

**Ubicación:** `/js/content.js`  
**Responsabilidad:** Orquestar todos los módulos, manejar errores

**¿Cuándo modificar?**
- Añadir nuevos módulos al flujo
- Cambiar orden de ejecución
- Modificar manejo de errores

**Código clave:**
```javascript
async function fillMonsterForm(monster) {
    // Llamar módulos en orden
    fillBasicInfo(monster);
    fillAbilityScores(monster);
    fillCombatStats(monster);
    // ... etc
}
```

**Para añadir un nuevo módulo:**
```javascript
// 1. Importar
import { fillNewFeature } from './modules/new-feature.js';

// 2. Llamar en fillMonsterForm
fillNewFeature(monster);
```

---

### Popup

#### `popup.js`

**Ubicación:** `/popup.js`  
**Responsabilidad:** UI del popup, búsqueda, envío de datos

**¿Cuándo modificar?**
- Cambiar diseño del popup
- Añadir filtros (CR, tipo, fuente)
- Modificar búsqueda
- Añadir vista previa mejorada

**Código clave:**
```javascript
// Cargar JSON comprimido
fetch(chrome.runtime.getURL('data/bestiary-data.json.gz'))
    .then(response => response.arrayBuffer())
    .then(buffer => {
        const decompressed = pako.inflate(new Uint8Array(buffer), { to: 'string' });
        return JSON.parse(decompressed);
    })
```

**Para añadir filtros:**
```javascript
// En populateMonsterSelect()
bestiaryData
    .filter(m => m.cr <= maxCR) // Filtro por CR
    .forEach(monster => {
        // Crear option...
    });
```

---

### Módulos Funcionales

#### `basic-info.js`

**Campos:** Nombre, Tipo, Tamaño, Alineamiento

**¿Cuándo modificar?**
- Añadir nuevos tipos de criatura
- Modificar mapeo de tamaños/alineamientos
- Cambiar formato de nombre

**Código importante:**
```javascript
// Mapeo de tamaños
const sizeMap = {
    'T': 'Diminuto',
    'S': 'Pequeño',
    'M': 'Mediano',
    // Añadir nuevos aquí
};

// Mapeo de alineamientos
const alignmentMap = {
    'LG': 'Legal bueno',
    // Añadir nuevos aquí
};
```

---

#### `ability-scores.js`

**Campos:** STR, DEX, CON, INT, WIS, CHA

**¿Cuándo modificar?**
- Raramente (las habilidades son fijas en D&D)
- Cambiar selectores si nivel20 cambia HTML

**Código:**
```javascript
setSelect2Value('#creature_abilities_fue', monster.str);
setSelect2Value('#creature_abilities_des', monster.dex);
// ...
```

---

#### `combat-stats.js`

**Campos:** AC, HP, CR, Iniciativa, Percepción Pasiva

**¿Cuándo modificar?**
- Añadir nuevas estadísticas de combate
- Modificar cálculos (iniciativa, PP)

**Código:**
```javascript
// AC
const [ac, acFrom] = extractAC(monster);
setFieldValue('#creature_armor_class', ac);

// CR
const cr = extractCR(monster);
setSelect2Value('#creature_challenge_rating', cr);
```

---

#### `speeds.js`

**Campos:** Walk, Fly, Swim, Burrow, Climb

**¿Cuándo modificar?**
- Añadir nuevos tipos de velocidad
- Modificar manejo de condiciones (hover, etc.)

**Código:**
```javascript
// Velocidad de vuelo con hover
if (monster.speed.fly) {
    const flySpeed = typeof monster.speed.fly === 'number' 
        ? monster.speed.fly 
        : monster.speed.fly.number;
    
    const hover = monster.speed.fly.condition?.includes('hover');
    // ...
}
```

---

#### `saves-skills.js`

**Campos:** Resistencias, Inmunidades, Vulnerabilidades, Condiciones, Sentidos, Idiomas

**¿Cuándo modificar?**
- Implementar campo de Idiomas (actualmente no automatizado)
- Mejorar parsing de sentidos

**Para añadir Idiomas:**
```javascript
// Añadir en fillSavesAndSkills()
if (monster.languages) {
    const languages = Array.isArray(monster.languages) 
        ? monster.languages.join(', ') 
        : monster.languages;
    setFieldValue('#creature_languages', languages);
}
```

---

#### `saving-throws.js`

**Campos:** Tiradas de salvación (dinámico, hasta 6)

**¿Cuándo modificar?**
- Cambiar delays entre creación de campos
- Modificar mapeo de habilidades

**Código importante:**
```javascript
// Mapeo de habilidades en→es
const abilityMap = {
    'str': 'fue',
    'dex': 'des',
    'con': 'con',
    'int': 'int',
    'wis': 'sab',
    'cha': 'car'
};
```

---

#### `skills.js`

**Campos:** 18 habilidades de D&D

**¿Cuándo modificar?**
- Añadir nuevas habilidades (Si se adapta otro sistema)
- Cambiar mapeo inglés→español

**Código importante:**
```javascript
// Mapeo completo de habilidades
const skillMap = {
    'acrobatics': 'acrobacias',
    'animal handling': 'trato-con-animales',
    'arcana': 'arcanos',
    // ... 18 habilidades
};
```

---

#### `traits.js`

**Campos:** Rasgos, Acciones, Reacciones, Legendary, Bonus

**¿Cuándo modificar?**
- Cambiar delays entre rasgos
- Modificar formato de descripciones
- Añadir nuevas categorías
- Mejorar identificación de campos

**Código importante:**

**Procesamiento secuencial global:**
```javascript
function fillTraitsAndAbilities(monster) {
    // Cola de trabajos secuencial
    const traitJobs = [];
    
    if (monster.trait) traitJobs.push({ traits: monster.trait, category: 'traits' });
    if (monster.action) traitJobs.push({ traits: monster.action, category: 'actions' });
    // ...
    
    processNextJob(0); // Procesa UNO POR UNO
}
```

**Encontrar botón correcto por categoría:**
```javascript
// Busca el botón que tenga value="legendary_actions" en su template
const match = template.match(/trait_category.*?value="([^"]*)"/);
if (match && match[1] === category) {
    addButton = button; // Botón correcto
}
```

**Añadir rasgos recursivamente:**
```javascript
function addNextTrait(index) {
    if (index >= traits.length) {
        onComplete(); // Llamar callback cuando termina
        return;
    }
    
    // Añadir rasgo, esperar, siguiente
    addButton.click();
    setTimeout(() => {
        fillTraitFields(trait, category, index, newField);
        setTimeout(() => addNextTrait(index + 1), 1000);
    }, 3000);
}
```

---

#### `spellcasting.js`

**Responsabilidad:** Convertir spellcasting JSON → rasgo formateado

**¿Cuándo modificar?**
- Mejorar formato de conjuros
- Añadir soporte para linkear los conjuros de nivel20

**Código:**
```javascript
export function formatSpellcastingAsTrait(spellcasting) {
    // Convierte JSON de spellcasting a texto formateado
    // que se añade como rasgo
}
```

---

#### `mythic-actions.js`

**Responsabilidad:** Añadir acciones míticas al campo de notas

**¿Cuándo modificar?**
- Cambiar formato de las acciones míticas
- Modificar el campo destino (actualmente: notas)

---

### Utilidades

#### `text-cleaner.js`

**Responsabilidad:** Limpiar 25+ tipos de tags de 5etools

**¿Cuándo modificar?**
- Añadir nuevos tags de 5etools
- Mejorar las descripciones

**Código:**
```javascript
export function cleanText(text) {
    return text
        .replace(/\{@actSave\s+(\w+)\}/g, (match, stat) => {
            const statMap = {
                'str': 'Fuerza',
                // Añadir nuevos aquí
            };
            return `Tirada de Salvación de ${statMap[stat.toLowerCase()]}`;
        })
        // ... 25+ reemplazos más
}
```

**Para añadir nuevo tag:**
```javascript
// Añadir antes del cleanup general
.replace(/\{@newTag ([^}]+)\}/g, 'Formato deseado: $1')
```

---

#### `formatters.js`

**Responsabilidad:** Funciones de formateo y extracción

**Funciones exportadas:**
- `formatAlignment(alignment)` - Alineamientos mapeados al español
- `extractCR(monster)` - Extrae el VD
- `extractAC(monster)` - Extrae CA y fuente de la CA
- `getModifier(score)` - Calcula modificador
- `formatModifier(mod)` - Formatea modificador (+3, -1)
- `extractInitiative(monster)` - Calcula iniciativa
- `formatAbilityList(list)` - Formatea listas de habilidades

**¿Cuándo modificar?**
- Añadir nuevos extractores
- Modificar formatos

---

#### `selectors.js`

**Responsabilidad:** Manejo de Select2 y campos dinámicos

**Funciones exportadas:**
- `setFieldValue(selector, value)` - Campo input simple
- `setSelectValue(selector, value)` - Select nativo
- `setSelect2Value(selector, value)` - Select2 con eventos

**¿Cuándo modificar?**
- Si nivel20 cambia de Select2 a otro plugin
- Añadir soporte para nuevos tipos de campos

**Código importante:**
```javascript
export function setSelect2Value(selector, value) {
    const $select = $(selector);
    
    // Buscar opción que matchee
    const $option = $select.find('option').filter(function() {
        return $(this).text().includes(value) || 
               $(this).val() == value;
    });
    
    // Setear y disparar eventos
    $select.val($option.val());
    $select.trigger('change');
    $select.trigger('change.select2');
}
```

---

## Guía de Modificación

### Caso 1: Añadir un Nuevo Campo Simple

**Ejemplo:** Automatizar el campo "Challenge" (actualmente vacío)

1. **Identificar módulo apropiado:**  
   → `combat-stats.js` (es una estadística de combate)

2. **Obtener selector del campo:**
   ```javascript
   // Inspeccionar en nivel20.com
   const selector = '#creature_challenge_description';
   ```

3. **Añadir código:**
   ```javascript
   // En fillCombatStats()
   if (monster.challenge) {
       setFieldValue('#creature_challenge_description', monster.challenge);
       console.log('✓ Challenge set');
   }
   ```

4. **Testear:**
   - Recargar extensión
   - Seleccionar monstruo
   - Verificar que se rellena

---

### Caso 2: Añadir un Nuevo Tag al Text Cleaner

**Ejemplo:** Soportar `{@item name}`

1. **Abrir:** `js/utils/text-cleaner.js`

2. **Añadir regex:**
   ```javascript
   export function cleanText(text) {
       return text
           // ... otros tags
           .replace(/\{@item ([^}|]+)(?:\|[^}]*)?\}/g, '$1')
           // ... resto
   }
   ```

3. **Testear:**
   ```javascript
   cleanText("{@item Longsword|PHB}") // → "Longsword"
   ```

---


### Caso 3: Mejorar la Búsqueda del Popup

**Objetivo:** Añadir filtro por CR

1. **Modificar:** `popup.html`
   ```html
   <select id="crFilter">
       <option value="">Todos los CR</option>
       <option value="0-4">CR 0-4</option>
       <option value="5-10">CR 5-10</option>
       <!-- etc -->
   </select>
   ```

2. **Modificar:** `popup.js`
   ```javascript
   document.getElementById('crFilter').addEventListener('change', filterMonsters);
   
   function filterMonsters() {
       const crFilter = document.getElementById('crFilter').value;
       
       bestiaryData
           .filter(m => {
               if (!crFilter) return true;
               const cr = extractCR(m);
               // Lógica de filtro
           })
           .forEach(monster => {
               // Mostrar monster
           });
   }
   ```


---

## Workflow de Desarrollo

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/smc98/easy20.git
cd nivel20-extension

# 2. Crear rama
git checkout -b feature/mi-mejora

# 3. Cargar en navegador
# Chrome: chrome://extensions → Cargar descomprimida
# Firefox: about:debugging → Cargar temporal
```

### Ciclo de Desarrollo

```bash
# 1. Editar archivo (ej: js/modules/basic-info.js)

# 2. Recargar extensión
# Chrome: Click en icono de recarga en chrome://extensions
# Firefox: Click en "Recargar" en about:debugging

# 3. Probar en nivel20.com
# - Abrir ficha de monstruo
# - Abrir popup
# - Seleccionar monstruo
# - Click "Rellenar Formulario"
# - Verificar cambios

# 4. Ver logs
# F12 en nivel20.com → Console
# Buscar logs de tu módulo

# 5. Repetir hasta funcionar
```

### Git Workflow

```bash
# Commit frecuente
git add js/modules/basic-info.js
git commit -m "feat: add new size mapping"

# Push a tu fork
git push origin feature/mi-mejora

# Crear Pull Request en GitHub
```

---

## Testing

### Testing Manual

**Checklist básico:**
```
[ ] Monstruo simple (Goblin)
    [ ] Campos básicos se rellenan
    [ ] Rasgos aparecen
    [ ] No hay errores en consola

[ ] Monstruo con spellcasting (Archmage)
    [ ] Spellcasting se convierte a rasgo
    [ ] Formato es correcto

[ ] Monstruo legendary (Ancient Red Dragon)
    [ ] Acciones legendarias se añaden
    [ ] En la categoría correcta
    [ ] Nombres y descripciones correctos

[ ] Monstruo con bonus actions (Vecna)
    [ ] Se añaden correctamente
    [ ] No se cruzan con otros rasgos

```

### Debugging

**Ver logs detallados:**
```javascript
// Cada módulo tiene logs estructurados
console.log('--- fillBasicInfo ---');      // Inicio
console.log('  Setting name...');          // Progreso
console.log('    ✓ Name set');             // Éxito
console.log('    ⚠️ Field not found');     // Warning
console.log('  ❌ Error: ...');             // Error
```

**Breakpoints:**
```javascript
// Añadir debugger en código
export function fillBasicInfo(monster) {
    debugger; // Pausa aquí
    console.log('--- fillBasicInfo ---');
    // ...
}
```

**Ver objeto monster:**
```javascript
// En consola del navegador
console.log(JSON.stringify(monster, null, 2));
```

---

## Build y Distribución

### Comprimir Bestiario

```bash
# Solo necesario si actualizas bestiary-data.json
gzip -9 -k data/bestiary-data.json
# Genera: data/bestiary-data.json.gz (3.3MB)
```

### Estructura del Build

```
easy20.zip
├── manifest.json
├── content.js
├── popup.html/css/js
├── icons/
├── data/
│   └── bestiary-data.json.gz
└── js/
    ├── content.js
    ├── modules/
    └── utils/
```

---

## Próximos Pasos

Si quieres contribuir, revisa:

 **[Issues abiertos](../../issues)** - Bugs conocidos

### Features Prioritarias

1. **Campo de Idiomas**
2. **Conjuros integrados en nivel20**
3. **Tema Oscuro** - Experiencia de usuario
4. **Filtros Avanzados** - Búsqueda por CR, tipo, fuente
5. **Tests Automatizados** - Garantizar calidad

---

## 📚 Recursos Adicionales

### Documentación del Proyecto

- [README.md](README.md) - Guía general

### Tecnologías

- [Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [5etools JSON format](https://github.com/5etools-mirror-1/5etools-mirror-1.github.io)

### Comunidad

- [GitHub Discussions](../../discussions) - Preguntas generales
- [GitHub Issues](../../issues) - Reportar bugs
- [Pull Requests](../../pulls) - Contribuir código

---

**¿Preguntas?** Abre un [Discussion](../../discussions) o un [Issue](../../issues).

**¡Gracias por contribuir!**