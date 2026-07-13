import { CheckCircle2, FolderPlus, GitBranch, X } from "lucide-react";

type MvpGuideProps = {
  onCreateProject: () => void;
  onClose: () => void;
};

export function MvpGuide({ onCreateProject, onClose }: MvpGuideProps) {
  return (
    <aside className="mvp-guide glass-panel" aria-label="Быстрый старт">
      <header>
        <div>
          <span>Быстрый старт MVP</span>
          <strong>Как собрать проект за 3 шага</strong>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Скрыть подсказку">
          <X size={18} />
        </button>
      </header>

      <ol>
        <li>
          <FolderPlus size={17} />
          <p>Создайте проект из пустого шаблона или готовой структуры.</p>
        </li>
        <li>
          <GitBranch size={17} />
          <p>Переименуйте ноды и соедините их через плюс на ноде.</p>
        </li>
        <li>
          <CheckCircle2 size={17} />
          <p>Откройте связь и соберите контейнер согласования.</p>
        </li>
      </ol>

      <button className="mvp-guide-primary" onClick={onCreateProject}>
        <FolderPlus size={17} />
        Создать проект
      </button>
    </aside>
  );
}
