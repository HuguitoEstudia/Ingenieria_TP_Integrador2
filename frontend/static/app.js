// URL base de la API, almacenada en localStorage o por defecto en http://127.0.0.1:8001
// Cambia este valor desde el navegador con: localStorage.setItem('API_BASE', 'http://127.0.0.1:8001')
const API_BASE = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8001';

// Mostrar la URL de la API en el elemento #api-url (si existe)
const apiUrlEl = document.getElementById('api-url');
if (apiUrlEl) apiUrlEl.textContent = API_BASE;

// Elementos del DOM
const $status = document.getElementById('status'); // Estado de la conexión con el backend
const $records = document.getElementById('records'); // Lista de registros
const $refresh = document.getElementById('refresh'); // Botón para refrescar la lista
const $openAdd = document.getElementById('open-add'); // Botón para abrir el formulario de agregar
const $formSection = document.getElementById('form'); // Sección del formulario
const $listSection = document.getElementById('list'); // Sección de la lista
const $form = document.getElementById('record-form'); // Formulario de agregar registro
const $cancel = document.getElementById('cancel'); // Botón para cancelar el formulario

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
async function load() {
  // Mostrar un mensaje de carga en la lista
  if ($records) $records.innerHTML = 'Cargando...';
  try {
    // Realizar una solicitud GET a /api/records
    const res = await fetch(API_BASE + '/api/records');
    // Si la respuesta no es OK, lanzar un error
    if (!res.ok) throw new Error('api error');
    // Parsear la respuesta como JSON
    const data = await res.json();
    // Renderizar la lista de registros
    render(data);
  } catch (e) {
    // Si hay un error, mostrar un mensaje de error en la lista
    if ($records) $records.innerHTML = '<div style="color:#a00">Error cargando registros</div>';
  }
}

/**
 * Renderizar la lista de registros en el DOM
 * @param {Array} items - Lista de registros
 */
function render(items) {
  // Si la lista está vacía, mostrar un mensaje
  if (!items || items.length === 0) {
    if ($records) $records.innerHTML = '<div style="text-align:center;padding:40px;color:#666">No hay registros disponibles</div>';
    return;
  }
  // Limpiar la lista
  if ($records) $records.innerHTML = '';
  // Iterar sobre la lista de registros y crear elementos del DOM
  items.forEach((it, idx) => {
    const card = document.createElement('div');
    card.className = 'record-card';
    // Muestra por pantalla un índice incremental basado en 1 para el frontend en lugar del ObjectId de Mongo
    // Mostrar solo el número del lote: prioridad valor -> dígitos en nombre -> dígitos en _id
    let loteDisplay = '';
    const loteVal = it.lote;
    const loteNum = extractLoteNumber(loteVal);
    loteDisplay = loteNum ? escapeHTML(loteNum) : '--';

    card.innerHTML = `
      <div class="card-header">Registro #${idx + 1}</div>
      <div class="card-body">
        <div class="record-grid">
          <div class="field"><span class="label">Litros:</span><span class="value">${escapeHTML(it.litros ?? '--')}</span></div>
          <div class="field"><span class="label">Estado:</span><span class="value">${escapeHTML(it.estado ?? '')}</span></div>
          <div class="field"><span class="label">Notas:</span><span class="value">${escapeHTML(it.notas ?? '')}</span></div>
          <div class="field"><span class="label">Lote:</span><span class="value">${loteDisplay}</span></div>
        </div>
      </div>
      <div class="card-actions"><button data-id="${it._id}" class="edit">Editar</button> <button data-id="${it._id}" class="del secondary">Eliminar</button></div>
    `;
    if ($records) $records.appendChild(card);
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
if ($openAdd) $openAdd.addEventListener('click', () => {
  // Abrir el formulario de agregar al hacer clic en el botón
  if ($formSection) $formSection.classList.remove('hidden');
  if ($listSection) $listSection.classList.add('hidden');
  if ($form) $form.reset();
  const title = document.getElementById('form-title'); if (title) title.textContent = 'Agregar Registro';
});
if ($cancel) $cancel.addEventListener('click', () => {
  // Cancelar el formulario al hacer clic en el botón
  if ($formSection) $formSection.classList.add('hidden');
  if ($listSection) $listSection.classList.remove('hidden');
});

if ($records) $records.addEventListener('click', async (e) => {
  // Obtener el ID del registro al hacer clic en un botón de editar o eliminar
  const id = e.target.dataset.id;
  if (!id) return;
  // Eliminar el registro al hacer clic en el botón de eliminar
  if (e.target.classList.contains('del')) {
    if (!confirm('Confirmar eliminación')) return;
    const urlDel = API_BASE + '/delete_madurador_by_id/?' + new URLSearchParams({ id }).toString();
    await fetch(urlDel, { method: 'POST' });
    await load();
  }
  // Editar el registro al hacer clic en el botón de editar: cargar datos en el formulario
  if (e.target.classList.contains('edit')) {
    try {
      const res = await fetch(API_BASE + '/api/records');
      if (!res.ok) throw new Error('error al obtener registros');
      const items = await res.json();
      const item = items.find(it => it._id === id);
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
        // Preservar el objeto lote original para poder reutilizar su _id en la actualización
        let loteObjEl = document.getElementById('lote-obj');
        if (!loteObjEl) {
          loteObjEl = document.createElement('input');
          loteObjEl.type = 'hidden';
          loteObjEl.id = 'lote-obj';
          loteObjEl.name = 'lote_obj';
          $form.appendChild(loteObjEl);
        }
        try {
          loteObjEl.value = JSON.stringify(item.lote ?? {});
        } catch (e) {
          loteObjEl.value = '{}';
        }
        const litrosEl = $form.querySelector('[name="litros"]'); if (litrosEl) litrosEl.value = item.litros ?? '';
        const estadoEl = $form.querySelector('[name="estado"]'); if (estadoEl) estadoEl.value = item.estado ?? '';
        const notasEl = $form.querySelector('[name="notas"]'); if (notasEl) notasEl.value = item.notas ?? '';
  const loteEl = $form.querySelector('[name="lote"]');
  if (loteEl) loteEl.value = extractLoteNumber(item.lote) || '';
      }
      if ($formSection) $formSection.classList.remove('hidden');
      if ($listSection) $listSection.classList.add('hidden');
      const title = document.getElementById('form-title'); if (title) title.textContent = 'Editar Registro';
    } catch (err) {
      alert('No se pudo cargar registro para editar: ' + err.message);
    }
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
        load();
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
