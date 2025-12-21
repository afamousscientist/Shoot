const state = {
  profile: null,
  projects: [],
  currentProject: null,
  selectedPageId: null,
  orientation: 'horizontal',
  noteEdit: null
};

let draggingPageId = null;

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
  headerProjectTitle: document.getElementById('headerProjectTitle'),
  renameProject: document.getElementById('renameProject'),
  layout: document.getElementById('layout'),
  orientationToggle: document.getElementById('orientationToggle'),
  addPage: document.getElementById('addPage'),
  pageTable: document.getElementById('pageTable').querySelector('tbody'),
  saveProject: document.getElementById('saveProject'),
  openDrafts: document.getElementById('openDrafts'),
  draftModal: document.getElementById('draftModal'),
  closeDrafts: document.getElementById('closeDrafts'),
  draftPreview: document.getElementById('draftPreview'),
  draftVersionList: document.getElementById('draftVersionList'),
  draftName: document.getElementById('draftName'),
  saveDraftVersion: document.getElementById('saveDraftVersion'),
  refreshDraftPreview: document.getElementById('refreshDraftPreview'),
  noteTitle: document.getElementById('noteTitle'),
  noteColor: document.getElementById('noteColor'),
  noteBody: document.getElementById('noteBody'),
  notePreview: document.getElementById('notePreview'),
  addNoteObject: document.getElementById('addNoteObject'),
  noteLibrary: document.getElementById('noteLibrary'),
  noteModeStatus: document.getElementById('noteModeStatus'),
  objectBuilder: document.getElementById('objectBuilder'),
  toolShelf: document.getElementById('toolShelf'),
  collapseToolbar: document.getElementById('collapseToolbar'),
  toolItems: document.querySelectorAll('#toolShelf input[type="checkbox"]'),
  scriptEditor: document.getElementById('scriptEditor'),
  editorMeta: document.getElementById('editorMeta'),
  lineTypeButtons: document.querySelectorAll('[data-line-type]'),
  directorBox: document.getElementById('directorBox')
};

function setProjectTitle(name = 'No project loaded') {
  els.headerProjectTitle.textContent = name;
}

setProjectTitle('No project loaded');

function normalizePageShape(page) {
  const normalized = { ...page };
  normalized.type = normalized.type || normalized.block || 'Shot';
  normalized.synopsis = normalized.synopsis ?? normalized.summary ?? '';
  normalized.directorNotes = Array.isArray(normalized.directorNotes) ? normalized.directorNotes : [];
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

function normalizeProjectShape(project) {
  return {
    ...project,
    draftVersions: Array.isArray(project.draftVersions) ? project.draftVersions : [],
    noteLibrary: Array.isArray(project.noteLibrary) ? project.noteLibrary : [],
    pages: project.pages.map(normalizePageShape)
  };
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
  state.projects = state.projects.map(normalizeProjectShape);
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
    row.draggable = true;
    const indexCell = document.createElement('td');
    indexCell.className = 'index-col';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'page-number';
    indexLabel.textContent = index + 1;
    const insertButton = document.createElement('button');
    insertButton.className = 'icon-button icon-only icon-inline with-icon';
    insertButton.dataset.icon = 'insert';
    insertButton.type = 'button';
    insertButton.title = 'Add page below';
    insertButton.setAttribute('aria-label', 'Add page below');
    insertButton.addEventListener('click', e => {
      e.stopPropagation();
      addPage(page.id);
    });
    indexCell.append(indexLabel, insertButton);

    const titleCell = document.createElement('td');
    titleCell.className = 'editable-cell';
    titleCell.dataset.field = 'title';
    titleCell.textContent = page.title;

    const typeCell = document.createElement('td');
    typeCell.className = 'editable-cell';
    typeCell.dataset.field = 'type';
    typeCell.textContent = page.type || 'Shot';

    const synopsisCell = document.createElement('td');
    synopsisCell.className = 'editable-cell';
    synopsisCell.dataset.field = 'synopsis';
    synopsisCell.textContent = page.synopsis || '';

    row.append(indexCell, titleCell, typeCell, synopsisCell);
    row.addEventListener('dblclick', () => selectPage(page.id));
    row.addEventListener('dragstart', e => {
      draggingPageId = page.id;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', page.id);
    });
    row.addEventListener('dragend', () => {
      draggingPageId = null;
      row.classList.remove('dragging');
      clearDragHighlights();
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      if (!draggingPageId || draggingPageId === page.id) return;
      clearDragHighlights();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', clearDragHighlights);
    row.addEventListener('drop', e => {
      e.preventDefault();
      if (!draggingPageId || draggingPageId === page.id) return;
      const rect = row.getBoundingClientRect();
      const dropBefore = e.clientY < rect.top + rect.height / 2;
      reorderPages(draggingPageId, page.id, dropBefore ? 'before' : 'after');
      draggingPageId = null;
      clearDragHighlights();
    });
    if (page.id === state.selectedPageId) {
      row.classList.add('active');
    }
    els.pageTable.appendChild(row);
  });
}

function clearDragHighlights() {
  els.pageTable.querySelectorAll('tr').forEach(tr => tr.classList.remove('drag-over'));
}

function reorderPages(sourceId, targetId, position = 'before') {
  const pages = state.currentProject?.pages;
  if (!pages) return;
  const fromIdx = pages.findIndex(p => p.id === sourceId);
  if (fromIdx === -1) return;
  const [moved] = pages.splice(fromIdx, 1);
  let insertIdx = pages.findIndex(p => p.id === targetId);
  if (insertIdx === -1) insertIdx = pages.length;
  if (position === 'after') insertIdx += 1;
  pages.splice(insertIdx, 0, moved);
  renderPages();
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
  exitNoteEdit();
  state.selectedPageId = pageId;
  renderPages();
  renderScript(page);
}

function getActivePage() {
  if (!state.currentProject || !state.selectedPageId) return null;
  return state.currentProject.pages.find(p => p.id === state.selectedPageId) || null;
}

function getLineElements() {
  return Array.from(els.scriptEditor.querySelectorAll('.script-line'));
}

function getFocusedLine() {
  const selection = window.getSelection();
  let node = selection?.focusNode || null;
  while (node && node !== els.scriptEditor && !(node.classList && node.classList.contains('script-line'))) {
    node = node.parentNode;
  }
  if (node && node.classList && node.classList.contains('script-line')) return node;
  return getLineElements()[0] || null;
}

function getCaretLineIndex() {
  const line = getFocusedLine();
  return line ? lineIndex(line) : 0;
}

function lineIndex(line) {
  return getLineElements().indexOf(line);
}

function placeCaret(line, offset = null) {
  const range = document.createRange();
  const sel = window.getSelection();
  let targetNode = line.firstChild;
  if (!targetNode) {
    targetNode = document.createTextNode('');
    line.appendChild(targetNode);
  }
  const targetOffset = offset === null ? targetNode.length : Math.min(offset, targetNode.length);
  range.setStart(targetNode, targetOffset);
  range.setEnd(targetNode, targetOffset);
  sel.removeAllRanges();
  sel.addRange(range);
}

function updateLineAppearance(line, type) {
  line.dataset.type = type;
  line.className = `script-line line-${type}`;
}

function createLine(block) {
  const line = document.createElement('div');
  updateLineAppearance(line, block.type || 'action');
  line.dataset.lineId = block.id || '';
  line.contentEditable = true;
  line.textContent = block.type === 'scene' || block.type === 'character'
    ? (block.text || '').toUpperCase()
    : (block.text || '');
  return line;
}

function syncLinesToPage(page) {
  if (!page) return;
  const lines = getLineElements();
  const focusedLine = getFocusedLine();
  const focusedIndex = focusedLine ? lineIndex(focusedLine) : 0;
  const focusedOffset = window.getSelection()?.focusOffset || 0;
  const blocks = lines.map((line, idx) => {
    const type = line.dataset.type || 'action';
    const rawText = line.textContent || '';
    const normalizedText = (type === 'scene' || type === 'character') ? rawText.toUpperCase() : rawText;
    if (normalizedText !== rawText) {
      line.textContent = normalizedText;
    }
    updateLineAppearance(line, type);
    return {
      id: line.dataset.lineId || page.blocks?.[idx]?.id || `blk-${page.id}-${idx}`,
      type,
      text: normalizedText
    };
  });
  page.blocks = blocks;
  const activeLine = getLineElements()[focusedIndex] || getLineElements()[0];
  if (activeLine) {
    const safeOffset = Math.min(focusedOffset, activeLine.textContent.length);
    placeCaret(activeLine, safeOffset);
    highlightChip(activeLine.dataset.type || 'action');
  }
}

function captureScriptToState() {
  if (!state.currentProject || !state.selectedPageId) return;
  const page = state.currentProject.pages.find(p => p.id === state.selectedPageId);
  if (!page) return;
  syncLinesToPage(page);
}

function formatDraftLine(block) {
  const raw = (block.text || '').trimEnd();
  if (!raw) return '';
  const normalized = (block.type === 'scene' || block.type === 'character') ? raw.toUpperCase() : raw;
  if (/\bCONT\./i.test(normalized)) return '';
  const indent = {
    scene: '',
    action: '    ',
    character: '               ',
    dialogue: '          '
  }[block.type || 'action'] || '';
  return `${indent}${normalized}`.trimEnd();
}

function buildDraftFromProject(project) {
  const lines = [];
  (project.pages || []).forEach((page, pageIdx) => {
    (page.blocks || []).forEach(block => {
      const line = formatDraftLine(block);
      if (line) lines.push(line);
    });
    if (pageIdx < (project.pages.length - 1)) lines.push('');
  });
  return lines.join('\n');
}

function renderDraftPreview(text) {
  els.draftPreview.textContent = text || 'No draft to display yet.';
}

function renderDraftVersions() {
  els.draftVersionList.innerHTML = '';
  if (!state.currentProject) return;
  const versions = state.currentProject.draftVersions || [];
  if (!versions.length) {
    const empty = document.createElement('div');
    empty.className = 'muted small';
    empty.textContent = 'No saved versions yet.';
    els.draftVersionList.appendChild(empty);
    return;
  }
  versions.forEach(version => {
    const row = document.createElement('button');
    row.className = 'draft-version';
    row.type = 'button';
    row.innerHTML = `<strong>${version.name}</strong><span class="muted small">${new Date(version.createdAt).toLocaleString()}</span>`;
    row.addEventListener('click', () => {
      renderDraftPreview(version.body);
      els.draftName.value = version.name;
    });
    els.draftVersionList.appendChild(row);
  });
}

function openDraftModal() {
  if (!state.currentProject) return;
  captureScriptToState();
  renderDraftVersions();
  renderDraftPreview(buildDraftFromProject(state.currentProject));
  els.draftModal.classList.remove('hidden');
}

function closeDraftModal() {
  els.draftModal.classList.add('hidden');
}

function refreshDraftPreview() {
  if (!state.currentProject) return;
  captureScriptToState();
  renderDraftPreview(buildDraftFromProject(state.currentProject));
}

function saveDraftVersion() {
  if (!state.currentProject) return;
  captureScriptToState();
  const body = buildDraftFromProject(state.currentProject);
  const fallback = `Version ${Math.max(1, (state.currentProject.draftVersions?.length || 0) + 1)}`;
  const name = (els.draftName.value || '').trim() || fallback;
  const version = {
    id: `draft-${Date.now()}`,
    name,
    body,
    createdAt: new Date().toISOString()
  };
  state.currentProject.draftVersions = state.currentProject.draftVersions || [];
  state.currentProject.draftVersions.unshift(version);
  els.draftName.value = name;
  renderDraftVersions();
  renderDraftPreview(body);
  saveProject();
}

function highlightChip(type) {
  els.lineTypeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lineType === type);
  });
}

function renderScript(page) {
  els.scriptEditor.innerHTML = '';
  els.editorMeta.textContent = page ? `${page.title} • ${page.type}` : 'No page loaded';
  els.scriptEditor.dataset.pageId = page?.id || '';
  if (!page) {
    renderDirectorNotes(null);
    return;
  }
  if (!page.blocks || !page.blocks.length) {
    page.blocks = [
      { id: `blk-${page.id}-0`, type: 'scene', text: 'INT. LOCATION - DAY' },
      { id: `blk-${page.id}-1`, type: 'action', text: '' }
    ];
  }
  page.blocks.forEach(block => {
    els.scriptEditor.appendChild(createLine(block));
  });
  const firstLine = getLineElements()[0];
  if (firstLine) {
    highlightChip(firstLine.dataset.type || 'scene');
    placeCaret(firstLine, firstLine.textContent.length);
  }
  syncLinesToPage(page);
  renderDirectorNotes(page);
}

function buildNoteCard(note, context = {}) {
  const card = document.createElement('div');
  card.className = 'note-card';
  card.style.setProperty('--note-color', note.color || '#2b8cff');
  const title = document.createElement('div');
  title.className = 'note-title';
  title.textContent = note.title || 'Untitled';
  const body = document.createElement('div');
  body.className = 'note-body';
  body.textContent = note.text || '';
  card.appendChild(title);
  card.appendChild(body);
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('application/json', JSON.stringify(note));
    e.dataTransfer.effectAllowed = 'copy';
  });
  card.addEventListener('dblclick', () => enterNoteEdit(note, context));
  return card;
}

function renderNotePreview() {
  const draft = getNoteDraft();
  els.notePreview.innerHTML = '';
  const card = buildNoteCard(draft);
  els.notePreview.appendChild(card);
}

function getNoteDraft() {
  return {
    id: state.noteEdit?.noteId || `note-draft-${Date.now()}`,
    title: els.noteTitle.value.trim() || 'Untitled',
    color: els.noteColor.value || '#2b8cff',
    text: els.noteBody.value.trim()
  };
}

function renderNoteLibrary() {
  els.noteLibrary.innerHTML = '';
  const notes = state.currentProject?.noteLibrary || [];
  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'muted small';
    empty.textContent = 'Saved toolkit notes appear here';
    els.noteLibrary.appendChild(empty);
    return;
  }
  notes.forEach(note => {
    const card = buildNoteCard(note, { source: 'library' });
    card.dataset.noteId = note.id;
    els.noteLibrary.appendChild(card);
  });
}

function renderDirectorNotes(page) {
  els.directorBox.innerHTML = '';
  if (!page) {
    const empty = document.createElement('div');
    empty.className = 'muted small';
    empty.textContent = 'Select a page to attach director notes.';
    els.directorBox.appendChild(empty);
    return;
  }
  const notes = page.directorNotes || [];
  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'muted small';
    empty.textContent = 'Drag toolkit notes or the preview here to attach to this page.';
    els.directorBox.appendChild(empty);
    return;
  }
  notes.forEach(note => {
    const card = buildNoteCard(note, { source: 'director', pageId: page.id });
    els.directorBox.appendChild(card);
  });
}

function attachNoteToPage(note) {
  const page = getActivePage();
  if (!page) return;
  const incoming = {
    id: note.id || `note-${Date.now()}`,
    title: note.title || 'Untitled',
    color: note.color || '#2b8cff',
    text: note.text || ''
  };
  page.directorNotes = page.directorNotes || [];
  page.directorNotes.push(incoming);
  renderDirectorNotes(page);
}

function handleDirectorDrop(e) {
  e.preventDefault();
  els.directorBox.classList.remove('dragging');
  const payload = e.dataTransfer.getData('application/json');
  if (!payload) return;
  try {
    const note = JSON.parse(payload);
    attachNoteToPage(note);
  } catch (err) {
    console.error('Invalid note payload', err);
  }
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
  const normalized = normalizeProjectShape(project);
  state.projects.push(normalized);
  await loadProfile();
  renderProjectSelect();
  renderRecent();
  openProjectById(project.id);
}

async function openProjectById(id) {
  if (!id) return;
  const project = await fetchJson(`/api/projects/${id}`);
  const normalized = normalizeProjectShape(project);
  state.currentProject = normalized;
  state.selectedPageId = normalized.pages[0]?.id || null;
  setProjectTitle(normalized.name);
  els.draftName.value = '';
  const existing = state.projects.findIndex(p => p.id === normalized.id);
  if (existing !== -1) state.projects[existing] = normalized;
  renderNoteLibrary();
  renderPages();
  selectPage(state.selectedPageId);
  showSection('workspace');
  await loadProfile();
  renderRecent();
}

function addPage(afterPageId = null) {
  if (!state.currentProject) return;
  const pages = state.currentProject.pages;
  const newPage = {
    id: `page-${Date.now()}`,
    title: `Page ${pages.length + 1}`,
    type: 'Shot',
    synopsis: '',
    directorNotes: [],
    blocks: [
      { id: `blk-${Date.now()}-scene`, type: 'scene', text: 'INT. LOCATION - DAY' },
      { id: `blk-${Date.now()}-action`, type: 'action', text: '' }
    ]
  };
  let insertIdx = pages.length;
  if (afterPageId) {
    const idx = pages.findIndex(p => p.id === afterPageId);
    if (idx !== -1) insertIdx = idx + 1;
  }
  pages.splice(insertIdx, 0, newPage);
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

function enterNoteEdit(note, context = { source: 'library', pageId: null }) {
  state.noteEdit = {
    source: context.source,
    pageId: context.pageId || null,
    noteId: note.id
  };
  els.noteTitle.value = note.title || '';
  els.noteColor.value = note.color || '#2b8cff';
  els.noteBody.value = note.text || '';
  els.addNoteObject.textContent = 'Apply changes';
  els.addNoteObject.classList.add('primary');
  els.objectBuilder.classList.add('editing');
  els.noteModeStatus.textContent = `Editing ${context.source === 'director' ? 'director note' : 'toolkit note'}`;
  els.noteModeStatus.classList.remove('hidden');
  renderNotePreview();
}

function exitNoteEdit() {
  state.noteEdit = null;
  els.addNoteObject.textContent = 'Save to toolkit';
  els.addNoteObject.classList.remove('primary');
  els.objectBuilder.classList.remove('editing');
  els.noteModeStatus.textContent = '';
  els.noteModeStatus.classList.add('hidden');
  renderNotePreview();
}

function applyNoteEdit(draft) {
  const context = state.noteEdit;
  if (!context || !state.currentProject) return;
  if (context.source === 'library') {
    const lib = state.currentProject.noteLibrary || [];
    const target = lib.find(n => n.id === context.noteId);
    if (target) {
      target.title = draft.title;
      target.color = draft.color;
      target.text = draft.text;
    } else {
      lib.push({ ...draft, id: context.noteId || `note-${Date.now()}` });
    }
    state.currentProject.noteLibrary = lib;
    renderNoteLibrary();
  }
  if (context.source === 'director') {
    const page = state.currentProject.pages.find(p => p.id === context.pageId) || getActivePage();
    if (page) {
      const notes = page.directorNotes || [];
      const target = notes.find(n => n.id === context.noteId);
      if (target) {
        target.title = draft.title;
        target.color = draft.color;
        target.text = draft.text;
      } else {
        notes.push({ ...draft, id: context.noteId || `note-${Date.now()}` });
      }
      page.directorNotes = notes;
      renderDirectorNotes(page);
    }
  }
  exitNoteEdit();
}

function attachTableEditing() {
  els.pageTable.addEventListener('click', e => {
    const cell = e.target.closest('.editable-cell');
    if (!cell) return;
    e.stopPropagation();
    startCellEdit(cell);
  });

  els.pageTable.addEventListener('dragover', e => {
    if (!draggingPageId) return;
    e.preventDefault();
  });

  els.pageTable.addEventListener('drop', e => {
    if (!draggingPageId) return;
    e.preventDefault();
    const rows = Array.from(els.pageTable.querySelectorAll('tr'));
    const lastId = rows.at(-1)?.dataset.pageId;
    if (lastId && draggingPageId !== lastId) {
      reorderPages(draggingPageId, lastId, 'after');
    }
    draggingPageId = null;
    clearDragHighlights();
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
  els.openDrafts.addEventListener('click', openDraftModal);
  els.closeDrafts.addEventListener('click', closeDraftModal);
  els.refreshDraftPreview.addEventListener('click', refreshDraftPreview);
  els.saveDraftVersion.addEventListener('click', saveDraftVersion);
  [els.noteTitle, els.noteColor, els.noteBody].forEach(input => {
    input.addEventListener('input', renderNotePreview);
  });
  els.addNoteObject.addEventListener('click', () => {
    if (!state.currentProject) return;
    const draft = getNoteDraft();
    if (state.noteEdit) {
      applyNoteEdit(draft);
      return;
    }
    const note = { ...draft, id: `note-${Date.now()}` };
    state.currentProject.noteLibrary = state.currentProject.noteLibrary || [];
    state.currentProject.noteLibrary.push(note);
    renderNoteLibrary();
    renderNotePreview();
  });
  els.renameProject.addEventListener('click', async () => {
    if (!state.currentProject) return;
    const newName = prompt('Rename project', state.currentProject.name || 'Untitled');
    if (!newName || !newName.trim()) return;
    state.currentProject.name = newName.trim();
    setProjectTitle(state.currentProject.name);
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
      const line = getFocusedLine();
      if (!page || !line) return;
      updateLineAppearance(line, btn.dataset.lineType);
      captureScriptToState();
      highlightChip(btn.dataset.lineType);
    });
  });

  els.scriptEditor.addEventListener('input', () => {
    const page = getActivePage();
    if (!page) return;
    captureScriptToState();
  });

  els.scriptEditor.addEventListener('keydown', e => {
    const page = getActivePage();
    const line = getFocusedLine();
    if (!page || !line) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      captureScriptToState();
      const currentType = line.dataset.type || 'action';
      let nextType = 'action';
      if (currentType === 'scene') nextType = 'action';
      else if (currentType === 'character') nextType = 'dialogue';
      const newLine = createLine({ id: `blk-${page.id}-${Date.now()}`, type: nextType, text: '' });
      line.insertAdjacentElement('afterend', newLine);
      captureScriptToState();
      placeCaret(newLine, 0);
      highlightChip(nextType);
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const order = ['scene', 'action', 'character', 'dialogue'];
      const curIdx = order.indexOf(line.dataset.type || 'action');
      let nextType;
      if (line.dataset.type === 'action') {
        nextType = 'character';
      } else {
        nextType = order[(curIdx + 1) % order.length];
      }
      updateLineAppearance(line, nextType);
      captureScriptToState();
      highlightChip(nextType);
    }
  });

  els.scriptEditor.addEventListener('keyup', () => {
    const page = getActivePage();
    const line = getFocusedLine();
    if (!page || !line) return;
    highlightChip(line.dataset.type || 'action');
  });

  els.scriptEditor.addEventListener('click', () => {
    const line = getFocusedLine();
    if (line) highlightChip(line.dataset.type || 'action');
  });

  els.directorBox.addEventListener('dragover', e => {
    e.preventDefault();
    els.directorBox.classList.add('dragging');
  });
  els.directorBox.addEventListener('dragleave', () => {
    els.directorBox.classList.remove('dragging');
  });
  els.directorBox.addEventListener('drop', handleDirectorDrop);

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProject();
    }
    if (e.key === 'Escape' && !els.draftModal.classList.contains('hidden')) {
      closeDraftModal();
    }
  });

  renderNotePreview();
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
