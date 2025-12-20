const state = {
  profile: null,
  projects: [],
  currentProject: null,
  selectedPageId: null,
  orientation: 'horizontal'
};

const els = {
  profileName: document.getElementById('profileName'),
  profileSave: document.getElementById('profileSave'),
  profileInput: document.getElementById('profileInput'),
  saveSettings: document.getElementById('saveSettings'),
  closeSettings: document.getElementById('closeSettings'),
  settingsButton: document.getElementById('settingsButton'),
  brandHome: document.getElementById('brandHome'),
  lobby: document.getElementById('lobby'),
  workspace: document.getElementById('workspace'),
  settings: document.getElementById('settings'),
  newProject: document.getElementById('newProject'),
  openProject: document.getElementById('openProject'),
  openSelect: document.getElementById('openProjectSelect'),
  recentList: document.getElementById('recentList'),
  projectTitle: document.getElementById('projectTitle'),
  renameProject: document.getElementById('renameProject'),
  layout: document.getElementById('layout'),
  orientationToggle: document.getElementById('orientationToggle'),
  addPage: document.getElementById('addPage'),
  pageTable: document.getElementById('pageTable').querySelector('tbody'),
  saveProject: document.getElementById('saveProject'),
  toolShelf: document.getElementById('toolShelf'),
  collapseToolbar: document.getElementById('collapseToolbar'),
  toolItems: document.querySelectorAll('#toolShelf input[type="checkbox"]'),
  scriptEditor: document.getElementById('scriptEditor'),
  editorMeta: document.getElementById('editorMeta'),
  lineTypeButtons: document.querySelectorAll('[data-line-type]')
};

function normalizePageShape(page) {
  const normalized = { ...page };
  normalized.type = normalized.type || normalized.block || 'Shot';
  normalized.synopsis = normalized.synopsis ?? normalized.summary ?? '';
  if (!Array.isArray(normalized.blocks)) {
    const seedText = (normalized.text || '').split('\n').filter(line => line !== '');
    const defaultType = normalized.block || 'action';
    normalized.blocks = (seedText.length ? seedText : ['']).map((text, idx) => ({
      id: `blk-${normalized.id}-${idx}`,
      type: defaultType,
      text
    }));
  }
  return normalized;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function loadProfile() {
  state.profile = await fetchJson('/api/profile');
  els.profileName.textContent = state.profile.userName || 'Guest';
  els.profileInput.value = state.profile.userName || '';
  els.toolItems.forEach(item => {
    const key = item.dataset.plugin;
    if (key in state.profile.plugins) {
      item.checked = !!state.profile.plugins[key];
    }
  });
}

async function loadProjects() {
  state.projects = await fetchJson('/api/projects');
  state.projects = state.projects.map(project => ({
    ...project,
    pages: project.pages.map(normalizePageShape)
  }));
  renderProjectSelect();
  renderRecent();
}

function renderProjectSelect() {
  els.openSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a project';
  els.openSelect.appendChild(defaultOption);

  state.projects.forEach(project => {
    const opt = document.createElement('option');
    opt.value = project.id;
    opt.textContent = `${project.name}`;
    els.openSelect.appendChild(opt);
  });
}

function renderRecent() {
  const { recentProjects = [] } = state.profile || {};
  if (!recentProjects.length) {
    els.recentList.innerHTML = '<p class="muted">No recent projects yet. Create one to get started.</p>';
    return;
  }
  els.recentList.innerHTML = '';
  recentProjects.forEach(id => {
    const project = state.projects.find(p => p.id === id);
    if (!project) return;
    const card = document.createElement('div');
    card.className = 'recent-card';
    card.innerHTML = `<strong>${project.name}</strong><span class="muted">Updated ${new Date(project.updatedAt).toLocaleString()}</span>`;
    card.addEventListener('click', () => openProjectById(project.id));
    els.recentList.appendChild(card);
  });
}

function showSection(section) {
  els.lobby.classList.add('hidden');
  els.workspace.classList.add('hidden');
  els.settings.classList.add('hidden');
  if (section === 'workspace') els.workspace.classList.remove('hidden');
  if (section === 'settings') els.settings.classList.remove('hidden');
  if (section === 'lobby') els.lobby.classList.remove('hidden');
}

function renderPages() {
  els.pageTable.innerHTML = '';
  if (!state.currentProject) return;
  state.currentProject.pages.forEach((page, index) => {
    const row = document.createElement('tr');
    row.dataset.pageId = page.id;
    row.innerHTML = `
      <td class="index-col">${index + 1}</td>
      <td class="editable-cell" data-field="title">${page.title}</td>
      <td class="editable-cell" data-field="type">${page.type || 'Shot'}</td>
      <td class="editable-cell" data-field="synopsis">${page.synopsis || ''}</td>
    `;
    row.addEventListener('dblclick', () => selectPage(page.id));
    if (page.id === state.selectedPageId) {
      row.classList.add('active');
    }
    els.pageTable.appendChild(row);
  });
}

function startCellEdit(cell) {
  const row = cell.closest('tr');
  const pageId = row?.dataset.pageId;
  const field = cell.dataset.field;
  if (!pageId || !field) return;
  const original = cell.textContent;
  cell.setAttribute('contenteditable', 'true');
  cell.focus();

  function finish() {
    cell.removeAttribute('contenteditable');
    const value = cell.textContent.trim();
    const page = state.currentProject.pages.find(p => p.id === pageId);
    if (page) {
      page[field] = value || (field === 'type' ? 'Shot' : '');
      if (page.id === state.selectedPageId && (field === 'title' || field === 'type')) {
        els.editorMeta.textContent = `${page.title} • ${page.type}`;
      }
    }
    cell.textContent = value;
    cell.removeEventListener('blur', onBlur);
    cell.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cell.textContent = original;
      finish();
    }
  }

  function onBlur() {
    finish();
  }

  cell.addEventListener('blur', onBlur);
  cell.addEventListener('keydown', onKey);
}

function selectPage(pageId) {
  const page = state.currentProject.pages.find(p => p.id === pageId);
  if (!page) return;
  state.selectedPageId = pageId;
  renderPages();
  renderScript(page);
}

function getActivePage() {
  if (!state.currentProject || !state.selectedPageId) return null;
  return state.currentProject.pages.find(p => p.id === state.selectedPageId) || null;
}

function getCaretLineIndex() {
  const pos = els.scriptEditor.selectionStart || 0;
  const untilCaret = els.scriptEditor.value.slice(0, pos);
  return untilCaret.split('\n').length - 1;
}

function normalizeBlocksFromText(page) {
  const selection = [els.scriptEditor.selectionStart, els.scriptEditor.selectionEnd];
  const lines = els.scriptEditor.value.replace(/\r/g, '').split('\n');
  const normalizedLines = [...lines];
  const prev = Array.isArray(page.blocks) ? page.blocks : [];
  const blocks = [];
  lines.forEach((text, idx) => {
    const existing = prev[idx];
    const previousType = idx > 0 ? (blocks[idx - 1]?.type || prev[idx - 1]?.type) : null;
    let type = existing?.type || prev[idx]?.type;
    if (!type) {
      if (idx === 0) type = 'scene';
      else if (previousType === 'character') type = 'dialogue';
      else type = 'action';
    }
    const normalizedText = (type === 'scene' || type === 'character') ? (text || '').toUpperCase() : text || '';
    normalizedLines[idx] = normalizedText;
    blocks.push({
      id: existing?.id || prev[idx]?.id || `blk-${page.id}-${idx}`,
      type,
      text: normalizedText
    });
  });
  page.blocks = blocks;
  const refreshed = normalizedLines.join('\n');
  if (refreshed !== els.scriptEditor.value.replace(/\r/g, '')) {
    els.scriptEditor.value = refreshed;
    els.scriptEditor.setSelectionRange(selection[0], selection[1]);
  }
}

function captureScriptToState() {
  if (!state.currentProject || !state.selectedPageId) return;
  const page = state.currentProject.pages.find(p => p.id === state.selectedPageId);
  if (!page) return;
  normalizeBlocksFromText(page);
}

function highlightChip(type) {
  els.lineTypeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lineType === type);
  });
}

function renderScript(page) {
  els.scriptEditor.value = '';
  els.editorMeta.textContent = page ? `${page.title} • ${page.type}` : 'No page loaded';
  els.scriptEditor.placeholder = page ? '' : 'Double-click a page to start writing.';
  if (!page) return;
  if (!page.blocks || !page.blocks.length) {
    page.blocks = [
      { id: `blk-${page.id}-0`, type: 'scene', text: 'INT. LOCATION - DAY' },
      { id: `blk-${page.id}-1`, type: 'action', text: '' }
    ];
  }
  els.scriptEditor.value = page.blocks.map(block => {
    if (block.type === 'scene' || block.type === 'character') {
      return (block.text || '').toUpperCase();
    }
    return block.text || '';
  }).join('\n');
  highlightChip(page.blocks[0]?.type || 'scene');
  captureScriptToState();
}

async function saveProject() {
  if (!state.currentProject) return;
  captureScriptToState();
  const updated = await fetchJson(`/api/projects/${state.currentProject.id}`, {
    method: 'PUT',
    body: JSON.stringify(state.currentProject)
  });
  state.currentProject = {
    ...updated,
    pages: updated.pages.map(normalizePageShape)
  };
  const idx = state.projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) state.projects[idx] = state.currentProject;
  renderPages();
  renderRecent();
  renderProjectSelect();
}

async function createProject() {
  const project = await fetchJson('/api/projects', { method: 'POST', body: JSON.stringify({ name: 'New Project' }) });
  const normalized = { ...project, pages: project.pages.map(normalizePageShape) };
  state.projects.push(normalized);
  await loadProfile();
  renderProjectSelect();
  renderRecent();
  openProjectById(project.id);
}

async function openProjectById(id) {
  if (!id) return;
  const project = await fetchJson(`/api/projects/${id}`);
  const normalized = { ...project, pages: project.pages.map(normalizePageShape) };
  state.currentProject = normalized;
  state.selectedPageId = normalized.pages[0]?.id || null;
  els.projectTitle.textContent = normalized.name;
  const existing = state.projects.findIndex(p => p.id === normalized.id);
  if (existing !== -1) state.projects[existing] = normalized;
  renderPages();
  selectPage(state.selectedPageId);
  showSection('workspace');
  await loadProfile();
  renderRecent();
}

function addPage() {
  if (!state.currentProject) return;
  const newPage = {
    id: `page-${Date.now()}`,
    title: `Page ${state.currentProject.pages.length + 1}`,
    type: 'Shot',
    synopsis: '',
    blocks: [
      { id: `blk-${Date.now()}-scene`, type: 'scene', text: 'INT. LOCATION - DAY' },
      { id: `blk-${Date.now()}-action`, type: 'action', text: '' }
    ]
  };
  state.currentProject.pages.push(newPage);
  renderPages();
  selectPage(newPage.id);
}

function toggleOrientation() {
  state.orientation = state.orientation === 'horizontal' ? 'vertical' : 'horizontal';
  els.layout.className = `layout ${state.orientation}`;
  if (state.orientation === 'horizontal') {
    els.toolShelf.style.flexDirection = 'row';
  } else {
    els.toolShelf.style.flexDirection = 'column';
  }
}

async function saveProfileSettings() {
  const name = els.profileInput.value.trim() || 'Guest';
  const plugins = {};
  els.toolItems.forEach(item => {
    plugins[item.dataset.plugin] = item.checked;
  });
  state.profile = await fetchJson('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ userName: name, plugins })
  });
  els.profileName.textContent = state.profile.userName;
}

function attachTableEditing() {
  els.pageTable.addEventListener('click', e => {
    const cell = e.target.closest('.editable-cell');
    if (!cell) return;
    e.stopPropagation();
    startCellEdit(cell);
  });
}

function registerEvents() {
  els.newProject.addEventListener('click', createProject);
  els.openProject.addEventListener('click', () => openProjectById(els.openSelect.value));
  els.settingsButton.addEventListener('click', () => showSection('settings'));
  els.closeSettings.addEventListener('click', () => showSection('lobby'));
  els.saveSettings.addEventListener('click', async () => {
    await saveProfileSettings();
    showSection('lobby');
    renderRecent();
  });
  els.brandHome.addEventListener('click', () => showSection('lobby'));
  els.brandHome.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showSection('lobby');
    }
  });
  els.profileSave.addEventListener('click', saveProfileSettings);
  els.addPage.addEventListener('click', addPage);
  els.orientationToggle.addEventListener('click', toggleOrientation);
  els.saveProject.addEventListener('click', saveProject);
  els.renameProject.addEventListener('click', async () => {
    if (!state.currentProject) return;
    const newName = prompt('Rename project', state.currentProject.name || 'Untitled');
    if (!newName || !newName.trim()) return;
    state.currentProject.name = newName.trim();
    els.projectTitle.textContent = state.currentProject.name;
    await saveProject();
  });
  els.collapseToolbar.addEventListener('click', () => {
    els.toolShelf.classList.toggle('collapsed');
    els.collapseToolbar.textContent = els.toolShelf.classList.contains('collapsed') ? 'Show tools' : 'Hide tools';
  });

  attachTableEditing();

  els.lineTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = getActivePage();
      if (!page) return;
      captureScriptToState();
      const idx = getCaretLineIndex();
      if (!page.blocks[idx]) return;
      page.blocks[idx].type = btn.dataset.lineType;
      highlightChip(btn.dataset.lineType);
      captureScriptToState();
    });
  });

  els.scriptEditor.addEventListener('input', () => {
    captureScriptToState();
    const page = getActivePage();
    const idx = getCaretLineIndex();
    if (page && page.blocks[idx]) {
      highlightChip(page.blocks[idx].type);
    }
  });

  els.scriptEditor.addEventListener('keydown', e => {
    const page = getActivePage();
    if (!page) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      captureScriptToState();
      const idx = getCaretLineIndex();
      const current = page.blocks[idx];
      if (!current) return;
      const order = ['scene', 'action', 'character', 'dialogue'];
      const curIdx = order.indexOf(current.type);
      const nextType = order[(curIdx + 1) % order.length];
      current.type = nextType;
      highlightChip(nextType);
      captureScriptToState();
    }
  });

  els.scriptEditor.addEventListener('keyup', () => {
    const page = getActivePage();
    if (!page) return;
    const idx = getCaretLineIndex();
    if (page.blocks[idx]) {
      highlightChip(page.blocks[idx].type);
    }
  });

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProject();
    }
  });
}

async function init() {
  await loadProfile();
  await loadProjects();
  renderRecent();
  registerEvents();
}

init().catch(err => {
  console.error(err);
  alert('Unable to start workspace. Make sure the server can read/write its data directory.');
});
