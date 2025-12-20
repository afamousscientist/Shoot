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
  lobby: document.getElementById('lobby'),
  workspace: document.getElementById('workspace'),
  settings: document.getElementById('settings'),
  newProject: document.getElementById('newProject'),
  openProject: document.getElementById('openProject'),
  openSelect: document.getElementById('openProjectSelect'),
  recentList: document.getElementById('recentList'),
  projectTitle: document.getElementById('projectTitle'),
  layout: document.getElementById('layout'),
  orientationToggle: document.getElementById('orientationToggle'),
  addPage: document.getElementById('addPage'),
  pageTable: document.getElementById('pageTable').querySelector('tbody'),
  pageTitle: document.getElementById('pageTitle'),
  blockSelect: document.getElementById('blockSelect'),
  pageSummary: document.getElementById('pageSummary'),
  pageText: document.getElementById('pageText'),
  saveProject: document.getElementById('saveProject'),
  toolShelf: document.getElementById('toolShelf'),
  collapseToolbar: document.getElementById('collapseToolbar'),
  toolItems: document.querySelectorAll('#toolShelf input[type="checkbox"]')
};

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
    row.innerHTML = `<td>${index + 1}</td><td>${page.title}</td><td>${page.block}</td><td>${page.summary || ''}</td>`;
    row.addEventListener('dblclick', () => selectPage(page.id));
    els.pageTable.appendChild(row);
  });
}

function selectPage(pageId) {
  const page = state.currentProject.pages.find(p => p.id === pageId);
  if (!page) return;
  state.selectedPageId = pageId;
  els.pageTitle.value = page.title || '';
  els.blockSelect.value = page.block || 'action';
  els.pageSummary.value = page.summary || '';
  els.pageText.value = page.text || '';
}

function syncEditorToState() {
  if (!state.currentProject || !state.selectedPageId) return;
  const page = state.currentProject.pages.find(p => p.id === state.selectedPageId);
  if (!page) return;
  page.title = els.pageTitle.value;
  page.block = els.blockSelect.value;
  page.summary = els.pageSummary.value;
  page.text = els.pageText.value;
}

async function saveProject() {
  if (!state.currentProject) return;
  syncEditorToState();
  const updated = await fetchJson(`/api/projects/${state.currentProject.id}`, {
    method: 'PUT',
    body: JSON.stringify(state.currentProject)
  });
  state.currentProject = updated;
  const idx = state.projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) state.projects[idx] = updated;
  renderPages();
  renderRecent();
  renderProjectSelect();
}

async function createProject() {
  const project = await fetchJson('/api/projects', { method: 'POST', body: JSON.stringify({ name: 'New Project' }) });
  state.projects.push(project);
  await loadProfile();
  renderProjectSelect();
  renderRecent();
  openProjectById(project.id);
}

async function openProjectById(id) {
  if (!id) return;
  const project = await fetchJson(`/api/projects/${id}`);
  state.currentProject = project;
  state.selectedPageId = project.pages[0]?.id || null;
  els.projectTitle.textContent = project.name;
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
    block: 'action',
    summary: '',
    text: ''
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
  els.profileSave.addEventListener('click', saveProfileSettings);
  els.addPage.addEventListener('click', addPage);
  els.orientationToggle.addEventListener('click', toggleOrientation);
  els.saveProject.addEventListener('click', saveProject);
  els.collapseToolbar.addEventListener('click', () => {
    els.toolShelf.classList.toggle('collapsed');
    els.collapseToolbar.textContent = els.toolShelf.classList.contains('collapsed') ? 'Show tools' : 'Hide tools';
  });

  [els.pageTitle, els.blockSelect, els.pageSummary, els.pageText].forEach(control => {
    control.addEventListener('input', () => syncEditorToState());
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
