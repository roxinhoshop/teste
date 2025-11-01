// Servidor estático simples para preview local
// Usa apenas módulos nativos do Node (http, fs, path)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PREVIEW_PORT ? Number(process.env.PREVIEW_PORT) : 3011;
const HOST = 'localhost';
// Raiz do projeto (ajustar conforme necessário)
const ROOT = path.resolve(__dirname, '..');
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = Number(process.env.API_PORT || 3000);
// Aliases para slugs antigos que foram renomeados
const ALIASES = {
  '/paginaproduto': '/pagina-produto.html',
  '/redefinirsenha': '/redefinir-senha.html',
  '/cabecalhorodape': '/cabecalho-rodape.html'
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function serveFile(filePath, res) {
  fs.stat(filePath, (err, stat) => {
    if (err) {
      // Fallback para página 404 personalizada
      try {
        const notFoundPath = path.join(ROOT, '404.html');
        if (fs.existsSync(notFoundPath)) {
          const contentType = mimeTypes['.html'];
          fs.readFile(notFoundPath, (nfErr, nfData) => {
            if (nfErr) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              return res.end('Arquivo não encontrado');
            }
            res.writeHead(404, { 'Content-Type': contentType });
            return res.end(nfData);
          });
          return;
        }
      } catch (_) {}
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      return serveFile(indexPath, res);
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno ao ler arquivo');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  try {
    const origUrl = req.url;
    const urlPath = decodeURIComponent(origUrl.split('?')[0]);
    const safePath = urlPath.replace(/\\/g, '/');

    // Proxy para API
    if (safePath.startsWith('/api')) {
      // Sanitiza headers para evitar 304 e garantir resposta com corpo
      const headers = { ...req.headers };
      try {
        delete headers['if-none-match'];
        delete headers['if-modified-since'];
        headers['cache-control'] = 'no-store';
        headers['pragma'] = 'no-cache';
      } catch (_) {}
      const options = {
        hostname: API_HOST,
        port: API_PORT,
        path: req.url,
        method: req.method,
        headers
      };
      const proxyReq = http.request(options, (proxyRes) => {
        // Força cabeçalhos de não-cache na resposta
        const respHeaders = { ...proxyRes.headers, 'cache-control': 'no-store', 'pragma': 'no-cache' };
        res.writeHead(proxyRes.statusCode || 500, respHeaders);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'bad_gateway', message: String(err && err.message || err) }));
      });
      req.pipe(proxyReq);
      return;
    }
    // Redireciona permanentemente páginas *.html para URLs limpas
    if (/\.html$/i.test(safePath)) {
      const clean = safePath.replace(/\.html$/i, '');
      const qs = origUrl.includes('?') ? origUrl.slice(origUrl.indexOf('?')) : '';
      res.writeHead(301, { Location: clean + qs });
      res.end();
      return;
    }

    // Resolver página sem extensão para arquivo .html correspondente
    let rewritten = safePath === '/' ? '/index.html' : safePath;
    // Mapeia slugs antigos diretamente para o novo arquivo
    if (ALIASES[rewritten]) {
      rewritten = ALIASES[rewritten];
    }
    const candidate = path.join(ROOT, (rewritten.replace(/^\/+/, '')) + '.html');
    if (path.extname(rewritten) === '' && fs.existsSync(candidate)) {
      rewritten = '/' + path.basename(candidate);
    }
    const filePath = path.join(ROOT, rewritten);
    serveFile(filePath, res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro interno no servidor de preview');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Preview estático rodando em http://${HOST}:${PORT}/`);
});
