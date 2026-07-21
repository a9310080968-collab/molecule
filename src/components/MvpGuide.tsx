import { CheckCircle2, FolderPlus, GitBranch, X } from "lucide-react";
import { useI18n } from "../lib/i18n";

type MvpGuideProps = {
  onCreateProject: () => void;
  onClose: () => void;
};

export function MvpGuide({ onCreateProject, onClose }: MvpGuideProps) {
  const { t } = useI18n();
  return (
    <aside className="mvp-guide glass-panel" aria-label={t("Быстрый старт")}>
      <header>
        <div>
          <span>{t("Быстрый старт MVP")}</span>
          <strong>{t("Как собрать проект за 3 шага")}</strong>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={t("Скрыть подсказку")}>
          <X size={18} />
        </button>
      </header>

      <ol>
        <li>
          <FolderPlus size={17} />
          <p>{t("Создайте проект из пустого шаблона или готовой структуры.")}</p>
        </li>
        <li>
          <GitBranch size={17} />
          <p>{t("Переименуйте ноды и соедините их через плюс на ноде.")}</p>
        </li>
        <li>
          <CheckCircle2 size={17} />
          <p>{t("Откройте связь и соберите контейнер согласования.")}</p>
        </li>
      </ol>

      <button className="mvp-guide-primary" onClick={onCreateProject}>
        <FolderPlus size={17} />
        {t("Создать проект")}
      </button>
    </aside>
  );
}
