// URL base de la API, almacenada en localStorage o por defecto en http://127.0.0.1:8001
// Cambia este valor desde el navegador con: localStorage.setItem('API_BASE', 'http://127.0.0.1:8001')
const API_BASE = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8001';

// Mostrar la URL de la API en el elemento #api-url (si existe)
const apiUrlEl = document.getElementById('api-url');
if (apiUrlEl) apiUrlEl.textContent = API_BASE;

// Elementos del DOM
const $status = document.getElementById('status'); // Estado de la conexión con el backend
const $records = document.getElementById('records'); // marcador de posición heredado (puede ser null)
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
const $searchMaduradores = document.getElementById('search-maduradores');
const $searchLotes = document.getElementById('search-lotes');

// Cache global para lotes para mapearlos con IDs auto-incrementales
let cachedLotes = [];
// Cache global para todos los datos para habilitar filtrado del lado del cliente
let allMaduradores = [];
let allLotes = [];

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
// Utilidad: intentar parsear JSON, fallback a texto->comillas simples->JSON
async function parseResponseFlexible(res) {
  // Intentar JSON primero, de lo contrario leer texto una vez e intentar parsear dicts estilo Python
  try {
    const json = await res.json();
    console.debug('✓ Parseado como JSON:', json);
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
      console.debug('✗ JSON.parse falló:', err2.message);
      // Conversión de dict Python a JSON
      try {
        // Usar constructor Function para evaluar dict estilo Python como objeto JavaScript
        // Esto es seguro porque controlamos el backend
        const cleaned = txt
          .replace(/None/g, 'null')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false');
        
        console.debug('Intentando constructor Function con texto limpio...');
        
        // Usar constructor Function (más seguro que eval)
        const result = new Function(`'use strict'; return (${cleaned})`)();
        console.debug('✓ Dict Python parseado exitosamente:', result);
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
  // Para respuestas de objeto único
  if (parsed && parsed.data) {
    return parsed.data;
  }
  return parsed;
}

async function load() {
  // cargar tanto maduradores como lotes
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
    allMaduradores = items; // Cache para filtrado
    console.debug('loadMaduradores: recibido', items?.length ?? 0, 'items', items);
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
    cachedLotes = items; // Cache de lotes para mostrar en madurador
    allLotes = items; // Cache para filtrado
    console.debug('loadLotes: recibido', items?.length ?? 0, 'items', items);
    renderLotes(items);
  } catch (e) {
    console.error('loadLotes error:', e);
    if ($lotesList) $lotesList.innerHTML = '<div style="color:#a00">Error cargando lotes</div>';
  }
}

// Ayudante para formatear visualización de lote como "Lote #X - Cerveza"
function formatLoteDisplay(lote) {
  if (!lote) return '--';
  
  // Manejar si lote es un string (no debería pasar pero por si acaso)
  if (typeof lote === 'string') {
    try {
      lote = JSON.parse(lote.replace(/'/g, '"'));
    } catch (e) {
      return lote;
    }
  }
  
  if (typeof lote !== 'object') return '--';
  
  const cerveza = lote.cerveza || lote.nombre || 'Sin nombre';
  
  // Intentar encontrar el índice del lote en cachedLotes comparando _id
  if (cachedLotes && cachedLotes.length > 0 && lote._id) {
    const idx = cachedLotes.findIndex(l => l._id === lote._id);
    if (idx !== -1) {
      return `Lote #${idx + 1} - ${cerveza}`;
    }
  }
  
  // Fallback: usar valor si existe
  if (lote.valor) {
    return `Lote #${lote.valor} - ${cerveza}`;
  }
  
  // Último fallback: solo cerveza
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
          <div class="field"><span class="label">Cerveza:</span><span class="value">${escapeHTML(it.cerveza ?? '--')}</span></div>
          <div class="field"><span class="label">Estado:</span><span class="value">${escapeHTML(it.estado ?? '')}</span></div>
          <div class="field"><span class="label">Cantidad (Lts):</span><span class="value">${escapeHTML(it.cantidadLitros ?? '--')}</span></div>
          <div class="field"><span class="label">Carga:</span><span class="value">${escapeHTML(it.fechaCarga ?? '')}</span></div>
          <div class="field"><span class="label">Vencimiento:</span><span class="value">${escapeHTML(it.fechaVencimiento ?? '')}</span></div>
          <div class="field"><span class="label">Notas:</span><span class="value">${escapeHTML(it.notas ?? '--')}</span></div>
        </div>
      </div>
      <div class="card-actions">
        <button data-id="${it._id}" class="view-l">Ver</button>
        <button data-id="${it._id}" class="edit-l">Editar</button>
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
  // cadena de texto
  const m = String(lote).match(/\d+/);
  return m ? m[0] : String(lote);
}

// Eventos
if ($refresh) $refresh.addEventListener('click', () => load()); // Refrescar la lista al hacer clic en el botón
// El antiguo botón único 'open-add' fue eliminado; usar 'open-add-madurador' para abrir el formulario de madurador.
// Nuevo: abrir formulario de madurador - poblar selector de lote
if ($openAddMadurador) $openAddMadurador.addEventListener('click', async () => {
  if ($form) $form.reset();
  if ($listSection) $listSection.classList.add('hidden');
  if ($loteFormSection) $loteFormSection.classList.add('hidden');
  if ($formSection) $formSection.classList.remove('hidden');
  const title = document.getElementById('form-title'); if (title) title.textContent = 'Agregar nuevo Madurador';
  // obtener lotes
  try {
    const res = await fetch(API_BASE + '/find_all_lote/');
    if (!res.ok) {
      const errtxt = await res.text();
      console.warn('find_all_lote returned error:', res.status, errtxt);
      if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
      return;
    }
    const parsed = await parseResponseFlexible(res);
    console.debug('open-add-madurador: respuesta de lotes', parsed);
    // Si parsed es un string probablemente contiene un error del backend -> mostrar en consola y ocultar selector
    if (typeof parsed === 'string') {
      console.warn('find_all_lote responded with text:', parsed);
      if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
      return;
    }
    const list = extractDataArray(parsed);
    console.debug('open-add-madurador: lotes extraídos', list.length, list);
    // poblar selector
    if ($loteSelect) $loteSelect.innerHTML = '';
    if (list.length > 0) {
      list.forEach((l, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const loteId = idx + 1; // ID auto-incremental comenzando desde 1
        const cerveza = l.cerveza || l.nombre || 'Sin nombre';
        opt.textContent = `Lote #${loteId} - ${cerveza}`;
        opt.dataset.lote = JSON.stringify(l);
        $loteSelect.appendChild(opt);
      });
      $loteSelectLabel.classList.remove('hidden');
      // establecer input oculto de lote basado en primera opción
      const first = $loteSelect.options[0];
      if (first) {
        const obj = JSON.parse(first.dataset.lote);
        if ($loteObjInput) $loteObjInput.value = JSON.stringify(obj);
        const loteHidden = $form.querySelector('[name="lote"]');
        if (loteHidden) {
          // Enviar objeto lote completo como string de dict Python
          loteHidden.value = JSON.stringify(obj).replace(/"/g, "'");
        }
      }
    } else {
      if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
    }
  } catch (err) {
    console.warn('No se pudieron cargar lotes', err);
    if ($loteSelectLabel) $loteSelectLabel.classList.add('hidden');
  }
});
// al seleccionar un lote, actualizar input oculto de lote
if ($loteSelect) $loteSelect.addEventListener('change', (e) => {
  const opt = $loteSelect.options[$loteSelect.selectedIndex];
  if (!opt) return;
  const obj = JSON.parse(opt.dataset.lote || '{}');
  if ($loteObjInput) $loteObjInput.value = JSON.stringify(obj);
  const loteHidden = $form.querySelector('[name="lote"]');
  if (loteHidden) {
    // Enviar objeto lote completo como string de dict Python
    loteHidden.value = JSON.stringify(obj).replace(/"/g, "'");
  }
});
// Abrir formulario de lote
if ($openAddLote) $openAddLote.addEventListener('click', () => {
  if ($formSection) $formSection.classList.add('hidden');
  if ($loteFormSection) $loteFormSection.classList.remove('hidden');
  if ($listSection) $listSection.classList.add('hidden');
  if ($loteForm) $loteForm.reset();
});
// cancelar formulario de lote
if ($cancelLote) $cancelLote.addEventListener('click', () => {
  if ($loteFormSection) $loteFormSection.classList.add('hidden');
  if ($listSection) $listSection.classList.remove('hidden');
});
// Enviar formulario de lote -> endpoint create_lote
if ($loteForm) $loteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData($loteForm);
  // Si hay un campo id oculto (lote-id) -> actualizar, de lo contrario crear
  const idEl = document.getElementById('lote-id');
  if (idEl && idEl.value) {
    const id = idEl.value;
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (k === 'id') continue; // saltar campo id
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
        // después de crear un lote, refrescar la lista de maduradores y también refrescar el selector de lote al abrir el formulario la próxima vez
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

// Manejadores delegados para lista de maduradores
if ($maduradoresList) $maduradoresList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  console.debug('maduradores click', { target: e.target, button: btn });
  if (!btn) return;
  const id = btn.dataset.id;
  if (!id) return;
  // eliminar madurador
  if (btn.classList.contains('del')) {
    if (!confirm('Confirmar eliminación')) return;
    const urlDel = API_BASE + '/delete_madurador_by_id/?' + new URLSearchParams({ id }).toString();
    await fetch(urlDel, { method: 'POST' });
    await load();
    return;
  }
  // ver madurador por id
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
  // editar madurador
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
        // Preservar objeto lote
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

// Manejadores delegados para lista de lotes
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
  // editar lote
  if (btn.classList.contains('edit-l')) {
    try {
      const res = await fetch(API_BASE + '/find_lote_by_id/?' + new URLSearchParams({ id }).toString());
      if (!res.ok) throw new Error('error al obtener lote');
      const parsed = await parseResponseFlexible(res);
      const item = extractDataObject(parsed);
      if (!item) throw new Error('lote no encontrado');
      // Rellenar formulario de lote con los valores
      if ($loteForm) {
        let idEl = document.getElementById('lote-id');
        if (!idEl) {
          idEl = document.createElement('input');
          idEl.type = 'hidden';
          idEl.id = 'lote-id';
          idEl.name = 'id';
          $loteForm.appendChild(idEl);
        }
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
      const title = document.getElementById('lote-form-title'); if (title) title.textContent = 'Editar Lote';
    } catch (err) {
      alert('No se pudo cargar lote para editar: ' + err.message);
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
    console.debug('Creando madurador - loteVal del formulario:', loteVal);
    // loteVal ya debería ser un string de dict Python del selector (ej., "{'_id':'...','cerveza':'Rubia',...}")
    // Si está vacío o inválido, generar uno mínimo
    if (!loteVal || !loteVal.trim()) {
      const generatedId = genObjectId();
      loteVal = "{'_id':'" + generatedId + "','nombre':'lote_local'}";
      console.warn('No se seleccionó lote, usando generado:', loteVal);
    }
    // loteVal ya está formateado como dict Python, usarlo directamente
    console.debug('loteVal final a enviar:', loteVal);
    params.append('lote', loteVal);
    const urlCreate = API_BASE + '/create_madurador/?' + params.toString();
    console.debug('Create URL:', urlCreate);
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

// Cerrar detalle
if ($closeDetail) $closeDetail.addEventListener('click', () => {
  if ($detail) $detail.classList.add('hidden');
});

/**
 * Renderizar un panel de detalle amigable para madurador o lote
 * type: 'madurador' | 'lote' | null (auto-detectar)
 */
function renderDetail(data, type = null) {
  if (!$detail || !$detailContent) return;
  if (!data) {
    $detailContent.textContent = 'No hay detalle disponible';
    $detail.classList.remove('hidden');
    return;
  }
  // Si data es un error de texto crudo, mostrarlo en pre
  if (typeof data === 'string') {
    $detailContent.textContent = data;
    $detail.classList.remove('hidden');
    return;
  }
  // Determinar tipo si no se proporcionó
  if (!type) {
    if (data.litros !== undefined) type = 'madurador';
    else if (data.cerveza !== undefined || data.cantidadLitros !== undefined) type = 'lote';
  }
  // Construir HTML
  const parts = [];
  if (type === 'madurador') {
    parts.push(`<div class="detail-row"><strong>_id:</strong> ${escapeHTML(data._id ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Litros:</strong> ${escapeHTML(data.litros ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Estado:</strong> ${escapeHTML(data.estado ?? '')}</div>`);
    parts.push(`<div class="detail-row"><strong>Notas:</strong> ${escapeHTML(data.notas ?? '')}</div>`);
    // resumen de lote
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
    // fallback genérico
    $detailContent.textContent = JSON.stringify(data, null, 2);
    $detail.classList.remove('hidden');
    return;
  }

  $detailContent.innerHTML = parts.join('');
  $detail.classList.remove('hidden');
}

// Manejar clicks en acciones de detalle (editar / eliminar)
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
        // reutilizar flujo de edición: obtener item y poblar formulario de madurador
        const res = await fetch(API_BASE + '/find_madurador_by_id/?' + new URLSearchParams({ id }).toString());
        const parsed = await parseResponseFlexible(res);
        const item = extractDataObject(parsed);
        if (!item) throw new Error('registro no encontrado');
        // poblar formulario de madurador
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
        // obtener lote y poblar formulario de lote para editar
        const res = await fetch(API_BASE + '/find_lote_by_id/?' + new URLSearchParams({ id }).toString());
        const parsed = await parseResponseFlexible(res);
        const item = extractDataObject(parsed);
        if (!item) throw new Error('lote no encontrado');
        if ($loteForm) {
          // asegurar id oculto
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

// Funcionalidad de búsqueda/filtrado
function filterMaduradores(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    renderMaduradores(allMaduradores);
    return;
  }
  const term = searchTerm.toLowerCase();
  const filtered = allMaduradores.filter((m, idx) => {
    const maduradorNum = String(idx + 1); // Madurador #1, #2, etc.
    const litros = String(m.litros || '').toLowerCase();
    const estado = String(m.estado || '').toLowerCase();
    const notas = String(m.notas || '').toLowerCase();
    const loteStr = formatLoteDisplay(m.lote).toLowerCase();
    
    // Verificar si se está buscando "madurador 1", "mad 1", "#1", etc.
    const maduradorMatch = term.match(/(?:mad(?:urador)?|#)\s*(\d+)/i);
    if (maduradorMatch && maduradorMatch[1] === maduradorNum) {
      return true;
    }
    
    return maduradorNum.includes(term) || litros.includes(term) || estado.includes(term) || notas.includes(term) || loteStr.includes(term);
  });
  renderMaduradores(filtered);
}

function filterLotes(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    renderLotes(allLotes);
    return;
  }
  const term = searchTerm.toLowerCase();
  const filtered = allLotes.filter(l => {
    const cerveza = String(l.cerveza || '').toLowerCase();
    const estado = String(l.estado || '').toLowerCase();
    const cantidad = String(l.cantidadLitros || '').toLowerCase();
    const notas = String(l.notas || '').toLowerCase();
    const fechaCarga = String(l.fechaCarga || '').toLowerCase();
    return cerveza.includes(term) || estado.includes(term) || cantidad.includes(term) || notas.includes(term) || fechaCarga.includes(term);
  });
  renderLotes(filtered);
}

// Adjuntar event listeners de búsqueda
if ($searchMaduradores) {
  $searchMaduradores.addEventListener('input', (e) => {
    filterMaduradores(e.target.value);
  });
}

if ($searchLotes) {
  $searchLotes.addEventListener('input', (e) => {
    filterLotes(e.target.value);
  });
}
