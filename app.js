// ============================================================
// APP: Nuestro Ranking de Tragos
// ============================================================

let supabaseClient = null;
let editingId = null;
let selectedFile = null;

const tbody = document.getElementById('tbody');
const overlay = document.getElementById('overlay');
const form = document.getElementById('tragoForm');
const configBanner = document.getElementById('configBanner');
const saveStatus = document.getElementById('saveStatus');
const modalTitle = document.getElementById('modalTitle');

// Captura cualquier error de JS y lo muestra en pantalla (para poder diagnosticar sin consola)
window.addEventListener('error', (e) => {
  if (tbody) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">⚠️ Error de JavaScript: ${e.message} (línea ${e.lineno})</td></tr>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (tbody) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">⚠️ Error no controlado: ${e.reason && e.reason.message ? e.reason.message : e.reason}</td></tr>`;
  }
});

// --- Inicializar Supabase ---
function initSupabase() {
  const notConfigured =
    !SUPABASE_URL || !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes('PEGA_AQUI') || SUPABASE_ANON_KEY.includes('PEGA_AQUI');

  if (notConfigured) {
    configBanner.classList.add('show');
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Configura Supabase en config.js para empezar a guardar tragos.</td></tr>`;
    return;
  }

  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="8">⚠️ No se pudo cargar la librería de Supabase (revisa tu conexión a internet o recarga la página).</td></tr>`;
      return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    loadTragos();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">⚠️ Error al iniciar la conexión: ${err.message}</td></tr>`;
  }
}

// --- Cargar tragos desde la base de datos ---
async function loadTragos() {
  let data, error;
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa que la URL de Supabase sea correcta y que el proyecto no esté pausado.')), 10000)
    );
    const result = await Promise.race([
      supabaseClient.from('tragos').select('*').order('puntuacion_general', { ascending: false }),
      timeout
    ]);
    data = result.data;
    error = result.error;
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">⚠️ ${err.message}</td></tr>`;
    return;
  }

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Error al cargar los tragos: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Aún no hay tragos. ¡Agrega el primero! 🍹</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((t, i) => renderRow(t, i + 1)).join('');

  // listeners de acciones
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEdit(data.find(t => t.id == btn.dataset.edit)));
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteTrago(btn.dataset.del));
  });
}

function star(val) {
  return `<span class="score">⭐ ${Number(val).toFixed(1)}</span>`;
}
function beer(val) {
  return `<span class="score"><span class="icon">🍺</span> ${Number(val).toFixed(1)}</span>`;
}

function renderRow(t, rank) {
  const img = t.foto_url
    ? `<img src="${t.foto_url}" alt="${escapeHtml(t.nombre)}">`
    : `<div class="no-img">🍹</div>`;
  const refImg = t.foto_url
    ? `<img src="${t.foto_url}" alt="${escapeHtml(t.nombre)}">`
    : `<div class="no-img">🍹</div>`;

  return `
    <tr>
      <td class="rank">${rank}</td>
      <td>
        <div class="trago-cell">
          ${img}
          <div>
            <strong>${escapeHtml(t.nombre)}</strong>
            <span>${escapeHtml(t.descripcion || '')}</span>
          </div>
        </div>
      </td>
      <td>${star(t.puntuacion_general)}</td>
      <td>${star(t.puntuacion_sabor)}</td>
      <td>${beer(t.puntuacion_pega)}</td>
      <td class="comment">${escapeHtml(t.comentarios || '')}</td>
      <td class="foto-ref">${refImg}</td>
      <td>
        <div class="actions">
          <button class="icon-btn" data-edit="${t.id}" title="Editar">✏️</button>
          <button class="icon-btn del" data-del="${t.id}" title="Eliminar">🗑️</button>
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

function openAdd() {
  editingId = null;
  selectedFile = null;
  form.reset();
  document.getElementById('previewImg').style.display = 'none';
  document.getElementById('dropText').textContent = 'Haz clic para elegir una imagen (opcional)';
  modalTitle.textContent = 'Agregar Trago';
  saveStatus.textContent = '';
  overlay.classList.add('open');
}

function openEdit(t) {
  if (!t) return;
  editingId = t.id;
  selectedFile = null;
  document.getElementById('tragoId').value = t.id;
  document.getElementById('nombre').value = t.nombre;
  document.getElementById('descripcion').value = t.descripcion || '';
  document.getElementById('puntGeneral').value = t.puntuacion_general;
  document.getElementById('puntSabor').value = t.puntuacion_sabor;
  document.getElementById('puntPega').value = t.puntuacion_pega;
  document.getElementById('comentarios').value = t.comentarios || '';
  const preview = document.getElementById('previewImg');
  if (t.foto_url) {
    preview.src = t.foto_url;
    preview.style.display = 'block';
    document.getElementById('dropText').textContent = 'Imagen actual (haz clic para cambiarla)';
  } else {
    preview.style.display = 'none';
    document.getElementById('dropText').textContent = 'Haz clic para elegir una imagen (opcional)';
  }
  modalTitle.textContent = 'Editar Trago';
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
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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
      puntuacion_general: parseFloat(document.getElementById('puntGeneral').value),
      puntuacion_sabor: parseFloat(document.getElementById('puntSabor').value),
      puntuacion_pega: parseFloat(document.getElementById('puntPega').value),
      comentarios: document.getElementById('comentarios').value.trim(),
    };
    if (foto_url) payload.foto_url = foto_url;

    if (editingId) {
      const { error } = await supabaseClient.from('tragos').update(payload).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('tragos').insert(payload);
      if (error) throw error;
    }

    saveStatus.textContent = '¡Guardado!';
    await loadTragos();
    setTimeout(closeModal, 400);
  } catch (err) {
    console.error(err);
    saveStatus.textContent = 'Error: ' + err.message;
  } finally {
    saveBtn.disabled = false;
  }
});

// --- Eliminar ---
async function deleteTrago(id) {
  if (!confirm('¿Eliminar este trago del ranking?')) return;
  const { error } = await supabaseClient.from('tragos').delete().eq('id', id);
  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }
  loadTragos();
}

initSupabase();
