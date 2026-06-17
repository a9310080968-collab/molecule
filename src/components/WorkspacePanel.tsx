import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Paperclip,
  PencilLine,
  FileStack,
  FolderPlus,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Settings,
  Trash2,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  getAcceptedAssignments,
  getChecks,
  getDocumentFromNode,
  getFileLabel,
  getFileTypeColor,
  getNodeById,
  getProcessStatusColor,
  getProcessStatusText,
} from "../lib/graph";
import type { BusinessProcess, DemoProject, ParticipantEdit, ProcessDocument, ProjectParticipant, ProjectParticipantRole, ProjectParticipantStatus } from "../types";
import type { SidebarMenuId } from "./Sidebar";

type WorkspacePanelProps = {
  activeMenu: SidebarMenuId;
  project: DemoProject;
  onClose: () => void;
  onSelectProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onReceiveMail: () => void;
  onReceiveChat: () => void;
  onSendMessage: (text: string) => void;
  onOpenProjectManager: () => void;
  onAddParticipant: (edit: ParticipantEdit) => void;
  onUpdateParticipant: (participantId: string, edit: ParticipantEdit) => void;
  onDeleteParticipant: (participantId: string) => void;
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
    title: "Мессенджер",
    subtitle: "Живая переписка проекта: сообщения, события из почты и быстрые переходы к бизнес-процессам.",
    badge: "Команда",
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
  onSendMessage,
  onOpenProjectManager,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
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
        onSendMessage={onSendMessage}
        onOpenProjectManager={onOpenProjectManager}
        onAddParticipant={onAddParticipant}
        onUpdateParticipant={onUpdateParticipant}
        onDeleteParticipant={onDeleteParticipant}
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
  onSendMessage,
  onOpenProjectManager,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
}: Omit<WorkspacePanelProps, "onClose">) {
  if (activeMenu === "documents") {
    return <DocumentsRegistry project={project} onOpenDocument={onOpenDocument} />;
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
      <MessengerWorkspace
        project={project}
        onSelectProcess={onSelectProcess}
        onReceiveChat={onReceiveChat}
        onReceiveMail={onReceiveMail}
        onSendMessage={onSendMessage}
      />
    );
  }

  if (activeMenu === "participants") {
    return (
      <ParticipantsManager
        project={project}
        onAddParticipant={onAddParticipant}
        onUpdateParticipant={onUpdateParticipant}
        onDeleteParticipant={onDeleteParticipant}
      />
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
          <strong>Почта и мессенджер могут предложить связь</strong>
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

function MessengerWorkspace({
  project,
  onSelectProcess,
  onReceiveChat,
  onReceiveMail,
  onSendMessage,
}: {
  project: DemoProject;
  onSelectProcess: (processId: string) => void;
  onReceiveChat: () => void;
  onReceiveMail: () => void;
  onSendMessage: (text: string) => void;
}) {
  const [messageText, setMessageText] = useState("");
  const currentUser = project.participants.find((participant) => participant.name === "Павел Андреев")
    ?? project.participants.find((participant) => participant.role === "admin")
    ?? project.participants[0];
  const messages = [...project.chatMessages].reverse();
  const activeProcesses = project.processes
    .filter((process) => process.status !== "accepted")
    .slice(0, 4);

  function submitMessage() {
    const text = messageText.trim();
    if (!text) {
      return;
    }
    onSendMessage(text);
    setMessageText("");
  }

  return (
    <div className="messenger-workspace">
      <section className="messenger-main">
        <header className="messenger-thread-header">
          <div>
            <span>
              <MessageCircle size={16} />
              Мессенджер проекта
            </span>
            <strong>{project.title}</strong>
            <p>{project.participants.length} участников, события из почты и рабочих интеграций попадают сюда же.</p>
          </div>
          <em>{messages.length} сообщений</em>
        </header>

        <div className="messenger-feed" aria-label="Сообщения проекта">
          {messages.length ? messages.map((message) => {
            const isOwn = currentUser ? message.author === currentUser.name : false;

            return (
              <article key={message.id} className={clsx("messenger-message", isOwn && "own")}>
                <header>
                  <b>{message.author}</b>
                  <span>{message.role} · {message.time}</span>
                </header>
                <p>{message.text}</p>
                {message.processId ? (
                  <button className="messenger-process-link" onClick={() => onSelectProcess(message.processId!)}>
                    Открыть бизнес-процесс
                  </button>
                ) : null}
              </article>
            );
          }) : (
            <p className="workspace-empty">В мессенджере пока нет сообщений.</p>
          )}
        </div>

        <footer className="messenger-composer">
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
            placeholder="Напишите сообщение команде проекта..."
          />
          <button className="messenger-send-button" disabled={!messageText.trim()} onClick={submitMessage}>
            <Send size={16} />
            Отправить
          </button>
        </footer>
      </section>

      <aside className="messenger-side" aria-label="События мессенджера">
        <article className="messenger-action-card">
          <span>
            <Paperclip size={15} />
            Демо-события
          </span>
          <strong>Проверка входящих</strong>
          <p>Эти кнопки имитируют, как сообщение или письмо приносит файл и привязывает его к процессу.</p>
          <button onClick={onReceiveChat}>
            <MessageCircle size={15} />
            Событие из мессенджера
          </button>
          <button onClick={onReceiveMail}>
            <Mail size={15} />
            Письмо с вложением
          </button>
        </article>

        <article className="messenger-action-card">
          <span>Активные контейнеры</span>
          {activeProcesses.length ? activeProcesses.map((process) => (
            <button key={process.id} onClick={() => onSelectProcess(process.id)}>
              <i style={{ background: getProcessStatusColor(process.status) }} />
              <div>
                <b>{process.title}</b>
                <small>{getProcessStatusText(process.status)}</small>
              </div>
            </button>
          )) : <p>Нет активных контейнеров.</p>}
        </article>
      </aside>
    </div>
  );
}

type RegistryDocument = {
  document: ProcessDocument;
  groupKey: string;
  groupCode: string;
  groupTitle: string;
  location: string;
  ownerNodeId?: string;
  processId?: string;
  isOrphan: boolean;
};

type DocumentGroup = {
  key: string;
  code: string;
  title: string;
  documents: RegistryDocument[];
  isOrphan: boolean;
};

function DocumentsRegistry({ project, onOpenDocument }: { project: DemoProject; onOpenDocument: (document: ProcessDocument) => void }) {
  const groups = buildDocumentRegistry(project);
  const total = groups.reduce((sum, group) => sum + group.documents.length, 0);
  const orphanCount = groups.find((group) => group.isOrphan)?.documents.length ?? 0;

  if (!total) {
    return <p className="workspace-empty">В проекте пока нет документов.</p>;
  }

  return (
    <div className="documents-registry">
      <section className="documents-registry-summary">
        <article>
          <strong>{total}</strong>
          <span>актуальных документов</span>
        </article>
        <article>
          <strong>{groups.length}</strong>
          <span>разделов и нод</span>
        </article>
        <article>
          <strong>{orphanCount}</strong>
          <span>бесхозных наверху</span>
        </article>
      </section>

      <div className="documents-registry-groups">
        {groups.map((group) => (
          <section key={group.key} className={group.isOrphan ? "document-group orphan-document-group" : "document-group"}>
            <header>
              <b>{group.code}</b>
              <div>
                <strong>{group.title}</strong>
                <span>{group.documents.length} последних версий</span>
              </div>
            </header>
            <div className="document-group-list">
              {group.documents.map((item) => (
                <button key={`${item.groupKey}-${item.document.id}`} className="document-registry-row" onClick={() => onOpenDocument(item.document)}>
                  <b style={{ color: getFileTypeColor(item.document.fileType) }}>{getFileLabel(item.document.fileType)}</b>
                  <div>
                    <strong>{item.document.title}</strong>
                    <span>{item.location}</span>
                  </div>
                  <em>{item.document.version}</em>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function buildDocumentRegistry(project: DemoProject): DocumentGroup[] {
  const entries: RegistryDocument[] = [];

  project.inboxDocuments.forEach((document) => {
    entries.push(createRegistryEntry(project, document, "Входящие без связи", undefined, undefined, true));
  });

  project.nodes
    .filter((node) => node.type === "document" && node.document)
    .forEach((node) => {
      const document = getDocumentFromNode(node);
      const owner = node.documentOwnerNodeId ? getNodeById(project, node.documentOwnerNodeId) : undefined;
      entries.push(
        createRegistryEntry(
          project,
          document,
          owner ? `Внутри ноды: ${owner.shortCode ?? owner.title}` : "Бесхозный файл на карте",
          owner?.id,
          undefined,
          !owner,
        ),
      );
    });

  project.processes.forEach((process) => {
    process.documents.forEach((document) => {
      const owner = findDocumentOwnerNode(project, document, process.from);
      entries.push(createRegistryEntry(project, document, `Контейнер: ${process.title}`, owner?.id, process.id, false));
    });
  });

  const latestEntries = getLatestRegistryEntries(entries);
  const groupsByKey = new Map<string, DocumentGroup>();

  latestEntries.forEach((entry) => {
    const group = groupsByKey.get(entry.groupKey) ?? {
      key: entry.groupKey,
      code: entry.groupCode,
      title: entry.groupTitle,
      documents: [],
      isOrphan: entry.isOrphan,
    };
    group.documents.push(entry);
    groupsByKey.set(entry.groupKey, group);
  });

  return Array.from(groupsByKey.values())
    .map((group) => ({
      ...group,
      documents: group.documents.sort((a, b) => b.document.updatedAt.localeCompare(a.document.updatedAt) || a.document.title.localeCompare(b.document.title, "ru")),
    }))
    .sort((a, b) => {
      if (a.isOrphan !== b.isOrphan) {
        return a.isOrphan ? -1 : 1;
      }
      return a.code.localeCompare(b.code, "ru");
    });
}

function createRegistryEntry(
  project: DemoProject,
  document: ProcessDocument,
  location: string,
  ownerNodeId?: string,
  processId?: string,
  isOrphan = false,
): RegistryDocument {
  const owner = ownerNodeId ? getNodeById(project, ownerNodeId) : findDocumentOwnerNode(project, document);

  if (isOrphan || !owner) {
    return {
      document,
      groupKey: "00-orphans",
      groupCode: "Бесхозные",
      groupTitle: "Нераспределенные и входящие файлы",
      location,
      ownerNodeId,
      processId,
      isOrphan: true,
    };
  }

  return {
    document,
    groupKey: `node-${owner.id}`,
    groupCode: owner.shortCode ?? owner.title,
    groupTitle: owner.title,
    location,
    ownerNodeId: owner.id,
    processId,
    isOrphan: false,
  };
}

function getLatestRegistryEntries(entries: RegistryDocument[]) {
  const byIdentity = new Map<string, RegistryDocument>();

  entries.forEach((entry) => {
    const identity = `${entry.groupKey}-${normalizeDocumentTitle(entry.document.title)}-${entry.document.fileType}`;
    const current = byIdentity.get(identity);
    if (!current || compareDocumentVersions(entry.document, current.document) > 0) {
      byIdentity.set(identity, entry);
    }
  });

  return Array.from(byIdentity.values());
}

function compareDocumentVersions(left: ProcessDocument, right: ProcessDocument) {
  const leftVersion = parseVersionScore(left.version) || parseVersionScore(left.title);
  const rightVersion = parseVersionScore(right.version) || parseVersionScore(right.title);
  if (leftVersion !== rightVersion) {
    return leftVersion - rightVersion;
  }
  return left.updatedAt.localeCompare(right.updatedAt);
}

function parseVersionScore(value: string) {
  const match = value.match(/v(?:er)?\.?\s*(\d+(?:[.,]\d+)?)/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function normalizeDocumentTitle(title: string) {
  return title
    .replace(/\.[^.]+$/, "")
    .replace(/[_\s-]*v(?:er)?\.?\s*\d+(?:[.,]\d+)?/gi, "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function findDocumentOwnerNode(project: DemoProject, document: ProcessDocument, fallbackNodeId?: string) {
  const marker = normalizeSectionMarker(document.detectedTag ?? document.from);
  const markerMatch = marker
    ? project.nodes.find((node) => {
        if (node.type === "document" || node.type === "central") {
          return false;
        }
        return [node.shortCode, node.title, ...(node.tags ?? [])].some((value) => normalizeSectionMarker(value ?? "") === marker);
      })
    : undefined;

  return markerMatch ?? getNodeById(project, fallbackNodeId);
}

function normalizeSectionMarker(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, "");
}

const participantRoleLabels: Record<ProjectParticipantRole, string> = {
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

const participantStatusLabels: Record<ProjectParticipantStatus, string> = {
  active: "Активен",
  invited: "Приглашен",
  blocked: "Отключен",
};

const emptyParticipantForm: ParticipantEdit = {
  name: "",
  position: "",
  role: "engineer",
  email: "",
  phone: "",
  messenger: "",
  otherContacts: "",
  status: "active",
};

function ParticipantsManager({
  project,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
}: {
  project: DemoProject;
  onAddParticipant: (edit: ParticipantEdit) => void;
  onUpdateParticipant: (participantId: string, edit: ParticipantEdit) => void;
  onDeleteParticipant: (participantId: string) => void;
}) {
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ParticipantEdit>(emptyParticipantForm);
  const adminCount = project.participants.filter((participant) => participant.role === "admin").length;
  const canSubmit = Boolean(form.name.trim() && form.position.trim() && form.email.trim() && form.phone.trim());

  useEffect(() => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyParticipantForm);
  }, [project.id]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyParticipantForm);
    setEditorOpen(true);
  }

  function openEdit(participant: ProjectParticipant) {
    setEditingId(participant.id);
    setForm({
      name: participant.name,
      position: participant.position,
      role: participant.role,
      email: participant.email,
      phone: participant.phone,
      messenger: participant.messenger ?? "",
      otherContacts: participant.otherContacts ?? "",
      status: participant.status,
    });
    setEditorOpen(true);
  }

  function submitParticipant() {
    if (!canSubmit) {
      return;
    }

    const edit: ParticipantEdit = {
      ...form,
      name: form.name.trim(),
      position: form.position.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      messenger: form.messenger?.trim(),
      otherContacts: form.otherContacts?.trim(),
    };

    if (editingId) {
      onUpdateParticipant(editingId, edit);
    } else {
      onAddParticipant(edit);
    }
    setEditingId(null);
    setForm(emptyParticipantForm);
    setEditorOpen(false);
  }

  return (
    <div className={`participants-manager ${isEditorOpen ? "editor-open" : ""}`}>
      <section className="participants-toolbar">
        <div>
          <span>
            <ShieldCheck size={16} />
            Админский режим
          </span>
          <strong>{project.participants.length} участников</strong>
          <p>Email и телефон обязательны. Мессенджер и другие способы связи можно заполнить позже.</p>
        </div>
        <button onClick={openCreate}>
          <UserPlus size={17} />
          Добавить пользователя
        </button>
      </section>

      {isEditorOpen ? (
        <section className="participant-editor">
          <header>
            <div>
              <span>{editingId ? "Редактирование" : "Новый пользователь"}</span>
              <strong>{editingId ? form.name || "Карточка участника" : "Добавить в проект"}</strong>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                setEditorOpen(false);
                setEditingId(null);
                setForm(emptyParticipantForm);
              }}
              aria-label="Закрыть форму"
            >
              <X size={18} />
            </button>
          </header>

          <div className="participant-form-grid">
            <label>
              <span>ФИО</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} placeholder="Например, Иван Петров" />
            </label>
            <label>
              <span>Должность</span>
              <input value={form.position} onChange={(event) => setForm({ ...form, position: event.currentTarget.value })} placeholder="Ведущий инженер" />
            </label>
            <label>
              <span>Роль</span>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.currentTarget.value as ProjectParticipantRole })}>
                {Object.entries(participantRoleLabels).map(([role, label]) => (
                  <option key={role} value={role}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Статус</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.currentTarget.value as ProjectParticipantStatus })}>
                {Object.entries(participantStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Почта *</span>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.currentTarget.value })} placeholder="name@company.ru" />
            </label>
            <label>
              <span>Телефон *</span>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })} placeholder="+7 900 000-00-00" />
            </label>
            <label>
              <span>Мессенджер</span>
              <input value={form.messenger ?? ""} onChange={(event) => setForm({ ...form, messenger: event.currentTarget.value })} placeholder="@telegram / WhatsApp" />
            </label>
            <label>
              <span>Другие способы связи</span>
              <input value={form.otherContacts ?? ""} onChange={(event) => setForm({ ...form, otherContacts: event.currentTarget.value })} placeholder="Teams, Диадок, внутренний номер" />
            </label>
          </div>

          <footer>
            <small>{canSubmit ? "Карточка готова к сохранению." : "Заполните ФИО, должность, почту и телефон."}</small>
            <button className="settings-open-button" disabled={!canSubmit} onClick={submitParticipant}>
              {editingId ? "Сохранить" : "Добавить"}
            </button>
          </footer>
        </section>
      ) : null}

      <div className="participants-grid">
        {project.participants.map((participant) => {
          const relatedNodes = project.nodes.filter((node) => node.responsible === participant.name).length;
          const canDelete = participant.role !== "admin" || adminCount > 1;

          return (
            <article key={participant.id} className="participant-card">
              <div className="participant-avatar">{getInitials(participant.name)}</div>
              <div className="participant-main">
                <header>
                  <div>
                    <strong>{participant.name}</strong>
                    <span>{participant.position}</span>
                  </div>
                  <em>{participantRoleLabels[participant.role]}</em>
                </header>
                <div className="participant-contacts">
                  <span>
                    <Mail size={14} />
                    {participant.email}
                  </span>
                  <span>
                    <Phone size={14} />
                    {participant.phone}
                  </span>
                  {participant.messenger ? <span>{participant.messenger}</span> : null}
                  {participant.otherContacts ? <span>{participant.otherContacts}</span> : null}
                </div>
                <footer>
                  <small>{participantStatusLabels[participant.status]}</small>
                  <small>{relatedNodes ? `${relatedNodes} зон ответственности` : "без назначенных зон"}</small>
                </footer>
              </div>
              <div className="participant-actions">
                <button onClick={() => openEdit(participant)} title="Редактировать пользователя">
                  <PencilLine size={16} />
                </button>
                <button
                  onClick={() => onDeleteParticipant(participant.id)}
                  disabled={!canDelete}
                  title={canDelete ? "Удалить пользователя" : "Нельзя удалить последнего администратора"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
