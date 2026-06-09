import {
  Archive,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  GitBranch,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { plannedFeatures } from "../data/mockProject";
import type { DemoProject } from "../types";

export type SidebarMenuId =
  | "map"
  | "documents"
  | "tasks"
  | "checks"
  | "versions"
  | "chat"
  | "participants"
  | "settings";

type SidebarProps = {
  isOpen: boolean;
  activeMenu: SidebarMenuId;
  project: DemoProject;
  onMenuSelect: (menu: SidebarMenuId) => void;
  onClose: () => void;
  onPlannedClick: () => void;
};

const navItems = [
  { id: "map", label: "Карта процессов", icon: GitBranch },
  { id: "documents", label: "Документы", icon: FileStack },
  { id: "tasks", label: "Задания", icon: ClipboardCheck },
  { id: "checks", label: "Проверки ГИП", icon: CheckCircle2 },
  { id: "versions", label: "Версии", icon: Archive },
  { id: "chat", label: "Чат проекта", icon: MessageCircle },
  { id: "participants", label: "Участники", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
] satisfies Array<{ id: SidebarMenuId; label: string; icon: LucideIcon }>;

export function Sidebar({ isOpen, activeMenu, project, onMenuSelect, onClose, onPlannedClick }: SidebarProps) {
  const sent = project.processes.filter((process) => process.status === "sent").length;
  const rejected = project.processes.filter((process) => process.status === "rejected").length;
  const accepted = project.processes.filter((process) => process.status === "accepted").length;
  const storagePercent = Math.round((project.storageUsedGb / project.storageLimitGb) * 100);

  return (
    <>
      <aside className={clsx("sidebar glass-panel", isOpen && "is-open")}>
        <div className="project-switch">
          <LayoutDashboard size={20} />
          <div>
            <span>Текущий проект</span>
            <strong>{project.address}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={clsx("nav-item", activeMenu === item.id && "active")}
                key={item.id}
                onClick={() => {
                  onMenuSelect(item.id);
                  onClose();
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="storage-card">
          <div className="card-row">
            <span>Хранилище</span>
            <b>{project.storageUsedGb} ГБ из {project.storageLimitGb} ГБ</b>
          </div>
          <div className="progress-track">
            <i style={{ width: `${storagePercent}%` }} />
          </div>
          <button onClick={onPlannedClick}>Управление хранилищем</button>
        </section>

        <section className="review-card">
          <h2>Контейнеры связей</h2>
          <StatusCounter label="Отправлено" value={String(sent)} tone="sent" />
          <StatusCounter label="Не принято" value={String(rejected)} tone="rejected" />
          <StatusCounter label="Принято" value={String(accepted)} tone="accepted" />
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
          Двойной клик по разделу проваливает внутрь его молекулы. Наведите на ноду и нажмите плюс, чтобы вручную построить бизнес-процесс. Клик по линии открывает контейнер передачи документов.
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
  tone: "sent" | "rejected" | "accepted";
}) {
  return (
    <div className="status-counter">
      <span className={tone} />
      <p>{label}</p>
      <b>{value}</b>
    </div>
  );
}
