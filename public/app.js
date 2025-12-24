const state = {
  profile: null,
  projects: [],
  currentProject: null,
  selectedPageId: null,
  orientation: 'horizontal',
  noteEdit: null,
  draftViewMode: 'scroll',
  draftFormat: 'script'
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
  goalTimeInput: document.getElementById('goalTimeInput'),
  totalTimeDisplay: document.getElementById('totalTimeDisplay'),
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
  includeTitlePage: document.getElementById('includeTitlePage'),
  draftTitlePageTitle: document.getElementById('draftTitlePageTitle'),
  draftTitlePageSubtitle: document.getElementById('draftTitlePageSubtitle'),
  draftTitlePageAuthor: document.getElementById('draftTitlePageAuthor'),
  draftWatermark: document.getElementById('draftWatermark'),
  draftViewScroll: document.getElementById('draftViewScroll'),
  draftViewSpread: document.getElementById('draftViewSpread'),
  draftFormatScript: document.getElementById('draftFormatScript'),
  draftFormatDirector: document.getElementById('draftFormatDirector'),
  downloadDraft: document.getElementById('downloadDraft'),
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

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function parseTimeInput(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return 0;
  if (trimmed.includes(':')) {
    const [minsRaw, secsRaw] = trimmed.split(':');
    const mins = Number(minsRaw);
    const secs = Number(secsRaw);
    if (!Number.isFinite(mins) || !Number.isFinite(secs)) return null;
    const clampedSecs = Math.min(59, Math.max(0, secs));
    return Math.max(0, Math.round(mins * 60 + clampedSecs));
  }
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes)) return null;
  return Math.max(0, Math.round(minutes * 60));
}

function normalizeTimeValue(value, unit = 'minutes') {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    const parsed = parseTimeInput(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (unit === 'seconds') return Math.max(0, Math.round(numeric));
  return Math.max(0, Math.round(numeric * 60));
}

function updateTimingSummary() {
  if (!state.currentProject) {
    els.totalTimeDisplay.textContent = 'Total: 0:00';
    els.totalTimeDisplay.className = 'timing-total timing-none';
    return;
  }
  const total = state.currentProject.pages.reduce((sum, page) => sum + (Number(page.time) || 0), 0);
  const goal = Number(state.currentProject.goalTime) || 0;
  const goalSuffix = goal > 0 ? ` / ${formatTime(goal)}` : '';
  els.totalTimeDisplay.textContent = `Total: ${formatTime(total)}${goalSuffix}`;
  els.totalTimeDisplay.className = 'timing-total';
  if (goal <= 0) {
    els.totalTimeDisplay.classList.add('timing-none');
  } else if (total > goal) {
    els.totalTimeDisplay.classList.add('timing-over');
  } else if (total / goal <= 0.6) {
    els.totalTimeDisplay.classList.add('timing-low');
  } else {
    els.totalTimeDisplay.classList.add('timing-ok');
  }
}

function normalizePageShape(page, timeUnit = 'minutes') {
  const normalized = { ...page };
  normalized.type = normalized.type || normalized.block || 'Shot';
  normalized.synopsis = normalized.synopsis ?? normalized.summary ?? '';
  normalized.time = normalizeTimeValue(normalized.time, timeUnit);
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
  const timeUnit = project.timeUnit === 'seconds' ? 'seconds' : 'minutes';
  return {
    ...project,
    timeUnit: 'seconds',
    goalTime: normalizeTimeValue(project.goalTime, timeUnit),
    draftVersions: Array.isArray(project.draftVersions) ? project.draftVersions : [],
    draftSettings: project.draftSettings || {},
    noteLibrary: Array.isArray(project.noteLibrary) ? project.noteLibrary : [],
    pages: project.pages.map(page => normalizePageShape(page, timeUnit))
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

    const timeCell = document.createElement('td');
    timeCell.className = 'time-cell';
    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.inputMode = 'numeric';
    timeInput.placeholder = '0:00';
    timeInput.value = Number.isFinite(page.time) && page.time > 0 ? formatTime(page.time) : '';
    timeInput.addEventListener('input', e => {
      const parsed = parseTimeInput(e.target.value);
      if (parsed === null) return;
      page.time = parsed;
      updateTimingSummary();
    });
    timeInput.addEventListener('blur', e => {
      e.target.value = page.time > 0 ? formatTime(page.time) : '';
    });
    timeInput.addEventListener('click', e => e.stopPropagation());
    timeInput.addEventListener('dblclick', e => e.stopPropagation());
    timeCell.appendChild(timeInput);

    row.append(indexCell, titleCell, typeCell, synopsisCell, timeCell);
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
  updateTimingSummary();
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
  if (!raw) return null;
  const normalized = (block.type === 'scene' || block.type === 'character') ? raw.toUpperCase() : raw;
  if (/\bCONT\./i.test(normalized)) return null;
  return {
    text: normalized,
    type: block.type || 'action'
  };
}

function buildDraftLines(project) {
  const lines = [];
  (project.pages || []).forEach((page, pageIdx) => {
    (page.blocks || []).forEach(block => {
      const line = formatDraftLine(block);
      if (line) lines.push(line);
    });
    if (pageIdx < (project.pages.length - 1)) lines.push({ text: '', type: 'spacer' });
  });
  return lines;
}

function buildDirectorEntries(project) {
  return (project.pages || []).map((page, idx) => ({
    number: idx + 1,
    title: page.title || `Page ${idx + 1}`,
    type: page.type || 'Shot',
    synopsis: page.synopsis || '',
    directorNotes: Array.isArray(page.directorNotes) ? page.directorNotes : [],
    lines: (page.blocks || []).map(formatDraftLine).filter(Boolean)
  }));
}

function buildDraftFromProject(project) {
  return {
    lines: buildDraftLines(project),
    directorEntries: buildDirectorEntries(project)
  };
}

function getDraftSettings(overrides = {}) {
  const project = state.currentProject;
  const stored = project?.draftSettings || {};
  const defaults = {
    includeTitlePage: false,
    titlePageTitle: project?.name || 'Shoot!',
    titlePageSubtitle: 'by goblinStudio',
    titlePageAuthor: '',
    watermark: '',
    viewMode: state.draftViewMode || 'scroll',
    format: state.draftFormat || 'script'
  };
  return { ...defaults, ...stored, ...overrides };
}

function hydrateDraftSettingsForm() {
  const settings = getDraftSettings();
  els.includeTitlePage.checked = !!settings.includeTitlePage;
  els.draftTitlePageTitle.value = settings.titlePageTitle || '';
  els.draftTitlePageSubtitle.value = settings.titlePageSubtitle || '';
  els.draftTitlePageAuthor.value = settings.titlePageAuthor || '';
  els.draftWatermark.value = settings.watermark || '';
  toggleDraftView(settings.viewMode, false);
  toggleDraftFormat(settings.format || 'script', false);
}

function persistDraftSettings() {
  if (!state.currentProject) return;
  state.currentProject.draftSettings = {
    includeTitlePage: els.includeTitlePage.checked,
    titlePageTitle: els.draftTitlePageTitle.value,
    titlePageSubtitle: els.draftTitlePageSubtitle.value,
    titlePageAuthor: els.draftTitlePageAuthor.value,
    watermark: els.draftWatermark.value,
    viewMode: state.draftViewMode,
    format: state.draftFormat
  };
}

function normalizeDraftLine(entry) {
  if (!entry) return { text: '', type: 'action' };
  if (typeof entry === 'string') return { text: entry, type: 'action' };
  return { text: entry.text || '', type: entry.type || 'action' };
}

function splitIntoPages(lines, settings) {
  const MAX_LINES = 55;
  const pages = [];
  let buffer = [];
  lines.forEach(line => {
    const normalized = normalizeDraftLine(line);
    if (buffer.length >= MAX_LINES) {
      pages.push({ lines: buffer });
      buffer = [];
    }
    buffer.push(normalized);
  });
  if (buffer.length) pages.push({ lines: buffer });
  return pages;
}

function buildDraftPreviewData(fromText) {
  const settings = getDraftSettings(typeof fromText === 'object' && !Array.isArray(fromText) ? fromText.settings || {} : {});
  const projectTitle = settings.titlePageTitle || state.currentProject?.name || 'Shoot!';
  const baseLines = Array.isArray(fromText?.lines)
    ? fromText.lines
    : Array.isArray(fromText)
      ? fromText
      : typeof fromText === 'string'
        ? (fromText || '').split('\n')
        : [];
  const lines = (baseLines.length ? baseLines : ['']).map(normalizeDraftLine);
  const pages = splitIntoPages(lines, settings);
  const directorEntries = Array.isArray(fromText?.directorEntries) && fromText.directorEntries.length
    ? fromText.directorEntries
    : buildDirectorEntries(state.currentProject || { pages: [] });
  if (settings.includeTitlePage) {
    pages.unshift({
      isTitle: true,
      title: projectTitle,
      subtitle: settings.titlePageSubtitle,
      author: settings.titlePageAuthor
    });
  }
  return { pages, settings, projectTitle, directorEntries };
}

function renderDraftPreview(preview) {
  els.draftPreview.innerHTML = '';
  if (!preview || !preview.pages.length) {
    els.draftPreview.textContent = 'No draft to display yet.';
    return;
  }
  if (preview.settings.format === 'director') {
    renderDirectorPreview(preview);
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = `draft-pages ${preview.settings.viewMode === 'spread' ? 'spread' : 'scroll'}`;
  preview.pages.forEach((page, idx) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'draft-page';
    if (page.isTitle) pageEl.classList.add('title-page');

    const header = document.createElement('div');
    header.className = 'draft-page-header';
    const title = document.createElement('span');
    title.textContent = preview.projectTitle;
    header.appendChild(title);
    if (!page.isTitle) {
      const number = document.createElement('span');
      const numberIndex = idx + 1 - (preview.settings.includeTitlePage ? 1 : 0);
      number.textContent = `Page ${Math.max(1, numberIndex)}`;
      header.appendChild(number);
    }
    pageEl.appendChild(header);

    const body = document.createElement('div');
    body.className = 'draft-page-body';
    if (page.isTitle) {
      const t = document.createElement('div');
      t.className = 'title-line main';
      t.textContent = page.title || 'Title';
      const sub = document.createElement('div');
      sub.className = 'title-line sub';
      sub.textContent = page.subtitle || '';
      const by = document.createElement('div');
      by.className = 'title-line by';
      by.textContent = page.author ? `by ${page.author}` : '';
      body.append(t, sub, by);
    } else {
      page.lines.forEach(text => {
        const lineObj = normalizeDraftLine(text);
        const line = document.createElement('div');
        line.className = `draft-line draft-${lineObj.type || 'action'}`;
        line.textContent = lineObj.text || ' ';
        body.appendChild(line);
      });
    }
    pageEl.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'draft-page-footer';
    footer.textContent = preview.projectTitle;
    if (!page.isTitle) {
      const num = document.createElement('span');
      num.textContent = `${Math.max(1, idx + 1 - (preview.settings.includeTitlePage ? 1 : 0))}`;
      footer.appendChild(num);
    }
    pageEl.appendChild(footer);

    if (preview.settings.watermark) {
      const mark = document.createElement('div');
      mark.className = 'draft-watermark';
      mark.textContent = preview.settings.watermark;
      pageEl.appendChild(mark);
    }

  wrapper.appendChild(pageEl);
  });
  els.draftPreview.appendChild(wrapper);
}

function renderDirectorPreview(preview) {
  const wrapper = document.createElement('div');
  wrapper.className = `draft-pages ${preview.settings.viewMode === 'spread' ? 'spread' : 'scroll'} director-mode`;
  const entries = preview.directorEntries || [];
  entries.forEach((entry, idx) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'draft-page director-page';

    const header = document.createElement('div');
    header.className = 'draft-page-header';
    header.innerHTML = `<span>${preview.projectTitle}</span><span>Page ${idx + 1}</span>`;
    pageEl.appendChild(header);

    const body = document.createElement('div');
    body.className = 'draft-page-body director-body';

    const slug = document.createElement('div');
    slug.className = 'director-slug';
    const slugText = `(${entry.number}) : ${entry.title || ''} // ${entry.type || ''} - ${entry.synopsis || ''}`;
    slug.textContent = slugText.trim();
    body.appendChild(slug);

    const notesWrap = document.createElement('div');
    notesWrap.className = 'director-notes';
    (entry.directorNotes || []).forEach(note => {
      const noteEl = document.createElement('div');
      noteEl.className = 'director-note-card';
      noteEl.style.setProperty('--note-color', note.color || '#2b8cff');
      const title = document.createElement('div');
      title.className = 'director-note-title';
      title.textContent = note.title || 'Note';
      const text = document.createElement('div');
      text.className = 'director-note-text';
      text.textContent = note.text || '';
      noteEl.appendChild(title);
      noteEl.appendChild(text);
      notesWrap.appendChild(noteEl);
    });
    if (!notesWrap.children.length) {
      const empty = document.createElement('div');
      empty.className = 'muted small';
      empty.textContent = 'No director notes for this row yet.';
      notesWrap.appendChild(empty);
    }
    body.appendChild(notesWrap);

    const scriptWrap = document.createElement('div');
    scriptWrap.className = 'director-script';
    (entry.lines || []).forEach(lineText => {
      const entryLine = normalizeDraftLine(lineText);
      const line = document.createElement('div');
      line.className = `draft-line draft-${entryLine.type || 'action'}`;
      line.textContent = entryLine.text || ' ';
      scriptWrap.appendChild(line);
    });
    body.appendChild(scriptWrap);

    const footer = document.createElement('div');
    footer.className = 'draft-page-footer';
    footer.innerHTML = `<span>${preview.projectTitle}</span><span>${idx + 1}</span>`;
    pageEl.appendChild(body);
    pageEl.appendChild(footer);

    if (preview.settings.watermark) {
      const mark = document.createElement('div');
      mark.className = 'draft-watermark';
      mark.textContent = preview.settings.watermark;
      pageEl.appendChild(mark);
    }

    wrapper.appendChild(pageEl);
  });
  els.draftPreview.appendChild(wrapper);
}

function renderCurrentDraftPreview() {
  if (!state.currentProject) return;
  renderDraftPreview(buildDraftPreviewData(buildDraftFromProject(state.currentProject)));
}

function toggleDraftView(mode, rerender = true) {
  state.draftViewMode = mode;
  if (mode === 'spread') {
    els.draftViewSpread.classList.add('active');
    els.draftViewScroll.classList.remove('active');
  } else {
    els.draftViewScroll.classList.add('active');
    els.draftViewSpread.classList.remove('active');
  }
  if (rerender) renderCurrentDraftPreview();
}

function toggleDraftFormat(format, rerender = true) {
  state.draftFormat = format;
  if (format === 'director') {
    els.draftFormatDirector.classList.add('active');
    els.draftFormatScript.classList.remove('active');
  } else {
    els.draftFormatScript.classList.add('active');
    els.draftFormatDirector.classList.remove('active');
  }
  if (rerender) renderCurrentDraftPreview();
}

function buildPrintableHtml(preview) {
  const printableLine = line => {
    const entry = normalizeDraftLine(line);
    const safe = (entry.text || ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const cls = `draft-line draft-${entry.type || 'action'}`;
    return `<div class="${cls}">${safe || '&nbsp;'}</div>`;
  };

  const directorPages = (preview.directorEntries || []).map((entry, idx) => {
    const header = `<div class="draft-page-header"><span>${preview.projectTitle}</span><span>Page ${idx + 1}</span></div>`;
    const footer = `<div class="draft-page-footer"><span>${preview.projectTitle}</span><span>${idx + 1}</span></div>`;
    const slug = `<div class="director-slug">(${entry.number}) : ${entry.title || ''} // ${entry.type || ''} - ${entry.synopsis || ''}</div>`;
    const notes = (entry.directorNotes || []).length
      ? `<div class="director-notes">${entry.directorNotes.map(note => `<div class="director-note-card" style="--note-color:${note.color || '#2b8cff'}"><div class="director-note-title">${(note.title || 'Note').replace(/&/g, '&amp;')}</div><div class="director-note-text">${(note.text || '').replace(/&/g, '&amp;')}</div></div>`).join('')}</div>`
      : '<div class="director-notes"><div class="muted small">No director notes for this row yet.</div></div>';
    const script = `<div class="director-script">${(entry.lines || []).map(printableLine).join('')}</div>`;
    const watermark = preview.settings.watermark ? `<div class="draft-watermark">${preview.settings.watermark}</div>` : '';
    return `<div class="draft-page director-page">${header}<div class="draft-page-body director-body">${slug}${notes}${script}</div>${footer}${watermark}</div>`;
  }).join('');

  const pagesHtml = preview.pages.map((page, idx) => {
    const numberIndex = idx + 1 - (preview.settings.includeTitlePage ? 1 : 0);
    const header = page.isTitle ? '' : `<div class="draft-page-header"><span>${preview.projectTitle}</span><span>Page ${Math.max(1, numberIndex)}</span></div>`;
    const footer = page.isTitle ? '' : `<div class="draft-page-footer"><span>${preview.projectTitle}</span><span>${Math.max(1, numberIndex)}</span></div>`;
    const watermark = preview.settings.watermark ? `<div class="draft-watermark">${preview.settings.watermark}</div>` : '';
    const body = page.isTitle
      ? `<div class="draft-page-body title-body"><div class="title-line main">${page.title || ''}</div><div class="title-line sub">${page.subtitle || ''}</div><div class="title-line by">${page.author ? `by ${page.author}` : ''}</div></div>`
      : `<div class="draft-page-body">${(page.lines || []).map(printableLine).join('')}</div>`;
    return `<div class="draft-page ${page.isTitle ? 'title-page' : ''}">${header}${body}${footer}${watermark}</div>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${preview.projectTitle} draft</title>
    <style>
      body{margin:0;background:#dfe9fb;font-family:'Courier New',monospace;color:#111;}
      .draft-pages{padding:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;}
      .draft-page{position:relative;background:#fff;border:1px solid #b6c8e6;border-radius:12px;box-shadow:0 10px 28px rgba(0,32,92,.18);padding:72px 60px 60px;min-height:880px;overflow:hidden;}
      .draft-page-header{position:absolute;top:18px;left:28px;right:28px;display:flex;justify-content:space-between;font-size:12px;letter-spacing:0.4px;color:#123;}
      .draft-page-footer{position:absolute;bottom:18px;left:28px;right:28px;display:flex;justify-content:space-between;font-size:12px;letter-spacing:0.4px;color:#123;}
      .draft-page-body{margin-top:12px;line-height:1.55;font-family:'Courier New',monospace;}
      .draft-line{white-space:pre-wrap;margin:0.35em 0;}
      .draft-line.draft-scene{letter-spacing:0.5px;}
      .draft-line.draft-action{max-width:90%;}
      .draft-line.draft-character{max-width:55%;margin-left:auto;margin-right:auto;text-transform:uppercase;text-align:center;}
      .draft-line.draft-dialogue{max-width:65%;margin-left:auto;margin-right:auto;text-align:center;}
      .draft-line.draft-spacer{height:0.6em;}
      .draft-watermark{position:absolute;inset:20% 5%;display:flex;align-items:center;justify-content:center;font-size:48px;letter-spacing:4px;color:rgba(0,0,0,0.08);transform:rotate(-20deg);}
      .title-body{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:120px;}
      .title-line.main{font-size:28px;letter-spacing:1px;font-weight:700;}
      .title-line.sub{font-size:16px;}
      .title-line.by{font-size:16px;font-style:italic;}
      .director-page .director-body{display:flex;flex-direction:column;gap:12px;}
      .director-slug{font-weight:700;letter-spacing:0.6px;background:linear-gradient(90deg,rgba(0,62,128,0.08),rgba(255,255,255,0));padding:8px 12px;border-radius:8px;}
      .director-notes{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));font-family:'Georgia',serif;}
      .director-note-card{border:1px solid rgba(0,0,0,0.1);border-top:4px solid var(--note-color,#2b8cff);border-radius:10px;background:rgba(0,0,0,0.02);padding:8px 10px;box-shadow:0 6px 14px rgba(0,32,92,0.12);}
      .director-note-title{font-weight:700;margin-bottom:4px;}
      .director-note-text{white-space:pre-wrap;}
      .director-script{padding:10px 6px;border-radius:10px;background:linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.04));}
      @page { margin: 20mm 18mm; }
    </style></head><body><div class="draft-pages">${preview.settings.format === 'director' ? directorPages : pagesHtml}</div></body></html>`;
}

function downloadDraftPdf() {
  if (!state.currentProject) return;
  const preview = buildDraftPreviewData(buildDraftFromProject(state.currentProject));
  const html = buildPrintableHtml(preview);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 200);
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
      renderDraftPreview(buildDraftPreviewData(version.body));
      els.draftName.value = version.name;
    });
    els.draftVersionList.appendChild(row);
  });
}

function openDraftModal() {
  if (!state.currentProject) return;
  captureScriptToState();
  hydrateDraftSettingsForm();
  renderDraftVersions();
  renderDraftPreview(buildDraftPreviewData(buildDraftFromProject(state.currentProject)));
  els.draftModal.classList.remove('hidden');
}

function closeDraftModal() {
  els.draftModal.classList.add('hidden');
}

function refreshDraftPreview() {
  if (!state.currentProject) return;
  captureScriptToState();
  persistDraftSettings();
  renderDraftPreview(buildDraftPreviewData(buildDraftFromProject(state.currentProject)));
}

function saveDraftVersion() {
  if (!state.currentProject) return;
  captureScriptToState();
  persistDraftSettings();
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
  renderDraftPreview(buildDraftPreviewData(body));
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
  state.currentProject.timeUnit = 'seconds';
  const updated = await fetchJson(`/api/projects/${state.currentProject.id}`, {
    method: 'PUT',
    body: JSON.stringify(state.currentProject)
  });
  state.currentProject = normalizeProjectShape(updated);
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
  els.goalTimeInput.value = normalized.goalTime > 0 ? formatTime(normalized.goalTime) : '';
  updateTimingSummary();
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
    time: 0,
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
  els.goalTimeInput.addEventListener('input', e => {
    if (!state.currentProject) return;
    const parsed = parseTimeInput(e.target.value);
    if (parsed === null) return;
    state.currentProject.goalTime = parsed;
    updateTimingSummary();
  });
  els.goalTimeInput.addEventListener('blur', e => {
    if (!state.currentProject) return;
    e.target.value = state.currentProject.goalTime > 0 ? formatTime(state.currentProject.goalTime) : '';
  });
  els.refreshDraftPreview.addEventListener('click', refreshDraftPreview);
  els.saveDraftVersion.addEventListener('click', saveDraftVersion);
  [els.includeTitlePage, els.draftTitlePageTitle, els.draftTitlePageSubtitle, els.draftTitlePageAuthor, els.draftWatermark].forEach(input => {
    input.addEventListener('input', () => {
      persistDraftSettings();
      renderCurrentDraftPreview();
    });
  });
  els.draftViewScroll.addEventListener('click', () => toggleDraftView('scroll'));
  els.draftViewSpread.addEventListener('click', () => toggleDraftView('spread'));
  els.draftFormatScript.addEventListener('click', () => toggleDraftFormat('script'));
  els.draftFormatDirector.addEventListener('click', () => toggleDraftFormat('director'));
  els.downloadDraft.addEventListener('click', downloadDraftPdf);
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
