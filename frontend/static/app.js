// URL base de la API, almacenada en localStorage o por defecto en http://127.0.0.1:8000
const API_BASE = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8000';

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
    // Display a 1-based incremental index for the frontend instead of the Mongo ObjectId
    card.innerHTML = `
      <div class="card-header">Registro #${idx + 1}</div>
      <div class="card-body">
        <div class="record-grid">
          <div class="field"><span class="label">Litros:</span><span class="value">${escapeHTML(it.litros ?? '--')}</span></div>
          <div class="field"><span class="label">Estado:</span><span class="value">${escapeHTML(it.estado ?? '')}</span></div>
          <div class="field"><span class="label">Notas:</span><span class="value">${escapeHTML(it.notas ?? '')}</span></div>
          <div class="field"><span class="label">Lote:</span><span class="value">${escapeHTML(it.lote ?? '')}</span></div>
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
    await fetch(API_BASE + '/delete_madurador_by_id/', { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: `id=${encodeURIComponent(id)}` });
    await load();
  }
  // Editar el registro al hacer clic en el botón de editar (no implementado)
  if (e.target.classList.contains('edit')) {
    alert('Editar no implementado en la SPA - use el backend directamente');
  }
});

if ($form) $form.addEventListener('submit', async (e) => {
  // Prevenir el envío del formulario por defecto
  e.preventDefault();
  // Crear un objeto FormData a partir del formulario
  const fd = new FormData($form);
  // Crear un objeto URLSearchParams a partir del FormData
  const payload = new URLSearchParams();
  for (const [k, v] of fd.entries()) payload.append(k, v);
  // Enviar una solicitud POST al endpoint /add
  const res = await fetch(API_BASE + '/add', { method: 'POST', body: payload });
  // Si la respuesta es OK, cerrar el formulario y refrescar la lista
  if (res.ok) {
    if ($formSection) $formSection.classList.add('hidden');
    if ($listSection) $listSection.classList.remove('hidden');
    load();
  } else {
    // Si hay un error, mostrar un mensaje de error
    alert('Error al guardar');
  }
});

// Inicializar la aplicación
health();
load();
// Verificar el estado de la conexión con el backend cada 15 segundos
setInterval(health, 15000);
