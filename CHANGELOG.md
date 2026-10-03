# Changelog

Todos los cambios relevantes de Easy20 se documentan aquí.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
La versión coincide con `manifest.json`.

---

## [1.2.1] — 2026-10

### Corregido

- **Resolución de `_copy` / `_mod`**: los stubs de aventuras (p. ej. *Turn of Fortune's Wheel*) heredan stats de MM/MPP y aplican reemplazos de texto/acciones antes del relleno. Sin esto, las fichas salían con valores por defecto vacíos.

---

## [1.2.0] — 2026-08

Release orientada a uso público: bestiarios conectados a internet, acceso a homebrew y completado real del editor de rasgos.

### Añadido

- **Bestiarios dinámicos** desde 5etools (CDN con fallback al mirror de GitHub).
- **Homebrew**: catálogo Giddy (solo packs con monstruos) + URL personalizada.
- **Pestaña Fuentes** en el popup: oficiales, añadir homebrew, instalados, limpiar caché.
- **Nombres de fuentes** (libro/aventura + sigla) desde `books.json` / `adventures.json`, con fallback local.
- **Índice de descubrimiento** (`search/index.json`): si la búsqueda no encuentra nada en fuentes activas, sugiere activar la fuente correcta (caché 24 h).
- **IndexedDB**: caché de bestiarios (~7 días) e índices auxiliares.
- **Resolución de legendary groups**: acciones de guarida / efectos regionales desde `legendarygroups.json`.
- **Relleno de EasyMDE/CodeMirror** en rasgos, acciones y notas míticas (`setValue` + `save`).
- Host permissions para `5e.tools` y `raw.githubusercontent.com`.

### Cambiado

- El gzip embebido (`js/data/bestiary-data.json.gz`) pasa a ser **fallback offline**, no la única fuente.
- UI del popup: pestañas **Buscar** / **Fuentes** (en lugar de paneles apilados).
- Listas de fuentes y resultados de búsqueda sin el tope artificial que cortaba el scroll.
- Flujo de rasgos: espera al bloque nuevo y a CodeMirror en lugar de timeouts fijos largos.

### Conservado

- Cajas de **copy-paste** junto a cada descripción como respaldo si el editor no se actualiza.
- Compatibilidad Manifest V3 (Chrome) y ajustes Gecko (Firefox).

---

## [1.1] — 2026

Base previa a la release pública: arquitectura modular ES6, relleno de ficha y bestiario comprimido embebido.

### Incluido

- Relleno de campos básicos, combate, velocidades, salvaciones, habilidades, rasgos y spellcasting.
- Copy-paste asistido para descripciones.
- Soporte cruzado 5e ↔ 2024 en campañas de Nivel20.
