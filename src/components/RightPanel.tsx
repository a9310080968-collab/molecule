import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  Inbox,
  Plus,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  getFileLabel,
  getFileTypeColor,
  getDocumentFromNode,
  getLevelNodes,
  getNodeDocuments,
  getNodeProcesses,
  getNodeVisualTone,
  getProcessStatusColor,
  getProcessStatusText,
  getProjectProgress,
  getStatusText,
} from "../lib/graph";
import type {
  BusinessProcess,
  DemoProject,
  MapLevel,
  NodeEdit,
  ProcessDocument,
  ProcessEdit,
  ProcessStatus,
  ProjectNode,
} from "../types";

type RightPanelProps = {
  project: DemoProject;
  level: MapLevel;
  node: ProjectNode;
  process: BusinessProcess | null;
  onNodeUpdate: (nodeId: string, edit: NodeEdit) => void;
  onProcessUpdate: (processId: string, edit: ProcessEdit) => void;
  onDeleteProcess: (processId: string) => void;
  onSelectProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
  onRejectProcessDocument: (processId: string, documentId: string) => void;
  onAttachInboxDocument: (processId: string, documentId: string) => void;
  onOpenProcessBuilder: (processId: string) => void;
};

const processStatuses: ProcessStatus[] = ["draft", "sent", "in_work", "rejected", "accepted"];

export function RightPanel({
  project,
  level,
  node,
  process,
  onNodeUpdate,
  onProcessUpdate,
  onDeleteProcess,
  onSelectProcess,
  onOpenDocument,
  onMoveDocumentNode,
  onRejectProcessDocument,
  onAttachInboxDocument,
  onOpenProcessBuilder,
}: RightPanelProps) {
  return (
    <aside className="right-panel glass-panel">
      {process ? (
        <ProcessInfo
          project={project}
          process={process}
          onProcessUpdate={onProcessUpdate}
          onDeleteProcess={onDeleteProcess}
          onOpenDocument={onOpenDocument}
          onRejectProcessDocument={onRejectProcessDocument}
          onAttachInboxDocument={onAttachInboxDocument}
          onOpenProcessBuilder={onOpenProcessBuilder}
        />
      ) : (
        <NodeInfo
          project={project}
          level={level}
          node={node}
          onNodeUpdate={onNodeUpdate}
          onSelectProcess={onSelectProcess}
          onOpenDocument={onOpenDocument}
          onMoveDocumentNode={onMoveDocumentNode}
        />
      )}
    </aside>
  );
}

function NodeInfo({
  project,
  level,
  node,
  onNodeUpdate,
  onSelectProcess,
  onOpenDocument,
  onMoveDocumentNode,
}: {
  project: DemoProject;
  level: MapLevel;
  node: ProjectNode;
  onNodeUpdate: (nodeId: string, edit: NodeEdit) => void;
  onSelectProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
}) {
  if (node.type === "document") {
    return (
        <DocumentNodeInfo
        project={project}
        level={level}
        node={node}
        onOpenDocument={onOpenDocument}
        onMoveDocumentNode={onMoveDocumentNode}
      />
    );
  }

  const tone = getNodeVisualTone(node);
  const processes = getNodeProcesses(project, node.id);
  const documents = getNodeDocuments(project, node.id);
  const progress = getProjectProgress(project, level);
  const isLevelCenter = node.id === level.centralNodeId;

  return (
    <>
      <PanelHeader eyebrow={node.shortCode ?? "Нода"} title={node.title} status={getStatusText(node.status)} statusColor={tone.glow} />

      <section className="node-editor">
        <label>
          <span>Название ноды</span>
          <input value={node.title} onChange={(event) => onNodeUpdate(node.id, { title: event.currentTarget.value })} />
        </label>
        <label>
          <span>Описание</span>
          <textarea value={node.description ?? ""} onChange={(event) => onNodeUpdate(node.id, { description: event.currentTarget.value })} />
        </label>
      </section>

      <TagsEditor node={node} onNodeUpdate={onNodeUpdate} />

      <section className="node-constructor-note">
        <GitBranch size={17} />
        <div>
          <b>Создание бизнес-процесса</b>
          <span>На карте наведите на ноду, нажмите плюс и выберите вторую ноду. После этого откроется конструктор процесса.</span>
        </div>
      </section>

      <div className="info-grid">
        <Metric icon={<GitBranch size={16} />} label="Связей" value={String(processes.length)} />
        <Metric icon={<FileText size={16} />} label="Документов в связях" value={String(documents.length)} />
        <Metric icon={<UserRound size={16} />} label="Ответственный" value={node.responsible ?? "Не назначен"} wide />
        <Metric icon={<Clock3 size={16} />} label="Обновлено" value={node.updatedAt ?? "сегодня"} />
        {isLevelCenter ? <Metric icon={<CheckCircle2 size={16} />} label="Готовность уровня" value={`${progress}%`} /> : null}
      </div>

      <section className="process-list">
        <h3>Связанные бизнес-процессы</h3>
        {processes.length ? processes.map((process) => (
          <button key={process.id} onClick={() => onSelectProcess(process.id)}>
            <i style={{ background: getProcessStatusColor(process.status) }} />
            <div>
              <b>{process.title}</b>
              <span>{getProcessStatusText(process.status)}</span>
            </div>
            <em>{process.documents.length}</em>
          </button>
        )) : <p>У ноды пока нет ручных контейнеров связей.</p>}
      </section>

      <DocumentList title="Документы в процессах" documents={documents.slice(0, 6)} onOpenDocument={onOpenDocument} />
    </>
  );
}

function DocumentNodeInfo({
  project,
  level,
  node,
  onOpenDocument,
  onMoveDocumentNode,
}: {
  project: DemoProject;
  level: MapLevel;
  node: ProjectNode;
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
}) {
  const document = getDocumentFromNode(node);
  const color = getFileTypeColor(document.fileType);
  const attachTargets = getLevelNodes(project, level).filter((target) =>
    target.id !== node.id && target.type !== "document" && target.type !== "central",
  );

  return (
    <>
      <PanelHeader eyebrow={getFileLabel(document.fileType)} title={document.title} status={getStatusText(document.status)} statusColor={color} />

      <div className="info-grid">
        <Metric icon={<FileText size={16} />} label="Тип файла" value={getFileLabel(document.fileType)} />
        <Metric icon={<Clock3 size={16} />} label="Версия" value={document.version} />
        <Metric icon={<UserRound size={16} />} label="Источник" value={document.from} wide />
        <Metric icon={<Clock3 size={16} />} label="Обновлен" value={document.updatedAt} />
      </div>

      <section className="quick-actions">
        <button onClick={() => onOpenDocument(document)}>
          <ExternalLink size={17} />
          Открыть документ
        </button>
        {false && node.documentOwnerNodeId ? (
          <button onClick={() => onMoveDocumentNode(node.id, null)}>
            <ExternalLink size={17} />
            Вынести из ноды
          </button>
        ) : null}
      </section>

      {node.documentOwnerNodeId ? (
        <div className="panel-note">
          Чтобы вынести файл из ноды, перетащите его на карте в зону «Вынести наружу». Она появляется сразу после начала перетаскивания.
        </div>
      ) : null}

      {!node.documentOwnerNodeId && attachTargets.length ? (
        <section className="document-targets">
          <h3>Вложить вручную</h3>
          {attachTargets.map((target) => (
            <button key={target.id} onClick={() => onMoveDocumentNode(node.id, target.id)}>
              <span>{target.shortCode ?? target.title}</span>
              <b>{target.title}</b>
            </button>
          ))}
        </section>
      ) : null}

      <div className="panel-note">
        Файловая нода не привязывается автоматически. Перетащите ее на раздел, чтобы положить внутрь, или вынесите обратно в бесхозные файлы.
      </div>
    </>
  );
}

function ProcessInfo({
  project,
  process,
  onProcessUpdate,
  onDeleteProcess,
  onOpenDocument,
  onRejectProcessDocument,
  onAttachInboxDocument,
  onOpenProcessBuilder,
}: {
  project: DemoProject;
  process: BusinessProcess;
  onProcessUpdate: (processId: string, edit: ProcessEdit) => void;
  onDeleteProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onRejectProcessDocument: (processId: string, documentId: string) => void;
  onAttachInboxDocument: (processId: string, documentId: string) => void;
  onOpenProcessBuilder: (processId: string) => void;
}) {
  const from = project.nodes.find((node) => node.id === process.from);
  const to = project.nodes.find((node) => node.id === process.to);
  const color = getProcessStatusColor(process.status);

  return (
    <>
      <PanelHeader eyebrow="Бизнес-процесс" title={process.title} status={getProcessStatusText(process.status)} statusColor={color} />

      <section className="link-editor">
        <div className="link-endpoints">
          <span>{from?.shortCode ?? from?.title ?? "Источник"}</span>
          <ArrowLeftRight size={18} />
          <span>{to?.shortCode ?? to?.title ?? "Получатель"}</span>
        </div>

        <label>
          <span>Название процесса</span>
          <input value={process.title} onChange={(event) => onProcessUpdate(process.id, { title: event.currentTarget.value })} />
        </label>

        <label>
          <span>Описание / суть передачи</span>
          <textarea value={process.description} onChange={(event) => onProcessUpdate(process.id, { description: event.currentTarget.value })} />
        </label>

        <div className="process-status-editor">
          {processStatuses.map((status) => (
            <button
              key={status}
              className={clsx(process.status === status && "active")}
              style={{ "--status-color": getProcessStatusColor(status) } as React.CSSProperties}
              onClick={() => onProcessUpdate(process.id, { status, validationAt: status === "accepted" || status === "in_work" ? "сегодня" : process.validationAt })}
            >
              {getProcessStatusText(status)}
            </button>
          ))}
        </div>

        <div className="inline-form-grid">
          <label>
            <span>Направление</span>
            <select value={process.direction} onChange={(event) => onProcessUpdate(process.id, { direction: event.currentTarget.value as BusinessProcess["direction"] })}>
              <option value="forward">В одну сторону</option>
              <option value="backward">Обратно</option>
              <option value="both">В обе стороны</option>
            </select>
          </label>
          <label>
            <span>Дата валидации</span>
            <input value={process.validationAt ?? ""} onChange={(event) => onProcessUpdate(process.id, { validationAt: event.currentTarget.value })} placeholder="сегодня / дата" />
          </label>
        </div>
      </section>

      <section className="quick-actions">
        <button onClick={() => onOpenProcessBuilder(process.id)}>
          <GitBranch size={17} />
          Настроить бизнес-процесс
        </button>
        <button onClick={() => onProcessUpdate(process.id, { status: "sent" })}>
          <Send size={17} />
          Отправить на согласование
        </button>
        <button className="danger" onClick={() => onDeleteProcess(process.id)}>
          <Trash2 size={17} />
          Удалить процесс
        </button>
      </section>

      <div className="info-grid">
        <Metric icon={<UserRound size={16} />} label="От кого" value={process.sender} />
        <Metric icon={<UserRound size={16} />} label="Кому" value={process.receiver} />
        <Metric icon={<Clock3 size={16} />} label="Создано" value={process.createdAt} />
        <Metric icon={<Inbox size={16} />} label="Документов" value={String(process.documents.length)} />
      </div>

      <AttachInbox project={project} process={process} onAttachInboxDocument={onAttachInboxDocument} />
      <DocumentList
        title="Документы на проверку"
        documents={process.documents}
        onOpenDocument={onOpenDocument}
        onRejectDocument={(documentId) => onRejectProcessDocument(process.id, documentId)}
      />

      <div className="panel-note">
        Связь здесь работает как контейнер бизнес-процесса: у нее есть статус, направление, описание, документы и история принятия в работу. Параллельные контейнеры между теми же нодами отображаются отдельными дугами.
      </div>
    </>
  );
}

function AttachInbox({
  project,
  process,
  onAttachInboxDocument,
}: {
  project: DemoProject;
  process: BusinessProcess;
  onAttachInboxDocument: (processId: string, documentId: string) => void;
}) {
  const [selectedDocumentId, setSelectedDocumentId] = useState(project.inboxDocuments[0]?.id ?? "");

  useEffect(() => {
    setSelectedDocumentId(project.inboxDocuments[0]?.id ?? "");
  }, [project.inboxDocuments]);

  if (!project.inboxDocuments.length) {
    return (
      <section className="attach-inbox empty">
        <Inbox size={18} />
        <span>Входящих без связи нет</span>
      </section>
    );
  }

  return (
    <section className="attach-inbox">
      <label>
        <span>Прикрутить задание вручную</span>
        <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.currentTarget.value)}>
          {project.inboxDocuments.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => selectedDocumentId && onAttachInboxDocument(process.id, selectedDocumentId)}>
        <Plus size={17} />
        Прикрепить
      </button>
    </section>
  );
}

function TagsEditor({
  node,
  onNodeUpdate,
}: {
  node: ProjectNode;
  onNodeUpdate: (nodeId: string, edit: NodeEdit) => void;
}) {
  const [value, setValue] = useState((node.tags ?? []).join(", "));

  useEffect(() => {
    setValue((node.tags ?? []).join(", "));
  }, [node.id, node.tags]);

  return (
    <section className="tags-editor">
      <label>
        <span>Теги автопривязки</span>
        <input value={value} onChange={(event) => setValue(event.currentTarget.value)} onBlur={() => onNodeUpdate(node.id, { tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="АР, ТЗ, фасад" />
      </label>
      <p>Если письмо или загруженный файл содержит тег, демо подсветит подходящую связь или предложит ручную привязку.</p>
    </section>
  );
}

function DocumentList({
  title,
  documents,
  onOpenDocument,
  onRejectDocument,
}: {
  title: string;
  documents: ProcessDocument[];
  onOpenDocument: (document: ProcessDocument) => void;
  onRejectDocument?: (documentId: string) => void;
}) {
  if (!documents.length) {
    return (
      <section className="document-list">
        <h3>{title}</h3>
        <p>Документов пока нет.</p>
      </section>
    );
  }

  return (
    <section className="document-list">
      <h3>{title}</h3>
      {documents.map((document) => (
        <article key={document.id} className={clsx("document-row", onRejectDocument && "with-action")}>
          <button onClick={() => onOpenDocument(document)}>
            <span style={{ color: getFileTypeColor(document.fileType) }}>
              <FileText size={17} />
            </span>
            <div>
              <b>{document.title}</b>
              <small>{getFileLabel(document.fileType)} · {document.from}</small>
            </div>
            <em>{document.version}</em>
          </button>
          {onRejectDocument ? (
            <button className="document-reject-button" onClick={() => onRejectDocument(document.id)}>
              Не принято
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function PanelHeader({
  eyebrow,
  status,
  statusColor,
  title,
}: {
  eyebrow: string;
  status: string;
  statusColor: string;
  title: string;
}) {
  return (
    <header className="panel-header">
      <div className="panel-kicker">
        <span>{eyebrow}</span>
        <em style={{ color: statusColor, background: `${statusColor}16` }}>
          <i style={{ background: statusColor, boxShadow: `0 0 14px ${statusColor}` }} />
          {status}
        </em>
      </div>
      <h2>{title}</h2>
    </header>
  );
}

function Metric({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <div className={clsx("metric", wide && "wide")}>
      {icon}
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
