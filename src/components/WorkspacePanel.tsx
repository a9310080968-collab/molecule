import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  FolderPlus,
  MessageCircle,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getAcceptedAssignments,
  getAllVisibleDocuments,
  getChecks,
  getFileLabel,
  getFileTypeColor,
  getProcessStatusColor,
  getProcessStatusText,
} from "../lib/graph";
import type { BusinessProcess, DemoProject, ProcessDocument } from "../types";
import type { SidebarMenuId } from "./Sidebar";

type WorkspacePanelProps = {
  activeMenu: SidebarMenuId;
  project: DemoProject;
  onClose: () => void;
  onSelectProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onReceiveMail: () => void;
  onReceiveChat: () => void;
  onOpenProjectManager: () => void;
};

const menuMeta = {
  documents: {
    icon: FileStack,
    title: "Документы",
    subtitle: "Список документов остается, но карта больше не превращает каждый файл в отдельную сферу.",
    badge: "Демо-реестр",
  },
  tasks: {
    icon: ClipboardCheck,
    title: "Задания",
    subtitle: "Очередь контейнеров передачи файлов между разделами.",
    badge: "Контейнеры",
  },
  checks: {
    icon: CheckCircle2,
    title: "Проверки ГИП",
    subtitle: "Процессы, отправленные на проверку или возвращенные с замечаниями.",
    badge: "Валидация",
  },
  versions: {
    icon: Archive,
    title: "Версии",
    subtitle: "Здесь хранятся задания, принятые в работу, с датой валидации и маршрутом.",
    badge: "Принято в работу",
  },
  chat: {
    icon: MessageCircle,
    title: "Чат проекта",
    subtitle: "Сообщения могут создавать задания или менять статус контейнера связи.",
    badge: "Демо-чат",
  },
  participants: {
    icon: Users,
    title: "Участники",
    subtitle: "Роли, ответственные и маршруты передачи между командами.",
    badge: "Команда",
  },
  settings: {
    icon: Settings,
    title: "Настройки",
    subtitle: "Цвет ноды больше не выбирается вручную. Визуал зависит от роли ноды и согласования.",
    badge: "Правила",
  },
} satisfies Record<
  Exclude<SidebarMenuId, "map">,
  {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    badge: string;
  }
>;

export function WorkspacePanel({
  activeMenu,
  project,
  onClose,
  onSelectProcess,
  onOpenDocument,
  onReceiveMail,
  onReceiveChat,
  onOpenProjectManager,
}: WorkspacePanelProps) {
  if (activeMenu === "map") {
    return null;
  }

  const meta = menuMeta[activeMenu];
  const Icon = meta.icon;

  return (
    <section className="workspace-panel glass-panel" aria-label={meta.title}>
      <header className="workspace-header">
        <div>
          <span>
            <Icon size={18} />
            {meta.badge}
          </span>
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Закрыть раздел">
          <X size={20} />
        </button>
      </header>

      <WorkspaceContent
        activeMenu={activeMenu}
        project={project}
        onSelectProcess={onSelectProcess}
        onOpenDocument={onOpenDocument}
        onReceiveMail={onReceiveMail}
        onReceiveChat={onReceiveChat}
        onOpenProjectManager={onOpenProjectManager}
      />
    </section>
  );
}

function WorkspaceContent({
  activeMenu,
  project,
  onSelectProcess,
  onOpenDocument,
  onReceiveMail,
  onReceiveChat,
  onOpenProjectManager,
}: Omit<WorkspacePanelProps, "onClose">) {
  if (activeMenu === "documents") {
    const documents = getAllVisibleDocuments(project);
    return (
      <div className="workspace-grid">
        {documents.map((document) => (
          <button key={`${document.processId}-${document.id}`} className="workspace-row document-workspace-row" onClick={() => onOpenDocument(document)}>
            <b style={{ color: getFileTypeColor(document.fileType) }}>{getFileLabel(document.fileType)}</b>
            <div>
              <strong>{document.title}</strong>
              <span>{document.processTitle}</span>
            </div>
            <em>{document.version}</em>
          </button>
        ))}
      </div>
    );
  }

  if (activeMenu === "tasks") {
    return <ProcessRows processes={project.processes} onSelectProcess={onSelectProcess} />;
  }

  if (activeMenu === "checks") {
    return <ProcessRows processes={getChecks(project)} onSelectProcess={onSelectProcess} />;
  }

  if (activeMenu === "versions") {
    const accepted = getAcceptedAssignments(project);
    return (
      <div className="workspace-grid">
        {accepted.map((process) => (
          <button key={process.id} className="workspace-row version-row" onClick={() => onSelectProcess(process.id)}>
            <b>{process.validationAt ?? "в работе"}</b>
            <div>
              <strong>{process.title}</strong>
              <span>{process.sender} → {process.receiver}</span>
            </div>
            <em>{process.description}</em>
          </button>
        ))}
      </div>
    );
  }

  if (activeMenu === "chat") {
    return (
      <>
        <div className="workspace-grid chat-grid">
          {project.chatMessages.map((message) => (
            <button key={message.id} className="chat-row" onClick={() => message.processId && onSelectProcess(message.processId)}>
              <b>{message.author}</b>
              <span>{message.role} · {message.time}</span>
              <p>{message.text}</p>
            </button>
          ))}
        </div>
        <footer className="workspace-actions">
          <button onClick={onReceiveChat}>Сымитировать сообщение с заданием</button>
          <button onClick={onReceiveMail}>Сымитировать письмо с вложением</button>
        </footer>
      </>
    );
  }

  if (activeMenu === "participants") {
    const participants = Array.from(new Set(project.nodes.map((node) => node.responsible).filter(Boolean))) as string[];
    return (
      <div className="workspace-grid">
        {participants.map((name) => (
          <article key={name} className="workspace-row">
            <b>{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</b>
            <div>
              <strong>{name}</strong>
              <span>Участник проектной команды</span>
            </div>
            <em>{project.nodes.filter((node) => node.responsible === name).length} зон</em>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="workspace-grid settings-grid">
      <article className="workspace-row">
        <b>Цвет</b>
        <div>
          <strong>Цвет нод фиксирован правилами</strong>
          <span>Согласованные разделы получают спокойный янтарный акцент, остальные остаются серыми.</span>
        </div>
        <em>без палитры</em>
      </article>
      <article className="workspace-row">
        <b>Связи</b>
        <div>
          <strong>Только ручное построение</strong>
          <span>Нода → плюс → вторая нода. Автоматического прилипания больше нет.</span>
        </div>
        <em>процесс</em>
      </article>
      <article className="workspace-row">
        <b>Теги</b>
        <div>
          <strong>Почта и чат могут предложить связь</strong>
          <span>Если тегов нет, задание прикручивается вручную из входящих.</span>
        </div>
        <em>демо</em>
      </article>
      <article className="workspace-row project-template-settings-row">
        <b>
          <FolderPlus size={16} />
        </b>
        <div>
          <strong>Проекты и шаблоны</strong>
          <span>Создайте новый проект, сохраните текущую структуру как шаблон или запустите проект из готовой схемы.</span>
        </div>
        <button className="settings-open-button" onClick={onOpenProjectManager}>
          Открыть
        </button>
      </article>
    </div>
  );
}

function ProcessRows({ processes, onSelectProcess }: { processes: BusinessProcess[]; onSelectProcess: (processId: string) => void }) {
  if (!processes.length) {
    return <p className="workspace-empty">Нет контейнеров в этом разделе.</p>;
  }

  return (
    <div className="workspace-grid">
      {processes.map((process) => (
        <button key={process.id} className="workspace-row process-row" onClick={() => onSelectProcess(process.id)}>
          <b style={{ color: getProcessStatusColor(process.status) }}>{process.documents.length}</b>
          <div>
            <strong>{process.title}</strong>
            <span>{process.sender} → {process.receiver}</span>
          </div>
          <em>{getProcessStatusText(process.status)}</em>
        </button>
      ))}
    </div>
  );
}
