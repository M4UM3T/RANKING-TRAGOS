// ============================================================
// APP: Nuestro Ranking de Tragos
// ============================================================
 
let supabaseClient = null;
let editingId = null;
let selectedFile = null;          // foto principal (thumbnail)
let selectedMomentosFiles = [];   // fotos nuevas para "Momentos"
let existingMomentos = [];        // fotos ya guardadas (se puede quitar alguna antes de guardar)
let allTragos = [];
 
const grid = document.getElementById('tragosGrid');
const overlay = document.getElementById('overlay');
const form = document.getElementById('tragoForm');
const configBanner = document.getElementById('configBanner');
const saveStatus = document.getElementById('saveStatus');
const modalTitle = document.getElementById('modalTitle');
const statCount = document.getElementById('statCount');
 
const CATEGORIAS = {
  cerveza: '🍺 Cerveza',
  coctel: '🍹 Cóctel',
  vino: '🍷 Vino',
  ron: '🥃 Ron',
  tequila: '🥂 Tequila',
  otro: '🍸 Otro',
};
 
const VEREDICTOS = {
  repetir: { label: 'Repetir siempre', icon: '💖', cls: 'good' },
  otra_vez: { label: 'Sí, otra vez', icon: '😊', cls: 'good' },
  tal_vez: { label: 'Tal vez', icon: '🤔', cls: 'neutral' },
  no_volver: { label: 'No volver a probar', icon: '🚫', cls: 'bad' },
};
 
// Captura cualquier error de JS y lo muestra en pantalla (para poder diagnosticar sin consola)
window.addEventListener('error', (e) => {
  if (grid) {
    grid.innerHTML = `<div class="empty-state">⚠️ Error de JavaScript: ${e.message} (línea ${e.lineno})</div>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (grid) {
    grid.innerHTML = `<div class="empty-state">⚠️ Error no controlado: ${e.reason && e.reason.message ? e.reason.message : e.reason}</div>`;
  }
});
 
// --- Inicializar Supabase ---
function initSupabase() {
  const notConfigured =
    !SUPABASE_URL || !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes('PEGA_AQUI') || SUPABASE_ANON_KEY.includes('PEGA_AQUI');
 
  if (notConfigured) {
    configBanner.classList.add('show');
    grid.innerHTML = `<div class="empty-state">Configura Supabase en config.js para empezar a guardar tragos.</div>`;
    return;
  }
 
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      grid.innerHTML = `<div class="empty-state">⚠️ No se pudo cargar la librería de Supabase (revisa tu conexión a internet o recarga la página).</div>`;
      return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    loadTragos();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">⚠️ Error al iniciar la conexión: ${err.message}</div>`;
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
    grid.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
    return;
  }
 
  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-state">Error al cargar los tragos: ${error.message}</div>`;
    return;
  }
 
  allTragos = data || [];
  statCount.textContent = allTragos.length;
 
  if (allTragos.length === 0) {
    grid.innerHTML = `<div class="empty-state">Aún no hay tragos. ¡Agrega el primero! 🍹</div>`;
    return;
  }
 
  grid.innerHTML = allTragos.map((t, i) => renderCard(t, i + 1)).join('');
  applyActiveFilter();
  attachCardListeners();
}
 
function attachCardListeners() {
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEdit(allTragos.find(t => t.id == btn.dataset.edit)));
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteTrago(btn.dataset.del));
  });
}
 
// --- Helpers de calificación con iconos ---
function iconRating(value, icon) {
  const rounded = Math.round(Number(value) || 0);
  let html = '<span class="icon-rating">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="${i <= rounded ? 'ic-filled' : 'ic-empty'}">${icon}</span>`;
  }
  html += '</span>';
  return html;
}
 
function momentosGallery(fotos) {
  if (!fotos || fotos.length === 0) {
    return `<div class="momento-empty">Aún no hay fotos de este momento ♡</div>`;
  }
  return fotos.map(url => `<div class="momento-thumb"><img src="${url}" alt=""></div>`).join('');
}
 
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
 
function renderCard(t, rank) {
  const img = t.foto_url
    ? `<img src="${t.foto_url}" alt="${escapeHtml(t.nombre)}">`
    : `<div class="no-img">🍹</div>`;
 
  const cat = CATEGORIAS[t.categoria] ? t.categoria : 'otro';
  const veredicto = VEREDICTOS[t.veredicto] || null;
 
  return `
    <div class="trago-card" data-categoria="${cat}">
      <div class="rank-badge">#${rank}</div>
      <div class="card-top">
        <div class="thumb">${img}</div>
        <div class="card-title">
          <h3>${escapeHtml(t.nombre)}</h3>
          <span class="categoria-tag">${CATEGORIAS[cat]}</span>
        </div>
        <div class="card-actions">
          <button class="icon-btn" data-edit="${t.id}" title="Editar">✏️</button>
          <button class="icon-btn del" data-del="${t.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
 
      <div class="ratings">
        <div class="rating-row"><span class="rating-label">Calificación general</span>${iconRating(t.puntuacion_general, '⭐')}</div>
        <div class="rating-row"><span class="rating-label">Sabor</span>${iconRating(t.puntuacion_sabor, '🍺')}</div>
        <div class="rating-row"><span class="rating-label">Subidón</span>${iconRating(t.puntuacion_subidon, '❤️')}</div>
        <div class="rating-row"><span class="rating-label">Resaca</span>${iconRating(t.puntuacion_resaca, '🥴')}</div>
      </div>
 
      <div class="momentos">
        <div class="momentos-label">Momentos <span>♡</span></div>
        <div class="momentos-grid">${momentosGallery(t.fotos_momentos)}</div>
      </div>
 
      <div class="card-footer">
        ${t.ubicacion ? `<div class="ubicacion">📍 ${escapeHtml(t.ubicacion)}</div>` : ''}
        ${(t.nota_el || t.nota_ella) ? `
          <div class="notas">
            ${t.nota_el ? `<div><strong>Él:</strong> ${escapeHtml(t.nota_el)}</div>` : ''}
            ${t.nota_ella ? `<div><strong>Ella:</strong> ${escapeHtml(t.nota_ella)}</div>` : ''}
          </div>` : ''}
        ${veredicto ? `<div class="veredicto veredicto-${veredicto.cls}">Veredicto final: ${veredicto.label} ${veredicto.icon}</div>` : ''}
      </div>
    </div>
  `;
}
 
// --- Filtros ---
function applyActiveFilter() {
  const active = document.querySelector('.filtro-pill[data-cat].active');
  const cat = active ? active.dataset.cat : 'todos';
  document.querySelectorAll('.trago-card').forEach(card => {
    const show = cat === 'todos' || card.dataset.categoria === cat;
    card.classList.toggle('hidden-filter', !show);
  });
}
 
document.querySelectorAll('.filtro-pill[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-pill[data-cat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyActiveFilter();
  });
});
 
// --- Trago aleatorio ---
document.getElementById('randomBtn').addEventListener('click', () => {
  const cards = Array.from(document.querySelectorAll('.trago-card')).filter(c => !c.classList.contains('hidden-filter'));
  if (!cards.length) return;
  cards.forEach(c => c.classList.remove('highlight'));
  const pick = cards[Math.floor(Math.random() * cards.length)];
  pick.classList.add('highlight');
  pick.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => pick.classList.remove('highlight'), 2200);
});
 
// --- Modal open/close ---
document.getElementById('openAddBtn').addEventListener('click', () => openAdd());
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
 
function openAdd() {
  editingId = null;
  selectedFile = null;
  selectedMomentosFiles = [];
  existingMomentos = [];
  form.reset();
  document.getElementById('previewImg').style.display = 'none';
  document.getElementById('dropText').textContent = 'Haz clic para elegir una imagen (opcional)';
  renderMomentosPreview();
  modalTitle.textContent = 'Agregar Trago';
  saveStatus.textContent = '';
  overlay.classList.add('open');
}
 
function openEdit(t) {
  if (!t) return;
  editingId = t.id;
  selectedFile = null;
  selectedMomentosFiles = [];
  existingMomentos = Array.isArray(t.fotos_momentos) ? [...t.fotos_momentos] : [];
 
  document.getElementById('tragoId').value = t.id;
  document.getElementById('nombre').value = t.nombre;
  document.getElementById('categoria').value = CATEGORIAS[t.categoria] ? t.categoria : 'otro';
  document.getElementById('puntGeneral').value = t.puntuacion_general ?? '';
  document.getElementById('puntSabor').value = t.puntuacion_sabor ?? '';
  document.getElementById('puntSubidon').value = t.puntuacion_subidon ?? '';
  document.getElementById('puntResaca').value = t.puntuacion_resaca ?? '';
  document.getElementById('ubicacion').value = t.ubicacion || '';
  document.getElementById('notaEl').value = t.nota_el || '';
  document.getElementById('notaElla').value = t.nota_ella || '';
  document.getElementById('veredicto').value = VEREDICTOS[t.veredicto] ? t.veredicto : '';
 
  const preview = document.getElementById('previewImg');
  if (t.foto_url) {
    preview.src = t.foto_url;
    preview.style.display = 'block';
    document.getElementById('dropText').textContent = 'Imagen actual (haz clic para cambiarla)';
  } else {
    preview.style.display = 'none';
    document.getElementById('dropText').textContent = 'Haz clic para elegir una imagen (opcional)';
  }
 
  renderMomentosPreview();
 
  modalTitle.textContent = 'Editar Trago';
  saveStatus.textContent = '';
  overlay.classList.add('open');
}
 
function closeModal() {
  overlay.classList.remove('open');
}
 
// --- Selección de foto principal ---
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
 
// --- Selección de fotos de "Momentos" (varias) ---
const dropZoneMomentos = document.getElementById('dropZoneMomentos');
const momentosInput = document.getElementById('momentosInput');
dropZoneMomentos.addEventListener('click', () => momentosInput.click());
momentosInput.addEventListener('change', () => {
  selectedMomentosFiles = selectedMomentosFiles.concat(Array.from(momentosInput.files));
  momentosInput.value = '';
  renderMomentosPreview();
});
 
function renderMomentosPreview() {
  const container = document.getElementById('momentosPreview');
  const existingHtml = existingMomentos.map((url, i) => `
    <div class="momento-preview-item">
      <img src="${url}">
      <button type="button" class="momento-remove" data-existing="${i}" title="Quitar">×</button>
    </div>
  `).join('');
  const newHtml = selectedMomentosFiles.map((file, i) => `
    <div class="momento-preview-item">
      <img src="${URL.createObjectURL(file)}">
      <button type="button" class="momento-remove" data-new="${i}" title="Quitar">×</button>
    </div>
  `).join('');
  container.innerHTML = existingHtml + newHtml || '<span class="hint">Aún no has agregado fotos.</span>';
 
  container.querySelectorAll('[data-existing]').forEach(btn => {
    btn.addEventListener('click', () => {
      existingMomentos.splice(Number(btn.dataset.existing), 1);
      renderMomentosPreview();
    });
  });
  container.querySelectorAll('[data-new]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMomentosFiles.splice(Number(btn.dataset.new), 1);
      renderMomentosPreview();
    });
  });
}
 
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
 
    // Subir las fotos nuevas de "Momentos" y unirlas con las que ya existían (menos las quitadas)
    const nuevosMomentos = [];
    for (const file of selectedMomentosFiles) {
      const ext = file.name.split('.').pop();
      const fileName = `momento_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabaseClient.storage
        .from('fotos-tragos')
        .upload(fileName, file);
      if (upErr) throw upErr;
      const { data: pub } = supabaseClient.storage.from('fotos-tragos').getPublicUrl(fileName);
      nuevosMomentos.push(pub.publicUrl);
    }
    const fotos_momentos = existingMomentos.concat(nuevosMomentos);
 
    const payload = {
      nombre: document.getElementById('nombre').value.trim(),
      categoria: document.getElementById('categoria').value,
      puntuacion_general: parseFloat(document.getElementById('puntGeneral').value),
      puntuacion_sabor: parseFloat(document.getElementById('puntSabor').value),
      puntuacion_subidon: parseFloat(document.getElementById('puntSubidon').value),
      puntuacion_resaca: parseFloat(document.getElementById('puntResaca').value),
      ubicacion: document.getElementById('ubicacion').value.trim(),
      nota_el: document.getElementById('notaEl').value.trim(),
      nota_ella: document.getElementById('notaElla').value.trim(),
      veredicto: document.getElementById('veredicto').value || null,
      fotos_momentos,
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
 
