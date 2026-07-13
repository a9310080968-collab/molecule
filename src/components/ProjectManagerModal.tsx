import { Check, FolderPlus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { ProjectParticipantRole, ProjectParticipantSeed, ProjectTemplate } from "../types";

type ProjectManagerModalProps = {
  templates: ProjectTemplate[];
  onClose: () => void;
  onCreateProject: (title: string, address: string, templateId: string, teamMembers: ProjectParticipantSeed[]) => void;
};

const baseTeam: ProjectParticipantSeed[] = [
  member("Павел Андреев", "ГИП / администратор проекта", "admin", "p.andreev@alfaproject.ru", "+7 916 110-12-40", "@pavel_gip", "all"),
  member("Анна Лебедева", "Руководитель группы АР", "architect", "a.lebedeva@alfaproject.ru", "+7 916 220-18-41", "@anna_ar", "assigned"),
  member("Игорь Мельников", "Ведущий конструктор", "constructor", "i.melnikov@alfaproject.ru", "+7 916 330-22-09", "@igor_kr", "assigned"),
  member("Мария Соколова", "Координатор документации", "coordinator", "m.sokolova@alfaproject.ru", "+7 916 440-63-12", "@maria_docs", "all"),
  member("Ольга Данилова", "Сметчик", "estimator", "o.danilova@alfaproject.ru", "+7 916 550-71-30", "@olga_est", "assigned"),
];

const generatedTeam: ProjectParticipantSeed[] = Array.from({ length: 36 }, (_, index) => {
  const roles: ProjectParticipantRole[] = ["engineer", "contractor", "observer", "coordinator"];
  const role = roles[index % roles.length];
  const number = index + 1;
  return member(
    `Участник ${number}`,
    role === "engineer" ? "Инженер раздела" : role === "contractor" ? "Подрядчик" : role === "observer" ? "Наблюдатель заказчика" : "Координатор",
    role,
    `user${number}@demo-project.ru`,
    `+7 900 ${String(100 + number).slice(-3)}-${String(10 + number).slice(-2)}-${String(20 + number).slice(-2)}`,
    `@user_${number}`,
    role === "observer" ? "custom" : "assigned",
  );
});

const teamDirectory = [...baseTeam, ...generatedTeam];
const lockedAdminEmail = baseTeam[0].email;

export function ProjectManagerModal({
  templates,
  onClose,
  onCreateProject,
}: ProjectManagerModalProps) {
  const [projectTitle, setProjectTitle] = useState("Новый проект");
  const [projectAddress, setProjectAddress] = useState("Объект без адреса");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [selectedTeamEmails, setSelectedTeamEmails] = useState<string[]>([
    baseTeam[0].email,
    baseTeam[1].email,
    baseTeam[2].email,
    baseTeam[3].email,
  ]);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [teamQuery, setTeamQuery] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );
  const selectedTeam = teamDirectory.filter((member) => selectedTeamEmails.includes(member.email));
  const filteredTeam = teamDirectory.filter((member) => {
    const query = teamQuery.trim().toLocaleLowerCase("ru-RU");
    if (!query) {
      return true;
    }
    return [member.name, member.position, member.role, member.email, member.phone, member.messenger]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ru-RU")
      .includes(query);
  });
  const canCreate = Boolean(projectTitle.trim() && projectAddress.trim() && selectedTemplate);

  function toggleTeamMember(email: string) {
    if (email === lockedAdminEmail) {
      return;
    }
    setSelectedTeamEmails((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email],
    );
  }

  function createProject() {
    if (!canCreate || !selectedTemplate) {
      return;
    }
    onCreateProject(projectTitle, projectAddress, selectedTemplate.id, selectedTeam);
  }

  return (
    <div className="modal-backdrop project-manager-backdrop" role="dialog" aria-modal="true">
      <article className="project-manager-modal project-create-modal glass-panel">
        <header className="project-manager-header">
          <div>
            <span>
              <FolderPlus size={18} />
              Новый проект
            </span>
            <h2>Создание проекта</h2>
            <p>Задайте базовые данные. После создания проект откроется на карте, где ноды и бизнес-процессы собираются визуально.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <div className="project-create-body">
          <section className="project-create-form project-manager-form">
            <label>
              <span>Название проекта</span>
              <input value={projectTitle} onChange={(event) => setProjectTitle(event.currentTarget.value)} />
            </label>
            <label>
              <span>Объект / адрес</span>
              <input value={projectAddress} onChange={(event) => setProjectAddress(event.currentTarget.value)} />
            </label>
            <label>
              <span>Стартовый шаблон</span>
              <select value={selectedTemplate?.id ?? ""} onChange={(event) => setSelectedTemplateId(event.currentTarget.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="project-team-summary">
            <div>
              <span>
                <UsersRound size={17} />
                Команда
              </span>
              <strong>{selectedTeam.length} участников выбрано</strong>
              <p>Список может быть большим. Для выбора участников откройте отдельное окно с поиском.</p>
            </div>
            <button onClick={() => setTeamPickerOpen(true)}>
              <UsersRound size={17} />
              Выбрать команду
            </button>
          </section>

          <section className="selected-team-preview" aria-label="Выбранная команда">
            {selectedTeam.slice(0, 8).map((member) => (
              <article key={member.email}>
                <b>{getInitials(member.name)}</b>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.position}</span>
                </div>
              </article>
            ))}
            {selectedTeam.length > 8 ? <em>+{selectedTeam.length - 8} участников</em> : null}
          </section>
        </div>

        <footer className="project-create-footer">
          <span>{canCreate ? "Проект готов к созданию." : "Заполните название, объект и выберите шаблон."}</span>
          <button className="primary-action" disabled={!canCreate} onClick={createProject}>
            <FolderPlus size={17} />
            Создать проект
          </button>
        </footer>
      </article>

      {teamPickerOpen ? (
        <div className="team-picker-backdrop" role="dialog" aria-modal="true">
          <article className="team-picker-modal glass-panel">
            <header>
              <div>
                <span>
                  <UsersRound size={18} />
                  Команда проекта
                </span>
                <h2>Выбор участников</h2>
                <p>Администратор включен всегда. Остальных участников можно быстро найти и добавить.</p>
              </div>
              <button className="icon-button" onClick={() => setTeamPickerOpen(false)} aria-label="Закрыть выбор команды">
                <X size={20} />
              </button>
            </header>

            <label className="team-search">
              <Search size={17} />
              <input value={teamQuery} onChange={(event) => setTeamQuery(event.currentTarget.value)} placeholder="Поиск по имени, роли, почте или телефону..." />
            </label>

            <div className="team-picker-list">
              {filteredTeam.map((member) => {
                const selected = selectedTeamEmails.includes(member.email);
                const locked = member.email === lockedAdminEmail;
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
                      <small>{member.email} · {member.phone}</small>
                    </div>
                    <em>{member.role}</em>
                  </button>
                );
              })}
            </div>

            <footer>
              <span>{selectedTeam.length} участников выбрано</span>
              <button className="primary-action" onClick={() => setTeamPickerOpen(false)}>
                Готово
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function member(
  name: string,
  position: string,
  role: ProjectParticipantRole,
  email: string,
  phone: string,
  messenger: string,
  visibilityMode: ProjectParticipantSeed["visibilityMode"],
): ProjectParticipantSeed {
  return {
    name,
    position,
    role,
    email,
    phone,
    messenger,
    visibilityMode,
    visibleNodeIds: [],
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
