import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const proofRoot = path.dirname(fileURLToPath(import.meta.url));
const threeRoot = path.resolve(proofRoot, '../../../.research/chasi/node_modules/three');
const port = process.argv[2] === undefined ? 4320 : Number(process.argv[2]);
const host = '127.0.0.1';
const vendorPrefix = '/vendor/three/';

if (!Number.isInteger(port) || port < 1 || port > 65535 || process.argv.length > 3) {
  console.error('Usage: node docs/design/review-v2/serve.mjs [port: 1..65535]');
  process.exit(1);
}

let roots;
try {
  roots = { proof: await realpath(proofRoot), three: await realpath(threeRoot) };
  await stat(path.join(roots.three, 'build/three.module.js'));
} catch {
  console.error('Three.js is missing. From the repository root run: npm --prefix .research/chasi ci --no-audit --no-fund');
  console.error('The source checkout .research/chasi must exist; see docs/design/review-v2/README.md.');
  process.exit(1);
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function contained(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function failure(status, message) {
  return Object.assign(new Error(message), { status });
}

function replyError(response, request, status, message) {
  const body = `${message}\n`;
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(status === 405 ? { Allow: 'GET, HEAD' } : {}),
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    replyError(response, request, 405, 'Method not allowed');
    return;
  }
  try {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
    } catch {
      throw failure(400, 'Invalid URL');
    }
    // Reject Windows separators/ADS and encoded traversal before filesystem access.
    if (/[\\\0:]/.test(pathname) || pathname.split('/').some((segment) => segment === '..')) {
      throw failure(403, 'Forbidden path');
    }
    const isVendor = pathname.startsWith(vendorPrefix);
    const root = isVendor ? roots.three : roots.proof;
    const relative = isVendor ? pathname.slice(vendorPrefix.length) : pathname.replace(/^\/+/, '');
    let file = path.resolve(root, relative);
    if (!contained(root, file)) throw failure(403, 'Forbidden path');
    let info = await stat(file);
    if (info.isDirectory()) {
      file = path.join(file, 'index.html');
      info = await stat(file);
    }
    // Realpath containment also prevents a symlink/junction from escaping its root.
    file = await realpath(file);
    if (!contained(root, file)) throw failure(403, 'Forbidden path');
    if (!info.isFile()) throw failure(404, 'Not found');
    const body = request.method === 'HEAD' ? null : await readFile(file);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body ? body.length : info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch (error) {
    const status = error.status || (['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : error.code === 'EACCES' ? 403 : 500);
    replyError(response, request, status, status === 500 ? 'Internal server error' : error.status ? error.message : status === 404 ? 'Not found' : 'Forbidden path');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Keep the existing preview or pass a different port.`
    : `Preview server error: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`Design comparison: http://${host}:${port}/`);
  console.log('Loopback only. Ctrl+C to stop. Original project servers are independent.');
});
process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());
