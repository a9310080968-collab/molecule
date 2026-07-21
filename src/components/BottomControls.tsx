import { Focus, Maximize2, Redo2, RotateCcw, Sparkles, Undo2, Waypoints } from "lucide-react";
import { useI18n } from "../lib/i18n";

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
  const { t } = useI18n();
  return (
    <footer className="bottom-controls">
      <div className="view-tools glass-panel">
        <span title={t("Карта процессов")} className="view-tool-static active">
          <Waypoints size={20} />
        </span>
        <button title={t("Отменить действие (Ctrl+Z)")} onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={20} />
        </button>
        <button title={t("Повторить действие (Ctrl+Y / Ctrl+Shift+Z)")} onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={20} />
        </button>
        <button title={t("Фокус на выбранной ноде")} onClick={onFocus}>
          <Focus size={20} />
        </button>
        <button title={t("Развести ноды и сократить пересечения процессов")} onClick={onNormalize}>
          <Sparkles size={20} />
        </button>
        <button title={t("Сбросить вид")} onClick={onReset}>
          <RotateCcw size={20} />
        </button>
      </div>

      <button className="fullscreen-button glass-panel" title={t("Полноэкранный вид")} onClick={onFullscreen}>
        <Maximize2 size={20} />
      </button>
    </footer>
  );
}
