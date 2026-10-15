const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json', '.ico': 'image/x-icon' };
const server = http.createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch (_) { response.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const stat = fs.statSync(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size });
    fs.createReadStream(file).pipe(response);
  } catch (_) {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(root, '404.html')).pipe(response);
  }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.GINKA_BROWSER_CHANNEL ? { channel: process.env.GINKA_BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const load = name => vm.runInNewContext('(' + fs.readFileSync(path.join(__dirname, name), 'utf8') + ')', { URL, Date });
    const performanceReport = await load('browser-audit.js')(page);
    const regressions = await load('browser-regressions.js')(page);
    fs.mkdirSync(path.join(root, '.artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, '.artifacts/browser-report.json'), JSON.stringify({ performance: performanceReport, regressions }, null, 2));
    for (const result of performanceReport.results) console.log(`${result.width}px: ${result.requests} requests, ${result.bytes} bytes; ${JSON.stringify(result.checks)}`);
    console.log(`${regressions.results.length} browser checks: ${regressions.passed ? 'passed' : 'failed'}`);
    if (!performanceReport.passed || !regressions.passed) process.exitCode = 1;
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})();
