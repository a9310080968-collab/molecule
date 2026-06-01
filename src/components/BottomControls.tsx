import { Focus, Maximize2, Network, Redo2, RotateCcw, ScanSearch, Sparkles, Type, Undo2, Waypoints } from "lucide-react";
import { getFileTypeColor } from "../lib/graph";
import type { FileType } from "../types";

type BottomControlsProps = {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNormalize: () => void;
  onReset: () => void;
  onFocus: () => void;
  autoRotate: boolean;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  onToggleAutoRotate: () => void;
};

const fileLegend: Array<{ type: FileType; label: string }> = [
  { type: "txt", label: "TXT" },
  { type: "docx", label: "DOC/DOCX" },
  { type: "xlsx", label: "XLS/XLSX" },
  { type: "pptx", label: "PPT/PPTX" },
  { type: "pdf", label: "PDF" },
  { type: "unknown", label: "Другое" },
];

export function BottomControls({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onNormalize,
  onReset,
  onFocus,
  autoRotate,
  fontScale,
  onFontScaleChange,
  onToggleAutoRotate,
}: BottomControlsProps) {
  return (
    <footer className="bottom-controls">
      <div className="view-tools glass-panel">
        <button title="2D-карта" className="active">
          <Waypoints size={20} />
        </button>
        <button title="Связи">
          <Network size={20} />
        </button>
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
        <button title="Автовращение" className={autoRotate ? "active" : ""} onClick={onToggleAutoRotate}>
          <ScanSearch size={20} />
        </button>
      </div>

      <div className="font-control glass-panel" title="Общий размер шрифта">
        <Type size={18} />
        <button
          type="button"
          onClick={() => onFontScaleChange(Math.max(0.8, Number((fontScale - 0.05).toFixed(2))))}
          aria-label="Уменьшить общий шрифт"
        >
          A-
        </button>
        <input
          type="range"
          min="0.8"
          max="1.3"
          step="0.05"
          value={fontScale}
          onChange={(event) => onFontScaleChange(Number(event.currentTarget.value))}
          onInput={(event) => onFontScaleChange(Number(event.currentTarget.value))}
          aria-label="Общий размер шрифта"
        />
        <button
          type="button"
          onClick={() => onFontScaleChange(Math.min(1.3, Number((fontScale + 0.05).toFixed(2))))}
          aria-label="Увеличить общий шрифт"
        >
          A+
        </button>
        <b>{Math.round(fontScale * 100)}%</b>
      </div>

      <div className="status-legend file-type-legend glass-panel" title="Цвет документа зависит от типа файла">
        {fileLegend.map((item) => (
          <span key={item.type}>
            <i
              style={{
                borderColor: getFileTypeColor(item.type),
                background: getFileTypeColor(item.type),
                color: getFileTypeColor(item.type),
              }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <button className="fullscreen-button glass-panel" title="Полноэкранный вид">
        <Maximize2 size={20} />
      </button>
    </footer>
  );
}
