import { CopyPlus, FolderPlus, Layers3, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { DemoProject, ProjectTemplate } from "../types";

type ProjectManagerModalProps = {
  projects: DemoProject[];
  activeProjectId: string;
  templates: ProjectTemplate[];
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (title: string, address: string, templateId: string) => void;
  onCreateTemplate: (title: string, description: string) => ProjectTemplate;
};

export function ProjectManagerModal({
  projects,
  activeProjectId,
  templates,
  onClose,
  onSelectProject,
  onCreateProject,
  onCreateTemplate,
}: ProjectManagerModalProps) {
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const [projectTitle, setProjectTitle] = useState("Новый проект");
  const [projectAddress, setProjectAddress] = useState("Объект без адреса");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );

  function createProject() {
    if (!selectedTemplate) {
      return;
    }
    onCreateProject(projectTitle, projectAddress, selectedTemplate.id);
  }

  function createTemplate() {
    const template = onCreateTemplate(templateTitle, templateDescription);
    setSelectedTemplateId(template.id);
    setTemplateTitle("");
    setTemplateDescription("");
  }

  return (
    <div className="modal-backdrop project-manager-backdrop" role="dialog" aria-modal="true">
      <article className="project-manager-modal glass-panel">
        <header className="project-manager-header">
          <div>
            <span>
              <Layers3 size={18} />
              Проекты и шаблоны
            </span>
            <h2>Рабочие структуры проекта</h2>
            <p>Создавайте новые проекты из шаблонов, переключайтесь между проектами и сохраняйте удачные структуры текущего проекта отдельно.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <div className="project-manager-grid">
          <div className="project-manager-stack">
            <section className="project-manager-section project-create-section">
              <div className="section-title">
                <FolderPlus size={18} />
                <div>
                  <h3>Добавить проект</h3>
                  <p>Новый проект появится в верхнем переключателе и сразу откроется на карте.</p>
                </div>
              </div>

              <div className="project-manager-form">
                <label>
                  <span>Название проекта</span>
                  <input value={projectTitle} onChange={(event) => setProjectTitle(event.currentTarget.value)} />
                </label>
                <label>
                  <span>Объект / адрес</span>
                  <input value={projectAddress} onChange={(event) => setProjectAddress(event.currentTarget.value)} />
                </label>
                <label>
                  <span>Шаблон структуры</span>
                  <select value={selectedTemplate?.id ?? ""} onChange={(event) => setSelectedTemplateId(event.currentTarget.value)}>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-action" onClick={createProject} disabled={!selectedTemplate}>
                  <FolderPlus size={17} />
                  Создать проект
                </button>
              </div>

              <div className="project-list">
                <h3>Текущие проекты</h3>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className={clsx(project.id === activeProjectId && "active")}
                    onClick={() => {
                      onSelectProject(project.id);
                      onClose();
                    }}
                  >
                    <span>{project.title}</span>
                    <small>{project.address}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="project-manager-section current-project-section">
              <div className="section-title">
                <Save size={18} />
                <div>
                  <h3>Текущий проект</h3>
                  <p>Здесь сохраняется именно структура открытого проекта: уровни, ноды и бизнес-процессы без рабочих документов.</p>
                </div>
              </div>

              <article className="current-project-card">
                <span>Открыт сейчас</span>
                <strong>{activeProject.title}</strong>
                <small>{activeProject.address}</small>
                <em>
                  {activeProject.nodes.length} нод · {activeProject.levels.length} уровней · {activeProject.processes.length} процессов
                </em>
              </article>

              <div className="project-manager-form save-template-form">
                <label>
                  <span>Название нового шаблона</span>
                  <input
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.currentTarget.value)}
                    placeholder="Например: ЖК с полным комплектом разделов"
                  />
                </label>
                <label>
                  <span>Описание</span>
                  <textarea
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.currentTarget.value)}
                    placeholder="Что входит в структуру и когда использовать этот шаблон"
                  />
                </label>
                <button onClick={createTemplate}>
                  <CopyPlus size={17} />
                  Сохранить текущий проект как шаблон
                </button>
              </div>
            </section>
          </div>

          <section className="project-manager-section project-templates-section">
            <div className="section-title">
              <CopyPlus size={18} />
              <div>
                <h3>Использовать шаблон</h3>
                <p>Выберите структуру, из которой будет создан новый проект. Рабочие документы в шаблон не переносятся.</p>
              </div>
            </div>

            <div className="template-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className={clsx(template.id === selectedTemplate?.id && "active")}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                  <em>
                    {template.nodes.length} нод · {template.levels.length} уровней · источник: {template.sourceProjectTitle}
                  </em>
                </button>
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
