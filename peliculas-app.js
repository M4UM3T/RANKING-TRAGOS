// ============================================================
// APP: Nuestro Ranking de Películas
// ============================================================
 
let supabaseClient = null;
let editingId = null;
let selectedFile = null;
 
const tbodyPend = document.getElementById('tbodyPendientes');
const tbodyRank = document.getElementById('tbodyRanking');
const countPend = document.getElementById('countPend');
const countVistas = document.getElementById('countVistas');
const overlay = document.getElementById('overlay');
const form = document.getElementById('peliForm');
const configBanner = document.getElementById('configBanner');
const saveStatus = document.getElementById('saveStatus');
const modalTitle = document.getElementById('modalTitle');
const yaVista = document.getElementById('yaVista');
const ratingFields = document.getElementById('ratingFields');
 
window.addEventListener('error', (e) => {
  if (tbodyPend) {
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">⚠️ Error de JavaScript: ${e.message} (línea ${e.lineno})</td></tr>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (tbodyPend) {
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">⚠️ Error no controlado: ${e.reason && e.reason.message ? e.reason.message : e.reason}</td></tr>`;
  }
});
 
function initSupabase() {
  const notConfigured =
    !SUPABASE_URL || !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes('PEGA_AQUI') || SUPABASE_ANON_KEY.includes('PEGA_AQUI');
 
  if (notConfigured) {
    configBanner.classList.add('show');
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">Configura Supabase en config.js.</td></tr>`;
    tbodyRank.innerHTML = `<tr class="empty-row"><td colspan="5">Configura Supabase en config.js.</td></tr>`;
    return;
  }
 
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">⚠️ No se pudo cargar la librería de Supabase.</td></tr>`;
      return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    loadPeliculas();
  } catch (err) {
    console.error(err);
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">⚠️ Error al iniciar la conexión: ${err.message}</td></tr>`;
  }
}
 
async function loadPeliculas() {
  let data, error;
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa tu conexión a Supabase.')), 10000)
    );
    const result = await Promise.race([
      supabaseClient.from('peliculas').select('*').order('created_at', { ascending: false }),
      timeout
    ]);
    data = result.data;
    error = result.error;
  } catch (err) {
    console.error(err);
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">⚠️ ${err.message}</td></tr>`;
    return;
  }
 
  if (error) {
    console.error(error);
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">Error: ${error.message}</td></tr>`;
    return;
  }
 
  const pendientes = (data || []).filter(p => !p.vista);
  const vistas = (data || []).filter(p => p.vista).sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));
 
  countPend.textContent = pendientes.length;
  countVistas.textContent = vistas.length;
 
  // --- Tabla de pendientes ---
  if (pendientes.length === 0) {
    tbodyPend.innerHTML = `<tr class="empty-row"><td colspan="4">No hay pendientes. ¡Agrega una película! 🎬</td></tr>`;
  } else {
    tbodyPend.innerHTML = pendientes.map(p => renderPendienteRow(p)).join('');
  }
 
  // --- Tabla de ranking ---
  if (vistas.length === 0) {
    tbodyRank.innerHTML = `<tr class="empty-row"><td colspan="5">Aún no han calificado ninguna película.</td></tr>`;
  } else {
    tbodyRank.innerHTML = vistas.map((p, i) => renderRankingRow(p, i + 1)).join('');
  }
 
  // listeners
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEdit(data.find(p => p.id == btn.dataset.edit)));
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deletePelicula(btn.dataset.del));
  });
  document.querySelectorAll('[data-watch]').forEach(btn => {
    btn.addEventListener('click', () => openEdit(data.find(p => p.id == btn.dataset.watch), true));
  });
}
 
function posterImg(p) {
  return p.foto_url
    ? `<img class="poster-thumb" src="${p.foto_url}" alt="${escapeHtml(p.nombre)}">`
    : `<div class="poster-thumb no-img">🎬</div>`;
}
 
function renderPendienteRow(p) {
  return `
    <tr>
      <td>${posterImg(p)}</td>
      <td>
        <div class="peli-cell">
          <div>
            <strong>${escapeHtml(p.nombre)}</strong>
            <span>${escapeHtml(p.descripcion || '')}</span>
          </div>
        </div>
      </td>
      <td class="comment">${escapeHtml(p.comentarios || '')}</td>
      <td>
        <div class="actions">
          <button class="icon-btn watch" data-watch="${p.id}" title="Marcar como vista">✅</button>
          <button class="icon-btn" data-edit="${p.id}" title="Editar">✏️</button>
          <button class="icon-btn del" data-del="${p.id}" title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}
 
function renderRankingRow(p, rank) {
  return `
    <tr>
      <td class="rank">${rank}</td>
      <td>
        <div class="peli-cell">
          ${posterImg(p)}
          <div>
            <strong>${escapeHtml(p.nombre)}</strong>
            <span>${escapeHtml(p.descripcion || '')}</span>
          </div>
        </div>
      </td>
      <td><span class="score">⭐ ${Number(p.puntuacion || 0).toFixed(1)}</span></td>
      <td class="comment">${escapeHtml(p.comentarios || '')}</td>
      <td>
        <div class="actions">
          <button class="icon-btn" data-edit="${p.id}" title="Editar">✏️</button>
          <button class="icon-btn del" data-del="${p.id}" title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}
 
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
 
// --- Modal open/close ---
document.getElementById('openAddBtn').addEventListener('click', () => openAdd());
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
 
yaVista.addEventListener('change', () => {
  ratingFields.classList.toggle('show', yaVista.checked);
});
 
function openAdd() {
  editingId = null;
  selectedFile = null;
  form.reset();
  ratingFields.classList.remove('show');
  document.getElementById('previewImg').style.display = 'none';
  document.getElementById('dropText').textContent = 'Haz clic para elegir una imagen';
  modalTitle.textContent = 'Agregar Película';
  saveStatus.textContent = '';
  overlay.classList.add('open');
}
 
function openEdit(p, forceWatch) {
  if (!p) return;
  editingId = p.id;
  selectedFile = null;
  document.getElementById('peliId').value = p.id;
  document.getElementById('nombre').value = p.nombre;
  document.getElementById('descripcion').value = p.descripcion || '';
  document.getElementById('puntuacion').value = p.puntuacion || '';
  document.getElementById('comentarios').value = p.comentarios || '';
 
  const isVista = forceWatch ? true : !!p.vista;
  yaVista.checked = isVista;
  ratingFields.classList.toggle('show', isVista);
 
  const preview = document.getElementById('previewImg');
  if (p.foto_url) {
    preview.src = p.foto_url;
    preview.style.display = 'block';
    document.getElementById('dropText').textContent = 'Imagen actual (haz clic para cambiarla)';
  } else {
    preview.style.display = 'none';
    document.getElementById('dropText').textContent = 'Haz clic para elegir una imagen';
  }
 
  modalTitle.textContent = forceWatch ? 'Calificar Película' : 'Editar Película';
  saveStatus.textContent = '';
  overlay.classList.add('open');
}
 
function closeModal() {
  overlay.classList.remove('open');
}
 
// --- Selección de imagen ---
const dropZone = document.getElementById('dropZone');
const fotoInput = document.getElementById('fotoInput');
dropZone.addEventListener('click', () => fotoInput.click());
fotoInput.addEventListener('change', () => {
  const file = fotoInput.files[0];
  if (!file) return;
  selectedFile = file;
  const preview = document.getElementById('previewImg');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  document.getElementById('dropText').textContent = file.name;
});
 
// --- Guardar (crear o editar) ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabaseClient) {
    saveStatus.textContent = 'Configura Supabase primero en config.js';
    return;
  }
 
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveStatus.textContent = 'Guardando…';
 
  try {
    let foto_url = null;
 
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop();
      const fileName = `pelicula_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabaseClient.storage
        .from('fotos-tragos')
        .upload(fileName, selectedFile);
      if (upErr) throw upErr;
      const { data: pub } = supabaseClient.storage.from('fotos-tragos').getPublicUrl(fileName);
      foto_url = pub.publicUrl;
    }
 
    const payload = {
      nombre: document.getElementById('nombre').value.trim(),
      descripcion: document.getElementById('descripcion').value.trim(),
      vista: yaVista.checked,
      puntuacion: yaVista.checked ? (parseFloat(document.getElementById('puntuacion').value) || 0) : null,
      comentarios: document.getElementById('comentarios').value.trim(),
    };
    if (foto_url) payload.foto_url = foto_url;
 
    if (editingId) {
      const { error } = await supabaseClient.from('peliculas').update(payload).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('peliculas').insert(payload);
      if (error) throw error;
    }
 
    saveStatus.textContent = '¡Guardado!';
    await loadPeliculas();
    setTimeout(closeModal, 400);
  } catch (err) {
    console.error(err);
    saveStatus.textContent = 'Error: ' + err.message;
  } finally {
    saveBtn.disabled = false;
  }
});
 
// --- Eliminar ---
async function deletePelicula(id) {
  if (!confirm('¿Eliminar esta película?')) return;
  const { error } = await supabaseClient.from('peliculas').delete().eq('id', id);
  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }
  loadPeliculas();
}
 
initSupabase();
 
