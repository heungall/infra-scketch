import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  fetchDiagrams,
  createDiagram,
  loadDiagram,
  updateDiagram,
  deleteDiagram,
  type DiagramMeta,
} from '../../utils/serverApi';
import type { DiagramData } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServerSaveModal({ isOpen, onClose }: Props) {
  const [list, setList] = useState<DiagramMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveName, setSaveName] = useState('');
  const [tab, setTab] = useState<'save' | 'load'>('save');

  const exportDiagram = useStore((s) => s.exportDiagram);
  const importDiagram = useStore((s) => s.importDiagram);
  const diagramName = useStore((s) => s.diagramName);

  // Fetch list on open
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await fetchDiagrams();
      setList(items);
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setSaveName(diagramName || '');
    }
  }, [isOpen, refresh, diagramName]);

  // ─── Save as new ──────────────────────────────────────────────────────────
  const handleSaveNew = useCallback(async () => {
    if (!saveName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const diagram = exportDiagram();
      await createDiagram(saveName.trim(), diagram);
      await refresh();
      setSaveName('');
      setTab('load');
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [saveName, exportDiagram, refresh]);

  // ─── Overwrite existing ───────────────────────────────────────────────────
  const handleOverwrite = useCallback(async (meta: DiagramMeta) => {
    if (!window.confirm(`"${meta.name}"에 현재 구조도를 덮어쓰시겠습니까?`)) return;
    setLoading(true);
    setError('');
    try {
      const diagram = exportDiagram();
      await updateDiagram(meta.id, meta.name, diagram);
      await refresh();
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [exportDiagram, refresh]);

  // ─── Load ─────────────────────────────────────────────────────────────────
  const handleLoad = useCallback(async (meta: DiagramMeta) => {
    setLoading(true);
    setError('');
    try {
      const { diagram } = await loadDiagram(meta.id);
      importDiagram(diagram as DiagramData);
      onClose();
    } catch {
      setError('불러오기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [importDiagram, onClose]);

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (meta: DiagramMeta) => {
    if (!window.confirm(`"${meta.name}"을(를) 삭제하시겠습니까?`)) return;
    setLoading(true);
    try {
      await deleteDiagram(meta.id);
      await refresh();
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center border-b px-4 py-3">
          <h2 className="font-bold text-gray-800">서버 저장/불러오기</h2>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('save')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'save' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💾 저장
          </button>
          <button
            onClick={() => setTab('load')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'load' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📂 불러오기
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          {tab === 'save' && (
            <div>
              {/* New save */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">새 이름으로 저장</label>
                <div className="flex gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                    placeholder="구조도 이름 입력..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-400"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveNew}
                    disabled={loading || !saveName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    저장
                  </button>
                </div>
              </div>

              {/* Overwrite existing */}
              {list.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기존 파일에 덮어쓰기</label>
                  <div className="border rounded divide-y max-h-[300px] overflow-y-auto">
                    {list.map((item) => (
                      <div key={item.id} className="flex items-center px-3 py-2 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(item.updatedAt).toLocaleString('ko-KR')} · 노드 {item.nodeCount} · 엣지 {item.edgeCount}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOverwrite(item)}
                          disabled={loading}
                          className="ml-2 px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-40"
                        >
                          덮어쓰기
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'load' && (
            <div>
              {loading && <div className="text-sm text-gray-500 text-center py-8">로딩 중...</div>}
              {!loading && list.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-8">저장된 구조도가 없습니다.</div>
              )}
              {!loading && list.length > 0 && (
                <div className="border rounded divide-y max-h-[400px] overflow-y-auto">
                  {list.map((item) => (
                    <div key={item.id} className="flex items-center px-3 py-2 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(item.updatedAt).toLocaleString('ko-KR')} · 노드 {item.nodeCount} · 엣지 {item.edgeCount}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoad(item)}
                        disabled={loading}
                        className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                      >
                        불러오기
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={loading}
                        className="ml-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded disabled:opacity-40"
                        title="삭제"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
