import { Bell, Menu, Plus, Search, SlidersHorizontal, UserCog, X } from "lucide-react";
import { useState } from "react";
import type { DemoNotification, DemoProject } from "../types";

type TopSearchProps = {
  value: string;
  onChange: (value: string) => void;
  hasNoResults: boolean;
  matchCount: number;
  onMenuClick: () => void;
  projects: DemoProject[];
  activeProjectId: string;
  onProjectChange: (projectId: string) => void;
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
  onProjectChange,
  notifications,
  onNotificationClick,
  onOpenProjectManager,
  onOpenPersonalSettings,
}: TopSearchProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectNotifications = notifications.filter((notification) => notification.projectId === activeProjectId);
  const unreadCount = projectNotifications.filter((notification) => notification.unread).length;

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu-button" onClick={onMenuClick} aria-label="Открыть меню">
        <Menu size={20} />
      </button>

      <div className="project-selector glass-panel" aria-label="Проекты">
        <label>
          <span>Проект</span>
          <select value={activeProjectId} onChange={(event) => onProjectChange(event.currentTarget.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title} — {project.address}
              </option>
            ))}
          </select>
        </label>
        <button className="project-add-tab" onClick={onOpenProjectManager} title="Создать проект">
          <Plus size={18} />
          <span>Создать</span>
        </button>
      </div>

      <div className="search-wrap">
        <Search size={22} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Поиск по нодам, бизнес-процессам, документам и мессенджеру..."
        />
        {value ? (
          <button className="clear-search" onClick={() => onChange("")} aria-label="Очистить поиск">
            <X size={18} />
          </button>
        ) : null}
        <SlidersHorizontal size={20} className="search-filter" />
      </div>

      {value ? (
        <div className="search-result-note">
          {hasNoResults ? "Ничего не найдено" : `Найдено: ${matchCount}`}
        </div>
      ) : null}

      <div className="user-chip">
        <span>ПА</span>
        <div>
          <b>Павел Андреев</b>
          <small>{activeProject.title}</small>
        </div>
        <button className="icon-button" aria-label="Личные настройки интеграций" onClick={onOpenPersonalSettings}>
          <UserCog size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Уведомления"
          onClick={() => setNotificationsOpen((current) => !current)}
        >
          <Bell size={18} />
          {unreadCount ? <i>{unreadCount}</i> : null}
        </button>
        {notificationsOpen ? (
          <div className="notifications-popover glass-panel">
            <header>
              <b>События проекта</b>
              <span>{unreadCount ? `${unreadCount} новых` : "нет новых"}</span>
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
                  <strong>{notification.title}</strong>
                  <span>{notification.description}</span>
                  <em>{notification.time}</em>
                </button>
              ))
            ) : (
              <p className="popover-empty">Событий пока нет</p>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
