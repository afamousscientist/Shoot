const els = {
  projectSelect: document.getElementById('previewProjectSelect'),
  previewPages: document.getElementById('previewPages'),
  previewStatus: document.getElementById('previewStatus'),
  viewSeamless: document.getElementById('viewSeamless'),
  viewPaged: document.getElementById('viewPaged'),
  downloadPreview: document.getElementById('downloadPreview'),
  includeTitlePage: document.getElementById('includeTitlePage'),
  includeCredit: document.getElementById('includeCredit'),
  headerInput: document.getElementById('headerInput'),
  footerInput: document.getElementById('footerInput'),
  titleInput: document.getElementById('titleInput'),
  authorInput: document.getElementById('authorInput'),
  notesList: document.getElementById('notesList'),
  noteBubble: document.getElementById('noteBubble'),
  noteBubbleInput: document.getElementById('noteBubbleInput'),
  noteBubbleSave: document.getElementById('noteBubbleSave'),
  noteBubbleCancel: document.getElementById('noteBubbleCancel')
};

let activeProjectId = '';
let lastUpdatedAt = '';
let pollHandle = null;
let activeNotes = [];
let pendingSelection = null;
let previewSettings = {
  view: 'seamless',
  includeTitlePage: false,
  includeCredit: false,
  header: '',
  footer: '',
  title: '',
  author: ''
};

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

function loadNotes(projectId) {
  if (!projectId) return [];
  try {
    const raw = localStorage.getItem(`shootPreviewNotes:${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load notes', err);
    return [];
  }
}

function saveNotes(projectId, notes) {
  if (!projectId) return;
  localStorage.setItem(`shootPreviewNotes:${projectId}`, JSON.stringify(notes));
}

function loadSettings(projectId) {
  if (!projectId) return { ...previewSettings };
  try {
    const raw = localStorage.getItem(`shootPreviewSettings:${projectId}`);
    if (!raw) return { ...previewSettings };
    return { ...previewSettings, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings', err);
    return { ...previewSettings };
  }
}

function saveSettings(projectId) {
  if (!projectId) return;
  localStorage.setItem(`shootPreviewSettings:${projectId}`, JSON.stringify(previewSettings));
}

function renderNotesList() {
  els.notesList.innerHTML = '';
  if (!activeNotes.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No notes yet.';
    els.notesList.appendChild(empty);
    return;
  }
  activeNotes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    const excerpt = document.createElement('div');
    excerpt.className = 'note-excerpt';
    excerpt.textContent = note.excerpt;
    const text = document.createElement('div');
    text.className = 'note-text';
    text.textContent = note.text;
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      activeNotes = activeNotes.filter(item => item.id !== note.id);
      saveNotes(activeProjectId, activeNotes);
      renderProject(currentProjectCache);
    });
    card.append(excerpt, text, del);
    els.notesList.appendChild(card);
  });
}

function clearNoteBubble() {
  els.noteBubble.classList.add('hidden');
  els.noteBubbleInput.value = '';
  pendingSelection = null;
}

function showNoteBubble(rect) {
  if (!rect) return;
  const containerRect = document.body.getBoundingClientRect();
  els.noteBubble.style.top = `${rect.top - containerRect.top + window.scrollY}px`;
  els.noteBubble.classList.remove('hidden');
  els.noteBubbleInput.focus();
}

let currentProjectCache = null;

function buildLine(lineData, pageIndex, lineIndex, notesByLine) {
  const line = document.createElement('div');
  line.className = `line ${lineData.type}`;
  line.dataset.pageIndex = String(pageIndex);
  line.dataset.lineIndex = String(lineIndex);
  const key = `${pageIndex}-${lineIndex}`;
  const notes = notesByLine[key] || [];
  if (notes.length) {
    let text = lineData.text;
    notes.forEach(note => {
      if (note.start < note.end && note.end <= text.length) {
        const before = text.slice(0, note.start);
        const mid = text.slice(note.start, note.end);
        const after = text.slice(note.end);
        text = `${before}[[HIGHLIGHT-${note.id}]]${mid}[[END-${note.id}]]${after}`;
      }
    });
    const parts = text.split(/(\[\[HIGHLIGHT-[^\]]+\]\]|\[\[END-[^\]]+\]\])/);
    let currentHighlight = null;
    parts.forEach(part => {
      const startMatch = part.match(/^\[\[HIGHLIGHT-(.+)\]\]$/);
      const endMatch = part.match(/^\[\[END-(.+)\]\]$/);
      if (startMatch) {
        currentHighlight = startMatch[1];
        return;
      }
      if (endMatch) {
        currentHighlight = null;
        return;
      }
      if (!part) return;
      if (currentHighlight) {
        const mark = document.createElement('mark');
        mark.className = 'note-highlight';
        mark.dataset.noteId = currentHighlight;
        mark.textContent = part;
        line.appendChild(mark);
      } else {
        line.appendChild(document.createTextNode(part));
      }
    });
  } else {
    line.textContent = lineData.text;
  }
  return line;
}

function getMaxCharsForType(type) {
  switch (type) {
    case 'character':
      return 22;
    case 'dialogue':
      return 44;
    case 'scene':
      return 58;
    default:
      return 64;
  }
}

function wrapLineText(type, text) {
  const maxChars = getMaxCharsForType(type);
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach(word => {
    if (!current.length) {
      current = word;
      return;
    }
    if ((current.length + 1 + word.length) <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function renderProject(project) {
  currentProjectCache = project;
  els.previewPages.innerHTML = '';
  if (!project || !project.pages || !project.pages.length) {
    els.previewPages.innerHTML = '<div class="empty">No pages available for this project.</div>';
    return;
  }
  const notesByLine = activeNotes.reduce((acc, note) => {
    const key = `${note.pageIndex}-${note.lineIndex}`;
    acc[key] = acc[key] || [];
    acc[key].push(note);
    return acc;
  }, {});
  const headerText = previewSettings.header || project.name || 'Untitled Project';
  const footerText = previewSettings.footer || '';

  if (previewSettings.includeTitlePage) {
    const titlePage = document.createElement('div');
    titlePage.className = 'page title-page';
    const title = document.createElement('h1');
    title.textContent = previewSettings.title || project.name || 'Untitled Project';
    const author = document.createElement('div');
    author.className = 'byline';
    author.textContent = previewSettings.author ? `by ${previewSettings.author}` : '';
    titlePage.append(title, author);
    if (previewSettings.includeCredit) {
      const watermark = document.createElement('div');
      watermark.className = 'watermark';
      watermark.textContent = 'Created in Shoot! Editor';
      titlePage.appendChild(watermark);
    }
    els.previewPages.appendChild(titlePage);
  }

  const allLines = [];
  project.pages.forEach((page, pageIndex) => {
    (page.blocks || []).forEach((block, lineIndex) => {
      const lineData = formatLine(block);
      if (!lineData) return;
      allLines.push({ lineData, pageIndex, lineIndex });
    });
    allLines.push({ lineData: { type: 'spacer', text: '' }, pageIndex, lineIndex: -1 });
  });

  if (previewSettings.view === 'seamless') {
    const pageEl = document.createElement('div');
    pageEl.className = 'page continuous';
    const header = document.createElement('div');
    header.className = 'page-header';
    header.textContent = headerText;
    pageEl.appendChild(header);
    const body = document.createElement('div');
    body.className = 'page-body';
    let lastPageIndex = -1;
    allLines.forEach(entry => {
      if (entry.lineData.type === 'spacer') {
        const spacer = document.createElement('div');
        spacer.className = 'line spacer';
        body.appendChild(spacer);
        return;
      }
      const line = buildLine(entry.lineData, entry.pageIndex, entry.lineIndex, notesByLine);
      if (entry.pageIndex !== lastPageIndex) {
        lastPageIndex = entry.pageIndex;
        const rowNumber = document.createElement('span');
        rowNumber.className = 'row-number';
        rowNumber.textContent = String(entry.pageIndex + 1);
        line.classList.add('with-row');
        line.prepend(rowNumber);
      }
      body.appendChild(line);
    });
    pageEl.appendChild(body);
    const footer = document.createElement('div');
    footer.className = 'page-footer';
    footer.innerHTML = `<span>${footerText}</span><span>${headerText}</span>`;
    pageEl.appendChild(footer);
    els.previewPages.appendChild(pageEl);
  } else {
    const linesPerPage = 36;
    const pages = [];
    let currentPage = [];
    let remaining = linesPerPage;
    allLines.forEach(entry => {
      if (entry.lineData.type === 'spacer') {
        if (remaining <= 0) {
          pages.push(currentPage);
          currentPage = [];
          remaining = linesPerPage;
        }
        currentPage.push({
          lineData: entry.lineData,
          pageIndex: entry.pageIndex,
          lineIndex: entry.lineIndex,
          showRowNumber: false
        });
        remaining -= 1;
        return;
      }
      const wrapped = wrapLineText(entry.lineData.type, entry.lineData.text);
      let lineOffset = 0;
      while (lineOffset < wrapped.length) {
        if (remaining === 0) {
          pages.push(currentPage);
          currentPage = [];
          remaining = linesPerPage;
        }
        const chunkSize = Math.min(remaining, wrapped.length - lineOffset);
        for (let i = 0; i < chunkSize; i += 1) {
          const isFirstLine = lineOffset === 0 && i === 0;
          const continuation = lineOffset > 0 && i === 0;
          currentPage.push({
            lineData: { ...entry.lineData, text: wrapped[lineOffset + i] },
            pageIndex: entry.pageIndex,
            lineIndex: entry.lineIndex,
            showRowNumber: isFirstLine || continuation,
            continuation
          });
        }
        lineOffset += chunkSize;
        remaining -= chunkSize;
      }
    });
    if (currentPage.length) pages.push(currentPage);

    let pageIndex = 0;
    pages.forEach(chunk => {
      const pageEl = document.createElement('div');
      pageEl.className = 'page';
      const header = document.createElement('div');
      header.className = 'page-header';
      header.textContent = headerText;
      pageEl.appendChild(header);
      const body = document.createElement('div');
      body.className = 'page-body paged';
      let lastPageIndex = -1;
      chunk.forEach(entry => {
        if (entry.lineData.type === 'spacer') {
          const spacer = document.createElement('div');
          spacer.className = 'line spacer';
          body.appendChild(spacer);
          return;
        }
        const line = buildLine(entry.lineData, entry.pageIndex, entry.lineIndex, notesByLine);
        if (entry.showRowNumber) {
          const rowNumber = document.createElement('span');
          rowNumber.className = 'row-number';
          rowNumber.textContent = `${entry.pageIndex + 1}${entry.continuation ? '*' : ''}`;
          line.classList.add('with-row');
          line.prepend(rowNumber);
        }
        body.appendChild(line);
      });
      pageEl.appendChild(body);
      const footer = document.createElement('div');
      footer.className = 'page-footer';
      footer.innerHTML = `<span>${footerText}</span><span>Page ${pageIndex + 1}</span>`;
      pageEl.appendChild(footer);
      els.previewPages.appendChild(pageEl);
      pageIndex += 1;
    });
  }
  renderNotesList();
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
    els.notesList.innerHTML = '<div class="empty">No notes yet.</div>';
    return;
  }
  const project = await fetchJson(`/api/projects/${activeProjectId}`);
  const updatedAt = project.updatedAt || '';
  activeNotes = loadNotes(activeProjectId);
  previewSettings = loadSettings(activeProjectId);
  els.includeTitlePage.checked = previewSettings.includeTitlePage;
  els.includeCredit.checked = previewSettings.includeCredit;
  els.headerInput.value = previewSettings.header;
  els.footerInput.value = previewSettings.footer;
  els.titleInput.value = previewSettings.title;
  els.authorInput.value = previewSettings.author;
  els.viewSeamless.classList.toggle('active', previewSettings.view === 'seamless');
  els.viewPaged.classList.toggle('active', previewSettings.view === 'paged');
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

els.viewSeamless.addEventListener('click', () => {
  previewSettings.view = 'seamless';
  saveSettings(activeProjectId);
  renderProject(currentProjectCache);
  els.viewSeamless.classList.add('active');
  els.viewPaged.classList.remove('active');
});

els.viewPaged.addEventListener('click', () => {
  previewSettings.view = 'paged';
  saveSettings(activeProjectId);
  renderProject(currentProjectCache);
  els.viewPaged.classList.add('active');
  els.viewSeamless.classList.remove('active');
});

[els.includeTitlePage, els.includeCredit, els.headerInput, els.footerInput, els.titleInput, els.authorInput].forEach(input => {
  input.addEventListener('input', () => {
    previewSettings.includeTitlePage = els.includeTitlePage.checked;
    previewSettings.includeCredit = els.includeCredit.checked;
    previewSettings.header = els.headerInput.value;
    previewSettings.footer = els.footerInput.value;
    previewSettings.title = els.titleInput.value;
    previewSettings.author = els.authorInput.value;
    saveSettings(activeProjectId);
    renderProject(currentProjectCache);
  });
});

els.downloadPreview.addEventListener('click', () => {
  window.print();
});

els.previewPages.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    clearNoteBubble();
    return;
  }
  const range = selection.getRangeAt(0);
  const startLine = range.startContainer.parentElement?.closest('.line');
  const endLine = range.endContainer.parentElement?.closest('.line');
  if (!startLine || startLine !== endLine) {
    clearNoteBubble();
    return;
  }
  const lineText = startLine.textContent || '';
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  if (!lineText.trim() || startOffset === endOffset) {
    clearNoteBubble();
    return;
  }
  pendingSelection = {
    pageIndex: Number(startLine.dataset.pageIndex),
    lineIndex: Number(startLine.dataset.lineIndex),
    start: Math.min(startOffset, endOffset),
    end: Math.max(startOffset, endOffset),
    excerpt: lineText.slice(Math.min(startOffset, endOffset), Math.max(startOffset, endOffset)).trim()
  };
  showNoteBubble(startLine.getBoundingClientRect());
});

els.noteBubbleCancel.addEventListener('click', () => {
  clearNoteBubble();
});

els.noteBubbleSave.addEventListener('click', () => {
  if (!pendingSelection || !activeProjectId) return;
  const text = els.noteBubbleInput.value.trim();
  if (!text) return;
  const note = {
    id: `note-${Date.now()}`,
    text,
    ...pendingSelection
  };
  activeNotes.push(note);
  saveNotes(activeProjectId, activeNotes);
  clearNoteBubble();
  renderProject(currentProjectCache);
});

loadProjects()
  .then(() => {
    startPolling();
  })
  .catch(err => {
    console.error(err);
    els.previewStatus.textContent = 'Unable to load projects';
  });
