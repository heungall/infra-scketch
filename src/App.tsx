import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Toolbar from './components/Layout/Toolbar';
import NodePalette from './components/Nodes/NodePalette';
import Canvas from './components/Canvas/Canvas';
import PropertyPanel from './components/Panels/PropertyPanel';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-gray-100">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <div className="flex-1 relative">
            <Canvas />
          </div>
          <PropertyPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
