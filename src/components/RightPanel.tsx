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
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  getFileLabel,
  getFileTypeColor,
  getDocumentFromNode,
  getLevelNodes,
  getNodeCompletion,
  getNodeVisualTone,
  getOwnedDocumentNodes,
  getProcessDeadlineLabel,
  getProcessRuntimeColor,
  getProcessStatusColor,
  getProcessStatusText,
  getProjectProgress,
  getStatusText,
} from "../lib/graph";
import type {
  BusinessProcess,
  DemoProject,
  MapLevel,
  NodeChecklistItem,
  NodeStatus,
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
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
  onUpdateDocumentStatus: (documentId: string, status: NodeStatus) => void;
  onRejectProcessDocument: (processId: string, documentId: string) => void;
  onAttachInboxDocument: (processId: string, documentId: string) => void;
  onOpenProcessBuilder: (processId: string) => void;
};

const processStatuses: ProcessStatus[] = ["draft", "sent", "in_work", "rejected", "accepted"];
const documentStatuses: NodeStatus[] = ["draft", "review", "approved", "comments", "unchecked"];

export function RightPanel({
  project,
  level,
  node,
  process,
  onNodeUpdate,
  onProcessUpdate,
  onDeleteProcess,
  onOpenDocument,
  onMoveDocumentNode,
  onUpdateDocumentStatus,
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
          onUpdateDocumentStatus={onUpdateDocumentStatus}
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
          onOpenDocument={onOpenDocument}
          onMoveDocumentNode={onMoveDocumentNode}
          onUpdateDocumentStatus={onUpdateDocumentStatus}
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
  onOpenDocument,
  onMoveDocumentNode,
  onUpdateDocumentStatus,
}: {
  project: DemoProject;
  level: MapLevel;
  node: ProjectNode;
  onNodeUpdate: (nodeId: string, edit: NodeEdit) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
  onUpdateDocumentStatus: (documentId: string, status: NodeStatus) => void;
}) {
  if (node.type === "document") {
    return (
        <DocumentNodeInfo
        project={project}
        level={level}
        node={node}
        onOpenDocument={onOpenDocument}
        onMoveDocumentNode={onMoveDocumentNode}
        onUpdateDocumentStatus={onUpdateDocumentStatus}
      />
    );
  }

  const tone = getNodeVisualTone(node);
  const ownedDocumentNodes = getOwnedDocumentNodes(project, node.id);
  const documents = ownedDocumentNodes.map((documentNode) => getDocumentFromNode(documentNode));
  const nodeCompletion = getNodeCompletion(node);
  const progress = node.id === level.centralNodeId ? getProjectProgress(project, level) : nodeCompletion;
  const isLevelCenter = node.id === level.centralNodeId;
  const responsibleOptions = project.participants;

  return (
    <>
      <PanelHeader eyebrow={node.shortCode ?? "Нода"} title={node.title} status={getStatusText(node.status)} statusColor={tone.glow} />

      <section className="node-editor">
        <div className="inline-form-grid">
          <label>
            <span>Код на сфере</span>
            <input value={node.shortCode ?? ""} onChange={(event) => onNodeUpdate(node.id, { shortCode: event.currentTarget.value })} placeholder="АР / Б1 / ИРД" />
          </label>
          <label>
            <span>Ответственный</span>
            <select value={node.responsible ?? ""} onChange={(event) => onNodeUpdate(node.id, { responsible: event.currentTarget.value })}>
              <option value="">Не назначен</option>
              {responsibleOptions.map((participant) => (
                <option key={participant.id} value={participant.name}>
                  {participant.name} · {participant.position}
                </option>
              ))}
            </select>
          </label>
        </div>
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

      {node.type !== "central" ? (
        <NodeChecklistEditor
          node={node}
          documents={documents}
          onNodeUpdate={onNodeUpdate}
          onOpenDocument={onOpenDocument}
        />
      ) : null}

      <div className="info-grid">
        <Metric icon={<CheckCircle2 size={16} />} label="Готовность ноды" value={`${progress}%`} />
        <Metric icon={<FileText size={16} />} label="Файлов внутри" value={String(documents.length)} />
        <Metric icon={<UserRound size={16} />} label="Ответственный" value={node.responsible ?? "Не назначен"} wide />
        <Metric icon={<Clock3 size={16} />} label="Обновлено" value={node.updatedAt ?? "сегодня"} />
        {isLevelCenter ? <Metric icon={<CheckCircle2 size={16} />} label="Готовность уровня" value={`${progress}%`} /> : null}
      </div>

      <DocumentList
        title="Файлы внутри ноды"
        documents={documents}
        documentNodes={ownedDocumentNodes}
        onOpenDocument={onOpenDocument}
        onMoveDocumentNode={onMoveDocumentNode}
        onUpdateDocumentStatus={onUpdateDocumentStatus}
      />
    </>
  );
}

function NodeChecklistEditor({
  node,
  documents,
  onNodeUpdate,
  onOpenDocument,
}: {
  node: ProjectNode;
  documents: ProcessDocument[];
  onNodeUpdate: (nodeId: string, edit: NodeEdit) => void;
  onOpenDocument: (document: ProcessDocument) => void;
}) {
  const checklist = node.checklist ?? [];
  const [newTitle, setNewTitle] = useState("");
  const [bindingItemId, setBindingItemId] = useState<string | null>(null);

  function updateChecklist(next: NodeChecklistItem[]) {
    onNodeUpdate(node.id, { checklist: next });
  }

  function addItem() {
    const title = newTitle.trim();
    if (!title) {
      return;
    }

    updateChecklist([
      ...checklist,
      {
        id: `check-${node.id}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        title,
        done: false,
        required: true,
      },
    ]);
    setNewTitle("");
  }

  function toggleItem(item: NodeChecklistItem, checked: boolean) {
    if (!checked) {
      updateChecklist(checklist.map((current) => current.id === item.id ? { ...current, done: false } : current));
      setBindingItemId(null);
      return;
    }

    const attachedDocument = documents.find((document) => document.id === item.documentId);
    if (attachedDocument) {
      updateChecklist(checklist.map((current) => current.id === item.id ? { ...current, done: true } : current));
      return;
    }
    setBindingItemId(item.id);
  }

  function bindDocument(itemId: string, documentId: string) {
    updateChecklist(checklist.map((current) =>
      current.id === itemId ? { ...current, done: true, documentId } : current,
    ));
    setBindingItemId(null);
  }

  return (
    <section className="node-checklist-editor">
      <header>
        <div>
          <h3>Документы ноды</h3>
          <span>{checklist.filter((item) => item.done).length} из {checklist.length} закрыто</span>
        </div>
        <b>{getNodeCompletion(node)}%</b>
      </header>

      <div className="checklist-add-row">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Название документа или результата..."
        />
        <button onClick={addItem}>Добавить</button>
      </div>

      <div className="checklist-items">
        {checklist.length ? checklist.map((item) => {
          const attachedDocument = documents.find((document) => document.id === item.documentId);
          return (
            <div className="checklist-item-group" key={item.id}>
              <article className={clsx(item.done && "done")}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(event) => toggleItem(item, event.currentTarget.checked)}
                  />
                  <span />
                </label>
                {attachedDocument ? (
                  <div className="checklist-file-binding">
                    <small>{item.title}</small>
                    <button className="checklist-document-link" onClick={() => onOpenDocument(attachedDocument)}>
                      <FileText size={15} />
                      <span>{attachedDocument.title}</span>
                    </button>
                    <button className="checklist-rebind-button" onClick={() => setBindingItemId(item.id)}>Сменить</button>
                  </div>
                ) : (
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateChecklist(checklist.map((current) => (current.id === item.id ? { ...current, title: event.currentTarget.value } : current)))
                    }
                  />
                )}
                <button onClick={() => updateChecklist(checklist.filter((current) => current.id !== item.id))}>Удалить</button>
              </article>
              {bindingItemId === item.id ? (
                <div className="checklist-document-picker" role="dialog" aria-label="Выбор документа для пункта">
                  <strong>Укажите файл в ноде, соответствующий «{item.title}»</strong>
                  {documents.length ? (
                    <div>
                      {documents.map((document) => (
                        <button key={document.id} onClick={() => bindDocument(item.id, document.id)}>
                          <FileText size={15} />
                          <span>{document.title}</span>
                          <small>{getFileLabel(document.fileType)} · {document.version}</small>
                        </button>
                      ))}
                    </div>
                  ) : <p>В этой ноде пока нет файлов. Сначала положите документ в ноду.</p>}
                  <button className="checklist-picker-cancel" onClick={() => setBindingItemId(null)}>Отмена</button>
                </div>
              ) : null}
            </div>
          );
        }) : <p>Добавьте документы, которые должны быть получены и согласованы внутри этой ноды.</p>}
      </div>
    </section>
  );
}

function DocumentNodeInfo({
  project,
  level,
  node,
  onOpenDocument,
  onMoveDocumentNode,
  onUpdateDocumentStatus,
}: {
  project: DemoProject;
  level: MapLevel;
  node: ProjectNode;
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
  onUpdateDocumentStatus: (documentId: string, status: NodeStatus) => void;
}) {
  const document = getDocumentFromNode(node);
  const color = getFileTypeColor(document.fileType);
  const attachTargets = getLevelNodes(project, level).filter((target) =>
    target.id !== node.id && target.type !== "document" && target.type !== "central",
  );

  return (
    <>
      <PanelHeader eyebrow={getFileLabel(document.fileType)} title={document.title} status={getStatusText(document.status)} statusColor={color} />

      <DocumentStatusControl document={document} onChange={(status) => onUpdateDocumentStatus(document.id, status)} />

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
  onUpdateDocumentStatus,
  onRejectProcessDocument,
  onAttachInboxDocument,
  onOpenProcessBuilder,
}: {
  project: DemoProject;
  process: BusinessProcess;
  onProcessUpdate: (processId: string, edit: ProcessEdit) => void;
  onDeleteProcess: (processId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onUpdateDocumentStatus: (documentId: string, status: NodeStatus) => void;
  onRejectProcessDocument: (processId: string, documentId: string) => void;
  onAttachInboxDocument: (processId: string, documentId: string) => void;
  onOpenProcessBuilder: (processId: string) => void;
}) {
  const from = project.nodes.find((node) => node.id === process.from);
  const to = project.nodes.find((node) => node.id === process.to);
  const color = getProcessRuntimeColor(process);

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
            <span>Срок передачи</span>
            <input type="datetime-local" value={process.dueAt ?? ""} onChange={(event) => onProcessUpdate(process.id, { dueAt: event.currentTarget.value })} />
          </label>
          {process.direction === "both" ? (
            <label>
              <span>Срок обратно</span>
              <input type="datetime-local" value={process.dueBackAt ?? ""} onChange={(event) => onProcessUpdate(process.id, { dueBackAt: event.currentTarget.value })} />
            </label>
          ) : null}
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
        <Metric icon={<UserRound size={16} />} label="Согласует" value={process.approver ?? process.receiver} />
        <Metric icon={<Clock3 size={16} />} label="Создано" value={process.createdAt} />
        <Metric icon={<Clock3 size={16} />} label="Таймер" value={getProcessDeadlineLabel(process)} />
        <Metric icon={<Inbox size={16} />} label="Документов" value={String(process.documents.length)} />
      </div>

      <AttachInbox project={project} process={process} onAttachInboxDocument={onAttachInboxDocument} />
      <DocumentList
        title="Документы на проверку"
        documents={process.documents}
        onOpenDocument={onOpenDocument}
        onRejectDocument={(documentId) => onRejectProcessDocument(process.id, documentId)}
        onUpdateDocumentStatus={onUpdateDocumentStatus}
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
  documentNodes = [],
  onOpenDocument,
  onMoveDocumentNode,
  onRejectDocument,
  onUpdateDocumentStatus,
}: {
  title: string;
  documents: ProcessDocument[];
  documentNodes?: ProjectNode[];
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode?: (documentNodeId: string, targetNodeId: string | null) => void;
  onRejectDocument?: (documentId: string) => void;
  onUpdateDocumentStatus?: (documentId: string, status: NodeStatus) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ documentId: string; x: number; y: number } | null>(null);
  const documentNodeByDocumentId = useMemo(
    () => new Map(documentNodes.filter((node) => node.document).map((node) => [node.document!.id, node])),
    [documentNodes],
  );
  const contextDocument = contextMenu ? documents.find((document) => document.id === contextMenu.documentId) : undefined;
  const contextDocumentNode = contextDocument ? documentNodeByDocumentId.get(contextDocument.id) : undefined;

  useEffect(() => {
    const closeContextMenu = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest(".document-context-menu")) {
        setContextMenu(null);
      }
    };
    window.addEventListener("pointerdown", closeContextMenu);
    return () => window.removeEventListener("pointerdown", closeContextMenu);
  }, []);

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
        <article
          key={document.id}
          className={clsx("document-row", (onRejectDocument || onUpdateDocumentStatus) && "with-action")}
          draggable={Boolean(documentNodeByDocumentId.get(document.id))}
          onDragStart={(event) => {
            const documentNode = documentNodeByDocumentId.get(document.id);
            if (!documentNode) {
              return;
            }
            event.dataTransfer.setData("application/x-molecule-document-node", documentNode.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu({
              documentId: document.id,
              x: Math.max(12, Math.min(event.clientX, window.innerWidth - 236)),
              y: Math.max(12, Math.min(event.clientY, window.innerHeight - 236)),
            });
          }}
        >
          <DocumentStatusControl
            document={document}
            onChange={
              onUpdateDocumentStatus
                ? (status) => {
                    if (status === "comments" && onRejectDocument) {
                      onRejectDocument(document.id);
                      return;
                    }
                    onUpdateDocumentStatus(document.id, status);
                  }
                : undefined
            }
          />
          <button className="document-file-button" onClick={() => onOpenDocument(document)}>
            <span style={{ color: getFileTypeColor(document.fileType) }}>
              <FileText size={17} />
            </span>
            <div>
              <b>{document.title}</b>
              <small>{getFileLabel(document.fileType)} · {document.from}</small>
            </div>
            <em>{document.version}</em>
          </button>
        </article>
      ))}
      {contextMenu && contextDocument ? createPortal(
        <div
          className="document-context-menu glass-panel"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>{contextDocument.title}</strong>
          <button
            onClick={() => {
              onOpenDocument(contextDocument);
              setContextMenu(null);
            }}
          >
            Открыть документ
          </button>
          {contextDocumentNode && onMoveDocumentNode ? (
            <button
              onClick={() => {
                onMoveDocumentNode(contextDocumentNode.id, null);
                setContextMenu(null);
              }}
            >
              Вынести в пространство
            </button>
          ) : null}
          {onUpdateDocumentStatus ? (
            <>
              <button onClick={() => { onUpdateDocumentStatus(contextDocument.id, "review"); setContextMenu(null); }}>На проверке</button>
              <button onClick={() => { onUpdateDocumentStatus(contextDocument.id, "approved"); setContextMenu(null); }}>Согласовано</button>
              <button className="danger" onClick={() => { onUpdateDocumentStatus(contextDocument.id, "comments"); setContextMenu(null); }}>Не принято</button>
            </>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </section>
  );
}

function DocumentStatusControl({
  document,
  onChange,
}: {
  document: ProcessDocument;
  onChange?: (status: NodeStatus) => void;
}) {
  const color = getDocumentStatusColor(document.status);

  return (
    <label
      className={clsx("document-status-control", !onChange && "readonly")}
      style={{ "--document-status-color": color } as React.CSSProperties}
    >
      <span>
        <i />
        Статус ГИП/админ
      </span>
      <select
        value={document.status}
        disabled={!onChange}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange?.(event.currentTarget.value as NodeStatus)}
      >
        {documentStatuses.map((status) => (
          <option key={status} value={status}>
            {getDocumentStatusLabel(status)}
          </option>
        ))}
      </select>
    </label>
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

function getDocumentStatusLabel(status: NodeStatus) {
  if (status === "approved") return "Согласовано";
  if (status === "review") return "На проверке";
  if (status === "comments") return "Не принято";
  if (status === "unchecked") return "Не проверено";
  return "Черновик";
}

function getDocumentStatusColor(status: NodeStatus) {
  if (status === "approved") return "#2ed8a3";
  if (status === "review") return "#ffe26d";
  if (status === "comments") return "#ff7a8a";
  if (status === "unchecked") return "#9aa5bd";
  return "#35d9ff";
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
