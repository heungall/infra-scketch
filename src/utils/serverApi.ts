const API_BASE = '/api';

export interface DiagramMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
}

export interface DiagramResponse {
  meta: DiagramMeta;
  diagram: unknown;
}

/** 다이어그램 목록 조회 */
export async function fetchDiagrams(): Promise<DiagramMeta[]> {
  const res = await fetch(`${API_BASE}/diagrams`);
  if (!res.ok) throw new Error('목록 조회 실패');
  return res.json();
}

/** 새 다이어그램 저장 */
export async function createDiagram(name: string, diagram: unknown): Promise<DiagramMeta> {
  const res = await fetch(`${API_BASE}/diagrams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, diagram }),
  });
  if (!res.ok) throw new Error('저장 실패');
  return res.json();
}

/** 다이어그램 불러오기 */
export async function loadDiagram(id: string): Promise<DiagramResponse> {
  const res = await fetch(`${API_BASE}/diagrams/${id}`);
  if (!res.ok) throw new Error('불러오기 실패');
  return res.json();
}

/** 다이어그램 덮어쓰기 */
export async function updateDiagram(id: string, name: string, diagram: unknown): Promise<DiagramMeta> {
  const res = await fetch(`${API_BASE}/diagrams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, diagram }),
  });
  if (!res.ok) throw new Error('저장 실패');
  return res.json();
}

/** 다이어그램 삭제 */
export async function deleteDiagram(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/diagrams/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('삭제 실패');
}
