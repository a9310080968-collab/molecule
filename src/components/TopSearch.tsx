import { Bell, Menu, Plus, Search, SlidersHorizontal, Trash2, UserCog, X } from "lucide-react";
import { useState } from "react";
import type { DemoAccess } from "../lib/demoAccess";
import type { DemoNotification, DemoProject, ProjectParticipant } from "../types";
import { useI18n } from "../lib/i18n";

type TopSearchProps = {
  value: string;
  onChange: (value: string) => void;
  hasNoResults: boolean;
  matchCount: number;
  onMenuClick: () => void;
  projects: DemoProject[];
  activeProjectId: string;
  user?: ProjectParticipant;
  access: DemoAccess;
  onProjectChange: (projectId: string) => void;
  onProjectDelete: (projectId: string) => void;
  notifications: DemoNotification[];
  onNotificationClick: (notification: DemoNotification) => void;
  onOpenProjectManager: () => void;
  onOpenPersonalSettings: () => void;
};

export function TopSearch({
  value,
  onChange,
  hasNoResults,
  matchCount,
  onMenuClick,
  projects,
  activeProjectId,
  user,
  access,
  onProjectChange,
  onProjectDelete,
  notifications,
  onNotificationClick,
  onOpenProjectManager,
  onOpenPersonalSettings,
}: TopSearchProps) {
  const { t, system } = useI18n();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectNotifications = notifications.filter((notification) => notification.projectId === activeProjectId);
  const unreadCount = projectNotifications.filter((notification) => notification.unread).length;

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu-button" onClick={onMenuClick} aria-label={t("Открыть меню")}>
        <Menu size={20} />
      </button>

      <div className="project-selector glass-panel" aria-label={t("Проекты")}>
        <label>
          <span>{t("Проект")}</span>
          <select value={activeProjectId} onChange={(event) => onProjectChange(event.currentTarget.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title} — {project.address}
              </option>
            ))}
          </select>
        </label>
        {access.canManageProjects ? (
          <>
            <button className="project-add-tab" onClick={onOpenProjectManager} title={t("Создать проект")}>
              <Plus size={18} />
              <span>{t("Создать")}</span>
            </button>
            <button
              className="project-delete-tab"
              onClick={() => onProjectDelete(activeProjectId)}
              title={t("Удалить текущий проект")}
            >
              <Trash2 size={17} />
            </button>
          </>
        ) : null}
      </div>

      <div className="search-wrap">
        <Search size={22} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("Поиск по нодам, бизнес-процессам, документам и мессенджеру...")}
        />
        {value ? (
          <button className="clear-search" onClick={() => onChange("")} aria-label={t("Очистить поиск")}>
            <X size={18} />
          </button>
        ) : null}
        <SlidersHorizontal size={20} className="search-filter" />
      </div>

      {value ? (
        <div className="search-result-note">
          {hasNoResults ? t("Ничего не найдено") : t("Найдено: {count}", { count: matchCount })}
        </div>
      ) : null}

      <div className="user-chip">
        <span className="user-chip-avatar">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getInitials(user?.name ?? "Павел Андреев")}
        </span>
        <div>
          <b>{user?.name ?? "Павел Андреев"}</b>
          <small>{t(access.label)} · {activeProject.title}</small>
        </div>
        <button className="icon-button" aria-label={t("Личный кабинет")} onClick={onOpenPersonalSettings}>
          <UserCog size={18} />
        </button>
        <button
          className="icon-button"
          aria-label={t("Уведомления")}
          onClick={() => setNotificationsOpen((current) => !current)}
        >
          <Bell size={18} />
          {unreadCount ? <i>{unreadCount}</i> : null}
        </button>
        {notificationsOpen ? (
          <div className="notifications-popover glass-panel">
            <header>
              <b>{t("События проекта")}</b>
              <span>{unreadCount ? t("{count} новых", { count: unreadCount }) : t("нет новых")}</span>
            </header>
            {projectNotifications.length ? (
              projectNotifications.map((notification) => (
                <button
                  key={notification.id}
                  className={notification.unread ? "unread" : ""}
                  onClick={() => {
                    onNotificationClick(notification);
                    setNotificationsOpen(false);
                  }}
                >
                  <strong>{system(notification.title)}</strong>
                  <span>{system(notification.description)}</span>
                  <em>{system(notification.time)}</em>
                </button>
              ))
            ) : (
              <p className="popover-empty">{t("Событий пока нет")}</p>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
