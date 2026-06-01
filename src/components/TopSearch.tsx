import { Bell, Menu, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { project } from "../data/mockProject";
import type { DemoNotification } from "../types";

type TopSearchProps = {
  value: string;
  onChange: (value: string) => void;
  hasNoResults: boolean;
  matchCount: number;
  onMenuClick: () => void;
  notifications: DemoNotification[];
  onNotificationClick: (notification: DemoNotification) => void;
};

export function TopSearch({
  value,
  onChange,
  hasNoResults,
  matchCount,
  onMenuClick,
  notifications,
  onNotificationClick,
}: TopSearchProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu-button" onClick={onMenuClick} aria-label="Открыть меню">
        <Menu size={20} />
      </button>

      <div className="search-wrap">
        <Search size={22} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onInput={(event) => onChange(event.currentTarget.value)}
          placeholder="Поиск по документам и узлам..."
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
          <small>{project.title}</small>
        </div>
        <button
          className="icon-button"
          aria-label="Уведомления"
          onClick={() => setNotificationsOpen((value) => !value)}
        >
          <Bell size={18} />
          {unreadCount ? <i>{unreadCount}</i> : null}
        </button>
        {notificationsOpen ? (
          <div className="notifications-popover glass-panel">
            <header>
              <b>События демо</b>
              <span>{unreadCount ? `${unreadCount} новых` : "нет новых"}</span>
            </header>
            {notifications.map((notification) => (
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
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
