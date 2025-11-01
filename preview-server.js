const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5534;
const API_BASE = process.env.API_BASE || 'http://localhost:3011';
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/octet-stream'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function safeJoin(base, target) {
  const p = path.posix.normalize('/' + target).replace(/^\/+/, '');
  return path.join(base, p);
}

function proxyApi(req, res) {
  try {
    const targetUrl = new URL(req.url, API_BASE);
    if (!targetUrl.pathname.startsWith('/api/')) {
      return false; // not an API request
    }
    const client = targetUrl.protocol === 'https:' ? https : http;
    const options = {
      method: req.method,
      headers: req.headers,
    };
    const proxied = client.request(targetUrl, options, (pr) => {
      const headers = { ...pr.headers };
      res.writeHead(pr.statusCode || 502, headers);
      pr.pipe(res);
    });
    proxied.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Bad Gateway', detail: String(err && err.message || err) }));
    });
    req.pipe(proxied);
    return true;
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Proxy Error', detail: String(e && e.message || e) }));
    return true;
  }
}

const server = http.createServer((req, res) => {
  try {
    // API proxy
    if (req.url.startsWith('/api/')) {
      const handled = proxyApi(req, res);
      if (handled) return;
    }

    const urlPath = decodeURIComponent(req.url.split('?')[0] || '/');
    let filePath = urlPath;
    if (filePath === '/' || filePath === '/index') filePath = '/index.html';

    const abs = safeJoin(ROOT, filePath);
    fs.stat(abs, (err, stat) => {
      if (err) {
        // Se não existe e a URL não tem extensão, tentar arquivo .html correspondente
        const ext = path.extname(abs);
        if (!ext) {
          const htmlAbs = abs + '.html';
          fs.access(htmlAbs, fs.constants.F_OK, (aErr) => {
            if (!aErr) {
              fs.readFile(htmlAbs, (rErr, rData) => {
                if (rErr) {
                  send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, '500 Internal Server Error');
                  return;
                }
                send(res, 200, { 'Content-Type': MIME['.html'] || 'text/html; charset=utf-8' }, rData);
              });
              return;
            }
            // Fallback para 404.html se existir
            const notFound = safeJoin(ROOT, '/404.html');
            if (notFound) {
              fs.access(notFound, fs.constants.F_OK, (nfErr) => {
                if (!nfErr) {
                  fs.readFile(notFound, (nfReadErr, nfData) => {
                    if (nfReadErr) {
                      send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, '500 Internal Server Error');
                      return;
                    }
                    send(res, 404, { 'Content-Type': MIME['.html'] || 'text/html; charset=utf-8' }, nfData);
                  });
                  return;
                }
                send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 Not Found');
              });
              return;
            }
            send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 Not Found');
          });
          return;
        }
        send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 Not Found');
        return;
      }
      if (stat.isDirectory()) {
        const fallback = path.join(abs, 'index.html');
        fs.readFile(fallback, (e2, data2) => {
          if (e2) {
            send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, '403 Forbidden');
            return;
          }
          send(res, 200, { 'Content-Type': MIME['.html'] || 'text/html; charset=utf-8' }, data2);
        });
        return;
      }
      const ext = path.extname(abs).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      fs.readFile(abs, (e, data) => {
        if (e) {
          send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, '500 Internal Server Error');
          return;
        }
        send(res, 200, { 'Content-Type': type }, data);
      });
    });
  } catch (e) {
    send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, '500 Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Static preview server running at http://localhost:${PORT}/`);
});
