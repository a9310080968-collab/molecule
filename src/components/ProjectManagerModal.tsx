import { Check, CopyPlus, FolderPlus, Layers3, Save, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { DemoProject, ProjectParticipantSeed, ProjectTemplate } from "../types";

type ProjectManagerModalProps = {
  projects: DemoProject[];
  activeProjectId: string;
  templates: ProjectTemplate[];
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (title: string, address: string, templateId: string, teamMembers: ProjectParticipantSeed[]) => void;
  onCreateTemplate: (title: string, description: string) => ProjectTemplate;
};

const teamDirectory: ProjectParticipantSeed[] = [
  {
    name: "Павел Андреев",
    position: "ГИП / администратор проекта",
    role: "admin",
    email: "p.andreev@alfaproject.ru",
    phone: "+7 916 110-12-40",
    messenger: "@pavel_gip",
    visibilityMode: "all",
    visibleNodeIds: [],
  },
  {
    name: "Анна Лебедева",
    position: "Руководитель группы АР",
    role: "architect",
    email: "a.lebedeva@alfaproject.ru",
    phone: "+7 916 220-18-41",
    messenger: "@anna_ar",
    visibilityMode: "assigned",
    visibleNodeIds: [],
  },
  {
    name: "Игорь Мельников",
    position: "Ведущий конструктор",
    role: "constructor",
    email: "i.melnikov@alfaproject.ru",
    phone: "+7 916 330-22-09",
    messenger: "@igor_kr",
    visibilityMode: "assigned",
    visibleNodeIds: [],
  },
  {
    name: "Мария Соколова",
    position: "Координатор документации",
    role: "coordinator",
    email: "m.sokolova@alfaproject.ru",
    phone: "+7 916 440-63-12",
    messenger: "@maria_docs",
    visibilityMode: "all",
    visibleNodeIds: [],
  },
  {
    name: "Ольга Данилова",
    position: "Сметчик",
    role: "estimator",
    email: "o.danilova@alfaproject.ru",
    phone: "+7 916 550-71-30",
    messenger: "@olga_est",
    visibilityMode: "assigned",
    visibleNodeIds: [],
  },
];

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
  const [selectedTeamEmails, setSelectedTeamEmails] = useState<string[]>([
    teamDirectory[0].email,
    teamDirectory[1].email,
    teamDirectory[2].email,
    teamDirectory[3].email,
  ]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );
  const selectedTeam = teamDirectory.filter((member) => selectedTeamEmails.includes(member.email));

  function toggleTeamMember(email: string) {
    if (email === teamDirectory[0].email) {
      return;
    }
    setSelectedTeamEmails((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email],
    );
  }

  function createProject() {
    if (!selectedTemplate) {
      return;
    }
    onCreateProject(projectTitle, projectAddress, selectedTemplate.id, selectedTeam);
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
              Проекты
            </span>
            <h2>Создать или открыть проект</h2>
            <p>На этом шаге задаются только название, объект, команда и шаблон. Схема нод и бизнес-процессы собираются уже на карте проекта.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <section className="project-wizard-steps">
          <article>
            <b>1</b>
            <span>Назовите проект и объект</span>
          </article>
          <article>
            <b>2</b>
            <span>Выберите команду доступа</span>
          </article>
          <article>
            <b>3</b>
            <span>Откройте карту и создайте бизнес-процессы через плюс на ноде</span>
          </article>
        </section>

        <div className="project-manager-grid project-manager-grid-simple">
          <section className="project-manager-section project-create-section">
            <div className="section-title">
              <FolderPlus size={18} />
              <div>
                <h3>Новый проект</h3>
                <p>Минимальный старт без лишних решений: проект создается, затем пользователь видит визуальный конструктор на карте.</p>
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
                <span>Шаблон стартовой карты</span>
                <select value={selectedTemplate?.id ?? ""} onChange={(event) => setSelectedTemplateId(event.currentTarget.value)}>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section className="team-selection">
              <div className="section-title compact">
                <UsersRound size={18} />
                <div>
                  <h3>Команда проекта</h3>
                  <p>Администратор включен всегда. Остальные участники получают доступ при создании проекта.</p>
                </div>
              </div>

              <div className="team-list">
                {teamDirectory.map((member) => {
                  const selected = selectedTeamEmails.includes(member.email);
                  const locked = member.email === teamDirectory[0].email;
                  return (
                    <button
                      key={member.email}
                      className={clsx(selected && "selected", locked && "locked")}
                      onClick={() => toggleTeamMember(member.email)}
                    >
                      <i>{selected ? <Check size={15} /> : null}</i>
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.position}</span>
                      </div>
                      <em>{member.role}</em>
                    </button>
                  );
                })}
              </div>
            </section>

            <button className="primary-action project-create-button" onClick={createProject} disabled={!selectedTemplate}>
              <FolderPlus size={17} />
              Создать проект и открыть карту
            </button>
          </section>

          <section className="project-manager-section project-list-section">
            <div className="section-title">
              <Layers3 size={18} />
              <div>
                <h3>Открыть проект</h3>
                <p>Список рассчитан на любое количество проектов. Активный проект подсвечен.</p>
              </div>
            </div>

            <div className="project-list">
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

            <div className="template-list compact-template-list">
              <h3>Доступные шаблоны</h3>
              {templates.map((template) => (
                <button
                  key={template.id}
                  className={clsx(template.id === selectedTemplate?.id && "active")}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                  <em>{template.nodes.length} нод · {template.levels.length} уровней</em>
                </button>
              ))}
            </div>
          </section>

          <section className="project-manager-section current-project-section">
            <div className="section-title">
              <Save size={18} />
              <div>
                <h3>Текущий проект</h3>
                <p>Этот блок относится к уже открытому проекту, а не к созданию нового.</p>
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
                <span>Название шаблона</span>
                <input
                  value={templateTitle}
                  onChange={(event) => setTemplateTitle(event.currentTarget.value)}
                  placeholder="Например: ЖК с полным комплектом разделов"
                />
              </label>
              <label>
                <span>Описание шаблона</span>
                <textarea
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.currentTarget.value)}
                  placeholder="Когда использовать этот шаблон"
                />
              </label>
              <button onClick={createTemplate}>
                <CopyPlus size={17} />
                Сохранить текущий проект как шаблон
              </button>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
