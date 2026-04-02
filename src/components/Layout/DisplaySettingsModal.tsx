import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { DISPLAY_FIELD_OPTIONS, DEFAULT_DISPLAY_SETTINGS } from '../../types';

interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisplaySettingsModal({ isOpen, onClose }: DisplaySettingsModalProps) {
  const displaySettings = useStore((s) => s.displaySettings);
  const updateDisplaySettings = useStore((s) => s.updateDisplaySettings);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    updateDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-80 max-w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">노드 표시 설정</h2>
          <p className="text-xs text-gray-500 mt-0.5">노드 카드에 표시할 정보를 선택하세요</p>
        </div>

        {/* Field toggles */}
        <div className="px-6 py-3 flex flex-col gap-1">
          {DISPLAY_FIELD_OPTIONS.map((field) => {
            const current = displaySettings[field.key];
            return (
              <label
                key={field.key}
                className="flex items-center justify-between py-2 cursor-pointer select-none group"
              >
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {field.label}
                </span>
                {/* Toggle switch */}
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={current}
                    onChange={() => updateDisplaySettings({ [field.key]: !current })}
                  />
                  <div
                    className={`
                      w-10 h-5 rounded-full transition-colors duration-200
                      ${current ? 'bg-blue-500' : 'bg-gray-300'}
                      peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-1
                    `}
                  />
                  <div
                    className={`
                      absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm
                      transition-transform duration-200
                      ${current ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-800 transition-colors underline underline-offset-2"
          >
            기본값으로 초기화
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
