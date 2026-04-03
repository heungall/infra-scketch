// ============================================================
// CSV 가져오기 모달 (F-85 ~ F-91)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { parseCsvFile, importCsvRows, type ParsedCsvRow } from '../../utils/csvUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = 'append' | 'replace';

// ---------------------------------------------------------------------------
// 유효성 상태 아이콘
// ---------------------------------------------------------------------------
function StatusIcon({ isValid }: { isValid: boolean }) {
  return (
    <span className={`text-sm font-bold ${isValid ? 'text-green-500' : 'text-red-500'}`}>
      {isValid ? '✓' : '✗'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 파일 업로드 드롭 영역
// ---------------------------------------------------------------------------
function DropZone({
  onFile,
  isDragging,
  setIsDragging,
}: {
  onFile: (file: File) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      onFile(file);
    } else if (file) {
      alert('CSV 파일(.csv)을 업로드해 주세요.');
    }
  }, [onFile, setIsDragging]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = '';
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="text-3xl mb-2">📂</div>
      <p className="text-sm text-gray-600">
        CSV 파일을 드래그&드롭하거나 클릭하여 업로드
      </p>
      <p className="text-xs text-gray-400 mt-1">.csv 파일만 지원합니다</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 미리보기 테이블
// ---------------------------------------------------------------------------
function PreviewTable({ rows }: { rows: ParsedCsvRow[] }) {
  const validCount = rows.filter(r => r.isValid).length;
  const errorCount = rows.length - validCount;

  return (
    <div>
      {/* 요약 */}
      <div className="flex items-center gap-3 mb-3 text-sm">
        <span className="text-green-600 font-medium">정상 {validCount}건</span>
        {errorCount > 0 && (
          <span className="text-red-600 font-medium">오류 {errorCount}건</span>
        )}
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium w-8">#</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">상태</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">서버명</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">호스트명</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">IP</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">유형</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">OS</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">환경</th>
                <th className="px-2 py-1.5 border-b border-gray-200 text-left text-gray-600 font-medium">존</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.rowNumber}
                  className={row.isValid ? 'bg-white' : 'bg-red-50'}
                  title={row.errors.join('\n')}
                >
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-400">{row.rowNumber}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-center">
                    <StatusIcon isValid={row.isValid} />
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 font-medium text-gray-800 max-w-[120px] truncate">
                    {row.data.label || <span className="text-red-400">(없음)</span>}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600 max-w-[120px] truncate">
                    {row.data.hostname || <span className="text-red-400">(없음)</span>}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 font-mono text-gray-600 max-w-[100px] truncate">
                    {row.data.ip}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600">{row.data.type}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600 max-w-[80px] truncate">{row.data.os}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600">{row.data.env}</td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600 max-w-[80px] truncate">{row.data.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 오류 상세 */}
      {rows.filter(r => !r.isValid).length > 0 && (
        <div className="mt-2 space-y-1">
          {rows.filter(r => !r.isValid).map(row => (
            <div key={row.rowNumber} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
              <span className="font-medium">{row.rowNumber}행:</span>{' '}
              {row.errors.join(' / ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 메인 모달
// ---------------------------------------------------------------------------

export default function CsvImportModal({ isOpen, onClose }: Props) {
  const { fitView } = useReactFlow();

  const [isDragging, setIsDragging]   = useState(false);
  const [parsedRows, setParsedRows]   = useState<ParsedCsvRow[] | null>(null);
  const [fileName, setFileName]       = useState('');
  const [importMode, setImportMode]   = useState<ImportMode>('append');
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');

  const handleReset = useCallback(() => {
    setParsedRows(null);
    setFileName('');
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError('');
    setFileName(file.name);
    try {
      const rows = await parseCsvFile(file);
      if (rows.length === 0) {
        setError('유효한 데이터 행이 없습니다. CSV 파일을 확인해 주세요.');
        setParsedRows(null);
      } else {
        setParsedRows(rows);
      }
    } catch (err) {
      setError('파일 파싱에 실패했습니다. CSV 형식을 확인해 주세요.');
      setParsedRows(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!parsedRows) return;
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('가져올 수 있는 정상 데이터가 없습니다.');
      return;
    }

    importCsvRows(parsedRows, { mode: importMode });

    // fitView 호출
    setTimeout(() => {
      fitView({ duration: 500, padding: 0.2 });
    }, 100);

    handleClose();
  }, [parsedRows, importMode, fitView, handleClose]);

  if (!isOpen) return null;

  const validCount = parsedRows ? parsedRows.filter(r => r.isValid).length : 0;

  return (
    // 배경 오버레이
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">CSV 서버 목록 가져오기</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            title="닫기"
          >
            ×
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 파일 미선택 상태: 드롭 존 */}
          {!parsedRows && !isLoading && (
            <>
              <DropZone
                onFile={handleFile}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
                  {error}
                </div>
              )}
            </>
          )}

          {/* 로딩 중 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <span className="text-gray-500 text-sm">파일 파싱 중...</span>
            </div>
          )}

          {/* 미리보기 */}
          {parsedRows && !isLoading && (
            <>
              {/* 파일명 + 다시 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium truncate">{fileName}</span>
                <button
                  onClick={handleReset}
                  className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
                >
                  다시 선택
                </button>
              </div>

              {/* 미리보기 테이블 */}
              <PreviewTable rows={parsedRows} />

              {/* 가져오기 모드 */}
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-600 mb-2">가져오기 방식</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-500"
                    />
                    <span className="text-sm text-gray-700">신규 추가 (기존 노드 유지)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-500"
                    />
                    <span className="text-sm text-gray-700">전체 교체 (기존 노드 삭제)</span>
                  </label>
                </div>
                {importMode === 'replace' && (
                  <p className="text-xs text-red-500 mt-1">
                    주의: 기존의 모든 노드와 연결선이 삭제됩니다.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          {parsedRows && (
            <button
              onClick={handleImport}
              disabled={validCount === 0}
              className="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              가져오기 ({validCount}건)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
