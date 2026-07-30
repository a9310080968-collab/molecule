import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Paperclip,
  PencilLine,
  FileStack,
  FilePlus2,
  FolderPlus,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Settings,
  Scaling,
  Trash2,
  Type,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import type { DemoAccess } from "../lib/demoAccess";
import { useI18n } from "../lib/i18n";
import {
  getAcceptedAssignments,
  getChecks,
  getDefaultLevel,
  getDocumentFromNode,
  getFileLabel,
  getFileTypeColor,
  getLevelNodes,
  getNodeById,
  getProcessStatusColor,
  getProcessStatusText,
} from "../lib/graph";
import type {
  BusinessProcess,
  DemoProject,
  NodeStatus,
  ParticipantEdit,
  ProcessDocument,
  ProjectParticipant,
  ProjectParticipantRole,
  ProjectParticipantStatus,
  ProjectTemplate,
  ProjectVisibilityMode,
} from "../types";
import type { SidebarMenuId } from "./Sidebar";

type WorkspacePanelProps = {
  activeMenu: SidebarMenuId;
  project: DemoProject;
  user?: ProjectParticipant;
  access: DemoAccess;
  onClose: () => void;
  onSelectProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onReceiveMail: () => void;
  onReceiveChat: () => void;
  onSendMessage: (text: string) => void;
  projectTemplates: ProjectTemplate[];
  onCreateTemplate: (title: string, description: string) => ProjectTemplate | undefined;
  onCreateTaggedDocument: (title: string, tag: string) => void;
  onCreateTaskDraft: (edit: WorkspaceTaskDraft) => void;
  onUpdateDocumentStatus: (documentId: string, status: NodeStatus) => void;
  onAddParticipant: (edit: ParticipantEdit) => void;
  onUpdateParticipant: (participantId: string, edit: ParticipantEdit) => void;
  onDeleteParticipant: (participantId: string) => void;
  fontScale: number;
  interfaceScale: number;
  onFontScaleChange: (scale: number) => void;
  onInterfaceScaleChange: (scale: number) => void;
};

export type WorkspaceTaskDraft = {
  title: string;
  description: string;
  fromNodeId: string;
  toNodeId: string;
  dueAt?: string;
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
    subtitle: "Масштаб текста и интерфейса, шаблоны проекта и правила визуализации.",
    badge: "Интерфейс",
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
  user,
  access,
  onClose,
  onSelectProcess,
  onOpenDocument,
  onReceiveMail,
  onReceiveChat,
  onSendMessage,
  projectTemplates,
  onCreateTemplate,
  onCreateTaggedDocument,
  onCreateTaskDraft,
  onUpdateDocumentStatus,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
  fontScale,
  interfaceScale,
  onFontScaleChange,
  onInterfaceScaleChange,
}: WorkspacePanelProps) {
  const { t } = useI18n();
  if (activeMenu === "map") {
    return null;
  }

  const meta = menuMeta[activeMenu];
  const Icon = meta.icon;

  return (
    <section className="workspace-panel glass-panel" aria-label={t(meta.title)}>
      <header className="workspace-header">
        <div>
          <span>
            <Icon size={18} />
            {t(meta.badge)}
          </span>
          <h2>{t(meta.title)}</h2>
          <p>{t(meta.subtitle)}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={t("Закрыть раздел")}>
          <X size={20} />
        </button>
      </header>

      <WorkspaceContent
        activeMenu={activeMenu}
        project={project}
        user={user}
        access={access}
        onSelectProcess={onSelectProcess}
        onOpenDocument={onOpenDocument}
        onReceiveMail={onReceiveMail}
        onReceiveChat={onReceiveChat}
        onSendMessage={onSendMessage}
        projectTemplates={projectTemplates}
        onCreateTemplate={onCreateTemplate}
        onCreateTaggedDocument={onCreateTaggedDocument}
        onCreateTaskDraft={onCreateTaskDraft}
        onUpdateDocumentStatus={onUpdateDocumentStatus}
        onAddParticipant={onAddParticipant}
        onUpdateParticipant={onUpdateParticipant}
        onDeleteParticipant={onDeleteParticipant}
        fontScale={fontScale}
        interfaceScale={interfaceScale}
        onFontScaleChange={onFontScaleChange}
        onInterfaceScaleChange={onInterfaceScaleChange}
      />
    </section>
  );
}

function WorkspaceContent({
  activeMenu,
  project,
  user,
  access,
  onSelectProcess,
  onOpenDocument,
  onReceiveMail,
  onReceiveChat,
  onSendMessage,
  projectTemplates,
  onCreateTemplate,
  onCreateTaggedDocument,
  onCreateTaskDraft,
  onUpdateDocumentStatus,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
  fontScale,
  interfaceScale,
  onFontScaleChange,
  onInterfaceScaleChange,
}: Omit<WorkspacePanelProps, "onClose">) {
  const { t, system } = useI18n();
  if (activeMenu === "documents") {
    return (
      <DocumentsRegistry
        project={project}
        onOpenDocument={onOpenDocument}
        onCreateTaggedDocument={onCreateTaggedDocument}
        canCreate={access.canUploadFiles}
      />
    );
  }

  if (activeMenu === "tasks") {
    return (
      <TasksWorkspace
        project={project}
        processes={project.processes}
        onSelectProcess={onSelectProcess}
        onCreateTaskDraft={onCreateTaskDraft}
        canCreateTasks={access.canCreateTasks}
      />
    );
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
            <b>{system(process.validationAt ?? t("В работе"))}</b>
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
        user={user}
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
        canManage={access.canManageUsers}
        onAddParticipant={onAddParticipant}
        onUpdateParticipant={onUpdateParticipant}
        onDeleteParticipant={onDeleteParticipant}
      />
    );

  }

  return (
    <SettingsWorkspace
      project={project}
      projectTemplates={projectTemplates}
      onCreateTemplate={onCreateTemplate}
      canViewProjectSettings={access.canViewProjectSettings}
      fontScale={fontScale}
      interfaceScale={interfaceScale}
      onFontScaleChange={onFontScaleChange}
      onInterfaceScaleChange={onInterfaceScaleChange}
    />
  );
}

function SettingsWorkspace({
  project,
  projectTemplates,
  onCreateTemplate,
  canViewProjectSettings,
  fontScale,
  interfaceScale,
  onFontScaleChange,
  onInterfaceScaleChange,
}: {
  project: DemoProject;
  projectTemplates: ProjectTemplate[];
  onCreateTemplate: (title: string, description: string) => ProjectTemplate | undefined;
  canViewProjectSettings: boolean;
  fontScale: number;
  interfaceScale: number;
  onFontScaleChange: (scale: number) => void;
  onInterfaceScaleChange: (scale: number) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(() => `${project.title}: ${t("шаблон")}`);
  const [description, setDescription] = useState(() => t("Структура проекта без рабочих документов."));

  useEffect(() => {
    setTitle((current) =>
      current === `${project.title}: шаблон` || current === `${project.title}: template`
        ? `${project.title}: ${t("шаблон")}`
        : current,
    );
    setDescription((current) =>
      current === "Структура проекта без рабочих документов." || current === "Project structure without working documents."
        ? t("Структура проекта без рабочих документов.")
        : current,
    );
  }, [project.title, t]);

  function saveTemplate() {
    const template = onCreateTemplate(title, description);
    if (!template) {
      return;
    }
    setTitle(t("{title}: копия", { title: t(template.title) }));
    setDescription(t(template.description));
  }

  return (
    <div className="settings-workspace">
      <section className="template-settings-card appearance-settings-card">
        <div className="section-title">
          <Scaling size={18} />
          <div>
            <h3>{t("Масштаб интерфейса")}</h3>
            <p>{t("Размеры текста и рабочих панелей сохраняются для этого браузера.")}</p>
          </div>
        </div>
        <label className="appearance-setting-row">
          <Type size={18} />
          <span>
            <strong>{t("Размер текста")}</strong>
            <small>{t("Подписи, поля и служебный текст")}</small>
          </span>
          <input
            type="range"
            min="0.85"
            max="1.25"
            step="0.05"
            value={fontScale}
            onChange={(event) => onFontScaleChange(Number(event.currentTarget.value))}
          />
          <b>{Math.round(fontScale * 100)}%</b>
        </label>
        <label className="appearance-setting-row">
          <Scaling size={18} />
          <span>
            <strong>{t("Размер интерфейса")}</strong>
            <small>{t("Ширина панелей и размер основных элементов управления")}</small>
          </span>
          <input
            type="range"
            min="0.85"
            max="1.2"
            step="0.05"
            value={interfaceScale}
            onChange={(event) => onInterfaceScaleChange(Number(event.currentTarget.value))}
          />
          <b>{Math.round(interfaceScale * 100)}%</b>
        </label>
      </section>

      {canViewProjectSettings ? (
        <>
          <section className="template-settings-card">
            <div className="section-title">
              <FolderPlus size={18} />
              <div>
                <h3>{t("Шаблоны проектов")}</h3>
                <p>{t("Шаблоны создаются здесь, отдельно от конструктора нового проекта.")}</p>
              </div>
            </div>
            <div className="template-settings-form">
              <label>
                <span>{t("Название шаблона")}</span>
                <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
              </label>
              <label>
                <span>{t("Описание")}</span>
                <textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
              </label>
              <button className="settings-open-button" onClick={saveTemplate}>
                {t("Сохранить текущий проект как шаблон")}
              </button>
            </div>
          </section>

          <section className="template-settings-card">
            <div className="section-title">
              <FileStack size={18} />
              <div>
                <h3>{t("Доступные шаблоны")}</h3>
                <p>{t("Эти шаблоны доступны в форме создания нового проекта.")}</p>
              </div>
            </div>
            <div className="settings-template-list">
              {projectTemplates.map((template) => (
                <article key={template.id}>
                  <strong>{t(template.title)}</strong>
                  <span>{t(template.description)}</span>
                  <em>{formatTemplateStats(template.nodes.length, template.levels.length, t(template.sourceProjectTitle))}</em>
                </article>
              ))}
            </div>
          </section>

          <div className="workspace-grid settings-grid">
            <article className="workspace-row">
              <b>{t("Цвет")}</b>
              <div>
                <strong>{t("Цвет нод фиксирован правилами")}</strong>
                <span>{t("Согласованные разделы получают спокойный янтарный акцент, остальные остаются серыми.")}</span>
              </div>
              <em>{t("без палитры")}</em>
            </article>
            <article className="workspace-row">
              <b>{t("Связи")}</b>
              <div>
                <strong>{t("Только ручное построение")}</strong>
                <span>{t("Нода → плюс → вторая нода. Автоматического прилипания больше нет.")}</span>
              </div>
              <em>{t("процесс")}</em>
            </article>
            <article className="workspace-row">
              <b>{t("Теги")}</b>
              <div>
                <strong>{t("Почта и мессенджер могут предложить связь")}</strong>
                <span>{t("Если тегов нет, задание прикручивается вручную из входящих.")}</span>
              </div>
              <em>{t("демо")}</em>
            </article>
          </div>
        </>
      ) : null}
    </div>
  );
}

function formatTemplateStats(nodes: number, levels: number, source: string) {
  return `${nodes} ${nodes === 1 ? "node" : "nodes"} · ${levels} ${levels === 1 ? "level" : "levels"} · ${source}`;
}

function TasksWorkspace({
  project,
  processes,
  onSelectProcess,
  onCreateTaskDraft,
  canCreateTasks,
}: {
  project: DemoProject;
  processes: BusinessProcess[];
  onSelectProcess: (processId: string) => void;
  onCreateTaskDraft: (edit: WorkspaceTaskDraft) => void;
  canCreateTasks: boolean;
}) {
  const { t } = useI18n();
  const rootLevel = getDefaultLevel(project);
  const nodes = getLevelNodes(project, rootLevel).filter((node) => node.type !== "central" && node.type !== "document");
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [title, setTitle] = useState(() => t("Новое задание"));
  const [description, setDescription] = useState(() => t("Передать комплект документов на проверку."));
  const [fromNodeId, setFromNodeId] = useState(nodes[0]?.id ?? "");
  const [toNodeId, setToNodeId] = useState(nodes[1]?.id ?? nodes[0]?.id ?? "");
  const [dueAt, setDueAt] = useState(() => t("сегодня, 18:00"));
  const canCreate = Boolean(title.trim() && fromNodeId && toNodeId && fromNodeId !== toNodeId);

  function createTask() {
    if (!canCreate) {
      return;
    }
    onCreateTaskDraft({
      title,
      description,
      fromNodeId,
      toNodeId,
      dueAt,
    });
    setCreatorOpen(false);
  }

  return (
    <div className="tasks-workspace">
      <section className="tasks-toolbar">
        <div>
          <strong>{t("Задания проекта")}</strong>
          <span>{t("Задание можно создать прямо здесь, без выбора ноды на карте.")}</span>
        </div>
        {canCreateTasks ? (
          <button onClick={() => setCreatorOpen(true)}>
            <ClipboardCheck size={17} />
            {t("Создать задание")}
          </button>
        ) : null}
      </section>

      {creatorOpen && canCreateTasks ? (
        <section className="task-create-card">
          <header>
            <strong>{t("Новое задание")}</strong>
            <button className="icon-button" onClick={() => setCreatorOpen(false)} aria-label={t("Закрыть создание задания")}>
              <X size={18} />
            </button>
          </header>
          <div className="task-create-grid">
            <label>
              <span>{t("Название")}</span>
              <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
            </label>
            <label>
              <span>{t("Срок")}</span>
              <input value={dueAt} onChange={(event) => setDueAt(event.currentTarget.value)} />
            </label>
            <label>
              <span>{t("Откуда")}</span>
              <select value={fromNodeId} onChange={(event) => setFromNodeId(event.currentTarget.value)}>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.shortCode ?? node.title} · {node.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Куда")}</span>
              <select value={toNodeId} onChange={(event) => setToNodeId(event.currentTarget.value)}>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.shortCode ?? node.title} · {node.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              <span>{t("Описание")}</span>
              <textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
            </label>
          </div>
          <footer>
            <span>{canCreate ? t("Будет создан черновик бизнес-процесса.") : t("Выберите разные ноды отправителя и получателя.")}</span>
            <button className="primary-action" disabled={!canCreate} onClick={createTask}>
              {t("Создать задание")}
            </button>
          </footer>
        </section>
      ) : null}

      <ProcessRows processes={processes} onSelectProcess={onSelectProcess} />
    </div>
  );
}

function MessengerWorkspace({
  project,
  user,
  onSelectProcess,
  onReceiveChat,
  onReceiveMail,
  onSendMessage,
}: {
  project: DemoProject;
  user?: ProjectParticipant;
  onSelectProcess: (processId: string) => void;
  onReceiveChat: () => void;
  onReceiveMail: () => void;
  onSendMessage: (text: string) => void;
}) {
  const { t, system } = useI18n();
  const [messageText, setMessageText] = useState("");
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
              {t("Мессенджер проекта")}
            </span>
            <strong>{project.title}</strong>
            <p>{t("{count} участников, события из почты и рабочих интеграций попадают сюда же.", { count: project.participants.length })}</p>
          </div>
          <em>{t("{count} сообщений", { count: messages.length })}</em>
        </header>

        <div className="messenger-feed" aria-label={t("Сообщения проекта")}>
          {messages.length ? messages.map((message) => {
            const isOwn = user ? message.author === user.name : false;

            return (
              <article key={message.id} className={clsx("messenger-message", isOwn && "own")}>
                <header>
                  <b>{message.author}</b>
                  <span>{t(message.role)} · {system(message.time)}</span>
                </header>
                <p>{system(message.text)}</p>
                {message.processId ? (
                  <button className="messenger-process-link" onClick={() => onSelectProcess(message.processId!)}>
                    {t("Открыть бизнес-процесс")}
                  </button>
                ) : null}
              </article>
            );
          }) : (
            <p className="workspace-empty">{t("В мессенджере пока нет сообщений.")}</p>
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
            placeholder={t("Напишите сообщение команде проекта...")}
          />
          <button className="messenger-send-button" disabled={!messageText.trim()} onClick={submitMessage}>
            <Send size={16} />
            {t("Отправить")}
          </button>
        </footer>
      </section>

      <aside className="messenger-side" aria-label={t("События мессенджера")}>
        <article className="messenger-action-card">
          <span>
            <Paperclip size={15} />
            {t("Демо-события")}
          </span>
          <strong>{t("Проверка входящих")}</strong>
          <p>{t("Эти кнопки имитируют, как сообщение или письмо приносит файл и привязывает его к процессу.")}</p>
          <button onClick={onReceiveChat}>
            <MessageCircle size={15} />
            {t("Событие из мессенджера")}
          </button>
          <button onClick={onReceiveMail}>
            <Mail size={15} />
            {t("Письмо с вложением")}
          </button>
        </article>

        <article className="messenger-action-card">
          <span>{t("Активные контейнеры")}</span>
          {activeProcesses.length ? activeProcesses.map((process) => (
            <button key={process.id} onClick={() => onSelectProcess(process.id)}>
              <i style={{ background: getProcessStatusColor(process.status) }} />
              <div>
                <b>{process.title}</b>
                <small>{t(getProcessStatusText(process.status))}</small>
              </div>
            </button>
          )) : <p>{t("Нет активных контейнеров.")}</p>}
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

function DocumentsRegistry({
  project,
  onOpenDocument,
  onCreateTaggedDocument,
  canCreate,
}: {
  project: DemoProject;
  onOpenDocument: (document: ProcessDocument) => void;
  onCreateTaggedDocument: (title: string, tag: string) => void;
  canCreate: boolean;
}) {
  const { t, system } = useI18n();
  const groups = buildDocumentRegistry(project, t);
  const total = groups.reduce((sum, group) => sum + group.documents.length, 0);
  const orphanCount = groups.find((group) => group.isOrphan)?.documents.length ?? 0;
  const [creatorOpen, setCreatorOpen] = useState(false);

  if (!total) {
    return (
      <div className="documents-registry empty-documents-registry">
        {canCreate ? (
          <button className="documents-create-button" onClick={() => setCreatorOpen(true)}>
            <FilePlus2 size={17} />
            {t("Создать тестовый документ")}
          </button>
        ) : null}
        <p className="workspace-empty">{t("В проекте пока нет документов.")}</p>
        {creatorOpen && canCreate ? (
          <TaggedDocumentModal
            onClose={() => setCreatorOpen(false)}
            onCreate={(title, tag) => {
              onCreateTaggedDocument(title, tag);
              setCreatorOpen(false);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="documents-registry">
      <div className="documents-registry-toolbar">
        <div>
          <strong>{t("Реестр последних версий")}</strong>
          <span>{t("Одинаковые названия внутри одного раздела схлопываются до самой поздней записи.")}</span>
        </div>
        {canCreate ? (
          <button onClick={() => setCreatorOpen(true)}>
            <FilePlus2 size={17} />
            {t("Создать тестовый документ")}
          </button>
        ) : null}
      </div>
      <section className="documents-registry-summary">
        <article>
          <strong>{total}</strong>
          <span>{t("актуальных документов")}</span>
        </article>
        <article>
          <strong>{groups.length}</strong>
          <span>{t("разделов и нод")}</span>
        </article>
        <article>
          <strong>{orphanCount}</strong>
          <span>{t("бесхозных наверху")}</span>
        </article>
      </section>

      <div className="documents-registry-groups">
        {groups.map((group) => (
          <section key={group.key} className={group.isOrphan ? "document-group orphan-document-group" : "document-group"}>
            <header>
              <b>{group.code}</b>
              <div>
                <strong>{group.title}</strong>
                <span>{t("{count} последних версий", { count: group.documents.length })}</span>
              </div>
            </header>
            <div className="document-group-list">
              {group.documents.map((item) => (
                <button key={`${item.groupKey}-${item.document.id}`} className="document-registry-row" onClick={() => onOpenDocument(item.document)}>
                  <b style={{ color: getFileTypeColor(item.document.fileType) }}>{t(getFileLabel(item.document.fileType))}</b>
                  <div>
                    <strong>{item.document.title}</strong>
                    <span>{t("{location} · {source} · изменён {time}", { location: item.location, source: t(getDocumentSourceLabel(item.document)), time: system(item.document.updatedAt) })}</span>
                  </div>
                  <em>{item.document.version}</em>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {creatorOpen && canCreate ? (
        <TaggedDocumentModal
          onClose={() => setCreatorOpen(false)}
          onCreate={(title, tag) => {
            onCreateTaggedDocument(title, tag);
            setCreatorOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function TaggedDocumentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, tag: string) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("Планировка_АР.pdf");
  const [tag, setTag] = useState("АР");
  const canCreate = Boolean(title.trim());

  return (
    <div className="inner-modal-backdrop" role="dialog" aria-modal="true">
      <article className="tagged-document-modal glass-panel">
        <header>
          <div>
            <span>
              <FilePlus2 size={17} />
              {t("Тестовый документ")}
            </span>
            <h3>{t("Создать документ с тегом")}</h3>
            <p>{t("Если тег совпадет с тегом ноды, документ сразу попадет внутрь этой ноды.")}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Закрыть")}>
            <X size={18} />
          </button>
        </header>
        <label>
          <span>{t("Название файла")}</span>
          <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder={t("Например: Планировка_АР.pdf")} />
        </label>
        <label>
          <span>{t("Тег маршрутизации")}</span>
          <input value={tag} onChange={(event) => setTag(event.currentTarget.value)} placeholder={t("АР, КР, ПЗ, ВК...")} />
        </label>
        <footer>
          <button onClick={onClose}>{t("Отмена")}</button>
          <button className="primary-action" disabled={!canCreate} onClick={() => onCreate(title, tag)}>
            {t("Создать документ")}
          </button>
        </footer>
      </article>
    </div>
  );
}

function buildDocumentRegistry(project: DemoProject, t: (source: string, params?: Record<string, string | number>) => string): DocumentGroup[] {
  const entries: RegistryDocument[] = [];

  project.inboxDocuments.forEach((document) => {
    entries.push(createRegistryEntry(project, document, t("Входящие без связи"), t, undefined, undefined, true));
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
          owner ? t("Внутри ноды: {node}", { node: owner.shortCode ?? owner.title }) : t("Бесхозный файл на карте"),
          t,
          owner?.id,
          undefined,
          !owner,
        ),
      );
    });

  project.processes.forEach((process) => {
    process.documents.forEach((document) => {
      const owner = findDocumentOwnerNode(project, document, process.from);
      entries.push(createRegistryEntry(project, document, t("Контейнер: {process}", { process: process.title }), t, owner?.id, process.id, false));
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
      documents: group.documents.sort((a, b) => compareDocumentVersions(b.document, a.document) || a.document.title.localeCompare(b.document.title, "ru")),
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
  t: (source: string, params?: Record<string, string | number>) => string,
  ownerNodeId?: string,
  processId?: string,
  isOrphan = false,
): RegistryDocument {
  const owner = ownerNodeId ? getNodeById(project, ownerNodeId) : findDocumentOwnerNode(project, document);

  if (isOrphan || !owner) {
    return {
      document,
      groupKey: "00-orphans",
      groupCode: t("Бесхозные"),
      groupTitle: t("Нераспределенные и входящие файлы"),
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
    const identity = `${entry.groupKey}-${normalizeExactDocumentTitle(entry.document.title)}-${entry.document.fileType}`;
    const current = byIdentity.get(identity);
    if (!current || compareDocumentVersions(entry.document, current.document) > 0) {
      byIdentity.set(identity, entry);
    }
  });

  return Array.from(byIdentity.values());
}

function compareDocumentVersions(left: ProcessDocument, right: ProcessDocument) {
  const leftDate = parseDocumentDateScore(left.updatedAt);
  const rightDate = parseDocumentDateScore(right.updatedAt);
  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }
  const leftVersion = parseVersionScore(left.version) || parseVersionScore(left.title);
  const rightVersion = parseVersionScore(right.version) || parseVersionScore(right.title);
  return leftVersion - rightVersion;
}

function getDocumentSourceLabel(document: ProcessDocument) {
  const source = document.integrationProvider ?? document.source;
  const labels: Record<string, string> = {
    outlook: "Outlook",
    yandex: "Яндекс Почта",
    gmail: "Gmail",
    telegram: "Telegram",
    folder: "Рабочая папка",
    mail: "Почта",
    chat: "Мессенджер",
    drop: "Загрузка",
    manual: "Создан вручную",
    demo: "Демо-данные",
  };
  return source ? labels[source] ?? "Внешний источник" : "Источник не указан";
}

function parseVersionScore(value: string) {
  const match = value.match(/v(?:er)?\.?\s*(\d+(?:[.,]\d+)?)/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function normalizeExactDocumentTitle(title: string) {
  return title
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDocumentDateScore(value: string) {
  const normalized = value.toLocaleLowerCase("ru-RU");
  if (normalized.includes("только")) {
    return 9_999_999_999;
  }
  if (normalized.includes("сегодня")) {
    return 9_000_000_000;
  }

  const match = normalized.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!match) {
    return 0;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  return year * 10000 + month * 100 + day;
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

const visibilityModeLabels: Record<ProjectVisibilityMode, string> = {
  all: "Видит все ноды",
  assigned: "Только назначенные",
  custom: "Выбранные ноды",
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
  visibilityMode: "all",
  visibleNodeIds: [],
};

function ParticipantsManager({
  project,
  canManage,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
}: {
  project: DemoProject;
  canManage: boolean;
  onAddParticipant: (edit: ParticipantEdit) => void;
  onUpdateParticipant: (participantId: string, edit: ParticipantEdit) => void;
  onDeleteParticipant: (participantId: string) => void;
}) {
  const { t } = useI18n();
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ParticipantEdit>(emptyParticipantForm);
  const adminCount = project.participants.filter((participant) => participant.role === "admin").length;
  const canSubmit = Boolean(form.name.trim() && form.position.trim() && form.email.trim() && form.phone.trim());
  const rootLevel = getDefaultLevel(project);
  const accessNodes = getLevelNodes(project, rootLevel).filter((node) => node.type !== "central" && node.type !== "document");

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
      visibilityMode: participant.visibilityMode ?? "all",
      visibleNodeIds: participant.visibleNodeIds ?? [],
    });
    setEditorOpen(true);
  }

  function toggleVisibleNode(nodeId: string) {
    setForm((current) => {
      const ids = new Set(current.visibleNodeIds ?? []);
      if (ids.has(nodeId)) {
        ids.delete(nodeId);
      } else {
        ids.add(nodeId);
      }
      return { ...current, visibleNodeIds: Array.from(ids), visibilityMode: "custom" };
    });
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
      visibilityMode: form.visibilityMode ?? "all",
      visibleNodeIds: form.visibilityMode === "custom" ? form.visibleNodeIds ?? [] : [],
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
            {t(canManage ? "Управление сотрудниками" : "Команда проекта")}
          </span>
          <strong>{t("{count} участников", { count: project.participants.length })}</strong>
          <p>{t("Email и телефон обязательны. Мессенджер и другие способы связи можно заполнить позже.")}</p>
        </div>
        {canManage ? (
          <button onClick={openCreate}>
            <UserPlus size={17} />
            {t("Добавить пользователя")}
          </button>
        ) : null}
      </section>

      {isEditorOpen && canManage ? (
        <section className="participant-editor">
          <header>
            <div>
              <span>{t(editingId ? "Редактирование" : "Новый пользователь")}</span>
              <strong>{editingId ? form.name || t("Карточка участника") : t("Добавить в проект")}</strong>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                setEditorOpen(false);
                setEditingId(null);
                setForm(emptyParticipantForm);
              }}
              aria-label={t("Закрыть форму")}
            >
              <X size={18} />
            </button>
          </header>

          <div className="participant-form-grid">
            <label>
              <span>{t("ФИО")}</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} placeholder={t("Например, Иван Петров")} />
            </label>
            <label>
              <span>{t("Должность")}</span>
              <input value={form.position} onChange={(event) => setForm({ ...form, position: event.currentTarget.value })} placeholder={t("Ведущий инженер")} />
            </label>
            <label>
              <span>{t("Роль")}</span>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.currentTarget.value as ProjectParticipantRole })}>
                {Object.entries(participantRoleLabels).map(([role, label]) => (
                  <option key={role} value={role}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Статус")}</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.currentTarget.value as ProjectParticipantStatus })}>
                {Object.entries(participantStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Почта *")}</span>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.currentTarget.value })} placeholder="name@company.ru" />
            </label>
            <label>
              <span>{t("Телефон *")}</span>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })} placeholder="+7 900 000-00-00" />
            </label>
            <label>
              <span>{t("Мессенджер")}</span>
              <input value={form.messenger ?? ""} onChange={(event) => setForm({ ...form, messenger: event.currentTarget.value })} placeholder="@telegram / WhatsApp" />
            </label>
            <label>
              <span>{t("Другие способы связи")}</span>
              <input value={form.otherContacts ?? ""} onChange={(event) => setForm({ ...form, otherContacts: event.currentTarget.value })} placeholder={t("Teams, Диадок, внутренний номер")} />
            </label>
            <label>
              <span>{t("Видимость в проекте")}</span>
              <select value={form.visibilityMode ?? "all"} onChange={(event) => setForm({ ...form, visibilityMode: event.currentTarget.value as ProjectVisibilityMode })}>
                {Object.entries(visibilityModeLabels).map(([mode, label]) => (
                  <option key={mode} value={mode}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.visibilityMode === "custom" ? (
            <section className="participant-access-list">
              <span>{t("Доступные ноды")}</span>
              <div>
                {accessNodes.map((node) => (
                  <button key={node.id} className={(form.visibleNodeIds ?? []).includes(node.id) ? "active" : ""} onClick={() => toggleVisibleNode(node.id)}>
                    {node.shortCode ?? node.title}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <footer>
            <small>{t(canSubmit ? "Карточка готова к сохранению." : "Заполните ФИО, должность, почту и телефон.")}</small>
            <button className="settings-open-button" disabled={!canSubmit} onClick={submitParticipant}>
              {t(editingId ? "Сохранить" : "Добавить")}
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
              <div className="participant-avatar">
                {participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : getInitials(participant.name)}
              </div>
              <div className="participant-main">
                <header>
                  <div>
                    <strong>{participant.name}</strong>
                    <span>{participant.position}</span>
                  </div>
                  <em>{t(participantRoleLabels[participant.role])}</em>
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
                  <small>{t(participantStatusLabels[participant.status])}</small>
                  <small>{getParticipantAccessText(participant, relatedNodes, t)}</small>
                </footer>
              </div>
              {canManage ? (
                <div className="participant-actions">
                  <button onClick={() => openEdit(participant)} title={t("Редактировать пользователя")}>
                    <PencilLine size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteParticipant(participant.id)}
                    disabled={!canDelete}
                    title={t(canDelete ? "Удалить пользователя" : "Нельзя удалить последнего администратора")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : null}
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

function getParticipantAccessText(participant: ProjectParticipant, relatedNodes: number, t: ReturnType<typeof useI18n>["t"]) {
  if (participant.visibilityMode === "custom") {
    return t("{count} нод в доступе", { count: participant.visibleNodeIds?.length ?? 0 });
  }
  if (participant.visibilityMode === "assigned") {
    return relatedNodes ? t("{count} назначенных зон", { count: relatedNodes }) : t("только назначенные зоны");
  }
  return t("видит все ноды проекта");
}

function ProcessRows({ processes, onSelectProcess }: { processes: BusinessProcess[]; onSelectProcess: (processId: string) => void }) {
  const { t } = useI18n();
  if (!processes.length) {
    return <p className="workspace-empty">{t("Нет контейнеров в этом разделе.")}</p>;
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
          <em>{t(getProcessStatusText(process.status))}</em>
        </button>
      ))}
    </div>
  );
}
