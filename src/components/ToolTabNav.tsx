'use client';

import { cn } from '@/lib/utils';

export type ToolTab = 'plan' | 'account' | 'drive';

const items: { value: ToolTab; label: string; delay: number }[] = [
  { value: 'plan', label: '旅行规划', delay: 0 },
  { value: 'account', label: '旅行记账', delay: 60 },
  { value: 'drive', label: '旅行驾驶', delay: 120 },
];

interface ToolTabNavProps {
  value: ToolTab;
  onChange: (value: ToolTab) => void;
}

/** 旅行工具内的二级导航：规划 / 记账 / 驾驶，仅文字 + 毛玻璃背景，与三级导航样式保持一致 */
export function ToolTabNav({ value, onChange }: ToolTabNavProps) {
  return (
    <div role="tablist" aria-label="旅行工具" className="grid w-full grid-cols-3 gap-1 h-[48px] sm:h-[44px] bg-black/60 backdrop-blur-md rounded-none p-0">
      {items.map(({ value: itemValue, label, delay }) => (
        <button
          key={itemValue}
          type="button"
          role="tab"
          aria-selected={value === itemValue}
          onClick={() => onChange(itemValue)}
          style={{ animationDelay: `${delay}ms` }}
          className={cn(
            'animate-chip-in flex items-center justify-center px-1 sm:px-2 text-xs transition-colors duration-300',
            value === itemValue ? 'text-[#CEA472]' : 'text-white/80 hover:text-[#CEA472]'
          )}
        >
          <span className="truncate leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
