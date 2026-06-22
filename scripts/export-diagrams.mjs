// server/data 의 각 다이어그램을 dist/index.html 에 임베드하여
// 독립 실행 가능한 HTML 파일로 내보낸다.
// 사용: node scripts/export-diagrams.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST_HTML = path.join(ROOT, 'dist', 'index.html');
const DATA_DIR = path.join(ROOT, 'server', 'data');
const OUT_DIR = path.join(ROOT, 'exported');

const template = fs.readFileSync(DIST_HTML, 'utf-8');
if (!template.includes('</body>')) throw new Error('dist/index.html 에 </body> 가 없습니다. 먼저 npm run build 하세요.');

fs.mkdirSync(OUT_DIR, { recursive: true });

function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled';
}

const dirs = fs.readdirSync(DATA_DIR, { withFileTypes: true }).filter((e) => e.isDirectory());
const results = [];

for (const dir of dirs) {
  const base = path.join(DATA_DIR, dir.name);
  let meta, diagram;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(base, 'meta.json'), 'utf-8'));
    diagram = JSON.parse(fs.readFileSync(path.join(base, 'diagram.json'), 'utf-8'));
  } catch {
    continue; // 손상된 항목 건너뛰기
  }

  // 보드 이름이 비어있으면 meta 의 이름을 채워 넣는다 (열었을 때 제목 표시용)
  if (!diagram.name) diagram.name = meta.name;

  // JSON 을 <script> 안에 안전하게 임베드 (태그 깨짐 방지)
  const jsonStr = JSON.stringify(diagram).replace(/</g, '\\u003c');
  const dataScript = `<script id="infra-sketch-data" type="application/json">${jsonStr}</script>`;
  const out = template.replace('</body>', `${dataScript}</body>`);

  const fileName = sanitize(meta.name) + '.html';
  fs.writeFileSync(path.join(OUT_DIR, fileName), out, 'utf-8');
  results.push({ name: meta.name, file: fileName, nodes: meta.nodeCount, edges: meta.edgeCount });
}

console.log(JSON.stringify(results, null, 2));
console.log(`\n${results.length}개 파일을 ${OUT_DIR} 에 생성했습니다.`);
