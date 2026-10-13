const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

class LocalServer {
  constructor(port = 3000) {
    this.port = port;
    this.server = null;
    this.webDir = path.join(__dirname, '..', '..', 'web');
    this.localIp = this.detectLocalIp();
  }

  detectLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Lấy IPv4 không phải loopback (127.0.0.1)
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  start() {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      const filePath = path.join(this.webDir, reqPath);
      const ext = path.extname(filePath).toLowerCase();

      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.webmanifest': 'application/manifest+json',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found - Sticky Notes Mobile Companion');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`500 Server Error: ${err.code}`);
          }
        } else {
          // Cho phép PWA cache và CORS linh hoạt
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });
          res.end(content, 'utf-8');
        }
      });
    });

    this.server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[LocalServer] Cổng ${this.port} đã bị chiếm, đổi sang ${this.port + 1}`);
        this.port += 1;
        this.server.listen(this.port);
      } else {
        console.error('[LocalServer] Lỗi server:', e);
      }
    });

    this.server.listen(this.port, () => {
      console.log(`[LocalServer] Mobile PWA Server đang chạy tại http://${this.localIp}:${this.port}`);
    });
  }

  getUrl() {
    return `http://${this.localIp}:${this.port}`;
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = LocalServer;
