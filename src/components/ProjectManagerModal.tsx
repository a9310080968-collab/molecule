import { Check, FolderPlus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { ProjectParticipantRole, ProjectParticipantSeed, ProjectTemplate } from "../types";
import { useI18n } from "../lib/i18n";

type ProjectManagerModalProps = {
  templates: ProjectTemplate[];
  onClose: () => void;
  onCreateProject: (title: string, address: string, templateId: string, teamMembers: ProjectParticipantSeed[]) => void;
};

const baseTeam: ProjectParticipantSeed[] = [
  member("Paul Anderson", "Lead Project Engineer / Project Administrator", "admin", "paul.anderson@northbridge-design.com", "+1 415 555-0140", "@paul_anderson", "all"),
  member("Alice Bishop", "Architecture Lead", "architect", "alice.bishop@northbridge-design.com", "+1 415 555-0141", "@alice_bishop", "assigned"),
  member("Ian Miller", "Lead Structural Engineer", "constructor", "ian.miller@northbridge-design.com", "+1 415 555-0109", "@ian_miller", "assigned"),
  member("Maria Stone", "Document Control Coordinator", "coordinator", "maria.stone@northbridge-design.com", "+1 415 555-0112", "@maria_stone", "all"),
  member("Olivia Daniels", "Cost Manager", "estimator", "olivia.daniels@northbridge-design.com", "+1 415 555-0130", "@olivia_daniels", "assigned"),
];

const generatedTeam: ProjectParticipantSeed[] = Array.from({ length: 36 }, (_, index) => {
  const roles: ProjectParticipantRole[] = ["engineer", "contractor", "observer", "coordinator"];
  const role = roles[index % roles.length];
  const number = index + 1;
  return member(
    `Team Member ${number}`,
    role === "engineer" ? "Discipline Engineer" : role === "contractor" ? "Contractor" : role === "observer" ? "Client Observer" : "Coordinator",
    role,
    `user${number}@northbridge-demo.com`,
    `+1 415 555-${String(1000 + number).slice(-4)}`,
    `@user_${number}`,
    role === "observer" ? "custom" : "assigned",
  );
});

export const teamDirectory = [...baseTeam, ...generatedTeam];
const lockedAdminEmail = baseTeam[0].email;

export function ProjectManagerModal({
  templates,
  onClose,
  onCreateProject,
}: ProjectManagerModalProps) {
  const { t } = useI18n();
  const [projectTitle, setProjectTitle] = useState(() => t("Новый проект"));
  const [projectAddress, setProjectAddress] = useState(() => t("Объект без адреса"));
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
    const query = teamQuery.trim().toLocaleLowerCase("en-US");
    if (!query) {
      return true;
    }
    return [member.name, member.position, member.role, member.email, member.phone, member.messenger]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("en-US")
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
              {t("Новый проект")}
            </span>
            <h2>{t("Создание проекта")}</h2>
            <p>{t("Задайте базовые данные. После создания проект откроется на карте, где ноды и бизнес-процессы собираются визуально.")}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Закрыть")}>
            <X size={20} />
          </button>
        </header>

        <div className="project-create-body">
          <section className="project-create-form project-manager-form">
            <label>
              <span>{t("Название проекта")}</span>
              <input value={projectTitle} onChange={(event) => setProjectTitle(event.currentTarget.value)} />
            </label>
            <label>
              <span>{t("Объект / адрес")}</span>
              <input value={projectAddress} onChange={(event) => setProjectAddress(event.currentTarget.value)} />
            </label>
            <label>
              <span>{t("Стартовый шаблон")}</span>
              <select value={selectedTemplate?.id ?? ""} onChange={(event) => setSelectedTemplateId(event.currentTarget.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {t(template.title)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="project-team-summary">
            <div>
              <span>
                <UsersRound size={17} />
                {t("Команда")}
              </span>
              <strong>{t("{count} участников выбрано", { count: selectedTeam.length })}</strong>
              <p>{t("Список может быть большим. Для выбора участников откройте отдельное окно с поиском.")}</p>
            </div>
            <button onClick={() => setTeamPickerOpen(true)}>
              <UsersRound size={17} />
              {t("Выбрать команду")}
            </button>
          </section>

          <section className="selected-team-preview" aria-label={t("Выбранная команда")}>
            {selectedTeam.slice(0, 8).map((member) => (
              <article key={member.email}>
                <b>{getInitials(member.name)}</b>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.position}</span>
                </div>
              </article>
            ))}
            {selectedTeam.length > 8 ? <em>{t("+{count} участников", { count: selectedTeam.length - 8 })}</em> : null}
          </section>
        </div>

        <footer className="project-create-footer">
          <span>{canCreate ? t("Проект готов к созданию.") : t("Заполните название, объект и выберите шаблон.")}</span>
          <button className="primary-action" disabled={!canCreate} onClick={createProject}>
            <FolderPlus size={17} />
            {t("Создать проект")}
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
                  {t("Команда проекта")}
                </span>
                <h2>{t("Выбор участников")}</h2>
                <p>{t("Администратор включен всегда. Остальных участников можно быстро найти и добавить.")}</p>
              </div>
              <button className="icon-button" onClick={() => setTeamPickerOpen(false)} aria-label={t("Закрыть выбор команды")}>
                <X size={20} />
              </button>
            </header>

            <label className="team-search">
              <Search size={17} />
              <input value={teamQuery} onChange={(event) => setTeamQuery(event.currentTarget.value)} placeholder={t("Поиск по имени, роли, почте или телефону...")} />
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
                    <em>{t(getRoleLabel(member.role))}</em>
                  </button>
                );
              })}
            </div>

            <footer>
              <span>{t("{count} участников выбрано", { count: selectedTeam.length })}</span>
              <button className="primary-action" onClick={() => setTeamPickerOpen(false)}>
                {t("Готово")}
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

function getRoleLabel(role: ProjectParticipantRole) {
  const labels: Record<ProjectParticipantRole, string> = {
    admin: "Администратор",
    gip: "ГИП",
    coordinator: "Координатор",
    architect: "Архитектор",
    constructor: "Конструктор",
    engineer: "Инженер",
    estimator: "Сметчик",
    observer: "Наблюдатель",
    contractor: "Подрядчик",
  };
  return labels[role];
}
