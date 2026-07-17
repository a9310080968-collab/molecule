import { Focus, Maximize2, Redo2, RotateCcw, Sparkles, Undo2, Waypoints } from "lucide-react";
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
        <button title="Развести ноды и сократить пересечения процессов" onClick={onNormalize}>
          <Sparkles size={20} />
        </button>
        <button title="Сбросить вид" onClick={onReset}>
          <RotateCcw size={20} />
        </button>
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
