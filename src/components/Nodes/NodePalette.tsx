import { NODE_TYPE_CONFIGS, type NodeTypeConfig } from '../../types';

export default function NodePalette() {
  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    config: NodeTypeConfig
  ) => {
    event.dataTransfer.setData('application/infra-node-type', config.variant);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-48 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          노드 팔레트
        </h2>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {NODE_TYPE_CONFIGS.map((config) => (
          <div
            key={config.variant}
            draggable
            onDragStart={(e) => handleDragStart(e, config)}
            className="flex items-center gap-2 px-2 py-2 rounded-md cursor-grab
                       hover:bg-gray-50 active:bg-gray-100 active:cursor-grabbing
                       border border-transparent hover:border-gray-200
                       transition-colors duration-100 select-none"
            title={`${config.label} — 드래그하여 캔버스에 추가`}
          >
            {/* Color swatch */}
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded text-sm shrink-0"
              style={{ background: config.defaultColor, border: `1.5px solid ${config.defaultBorderColor}` }}
            >
              {config.icon}
            </span>
            <span className="text-xs font-medium text-gray-700 truncate">
              {config.label}
            </span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="px-3 py-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 leading-tight text-center">
          드래그하여 캔버스에 추가
        </p>
      </div>
    </div>
  );
}
