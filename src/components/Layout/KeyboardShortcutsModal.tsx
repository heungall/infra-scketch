import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  action: string;
}

interface ShortcutSection {
  title: string;
  rows: ShortcutRow[];
}

const SECTIONS: ShortcutSection[] = [
  {
    title: '일반',
    rows: [
      { keys: ['Ctrl', 'Z'],           action: '실행 취소' },
      { keys: ['Ctrl', 'Shift', 'Z'],  action: '다시 실행' },
      { keys: ['Delete', '/','Backspace'], action: '선택 항목 삭제' },
      { keys: ['Ctrl', 'F'],           action: '검색' },
      { keys: ['?'],                   action: '단축키 도움말' },
    ],
  },
  {
    title: '캔버스',
    rows: [
      { keys: ['마우스 휠'],           action: '확대/축소' },
      { keys: ['드래그 (빈 영역)'],    action: '캔버스 이동' },
      { keys: ['Shift', '드래그'],     action: '다중 선택' },
      { keys: ['Ctrl', '클릭'],        action: '선택 추가/제거' },
    ],
  },
  {
    title: '노드',
    rows: [
      { keys: ['더블클릭'], action: '속성 편집 (컨테이너 라벨 편집)' },
      { keys: ['드래그'],   action: '노드 이동' },
    ],
  },
];

function KeyBadge({ label }: { label: string }) {
  // "/" is rendered as a plain separator, not a key badge
  if (label === '/') {
    return <span className="text-gray-400 text-xs mx-0.5">/</span>;
  }
  return (
    <kbd className="kbd">
      {label}
    </kbd>
  );
}

function ShortcutRow({ row }: { row: ShortcutRow }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-1.5 pr-4 align-middle">
        <div className="flex items-center gap-1 flex-wrap">
          {row.keys.map((key, i) => {
            // Insert "+" between actual keys (not "/" separators)
            const isPlus = i > 0 && key !== '/' && row.keys[i - 1] !== '/';
            return (
              <span key={i} className="flex items-center gap-1">
                {isPlus && <span className="text-gray-400 text-xs">+</span>}
                <KeyBadge label={key} />
              </span>
            );
          })}
        </div>
      </td>
      <td className="py-1.5 text-sm text-gray-600 align-middle">{row.action}</td>
    </tr>
  );
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="키보드 단축키"
    >
      {/* Dark overlay — click to close */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">키보드 단축키</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded p-0.5 hover:bg-gray-100"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto panel-scroll">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <table className="w-full">
                <tbody>
                  {section.rows.map((row, i) => (
                    <ShortcutRow key={i} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-center">
          <span className="text-xs text-gray-400">
            <kbd className="kbd">?</kbd> 키를 눌러 언제든지 이 창을 열 수 있습니다
          </span>
        </div>
      </div>
    </div>
  );
}
