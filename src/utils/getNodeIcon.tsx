import { NODE_TYPE_CONFIGS, CUSTOM_ICONS, type NodeVariant } from '../types';

export function getNodeIcon(variant: NodeVariant, className?: string): React.ReactNode {
  const customUrl = CUSTOM_ICONS[variant];
  if (customUrl) {
    return <img src={customUrl} alt={variant} className={className ?? 'w-4 h-4 inline-block'} />;
  }
  const config = NODE_TYPE_CONFIGS.find(c => c.variant === variant);
  return <span className={className}>{config?.icon ?? '📦'}</span>;
}
