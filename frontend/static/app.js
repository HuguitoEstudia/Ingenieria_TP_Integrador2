// URL base de la API, almacenada en localStorage o por defecto en http://127.0.0.1:8001
// Cambia este valor desde el navegador con: localStorage.setItem('API_BASE', 'http://127.0.0.1:8001')
const API_BASE = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8001';

// Mostrar la URL de la API en el elemento #api-url (si existe)
const apiUrlEl = document.getElementById('api-url');
if (apiUrlEl) apiUrlEl.textContent = API_BASE;

// Elementos del DOM
const $status = document.getElementById('status'); // Estado de la conexión con el backend
const $records = document.getElementById('records'); // legacy placeholder (may be null)
const $maduradoresList = document.getElementById('maduradores-list');
const $lotesList = document.getElementById('lotes-list');
const $detail = document.getElementById('detail');
const $detailContent = document.getElementById('detail-content');
const $closeDetail = document.getElementById('close-detail');
const $refresh = document.getElementById('refresh'); // Botón para refrescar la lista
const $formSection = document.getElementById('form'); // Sección del formulario
const $listSection = document.getElementById('list'); // Sección de la lista
const $form = document.getElementById('record-form'); // Formulario de agregar registro
const $cancel = document.getElementById('cancel'); // Botón para cancelar el formulario
const $openAddMadurador = document.getElementById('open-add-madurador');
const $openAddLote = document.getElementById('open-add-lote');
const $loteSelectLabel = document.getElementById('lote-select-label');
const $loteSelect = document.getElementById('lote-select');
const $loteObjInput = document.getElementById('lote-obj');
const $loteFormSection = document.getElementById('lote-form');
const $loteForm = document.getElementById('lote-record-form');
const $cancelLote = document.getElementById('cancel-lote');

// Global cache for lotes to map them with auto-incremental IDs
let cachedLotes = [];

/**
 * Verificar el estado de la conexión con el backend
 */
async function health() {
  try {
    // Realizar una solicitud GET a /health
    const res = await fetch(API_BASE + '/health');
    // Si la respuesta no es OK, lanzar un error
    if (!res.ok) throw new Error('no');
    // Parsear la respuesta como JSON
    const j = await res.json();
    // Mostrar el estado del backend en el elemento #status
    $status.textContent = 'Backend: ' + j.status;
  } catch (e) {
    // Si hay un error, mostrar un mensaje de desconexión
    if ($status) $status.textContent = 'Backend: desconectado';
  }
}

/**
 * Cargar la lista de registros desde el backend
 */
// Utility: try to parse JSON, fallback to text->single-quote->JSON
async function parseResponseFlexible(res) {
  // Try JSON first, otherwise read text once and attempt to parse Python-style dicts
  try {
    const json = await res.json();
    console.debug('✓ Parsed as JSON:', json);
    return json;
  } catch (err) {
    console.debug('✗ Not JSON, reading as text...');
    const txt = await res.text();
    console.debug('Text length:', txt?.length, 'First 100 chars:', txt?.substring(0, 100));
    if (!txt) return null;
    
    // Try strict JSON first
    try {
      const parsed = JSON.parse(txt);
      console.debug('✓ Parsed as JSON from text:', parsed);
      return parsed;
    } catch (err2) {
      console.debug('✗ JSON.parse failed:', err2.message);
      // Python dict to JSON conversion
      try {
        // Use Function constructor to evaluate Python-like dict as JavaScript object
        // This is safe because we control the backend
        const cleaned = txt
          .replace(/None/g, 'null')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false');
        
        console.debug('Attempting Function constructor with cleaned text...');
        
        // Use Function constructor (safer than eval)
        const result = new Function(`'use strict'; return (${cleaned})`)();
        console.debug('✓ Parsed Python dict successfully:', result);
        return result;
      } catch (err3) {
        console.error('✗ Function constructor failed:', err3.message);
        console.error('Full response text:', txt);
        // As a last resort, return the raw text
        return txt;
      }
    }
  }
}

function extractDataArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && parsed.data) {
    return Array.isArray(parsed.data) ? parsed.data : [];
  }
  if (parsed && typeof parsed === 'object') {
    // Check if it's a single object wrapper
    const keys = Object.keys(parsed);
    if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
      return parsed[keys[0]];
    }
  }
  return [];
}

function extractDataObject(parsed) {
  // For single-object responses
  if (parsed && parsed.data) {
    return parsed.data;
  }
  return parsed;
}

async function load() {
  // load both maduradores and lotes
  await Promise.all([loadMaduradores(), loadLotes()]);
}

async function loadMaduradores() {
  if ($maduradoresList) $maduradoresList.innerHTML = 'Cargando...';
  try {
    const res = await fetch(API_BASE + '/find_all_madurador/');
    if (!res.ok) throw new Error('error');
    const parsed = await parseResponseFlexible(res);
    if (typeof parsed === 'string') {
      console.error('Backend returned unparseable string:', parsed.substring(0, 200));
      console.error('Full string length:', parsed.length);
      if ($maduradoresList) $maduradoresList.innerHTML = '<div style="color:#a00">Error parseando respuesta del servidor. Ver consola para detalles.</div>';
      return;
    }
    const items = extractDataArray(parsed);
    console.debug('loadMaduradores: received', items?.length ?? 0, 'items', items);
    renderMaduradores(items);
  } catch (e) {
    console.error('loadMaduradores error:', e);
    if ($maduradoresList) $maduradoresList.innerHTML = '<div style="color:#a00">Error cargando maduradores</div>';
  }
}

async function loadLotes() {
  if ($lotesList) $lotesList.innerHTML = 'Cargando...';
  try {
    const res = await fetch(API_BASE + '/find_all_lote/');
    if (!res.ok) throw new Error('error');
    const parsed = await parseResponseFlexible(res);
    if (typeof parsed === 'string') {
      console.error('Backend returned unparseable string:', parsed.substring(0, 200));
      console.error('Full string length:', parsed.length);
      if ($lotesList) $lotesList.innerHTML = '<div style="color:#a00">Error parseando respuesta del servidor. Ver consola para detalles.</div>';
      return;
    }
    const items = extractDataArray(parsed);
    cachedLotes = items; // Cache lotes for madurador display
    console.debug('loadLotes: received', items?.length ?? 0, 'items', items);
    renderLotes(items);
  } catch (e) {
    console.error('loadLotes error:', e);
    if ($lotesList) $lotesList.innerHTML = '<div style="color:#a00">Error cargando lotes</div>';
  }
}

// Helper to format lote display as "Lote #X - Cerveza"
function formatLoteDisplay(lote) {
  if (!lote) return '--';
  
  // Handle if lote is a string (shouldn't happen but just in case)
  if (typeof lote === 'string') {
    try {
      lote = JSON.parse(lote.replace(/'/g, '"'));
    } catch (e) {
      return lote;
    }
  }
  
  if (typeof lote !== 'object') return '--';
  
  const cerveza = lote.cerveza || lote.nombre || 'Sin nombre';
  
  // Try to find the lote index in cachedLotes by matching _id
  if (cachedLotes && cachedLotes.length > 0 && lote._id) {
    const idx = cachedLotes.findIndex(l => l._id === lote._id);
    if (idx !== -1) {
      return `Lote #${idx + 1} - ${cerveza}`;
    }
  }
  
  // Fallback: use valor if exists
  if (lote.valor) {
    return `Lote #${lote.valor} - ${cerveza}`;
  }
  
  // Last fallback: just cerveza
  return cerveza;
}

/**
 * Renderizar la lista de registros en el DOM
 * @param {Array} items - Lista de registros
 */
function renderMaduradores(items) {
  if (!$maduradoresList) return;
  if (!items || items.length === 0) {
    $maduradoresList.innerHTML = '<div style="text-align:center;padding:20px;color:#666">No hay maduradores</div>';
    return;
  }
  $maduradoresList.innerHTML = '';
  items.forEach((it, idx) => {
    const card = document.createElement('div');
    card.className = 'record-card';
    const loteDisplay = formatLoteDisplay(it.lote);
    card.innerHTML = `
      <div class="card-header">Madurador #${idx + 1}</div>
      <div class="card-body">
        <div class="record-grid">
          <div class="field"><span class="label">Litros:</span><span class="value">${escapeHTML(it.litros ?? '--')}</span></div>
          <div class="field"><span class="label">Estado:</span><span class="value">${escapeHTML(it.estado ?? '')}</span></div>
          <div class="field"><span class="label">Notas:</span><span class="value">${escapeHTML(it.notas ?? '')}</span></div>
          <div class="field"><span class="label">Lote:</span><span class="value">${escapeHTML(loteDisplay)}</span></div>
        </div>
      </div>
      <div class="card-actions">
        <button data-id="${it._id}" class="view-m">Ver</button>
        <button data-id="${it._id}" class="edit">Editar</button>
        <button data-id="${it._id}" class="del secondary">Eliminar</button>
      </div>
    `;
    $maduradoresList.appendChild(card);
  });
}

function renderLotes(items) {
  if (!$lotesList) return;
  if (!items || items.length === 0) {
    $lotesList.innerHTML = '<div style="text-align:center;padding:20px;color:#666">No hay lotes</div>';
    return;
  }
  $lotesList.innerHTML = '';
  items.forEach((it, idx) => {
    const card = document.createElement('div');
    card.className = 'record-card';
    const title = escapeHTML(it.cerveza || it.nombre || (`Lote ${idx+1}`));
    card.innerHTML = `
      <div class="card-header">${title}</div>
      <div class="card-body">
        <div class="record-grid">
          <div class="field"><span class="label">Cantidad:</span><span class="value">${escapeHTML(it.cantidadLitros ?? '--')}</span></div>
          <div class="field"><span class="label">Estado:</span><span class="value">${escapeHTML(it.estado ?? '')}</span></div>
          <div class="field"><span class="label">Carga:</span><span class="value">${escapeHTML(it.fechaCarga ?? '')}</span></div>
        </div>
      </div>
      <div class="card-actions">
        <button data-id="${it._id}" class="view-l">Ver</button>
        <button data-id="${it._id}" class="del-l secondary">Eliminar</button>
      </div>
    `;
    $lotesList.appendChild(card);
  });
}

/**
 * Escapar caracteres HTML en una cadena
 * @param {string} s - Cadena a escapar
 * @returns {string} Cadena escapada
 */
function escapeHTML(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Pequeña ayuda para generar un string hexadecimal de 24 caracteres para un ObjectId de marcador de posición
function genObjectId() {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 24; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}

// Extrae el número del lote: prioriza lote.valor, luego dígitos en lote.nombre o en la cadena
function extractLoteNumber(lote) {
  if (lote == null) return '';
  if (typeof lote === 'object') {
    if (lote.valor !== undefined && lote.valor !== null) return String(lote.valor);
    if (lote.nombre) {
      const m = String(lote.nombre).match(/\d+/);
      return m ? m[0] : String(lote.nombre);
    }
    if (lote._id) {
      const m = String(lote._id).match(/\d+/);
      return m ? m[0] : String(lote._id);
    }
    return JSON.stringify(lote);
  }
  // string
  const m = String(lote).match(/\d+/);
  return m ? m[0] : String(lote);
}

// Eventos
if ($refresh) $refresh.addEventListener('click', () => load()); // Refrescar la lista al hacer clic en el botón
// The old single 'open-add' button was removed; use 'open-add-madurador' to open the madurador form.
// New: open madurador form - populate lote select
if ($openAddMadurador) $openAddMadurador.addEventListener('click', async () => {
  if ($form) $form.reset();
  if ($listSection) $listSection.classList.add('hidden');
  if ($loteFormSection) $loteFormSection.classList.add('hidden');
  if ($formSection) $formSection.classList.remove('hidden');
  const title = document.getElementById('form-title'); if (title) title.textContent = 'Agregar nuevo Madurador';
  // fetch lotes
  try {
    const res = await fetch(API_BASE + '/find_all_lote/');
    if (!res.ok) {
      const errtxt = await res.text();
      console.warn('find_all_lote returned error:', res.status, errtxt);
      if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
      return;
    }
    const parsed = await parseResponseFlexible(res);
    console.debug('open-add-madurador: lotes response', parsed);
    // If parsed is a string it likely contains an error from the backend -> show in console and hide select
    if (typeof parsed === 'string') {
      console.warn('find_all_lote responded with text:', parsed);
      if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
      return;
    }
    const list = extractDataArray(parsed);
    console.debug('open-add-madurador: extracted lotes', list.length, list);
    // populate select
    if ($loteSelect) $loteSelect.innerHTML = '';
    if (list.length > 0) {
      list.forEach((l, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const loteId = idx + 1; // Auto-incremental ID starting from 1
        const cerveza = l.cerveza || l.nombre || 'Sin nombre';
        opt.textContent = `Lote #${loteId} - ${cerveza}`;
        opt.dataset.lote = JSON.stringify(l);
        $loteSelect.appendChild(opt);
      });
      $loteSelectLabel.classList.remove('hidden');
      // set hidden lote input based on first option
      const first = $loteSelect.options[0];
      if (first) {
        const obj = JSON.parse(first.dataset.lote);
        if ($loteObjInput) $loteObjInput.value = JSON.stringify(obj);
        const loteHidden = $form.querySelector('[name="lote"]'); if (loteHidden) loteHidden.value = "{'_id':'" + (obj._id || '') + "','valor':'" + (obj.valor || obj.nombre || '') + "'}";
      }
    } else {
      if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
    }
  } catch (err) {
    console.warn('No se pudieron cargar lotes', err);
    if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
  }
});
// when selecting a lote, update hidden lote input
if ($loteSelect) $loteSelect.addEventListener('change', (e) => {
  const opt = $loteSelect.options[$loteSelect.selectedIndex];
  if (!opt) return;
  const obj = JSON.parse(opt.dataset.lote || '{}');
  if ($loteObjInput) $loteObjInput.value = JSON.stringify(obj);
  const loteHidden = $form.querySelector('[name="lote"]');
  if (loteHidden) loteHidden.value = "{'_id':'" + (obj._id || '') + "','valor':'" + (obj.valor || obj.nombre || '') + "'}";
});
// Open lote form
if ($openAddLote) $openAddLote.addEventListener('click', () => {
  if ($formSection) $formSection.classList.add('hidden');
  if ($loteFormSection) $loteFormSection.classList.remove('hidden');
  if ($listSection) $listSection.classList.add('hidden');
  if ($loteForm) $loteForm.reset();
});
// cancel lote form
if ($cancelLote) $cancelLote.addEventListener('click', () => {
  if ($loteFormSection) $loteFormSection.classList.add('hidden');
  if ($listSection) $listSection.classList.remove('hidden');
});
// Submit lote form -> create_lote endpoint
if ($loteForm) $loteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData($loteForm);
  // If there's a hidden id field (lote-id) -> update, otherwise create
  const idEl = document.getElementById('lote-id');
  if (idEl && idEl.value) {
    const id = idEl.value;
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (k === 'id') continue; // skip id field
      params.append(k, v);
    }
    params.append('id', id);
    const url = API_BASE + '/update_lote_by_id/?' + params.toString();
    try {
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        if ($loteFormSection) $loteFormSection.classList.add('hidden');
        if ($listSection) $listSection.classList.remove('hidden');
        $loteForm.reset();
        if (idEl) idEl.remove();
        await load();
      } else {
        const txt = await res.text();
        alert('Error actualizando lote: ' + txt);
      }
    } catch (err) {
      alert('Error actualizando lote: ' + err.message);
    }
  } else {
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) params.append(k, v);
    const url = API_BASE + '/create_lote/?' + params.toString();
    try {
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        if ($loteFormSection) $loteFormSection.classList.add('hidden');
        if ($listSection) $listSection.classList.remove('hidden');
        $loteForm.reset();
        // after creating a lote, refresh the madurador list and also refresh lote select when opening form next time
        await load();
      } else {
        const txt = await res.text();
        alert('Error guardando lote: ' + txt);
      }
    } catch (err) {
      alert('Error guardando lote: ' + err.message);
    }
  }
});
if ($cancel) $cancel.addEventListener('click', () => {
  // Cancelar el formulario al hacer clic en el botón
  if ($formSection) $formSection.classList.add('hidden');
  if ($listSection) $listSection.classList.remove('hidden');
});

// Delegated handlers for maduradores list
if ($maduradoresList) $maduradoresList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  console.debug('maduradores click', { target: e.target, button: btn });
  if (!btn) return;
  const id = btn.dataset.id;
  if (!id) return;
  // delete madurador
  if (btn.classList.contains('del')) {
    if (!confirm('Confirmar eliminación')) return;
    const urlDel = API_BASE + '/delete_madurador_by_id/?' + new URLSearchParams({ id }).toString();
    await fetch(urlDel, { method: 'POST' });
    await load();
    return;
  }
  // view madurador by id
  if (btn.classList.contains('view-m')) {
    try {
      const res = await fetch(API_BASE + '/find_madurador_by_id/?' + new URLSearchParams({ id }).toString());
      if (!res.ok) throw new Error('error');
      const parsed = await parseResponseFlexible(res);
      const data = extractDataObject(parsed);
      renderDetail(data, 'madurador');
    } catch (err) {
      alert('Error cargando detalle: ' + err.message);
    }
    return;
  }
  // edit madurador
  if (btn.classList.contains('edit')) {
    try {
      const res = await fetch(API_BASE + '/find_madurador_by_id/?' + new URLSearchParams({ id }).toString());
      if (!res.ok) throw new Error('error al obtener registro');
      const parsed = await parseResponseFlexible(res);
      const item = extractDataObject(parsed);
      if (!item) throw new Error('registro no encontrado');
      // Rellenar formulario con los valores
      if ($form) {
        let idEl = document.getElementById('record-id');
        if (!idEl) {
          idEl = document.createElement('input');
          idEl.type = 'hidden';
          idEl.id = 'record-id';
          idEl.name = 'id';
          $form.appendChild(idEl);
        }
        idEl.value = item._id || '';
        // Preservar lote object
        let loteObjEl = document.getElementById('lote-obj');
        if (!loteObjEl) {
          loteObjEl = document.createElement('input');
          loteObjEl.type = 'hidden';
          loteObjEl.id = 'lote-obj';
          loteObjEl.name = 'lote_obj';
          $form.appendChild(loteObjEl);
        }
        try { loteObjEl.value = JSON.stringify(item.lote ?? {}); } catch (e) { loteObjEl.value = '{}'; }
        const litrosEl = $form.querySelector('[name="litros"]'); if (litrosEl) litrosEl.value = item.litros ?? '';
        const estadoEl = $form.querySelector('[name="estado"]'); if (estadoEl) estadoEl.value = item.estado ?? '';
        const notasEl = $form.querySelector('[name="notas"]'); if (notasEl) notasEl.value = item.notas ?? '';
        const loteEl = $form.querySelector('[name="lote"]'); if (loteEl) loteEl.value = extractLoteNumber(item.lote) || '';
      }
      if ($formSection) $formSection.classList.remove('hidden');
      if ($listSection) $listSection.classList.add('hidden');
      const title = document.getElementById('form-title'); if (title) title.textContent = 'Editar Registro';
    } catch (err) {
      alert('No se pudo cargar registro para editar: ' + err.message);
    }
    return;
  }
});

// Delegated handlers for lotes list
if ($lotesList) $lotesList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  console.debug('lotes click', { target: e.target, button: btn });
  if (!btn) return;
  const id = btn.dataset.id;
  if (!id) return;
  if (btn.classList.contains('del-l')) {
    if (!confirm('Confirmar eliminación')) return;
    const urlDel = API_BASE + '/delete_lote_by_id/?' + new URLSearchParams({ id }).toString();
    await fetch(urlDel, { method: 'POST' });
    await load();
    return;
  }
  if (btn.classList.contains('view-l')) {
    try {
      const res = await fetch(API_BASE + '/find_lote_by_id/?' + new URLSearchParams({ id }).toString());
      if (!res.ok) throw new Error('error');
      const parsed = await parseResponseFlexible(res);
      const data = extractDataObject(parsed);
      renderDetail(data, 'lote');
    } catch (err) {
      alert('Error cargando detalle: ' + err.message);
    }
    return;
  }
});

if ($form) $form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData($form);
  // Si existe un campo oculto id => actualizar
  const idEl = document.getElementById('record-id');
  const id = idEl ? idEl.value : null;
    if (id) {
    // Backend espera los parámetros en la cadena de consulta
    const params = new URLSearchParams();
    // Recopilar primero los campos del formulario
    for (const [k, v] of fd.entries()) params.append(k, v);
    // Manejar lote especialmente: si tenemos lote_obj preservado, actualizar su valor
    const loteInput = params.get('lote');
    const loteObjEl = document.getElementById('lote-obj');
    if (loteObjEl && loteObjEl.value) {
      try {
        const obj = JSON.parse(loteObjEl.value);
        if (loteInput && String(loteInput).trim() !== '') obj.valor = loteInput;
        params.set('lote', JSON.stringify(obj));
      } catch (e) {
        // fallback: si loteInput existe, crear un pequeño objeto lote
        if (loteInput && String(loteInput).trim() !== '') {
          const genId = genObjectId();
          params.set('lote', JSON.stringify({ _id: genId, valor: loteInput }));
        }
      }
    } else {
      // Objeto no preservado: construir objeto lote a partir de la entrada
      if (loteInput && String(loteInput).trim() !== '') {
        const genId = genObjectId();
        params.set('lote', JSON.stringify({ _id: genId, valor: loteInput }));
      }
    }
    params.append('id', id);
    const url = API_BASE + '/update_madurador_by_id/?' + params.toString();
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) {
      if ($formSection) $formSection.classList.add('hidden');
      if ($listSection) $listSection.classList.remove('hidden');
      if (idEl) idEl.remove();
      load();
    } else {
      const txt = await res.text();
      alert('Error actualizando: ' + txt);
    }
  } else {
    // Backend espera parametros en la cadena de consulta como ?litros=..&estado=..&lote=..
    const params = new URLSearchParams();
    let loteVal = null;
    for (const [k, v] of fd.entries()) {
      if (k === 'lote') loteVal = v;
      else params.append(k, v);
    }
    // Asegurarse de que lote sea una representación de cadena que se pueda analizar mediante literal_eval y contenga _id
    if (!loteVal || !loteVal.trim()) {
      const generatedId = genObjectId();
      loteVal = "{'_id':'" + generatedId + "','nombre':'lote_local'}";
    } else if (!loteVal.trim().startsWith('{')) {
      const generatedId = genObjectId();
      loteVal = "{'_id':'" + generatedId + "','valor':'" + loteVal + "'}";
    }
    params.append('lote', loteVal);
    const urlCreate = API_BASE + '/create_madurador/?' + params.toString();
    try {
      const res = await fetch(urlCreate, { method: 'POST' });
      if (res.ok) {
        if ($formSection) $formSection.classList.add('hidden');
        if ($listSection) $listSection.classList.remove('hidden');
        $form.reset();
        await load();
      } else {
        const txt = await res.text();
        alert('Error guardando: ' + txt);
      }
    } catch (err) {
      alert('Error guardando: ' + err.message);
    }
  }
});

// Inicializar la aplicación
health();
load();
// Verificar el estado de la conexión con el backend cada 15 segundos
setInterval(health, 15000);

// Close detail
if ($closeDetail) $closeDetail.addEventListener('click', () => {
  if ($detail) $detail.classList.add('hidden');
});

/**
 * Render a human-friendly detail panel for madurador or lote
 * type: 'madurador' | 'lote' | null (auto-detect)
 */
function renderDetail(data, type = null) {
  if (!$detail || !$detailContent) return;
  if (!data) {
    $detailContent.textContent = 'No hay detalle disponible';
    $detail.classList.remove('hidden');
    return;
  }
  // If data is a raw text error, show it in pre
  if (typeof data === 'string') {
    $detailContent.textContent = data;
    $detail.classList.remove('hidden');
    return;
  }
  // Determine type if not provided
  if (!type) {
    if (data.litros !== undefined) type = 'madurador';
    else if (data.cerveza !== undefined || data.cantidadLitros !== undefined) type = 'lote';
  }
  // Build HTML
  const parts = [];
  if (type === 'madurador') {
    parts.push(`<div class="detail-row"><strong>_id:</strong> ${escapeHTML(data._id ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Litros:</strong> ${escapeHTML(data.litros ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Estado:</strong> ${escapeHTML(data.estado ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Notas:</strong> ${escapeHTML(data.notas ?? '')}</div>`);
    // lote summary
    if (data.lote) {
      const loteNum = extractLoteNumber(data.lote);
      parts.push(`<div class="detail-row"><strong>Lote:</strong> ${escapeHTML(loteNum ?? JSON.stringify(data.lote))}</div>`);
    }
    parts.push(`<div class="detail-actions"><button id="detail-edit" data-type="madurador" data-id="${data._id}">Editar</button> <button id="detail-delete" data-type="madurador" data-id="${data._id}" class="secondary">Eliminar</button></div>`);
  } else if (type === 'lote') {
    parts.push(`<div class="detail-row"><strong>_id:</strong> ${escapeHTML(data._id ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Cerveza:</strong> ${escapeHTML(data.cerveza ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>CantidadLitros:</strong> ${escapeHTML(data.cantidadLitros ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Estado:</strong> ${escapeHTML(data.estado ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>FechaCarga:</strong> ${escapeHTML(data.fechaCarga ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>FechaVencimiento:</strong> ${escapeHTML(data.fechaVencimiento ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Notas:</strong> ${escapeHTML(data.notas ?? '')}</div>`);
    parts.push(`<div class="detail-actions"><button id="detail-edit" data-type="lote" data-id="${data._id}">Editar</button> <button id="detail-delete" data-type="lote" data-id="${data._id}" class="secondary">Eliminar</button></div>`);
  } else {
    // generic fallback
    $detailContent.textContent = JSON.stringify(data, null, 2);
    $detail.classList.remove('hidden');
    return;
  }

  $detailContent.innerHTML = parts.join('');
  $detail.classList.remove('hidden');
}

// Handle clicks on detail actions (edit / delete)
document.addEventListener('click', async (e) => {
  const target = e.target;
  if (!target) return;
  if (target.id === 'detail-delete') {
    const id = target.dataset.id;
    const type = target.dataset.type;
    if (!confirm('Confirmar eliminación')) return;
    try {
      if (type === 'madurador') {
        await fetch(API_BASE + '/delete_madurador_by_id/?' + new URLSearchParams({ id }).toString(), { method: 'POST' });
      } else if (type === 'lote') {
        await fetch(API_BASE + '/delete_lote_by_id/?' + new URLSearchParams({ id }).toString(), { method: 'POST' });
      }
      if ($detail) $detail.classList.add('hidden');
      await load();
    } catch (err) {
      alert('Error eliminando: ' + err.message);
    }
  }
  if (target.id === 'detail-edit') {
    const id = target.dataset.id;
    const type = target.dataset.type;
    try {
      if (type === 'madurador') {
        // reuse edit flow: fetch item and populate madurador form
        const res = await fetch(API_BASE + '/find_madurador_by_id/?' + new URLSearchParams({ id }).toString());
        const parsed = await parseResponseFlexible(res);
        const item = extractDataObject(parsed);
        if (!item) throw new Error('registro no encontrado');
        // populate madurador form
        if ($form) {
          let idEl = document.getElementById('record-id');
          if (!idEl) { idEl = document.createElement('input'); idEl.type='hidden'; idEl.id='record-id'; idEl.name='id'; $form.appendChild(idEl); }
          idEl.value = item._id || '';
          let loteObjEl = document.getElementById('lote-obj');
          if (!loteObjEl) { loteObjEl = document.createElement('input'); loteObjEl.type='hidden'; loteObjEl.id='lote-obj'; loteObjEl.name='lote_obj'; $form.appendChild(loteObjEl); }
          try { loteObjEl.value = JSON.stringify(item.lote ?? {}); } catch (e) { loteObjEl.value = '{}'; }
          const litrosEl = $form.querySelector('[name="litros"]'); if (litrosEl) litrosEl.value = item.litros ?? '';
          const estadoEl = $form.querySelector('[name="estado"]'); if (estadoEl) estadoEl.value = item.estado ?? '';
          const notasEl = $form.querySelector('[name="notas"]'); if (notasEl) notasEl.value = item.notas ?? '';
          const loteEl = $form.querySelector('[name="lote"]'); if (loteEl) loteEl.value = extractLoteNumber(item.lote) || '';
        }
        if ($formSection) $formSection.classList.remove('hidden');
        if ($listSection) $listSection.classList.add('hidden');
        const title = document.getElementById('form-title'); if (title) title.textContent = 'Editar Registro';
      } else if (type === 'lote') {
        // fetch lote and populate lote form for editing
        const res = await fetch(API_BASE + '/find_lote_by_id/?' + new URLSearchParams({ id }).toString());
        const parsed = await parseResponseFlexible(res);
        const item = extractDataObject(parsed);
        if (!item) throw new Error('lote no encontrado');
        if ($loteForm) {
          // ensure hidden id
          let idEl = document.getElementById('lote-id');
          if (!idEl) { idEl = document.createElement('input'); idEl.type = 'hidden'; idEl.id = 'lote-id'; idEl.name = 'id'; $loteForm.appendChild(idEl); }
          idEl.value = item._id || '';
          const cervezaEl = $loteForm.querySelector('[name="cerveza"]'); if (cervezaEl) cervezaEl.value = item.cerveza ?? '';
          const estadoEl = $loteForm.querySelector('[name="estado"]'); if (estadoEl) estadoEl.value = item.estado ?? '';
          const cantidadEl = $loteForm.querySelector('[name="cantidadLitros"]'); if (cantidadEl) cantidadEl.value = item.cantidadLitros ?? '';
          const fechaCargaEl = $loteForm.querySelector('[name="fechaCarga"]'); if (fechaCargaEl) fechaCargaEl.value = item.fechaCarga ?? '';
          const fechaVencEl = $loteForm.querySelector('[name="fechaVencimiento"]'); if (fechaVencEl) fechaVencEl.value = item.fechaVencimiento ?? '';
          const notasEl = $loteForm.querySelector('[name="notas"]'); if (notasEl) notasEl.value = item.notas ?? '';
        }
        if ($loteFormSection) $loteFormSection.classList.remove('hidden');
        if ($listSection) $listSection.classList.add('hidden');
      }
      if ($detail) $detail.classList.add('hidden');
    } catch (err) {
      alert('No se pudo preparar edición: ' + err.message);
    }
  }
});
