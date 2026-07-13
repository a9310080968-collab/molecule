import { Focus, Maximize2, Redo2, RotateCcw, Sparkles, Type, Undo2, Waypoints } from "lucide-react";
import { processStatusColors, processStatusLabels } from "../data/mockProject";
import type { ProcessStatus } from "../types";

type BottomControlsProps = {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNormalize: () => void;
  onReset: () => void;
  onFocus: () => void;
  onFullscreen: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
};

const statusOrder: ProcessStatus[] = ["sent", "rejected", "accepted", "in_work", "draft"];

export function BottomControls({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onNormalize,
  onReset,
  onFocus,
  onFullscreen,
  fontScale,
  onFontScaleChange,
}: BottomControlsProps) {
  return (
    <footer className="bottom-controls">
      <div className="view-tools glass-panel">
        <span title="Карта процессов" className="view-tool-static active">
          <Waypoints size={20} />
        </span>
        <button title="Отменить действие (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={20} />
        </button>
        <button title="Повторить действие (Ctrl+Y / Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={20} />
        </button>
        <button title="Фокус на выбранной ноде" onClick={onFocus}>
          <Focus size={20} />
        </button>
        <button title="Нормализовать структуру" onClick={onNormalize}>
          <Sparkles size={20} />
        </button>
        <button title="Сбросить вид" onClick={onReset}>
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="font-control glass-panel" title="Общий размер шрифта">
        <Type size={18} />
        <button
          type="button"
          onClick={() => onFontScaleChange(Math.max(0.85, Number((fontScale - 0.05).toFixed(2))))}
          aria-label="Уменьшить общий шрифт"
        >
          A-
        </button>
        <input
          type="range"
          min="0.85"
          max="1.25"
          step="0.05"
          value={fontScale}
          onChange={(event) => onFontScaleChange(Number(event.currentTarget.value))}
          aria-label="Общий размер шрифта"
        />
        <button
          type="button"
          onClick={() => onFontScaleChange(Math.min(1.25, Number((fontScale + 0.05).toFixed(2))))}
          aria-label="Увеличить общий шрифт"
        >
          A+
        </button>
        <b>{Math.round(fontScale * 100)}%</b>
      </div>

      <div className="status-legend glass-panel" title="Цвет линии показывает статус бизнес-процесса">
        {statusOrder.map((status) => (
          <span key={status}>
            <i style={{ borderColor: processStatusColors[status], background: processStatusColors[status] }} />
            {processStatusLabels[status]}
          </span>
        ))}
      </div>

      <button className="fullscreen-button glass-panel" title="Полноэкранный вид" onClick={onFullscreen}>
        <Maximize2 size={20} />
      </button>
    </footer>
  );
}
