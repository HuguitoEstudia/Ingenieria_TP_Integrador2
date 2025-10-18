// URL base de la API, almacenada en localStorage o por defecto en http://127.0.0.1:8000
const API_BASE = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8000';

// Mostrar la URL de la API en el elemento #api-url
document.getElementById('api-url').textContent = API_BASE;

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
    $status.textContent = 'Backend: desconectado';
  }
}

/**
 * Cargar la lista de registros desde el backend
 */
async function load() {
  // Mostrar un mensaje de carga en la lista
  $records.innerHTML = 'Cargando...';
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
    $records.innerHTML = '<div style="color:#a00">Error cargando registros</div>';
  }
}

/**
 * Renderizar la lista de registros en el DOM
 * @param {Array} items - Lista de registros
 */
function render(items) {
  // Si la lista está vacía, mostrar un mensaje
  if (!items || items.length === 0) {
    $records.innerHTML = '<div style="text-align:center;padding:40px;color:#666">No hay registros disponibles</div>';
    return;
  }
  // Limpiar la lista
  $records.innerHTML = '';
  // Iterar sobre la lista de registros y crear elementos del DOM
  items.forEach((it) => {
    const el = document.createElement('div');
    el.className = 'record';
    el.innerHTML = `<div><strong>${escapeHTML(it.nombre || '--')}</strong><div style="color:#666">${escapeHTML(it.email || '')}</div></div>
      <div><button data-id="${it._id}" class="edit">Editar</button> <button data-id="${it._id}" class="del secondary">Eliminar</button></div>`;
    $records.appendChild(el);
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
$refresh.addEventListener('click', () => load()); // Refrescar la lista al hacer clic en el botón
$openAdd.addEventListener('click', () => {
  // Abrir el formulario de agregar al hacer clic en el botón
  $formSection.classList.remove('hidden');
  $listSection.classList.add('hidden');
  $form.reset();
  document.getElementById('form-title').textContent = 'Agregar Registro';
});
$cancel.addEventListener('click', () => {
  // Cancelar el formulario al hacer clic en el botón
  $formSection.classList.add('hidden');
  $listSection.classList.remove('hidden');
});

$records.addEventListener('click', async (e) => {
  // Obtener el ID del registro al hacer clic en un botón de editar o eliminar
  const id = e.target.dataset.id;
  if (!id) return;
  // Eliminar el registro al hacer clic en el botón de eliminar
  if (e.target.classList.contains('del')) {
    if (!confirm('Confirmar eliminación')) return;
    await fetch(API_BASE + '/delete/' + id, { method: 'POST' });
    await load();
  }
  // Editar el registro al hacer clic en el botón de editar (no implementado)
  if (e.target.classList.contains('edit')) {
    alert('Editar no implementado en la SPA - use el backend directamente');
  }
});

$form.addEventListener('submit', async (e) => {
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
    $formSection.classList.add('hidden');
    $listSection.classList.remove('hidden');
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