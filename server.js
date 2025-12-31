const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PREVIEW_PORT = process.env.PREVIEW_PORT || 8900;
const HOST = '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json');
const PROJECTS_PATH = path.join(DATA_DIR, 'projects.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json'
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getProfile() {
  return loadJson(PROFILE_PATH, {
    userName: 'Guest',
    recentProjects: [],
    plugins: {
      breakdownHelper: true,
      revisionTracker: true,
      referenceLinks: false
    }
  });
}

function saveProfile(profile) {
  saveJson(PROFILE_PATH, profile);
}

function getProjects() {
  return loadJson(PROJECTS_PATH, []);
}

function saveProjects(projects) {
  saveJson(PROJECTS_PATH, projects);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

function handleStatic(req, res, pathname, defaultFile = 'index.html') {
  const filePath = path.join(PUBLIC_DIR, pathname === '/' ? defaultFile : pathname.slice(1));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }
  return false;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function upsertRecentProject(profile, projectId) {
  const filtered = profile.recentProjects.filter(id => id !== projectId);
  filtered.unshift(projectId);
  profile.recentProjects = filtered.slice(0, 3);
  return profile;
}

function createRequestHandler(defaultFile) {
  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = url;

    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/profile') {
        if (req.method === 'GET') {
          return sendJson(res, 200, getProfile());
        }
        if (req.method === 'PUT' || req.method === 'POST') {
          try {
            const body = await parseBody(req);
            const profile = { ...getProfile(), ...body };
            saveProfile(profile);
            return sendJson(res, 200, profile);
          } catch (err) {
            return sendJson(res, 400, { error: 'Invalid profile data' });
          }
        }
        return notFound(res);
      }

      if (pathname === '/api/projects') {
        if (req.method === 'GET') {
          return sendJson(res, 200, getProjects());
        }
        if (req.method === 'POST') {
          try {
            const body = await parseBody(req);
            const name = body.name?.trim() || 'Untitled Project';
            const projects = getProjects();
            const now = new Date().toISOString();
            const project = {
              id: `proj-${Date.now()}`,
              name,
              goalTime: 0,
              timeUnit: 'seconds',
              draftVersions: [],
              noteLibrary: [],
              pages: [
                {
                  id: `page-${Date.now()}`,
                  title: 'Page 1',
                  type: 'Shot',
                  synopsis: 'Establishing page',
                  time: 0,
                  directorNotes: [],
                  blocks: [
                    { id: `blk-${Date.now()}-scene`, type: 'scene', text: 'INT. LOCATION - DAY' },
                    { id: `blk-${Date.now()}-action`, type: 'action', text: '' }
                  ]
                }
              ],
              updatedAt: now
            };
            projects.push(project);
            saveProjects(projects);
            const profile = upsertRecentProject(getProfile(), project.id);
            saveProfile(profile);
            return sendJson(res, 201, project);
          } catch (err) {
            return sendJson(res, 400, { error: 'Invalid project data' });
          }
        }
        return notFound(res);
      }

      const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (projectMatch) {
        const projectId = projectMatch[1];
        if (req.method === 'GET') {
          const project = getProjects().find(p => p.id === projectId);
          if (!project) return notFound(res);
          const profile = upsertRecentProject(getProfile(), projectId);
          saveProfile(profile);
          return sendJson(res, 200, project);
        }
        if (req.method === 'PUT') {
          try {
            const body = await parseBody(req);
            const projects = getProjects();
            const index = projects.findIndex(p => p.id === projectId);
            if (index === -1) return notFound(res);
            projects[index] = { ...projects[index], ...body, updatedAt: new Date().toISOString() };
            saveProjects(projects);
            return sendJson(res, 200, projects[index]);
          } catch (err) {
            return sendJson(res, 400, { error: 'Invalid project update' });
          }
        }
        return notFound(res);
      }

      const recentMatch = pathname.match(/^\/api\/projects\/([^/]+)\/recent$/);
      if (recentMatch && req.method === 'POST') {
        const projectId = recentMatch[1];
        const profile = upsertRecentProject(getProfile(), projectId);
        saveProfile(profile);
        return sendJson(res, 200, profile);
      }

      return notFound(res);
    }

    // static files
    const served = handleStatic(req, res, pathname, defaultFile);
    if (!served) {
      notFound(res);
    }
  };
}

const appServer = http.createServer(createRequestHandler('index.html'));
const previewServer = http.createServer(createRequestHandler('preview.html'));

appServer.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

previewServer.listen(PREVIEW_PORT, HOST, () => {
  console.log(`Preview running at http://${HOST}:${PREVIEW_PORT}`);
});
