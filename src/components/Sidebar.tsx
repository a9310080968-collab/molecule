import {
  Archive,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  GitBranch,
  LayoutDashboard,
  MessageCircleWarning,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { plannedFeatures, project } from "../data/mockProject";

export type SidebarMenuId =
  | "map"
  | "documents"
  | "tasks"
  | "checks"
  | "versions"
  | "participants"
  | "settings";

type SidebarProps = {
  isOpen: boolean;
  activeMenu: SidebarMenuId;
  onMenuSelect: (menu: SidebarMenuId) => void;
  onClose: () => void;
  onPlannedClick: () => void;
};

const navItems = [
  { id: "map", label: "2D-карта проекта", icon: GitBranch },
  { id: "documents", label: "Документы", icon: FileStack },
  { id: "tasks", label: "Задачи", icon: ClipboardCheck, badge: "12" },
  { id: "checks", label: "Проверки ГИП", icon: CheckCircle2 },
  { id: "versions", label: "Версии", icon: Archive },
  { id: "participants", label: "Участники", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
] satisfies Array<{ id: SidebarMenuId; label: string; icon: LucideIcon; badge?: string }>;

export function Sidebar({ isOpen, activeMenu, onMenuSelect, onClose, onPlannedClick }: SidebarProps) {
  return (
    <>
      <aside className={clsx("sidebar glass-panel", isOpen && "is-open")}>
        <div className="project-switch">
          <LayoutDashboard size={20} />
          <div>
            <span>Проект</span>
            <strong>{project.address}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={clsx("nav-item", activeMenu === item.id && "active")}
                key={item.label}
                onClick={() => {
                  onMenuSelect(item.id);
                  onClose();
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.badge ? <em>{item.badge}</em> : null}
              </button>
            );
          })}
        </nav>

        <section className="storage-card">
          <div className="card-row">
            <span>Хранилище</span>
            <b>247 ГБ из 500 ГБ</b>
          </div>
          <div className="progress-track">
            <i style={{ width: "49%" }} />
          </div>
          <button>Управление хранилищем</button>
        </section>

        <section className="review-card">
          <h2>Проверки ГИП</h2>
          <StatusCounter label="На проверке" value="14" tone="review" />
          <StatusCounter label="С замечаниями" value="8" tone="comments" />
          <StatusCounter label="Утверждено" value="128" tone="approved" />
        </section>

        <section className="planned-card">
          <h2>Планируемые функции</h2>
          {plannedFeatures.map((feature, index) => (
            <button key={feature} onClick={onPlannedClick}>
              {index === 2 ? <Bot size={16} /> : <Sparkles size={16} />}
              <span>{feature}</span>
              <em>В разработке</em>
            </button>
          ))}
        </section>

        <p className="hint">
          Перетаскивайте ноды для перемещения. Один клик выбирает ноду, двойной открывает документ.
          Используйте поиск, чтобы подсветить нужные документы.
        </p>
      </aside>
      {isOpen ? <button className="mobile-scrim" aria-label="Закрыть меню" onClick={onClose} /> : null}
    </>
  );
}

function StatusCounter({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "review" | "comments" | "approved";
}) {
  return (
    <div className="status-counter">
      <span className={tone} />
      <p>{label}</p>
      <b>{value}</b>
    </div>
  );
}
