import { useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Toolbar from './components/Layout/Toolbar';
import NodePalette from './components/Nodes/NodePalette';
import Canvas from './components/Canvas/Canvas';
import PropertyPanel from './components/Panels/PropertyPanel';
import ServerListPanel from './components/Panels/ServerListPanel';
import { loadEmbeddedDiagram, loadAutoSave, autoSave } from './utils/saveLoad';

type RightTab = 'property' | 'serverList';

const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export default function App() {
  const initialized = useRef(false);
  const [rightTab, setRightTab] = useState<RightTab>('property');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Priority 1: embedded diagram data (saved HTML file reopened)
    const loadedEmbedded = loadEmbeddedDiagram();

    // Priority 2: localStorage auto-save
    if (!loadedEmbedded) {
      loadAutoSave();
    }
  }, []);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(autoSave, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      autoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-gray-100">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <div className="flex-1 relative">
            <Canvas />
          </div>
          {/* 우측 패널 (탭 전환) */}
          <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
            {/* 탭 바 */}
            <div className="flex border-b border-gray-200 shrink-0">
              <button
                onClick={() => setRightTab('property')}
                className={`
                  flex-1 py-2 text-sm font-medium transition-colors
                  ${rightTab === 'property'
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                속성
              </button>
              <button
                onClick={() => setRightTab('serverList')}
                className={`
                  flex-1 py-2 text-sm font-medium transition-colors
                  ${rightTab === 'serverList'
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                서버 목록
              </button>
            </div>

            {/* 패널 본문 */}
            <div className="flex-1 overflow-y-auto panel-scroll">
              {rightTab === 'property' ? (
                <div className="p-3">
                  <PropertyPanel />
                </div>
              ) : (
                <ServerListPanel />
              )}
            </div>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
