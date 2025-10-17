const API_BASE = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8000'

document.getElementById('api-url').textContent = API_BASE

const $status = document.getElementById('status')
const $records = document.getElementById('records')
const $refresh = document.getElementById('refresh')
const $openAdd = document.getElementById('open-add')
const $formSection = document.getElementById('form')
const $listSection = document.getElementById('list')
const $form = document.getElementById('record-form')
const $cancel = document.getElementById('cancel')

async function health(){
  try{
    const res = await fetch(API_BASE + '/health')
    if(!res.ok) throw new Error('no')
    const j = await res.json()
    $status.textContent = 'Backend: ' + j.status
  }catch(e){
    $status.textContent = 'Backend: desconectado'
  }
}

async function load(){
  $records.innerHTML = 'Cargando...'
  try{
    const res = await fetch(API_BASE + '/api/records')
    if(!res.ok) throw new Error('api error')
    const data = await res.json()
    render(data)
  }catch(e){
    $records.innerHTML = '<div style="color:#a00">Error cargando registros</div>'
  }
}

function render(items){
  if(!items || items.length===0){
    $records.innerHTML = '<div style="text-align:center;padding:40px;color:#666">No hay registros disponibles</div>'
    return
  }
  $records.innerHTML = ''
  items.forEach(it=>{
    const el = document.createElement('div')
    el.className = 'record'
    el.innerHTML = `<div><strong>${escapeHTML(it.nombre||'--')}</strong><div style="color:#666">${escapeHTML(it.email||'')}</div></div>
      <div><button data-id="${it._id}" class="edit">Editar</button> <button data-id="${it._id}" class="del secondary">Eliminar</button></div>`
    $records.appendChild(el)
  })
}

function escapeHTML(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}

$refresh.addEventListener('click',()=>load())
$openAdd.addEventListener('click',()=>{ $formSection.classList.remove('hidden'); $listSection.classList.add('hidden'); $form.reset(); document.getElementById('form-title').textContent='Agregar Registro' })
$cancel.addEventListener('click',()=>{ $formSection.classList.add('hidden'); $listSection.classList.remove('hidden'); })

$records.addEventListener('click',async (e)=>{
  const id = e.target.dataset.id
  if(!id) return
  if(e.target.classList.contains('del')){
    if(!confirm('Confirmar eliminación')) return
    await fetch(API_BASE + '/delete/' + id, {method:'POST'})
    await load()
  }
  if(e.target.classList.contains('edit')){
    // Simple: load item and open form (not implemented server endpoint to get single item). Skipping for now
    alert('Editar no implementado en la SPA - use el backend directamente')
  }
})

$form.addEventListener('submit', async (e)=>{
  e.preventDefault()
  const fd = new FormData($form)
  const payload = new URLSearchParams()
  for(const [k,v] of fd.entries()) payload.append(k,v)
  const res = await fetch(API_BASE + '/add', {method:'POST', body: payload})
  if(res.ok){
    $formSection.classList.add('hidden')
    $listSection.classList.remove('hidden')
    load()
  }else{
    alert('Error al guardar')
  }
})

// init
health()
load()
setInterval(health, 15000)
