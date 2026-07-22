import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FileStack,
  GitBranch,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { getNodeById } from "../lib/graph";
import type { DemoAccess } from "../lib/demoAccess";
import type { DemoProject, ProcessDocument, ProcessStatus } from "../types";
import { useI18n } from "../lib/i18n";

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
  chatUnreadCount: number;
  access: DemoAccess;
  onMenuSelect: (menu: SidebarMenuId) => void;
  onSelectProcess: (processId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onClose: () => void;
};

const navItems = [
  { id: "map", label: "Карта процессов", icon: GitBranch },
  { id: "documents", label: "Документы", icon: FileStack },
  { id: "tasks", label: "Задания", icon: ClipboardCheck },
  { id: "checks", label: "Проверки ГИП", icon: CheckCircle2 },
  { id: "versions", label: "Версии", icon: Archive },
  { id: "chat", label: "Мессенджер", icon: MessageCircle },
  { id: "participants", label: "Участники", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
] satisfies Array<{ id: SidebarMenuId; label: string; icon: LucideIcon }>;

const connectionStatuses = [
  { status: "sent", label: "Отправлено", tone: "sent" },
  { status: "rejected", label: "Не принято", tone: "rejected" },
  { status: "accepted", label: "Принято", tone: "accepted" },
] satisfies Array<{ status: ProcessStatus; label: string; tone: "sent" | "rejected" | "accepted" }>;

export function Sidebar({
  isOpen,
  activeMenu,
  project,
  chatUnreadCount,
  access,
  onMenuSelect,
  onSelectProcess,
  onSelectNode,
  onOpenDocument,
  onClose,
}: SidebarProps) {
  const { t } = useI18n();
  const [expandedStatus, setExpandedStatus] = useState<ProcessStatus | null>(null);

  return (
    <>
      <aside className={clsx("sidebar glass-panel", isOpen && "is-open")}>
        <div className="project-switch">
          <LayoutDashboard size={20} />
          <div>
            <span>{t("Текущий проект")}</span>
            <strong>{project.address}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.filter((item) => isMenuVisible(item.id, access)).map((item) => {
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
                <span>{t(item.label)}</span>
                {item.id === "chat" && chatUnreadCount > 0 ? (
                  <b className="nav-unread-badge" aria-label={t("Новых сообщений: {count}", { count: chatUnreadCount })}>{chatUnreadCount}</b>
                ) : null}
              </button>
            );
          })}
        </nav>

        <section className="review-card">
          <h2>{t("Контейнеры связей")}</h2>
          {connectionStatuses.map((item) => {
            const matchingProcesses = project.processes.filter((process) => process.status === item.status);
            const expanded = expandedStatus === item.status;
            return (
              <div className="connection-status-group" key={item.status}>
                <button
                  className={clsx("status-counter", expanded && "expanded")}
                  onClick={() => setExpandedStatus(expanded ? null : item.status)}
                  aria-expanded={expanded}
                >
                  <span className={item.tone} />
                  <p>{t(item.label)}</p>
                  <b>{matchingProcesses.length}</b>
                  <ChevronDown size={15} />
                </button>
                {expanded ? (
                  <div className="connection-container-list">
                    {matchingProcesses.length ? matchingProcesses.map((process) => {
                      const fromNode = getNodeById(project, process.from);
                      const toNode = getNodeById(project, process.to);
                      return (
                        <article key={process.id}>
                          <button
                            className="connection-process-link"
                            onClick={() => {
                              onSelectProcess(process.id);
                              onClose();
                            }}
                          >
                            <strong>{process.title}</strong>
                            <small>{process.documents.length} {t("файлов")}</small>
                          </button>
                          <div className="connection-object-links">
                            {fromNode ? (
                              <button
                                onClick={() => {
                                  onSelectNode(fromNode.id);
                                  onClose();
                                }}
                                title={t("Перейти к исходной ноде")}
                              >
                                <GitBranch size={13} />
                                {fromNode.shortCode ?? fromNode.title}
                              </button>
                            ) : null}
                            {toNode ? (
                              <button
                                onClick={() => {
                                  onSelectNode(toNode.id);
                                  onClose();
                                }}
                                title={t("Перейти к целевой ноде")}
                              >
                                <GitBranch size={13} />
                                {toNode.shortCode ?? toNode.title}
                              </button>
                            ) : null}
                            {process.documents.map((document) => (
                              <button
                                key={document.id}
                                onClick={() => {
                                  onOpenDocument(document);
                                  onClose();
                                }}
                                title={document.title}
                              >
                                <FileText size={13} />
                                {document.title}
                              </button>
                            ))}
                          </div>
                        </article>
                      );
                    }) : <p className="connection-list-empty">{t("Нет контейнеров с этим статусом.")}</p>}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <p className="hint">
          {t("Двойной клик по разделу проваливает внутрь его молекулы. Наведите на ноду и нажмите плюс, чтобы вручную построить бизнес-процесс. Клик по линии открывает контейнер передачи документов.")}
        </p>
      </aside>
      {isOpen ? <button className="mobile-scrim" aria-label={t("Закрыть меню")} onClick={onClose} /> : null}
    </>
  );
}

function isMenuVisible(menu: SidebarMenuId, access: DemoAccess) {
  if (menu === "checks") return access.canViewChecks;
  if (menu === "participants") return access.canViewParticipants;
  if (menu === "settings") return true;
  return true;
}
