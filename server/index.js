import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const PORT = 3100;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure data directory exists
await fs.mkdir(DATA_DIR, { recursive: true });

// ─── Helper ──────────────────────────────────────────────────────────────────
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9가-힣_\-. ]/g, '').trim() || 'untitled';
}

async function readMeta(id) {
  const metaPath = path.join(DATA_DIR, id, 'meta.json');
  const raw = await fs.readFile(metaPath, 'utf-8');
  return JSON.parse(raw);
}

// ─── GET /api/diagrams — 목록 조회 ───────────────────────────────────────────
app.get('/api/diagrams', async (_req, res) => {
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    const list = [];
    for (const dir of dirs) {
      try {
        const meta = await readMeta(dir.name);
        list.push(meta);
      } catch {
        // skip corrupted entries
      }
    }

    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/diagrams — 새 다이어그램 저장 ─────────────────────────────────
app.post('/api/diagrams', async (req, res) => {
  try {
    const { name, diagram } = req.body;
    if (!diagram) return res.status(400).json({ error: 'diagram is required' });

    const id = `dia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dirPath = path.join(DATA_DIR, id);
    await fs.mkdir(dirPath, { recursive: true });

    const now = new Date().toISOString();
    const meta = {
      id,
      name: sanitizeFilename(name || 'Untitled'),
      createdAt: now,
      updatedAt: now,
      nodeCount: diagram.nodes?.length ?? 0,
      edgeCount: diagram.edges?.length ?? 0,
    };

    await Promise.all([
      fs.writeFile(path.join(dirPath, 'meta.json'), JSON.stringify(meta, null, 2)),
      fs.writeFile(path.join(dirPath, 'diagram.json'), JSON.stringify(diagram, null, 2)),
    ]);

    res.status(201).json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/diagrams/:id — 다이어그램 불러오기 ─────────────────────────────
app.get('/api/diagrams/:id', async (req, res) => {
  try {
    const dirPath = path.join(DATA_DIR, req.params.id);
    const [metaRaw, diagramRaw] = await Promise.all([
      fs.readFile(path.join(dirPath, 'meta.json'), 'utf-8'),
      fs.readFile(path.join(dirPath, 'diagram.json'), 'utf-8'),
    ]);
    res.json({ meta: JSON.parse(metaRaw), diagram: JSON.parse(diagramRaw) });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/diagrams/:id — 다이어그램 덮어쓰기 ────────────────────────────
app.put('/api/diagrams/:id', async (req, res) => {
  try {
    const dirPath = path.join(DATA_DIR, req.params.id);
    const { name, diagram } = req.body;
    if (!diagram) return res.status(400).json({ error: 'diagram is required' });

    // Read existing meta
    let meta;
    try {
      meta = await readMeta(req.params.id);
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }

    meta.updatedAt = new Date().toISOString();
    if (name !== undefined) meta.name = sanitizeFilename(name);
    meta.nodeCount = diagram.nodes?.length ?? 0;
    meta.edgeCount = diagram.edges?.length ?? 0;

    await Promise.all([
      fs.writeFile(path.join(dirPath, 'meta.json'), JSON.stringify(meta, null, 2)),
      fs.writeFile(path.join(dirPath, 'diagram.json'), JSON.stringify(diagram, null, 2)),
    ]);

    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/diagrams/:id — 다이어그램 삭제 ──────────────────────────────
app.delete('/api/diagrams/:id', async (req, res) => {
  try {
    const dirPath = path.join(DATA_DIR, req.params.id);
    await fs.rm(dirPath, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Infra-sketch API server running on http://localhost:${PORT}`);
});
