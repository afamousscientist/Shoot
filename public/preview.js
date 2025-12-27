const els = {
  projectSelect: document.getElementById('previewProjectSelect'),
  previewPages: document.getElementById('previewPages'),
  previewStatus: document.getElementById('previewStatus')
};

let activeProjectId = '';
let lastUpdatedAt = '';
let pollHandle = null;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function formatLine(block) {
  const raw = (block.text || '').trimEnd();
  if (!raw) return null;
  if (/\bCONT\./i.test(raw)) return null;
  const type = block.type || 'action';
  const text = (type === 'scene' || type === 'character') ? raw.toUpperCase() : raw;
  return { type, text };
}

function renderProject(project) {
  els.previewPages.innerHTML = '';
  if (!project || !project.pages || !project.pages.length) {
    els.previewPages.innerHTML = '<div class="empty">No pages available for this project.</div>';
    return;
  }
  project.pages.forEach((page, index) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'page';
    const header = document.createElement('div');
    header.className = 'page-header';
    header.textContent = `${project.name || 'Untitled Project'} — Page ${index + 1}`;
    pageEl.appendChild(header);
    (page.blocks || []).forEach(block => {
      const lineData = formatLine(block);
      if (!lineData) return;
      const line = document.createElement('div');
      line.className = `line ${lineData.type}`;
      line.textContent = lineData.text;
      pageEl.appendChild(line);
    });
    els.previewPages.appendChild(pageEl);
  });
}

async function loadProjects() {
  const projects = await fetchJson('/api/projects');
  els.projectSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a project';
  els.projectSelect.appendChild(defaultOption);
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    els.projectSelect.appendChild(option);
  });
  if (projects.length && !activeProjectId) {
    activeProjectId = projects[0].id;
    els.projectSelect.value = activeProjectId;
    await refreshProject(true);
  }
}

async function refreshProject(force = false) {
  if (!activeProjectId) {
    els.previewStatus.textContent = 'Waiting for selection…';
    els.previewPages.innerHTML = '<div class="empty">Select a project to view the live PDF preview.</div>';
    return;
  }
  const project = await fetchJson(`/api/projects/${activeProjectId}`);
  const updatedAt = project.updatedAt || '';
  if (!force && updatedAt && updatedAt === lastUpdatedAt) return;
  lastUpdatedAt = updatedAt;
  els.previewStatus.textContent = updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : 'Live preview';
  renderProject(project);
}

function startPolling() {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(() => {
    refreshProject().catch(err => {
      console.error(err);
      els.previewStatus.textContent = 'Preview offline';
    });
  }, 2000);
}

els.projectSelect.addEventListener('change', () => {
  activeProjectId = els.projectSelect.value;
  lastUpdatedAt = '';
  refreshProject(true).catch(console.error);
});

loadProjects()
  .then(() => {
    startPolling();
  })
  .catch(err => {
    console.error(err);
    els.previewStatus.textContent = 'Unable to load projects';
  });
