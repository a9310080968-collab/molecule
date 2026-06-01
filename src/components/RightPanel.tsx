import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  Layers3,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { project } from "../data/mockProject";
import {
  getEffectiveParentId,
  getFileLabel,
  getFileTypeColor,
  getLinkDefaults,
  getNodeById,
  getProjectProgress,
  getSectionDocuments,
  type ParentMap,
} from "../lib/graph";
import type { LinkEdit, ProjectLink, NodeEdit, ProjectNode, SectionReviews, StatusLabels } from "../types";

type RightPanelProps = {
  node: ProjectNode;
  link: ProjectLink | null;
  linkEdit?: LinkEdit;
  nodes: ProjectNode[];
  parentMap: ParentMap;
  statusLabels: StatusLabels;
  sectionReviews: SectionReviews;
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
  onLinkUpdate: (id: string, edit: LinkEdit) => void;
  onDeleteLink: (id: string) => void;
  onPinLink: (id: string) => void;
  onDeadlineSet: (nodeId: string, deadlineAt?: string) => void;
  onReleaseDocument: (documentId: string) => void;
  onSendSectionReview: (sectionId: string, documentIds: string[]) => void;
  onDecideSectionReview: (sectionId: string, approvedDocumentIds: string[], allDocumentIds: string[]) => void;
  onStartLink: (fromId: string) => void;
  onCloseLink: () => void;
  onOpenDocument: (node: ProjectNode) => void;
};

const SECTION_APPROVED_COLOR = "#a970ff";
const SECTION_LOCKED_COLOR = "#8a92a6";
const CENTRAL_LOCKED_COLOR = "#8b93a6";

export function RightPanel({
  node,
  link,
  linkEdit,
  nodes,
  parentMap,
  statusLabels,
  sectionReviews,
  onNodeUpdate,
  onLinkUpdate,
  onDeleteLink,
  onPinLink,
  onDeadlineSet,
  onReleaseDocument,
  onSendSectionReview,
  onDecideSectionReview,
  onStartLink,
  onCloseLink,
  onOpenDocument,
}: RightPanelProps) {
  return (
    <aside className="right-panel glass-panel">
      {link ? (
        <LinkInfo
          link={link}
          linkEdit={linkEdit}
          nodes={nodes}
          onLinkUpdate={onLinkUpdate}
          onDeleteLink={onDeleteLink}
          onPinLink={onPinLink}
          onStartLink={onStartLink}
          onClose={onCloseLink}
        />
      ) : node.type === "central" ? (
        <CentralInfo node={node} nodes={nodes} parentMap={parentMap} onNodeUpdate={onNodeUpdate} onDeadlineSet={onDeadlineSet} />
      ) : node.type === "section" ? (
        <SectionInfo
          node={node}
          nodes={nodes}
          parentMap={parentMap}
          statusLabels={statusLabels}
          review={sectionReviews[node.id]}
          onNodeUpdate={onNodeUpdate}
          onDeadlineSet={onDeadlineSet}
          onReleaseDocument={onReleaseDocument}
          onSendReview={onSendSectionReview}
          onDecideReview={onDecideSectionReview}
          onOpenDocument={onOpenDocument}
        />
      ) : (
        <DocumentInfo
          node={node}
          nodes={nodes}
          parentMap={parentMap}
          statusLabels={statusLabels}
          onNodeUpdate={onNodeUpdate}
          onDeadlineSet={onDeadlineSet}
          onOpenDocument={onOpenDocument}
        />
      )}
    </aside>
  );
}

function CentralInfo({
  node,
  nodes,
  parentMap,
  onNodeUpdate,
  onDeadlineSet,
}: {
  node: ProjectNode;
  nodes: ProjectNode[];
  parentMap: ParentMap;
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
  onDeadlineSet: (nodeId: string, deadlineAt?: string) => void;
}) {
  const progress = getProjectProgress(nodes, parentMap);
  const color = CENTRAL_LOCKED_COLOR;
  const sectionCount = nodes.filter((item) => item.type === "section").length;
  const documentCount = nodes.filter((item) => item.type === "document").length;

  return (
    <>
      <PanelHeader eyebrow="Проект" status="Живая карта" statusColor={color} title={node.title} />
      <NodeEditor node={node} onNodeUpdate={onNodeUpdate} />
      <DeadlineEditor node={node} onDeadlineSet={onDeadlineSet} />
      <div className="progress-block">
        <div>
          <span>Готовность документации</span>
          <b>{progress}%</b>
        </div>
        <div className="progress-track">
          <i style={{ width: `${progress}%`, background: `linear-gradient(90deg, #b755ff, ${color})` }} />
        </div>
      </div>
      <div className="info-grid">
        <Metric label="Разделов" value={String(sectionCount)} />
        <Metric label="Документов" value={String(documentCount)} />
        <Metric label="Обновлено" value={project.updatedAt} />
        <Metric label="Хранилище" value="247 ГБ" />
      </div>
      <div className="panel-note">
        Центральная нода показывает состояние всего документационного трека и собирает прогресс
        ключевых разделов проекта.
      </div>
    </>
  );
}

function SectionInfo({
  node,
  nodes,
  parentMap,
  statusLabels,
  review,
  onNodeUpdate,
  onDeadlineSet,
  onReleaseDocument,
  onSendReview,
  onDecideReview,
  onOpenDocument,
}: {
  node: ProjectNode;
  nodes: ProjectNode[];
  parentMap: ParentMap;
  statusLabels: StatusLabels;
  review?: SectionReviews[string];
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
  onDeadlineSet: (nodeId: string, deadlineAt?: string) => void;
  onReleaseDocument: (documentId: string) => void;
  onSendReview: (sectionId: string, documentIds: string[]) => void;
  onDecideReview: (sectionId: string, approvedDocumentIds: string[], allDocumentIds: string[]) => void;
  onOpenDocument: (node: ProjectNode) => void;
}) {
  const docs = getSectionDocuments(node.id, parentMap, nodes);
  const status = node.status ? statusLabels[node.status] : "Без статуса";
  const color = node.status === "approved" ? SECTION_APPROVED_COLOR : SECTION_LOCKED_COLOR;
  const docKey = docs.map((document) => document.id).join("|");
  const docIds = useMemo(() => (docKey ? docKey.split("|") : []), [docKey]);
  const [checkedDocIds, setCheckedDocIds] = useState<string[]>(docIds);

  useEffect(() => {
    setCheckedDocIds(review?.approvedDocumentIds?.length ? review.approvedDocumentIds : docIds);
  }, [docIds, review?.approvedDocumentIds]);

  return (
    <>
      <PanelHeader
        eyebrow={node.shortCode ?? "Раздел"}
        status={status}
        statusColor={color}
        title={node.title}
      />
      <NodeEditor node={node} onNodeUpdate={onNodeUpdate} />
      <DeadlineEditor node={node} onDeadlineSet={onDeadlineSet} />
      <TagsEditor node={node} onNodeUpdate={onNodeUpdate} />
      <NodeRoleSwitcher node={node} onNodeUpdate={onNodeUpdate} />
      <SectionApproval
        node={node}
        docs={docs}
        review={review}
        checkedDocIds={checkedDocIds}
        onCheckedChange={setCheckedDocIds}
        onSendReview={() => onSendReview(node.id, docIds)}
        onApproveAll={() => onDecideReview(node.id, docIds, docIds)}
        onApprovePartial={() => onDecideReview(node.id, checkedDocIds, docIds)}
        onReject={() => onDecideReview(node.id, [], docIds)}
      />

      <div className="info-grid">
        <Metric label="Документов" value={String(docs.length)} />
        <Metric label="Версия раздела" value={node.version ?? "v1.0"} />
        <Metric label="Ответственный" value={node.responsible ?? "Не назначен"} />
        <Metric label="Обновлено" value={node.updatedAt ?? "Сегодня"} />
      </div>

      <section className="document-list">
        <h3>Документы на проверку</h3>
        {docs.map((document) => (
          <article key={document.id} className="document-row">
          <button onClick={() => onOpenDocument(document)}>
            <span style={{ color: getFileTypeColor(document.fileType) }}>
              <FileText size={17} />
            </span>
            <div>
              <b>{document.title}</b>
              <small>{document.status ? statusLabels[document.status] : "Без статуса"}</small>
            </div>
            <em>{document.version}</em>
          </button>
          {document.absorbed ? (
            <button className="document-release" onClick={() => onReleaseDocument(document.id)}>
              вынести
            </button>
          ) : null}
          </article>
        ))}
      </section>

      <button className="primary-action">
        Открыть раздел
        <ExternalLink size={18} />
      </button>
    </>
  );
}

function DocumentInfo({
  node,
  nodes,
  parentMap,
  statusLabels,
  onNodeUpdate,
  onDeadlineSet,
  onOpenDocument,
}: {
  node: ProjectNode;
  nodes: ProjectNode[];
  parentMap: ParentMap;
  statusLabels: StatusLabels;
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
  onDeadlineSet: (nodeId: string, deadlineAt?: string) => void;
  onOpenDocument: (node: ProjectNode) => void;
}) {
  const parent = getNodeById(getEffectiveParentId(node, parentMap) ?? "", nodes);
  const status = node.status ? statusLabels[node.status] : "Без статуса";
  const color = getFileTypeColor(node.fileType);
  const parentLabel = parent?.type === "document" ? "Связана с" : "Раздел";
  const parentValue = parent?.type === "document" ? parent.title : parent?.shortCode ?? "Без раздела";

  return (
    <>
      <PanelHeader eyebrow={getFileLabel(node.fileType)} status={status} statusColor={color} title={node.title} />
      <NodeEditor node={node} onNodeUpdate={onNodeUpdate} />
      <DeadlineEditor node={node} onDeadlineSet={onDeadlineSet} />
      <NodeRoleSwitcher node={node} onNodeUpdate={onNodeUpdate} />
      <div className="document-summary">
        <span style={{ color }}>
          <FileText size={42} />
        </span>
        <div>
          <b>{node.version}</b>
          <p>{node.updatedAt}</p>
        </div>
      </div>

      <div className="info-grid">
        <Metric label="Тип файла" value={getFileLabel(node.fileType)} />
        <Metric label="Версия" value={node.version ?? "v1.0"} />
        <Metric label="Ответственный" value={node.responsible ?? "Не назначен"} />
        <Metric label={parentLabel} value={parentValue} />
      </div>

      <button className="primary-action" onClick={() => onOpenDocument(node)}>
        Открыть документ
        <ExternalLink size={18} />
      </button>
    </>
  );
}

function NodeEditor({
  node,
  onNodeUpdate,
}: {
  node: ProjectNode;
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
}) {
  return (
    <section className="node-editor" aria-label="Редактирование ноды">
      <label>
        <span>Название ноды</span>
        <input
          value={node.title}
          onChange={(event) => onNodeUpdate(node.id, { title: event.currentTarget.value })}
        />
      </label>
    </section>
  );
}

function DeadlineEditor({
  node,
  onDeadlineSet,
}: {
  node: ProjectNode;
  onDeadlineSet: (nodeId: string, deadlineAt?: string) => void;
}) {
  const value = node.deadlineAt ? toDateTimeInputValue(node.deadlineAt) : "";
  const deadlineText = node.deadlineAt ? getDeadlineText(node.deadlineAt) : "Таймер не задан";

  return (
    <section className="deadline-editor" aria-label="Таймер ноды">
      <label>
        <span>Дедлайн / таймер</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => onDeadlineSet(node.id, event.currentTarget.value || undefined)}
        />
      </label>
      <div>
        <b>{deadlineText}</b>
        <button onClick={() => onDeadlineSet(node.id, addDeadlineDays(1))}>+1 день</button>
        <button onClick={() => onDeadlineSet(node.id, addDeadlineDays(7))}>+7 дней</button>
        <button className="muted" onClick={() => onDeadlineSet(node.id, undefined)}>снять</button>
      </div>
    </section>
  );
}

function TagsEditor({
  node,
  onNodeUpdate,
}: {
  node: ProjectNode;
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
}) {
  const [value, setValue] = useState((node.tags ?? []).join(", "));

  useEffect(() => {
    setValue((node.tags ?? []).join(", "));
  }, [node.id, node.tags]);

  return (
    <section className="tags-editor" aria-label="Теги автосортировки">
      <label>
        <span>Теги автосортировки</span>
        <input
          value={value}
          placeholder="АР, ПЛАН, ФАСАД"
          onChange={(event) => setValue(event.currentTarget.value)}
          onBlur={() =>
            onNodeUpdate(node.id, {
              tags: value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <p>Если имя файла или вложения содержит тег, документ автоматически попадет внутрь этой средней сферы.</p>
    </section>
  );
}

function SectionApproval({
  node,
  docs,
  review,
  checkedDocIds,
  onCheckedChange,
  onSendReview,
  onApproveAll,
  onApprovePartial,
  onReject,
}: {
  node: ProjectNode;
  docs: ProjectNode[];
  review?: SectionReviews[string];
  checkedDocIds: string[];
  onCheckedChange: (ids: string[]) => void;
  onSendReview: () => void;
  onApproveAll: () => void;
  onApprovePartial: () => void;
  onReject: () => void;
}) {
  const approved = node.status === "approved";
  const sent = review?.status === "sent";
  const statusText =
    review?.status === "approved"
      ? "Согласовано ГИП"
      : review?.status === "partial"
        ? "Согласовано частично"
        : review?.status === "rejected"
          ? "Не согласовано"
          : sent
            ? "На рассмотрении у ГИП"
            : approved
              ? "Согласовано ГИП"
              : "Пакет еще не отправлен";

  function toggleDocument(id: string) {
    onCheckedChange(
      checkedDocIds.includes(id)
        ? checkedDocIds.filter((item) => item !== id)
        : [...checkedDocIds, id],
    );
  }

  return (
    <section className="approval-card">
      <span>Согласование пакета ГИП</span>
      <strong>{statusText}</strong>
      <p>
        Сотрудники загружают рабочие малые сферы внутрь раздела. На согласование отправляется средняя сфера с вложенным
        списком документов; малые сферы отдельно не согласовываются.
      </p>
      {sent ? (
        <div className="approval-checklist">
          {docs.map((document) => (
            <label key={document.id}>
              <input
                type="checkbox"
                checked={checkedDocIds.includes(document.id)}
                onChange={() => toggleDocument(document.id)}
              />
              <span style={{ color: getFileTypeColor(document.fileType) }} />
              <b>{document.title}</b>
            </label>
          ))}
        </div>
      ) : null}
      <div className="approval-actions">
        {!sent ? (
          <button onClick={onSendReview} disabled={!docs.length}>
            Отправить на согласование
          </button>
        ) : (
          <>
            <button onClick={onApproveAll}>Согласовать все</button>
            <button onClick={onApprovePartial} disabled={!checkedDocIds.length || checkedDocIds.length === docs.length}>
              Согласовать частично
            </button>
            <button className="muted" onClick={onReject}>
              Не согласовать
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function LinkInfo({
  link,
  linkEdit,
  nodes,
  onLinkUpdate,
  onDeleteLink,
  onPinLink,
  onStartLink,
  onClose,
}: {
  link: ProjectLink;
  linkEdit?: LinkEdit;
  nodes: ProjectNode[];
  onLinkUpdate: (id: string, edit: LinkEdit) => void;
  onDeleteLink: (id: string) => void;
  onPinLink: (id: string) => void;
  onStartLink: (fromId: string) => void;
  onClose: () => void;
}) {
  const from = getNodeById(link.from, nodes);
  const to = getNodeById(link.to, nodes);
  const defaults = getLinkDefaults(link, nodes);
  const title = linkEdit?.title ?? defaults.title;
  const description = linkEdit?.description ?? defaults.description;

  return (
    <>
      <header className="panel-header link-panel-header">
        <div className="panel-kicker">
          <span>Связь</span>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть связь">
            <X size={18} />
          </button>
        </div>
        <h2>{title}</h2>
      </header>

      <section className="link-editor">
        <div className="link-endpoints">
          <span>{from?.shortCode ?? from?.title ?? "Источник"}</span>
          <i />
          <span>{to?.shortCode ?? to?.title ?? "Цель"}</span>
        </div>
        <label>
          <span>Название связи</span>
          <input value={title} onChange={(event) => onLinkUpdate(link.id, { title: event.currentTarget.value })} />
        </label>
        <label>
          <span>Суть взаимосвязи</span>
          <textarea
            value={description}
            onChange={(event) => onLinkUpdate(link.id, { description: event.currentTarget.value })}
          />
        </label>
        <div className="link-actions">
          <button onClick={() => onStartLink(link.from)}>Настроить связь</button>
          {link.source === "auto" && !link.pinned ? <button onClick={() => onPinLink(link.id)}>Закрепить связь</button> : <span>Закреплена</span>}
          <button className="danger" onClick={() => onDeleteLink(link.id)}>Удалить</button>
        </div>
      </section>

      <div className="panel-note">
        Текст этой связи участвует в поиске. Delete на клавиатуре удаляет выбранную связь; ручные и закрепленные связи
        не рвутся от расстояния.
      </div>
    </>
  );
}

function NodeRoleSwitcher({
  node,
  onNodeUpdate,
}: {
  node: ProjectNode;
  onNodeUpdate: (id: string, edit: NodeEdit) => void;
}) {
  const isSection = node.type === "section";

  return (
    <section className="node-role-switcher" aria-label="Роль ноды">
      <span>Роль в молекуле</span>
      <div>
        <button
          className={!isSection ? "active" : ""}
          onClick={() =>
            onNodeUpdate(node.id, {
              type: "document",
              progress: undefined,
              fileType: node.fileType ?? "unknown",
              version: node.version ?? "v1",
            })
          }
        >
          Малая
        </button>
        <button
          className={isSection ? "active" : ""}
          onClick={() =>
            onNodeUpdate(node.id, {
              type: "section",
              shortCode: node.shortCode ?? buildShortCode(node.title),
              progress: node.progress ?? 0,
            })
          }
        >
          Средняя
        </button>
      </div>
    </section>
  );
}

function buildShortCode(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("ru-RU")
    .slice(0, 3) || "НД";
}

function addDeadlineDays(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return toDateTimeInputValue(date.toISOString());
}

function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getDeadlineText(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const years = 365 * day;
  const unit =
    absMs >= years ? { label: "лет", value: Math.round(absMs / years) }
      : absMs >= day ? { label: "дн.", value: Math.round(absMs / day) }
        : absMs >= hour ? { label: "ч.", value: Math.round(absMs / hour) }
          : { label: "мин.", value: Math.max(1, Math.round(absMs / 60000)) };
  return diffMs >= 0 ? `До сдачи: ${unit.value} ${unit.label}` : `Просрочено: ${unit.value} ${unit.label}`;
}

function PanelHeader({
  eyebrow,
  status,
  statusColor = "#22d3ee",
  title,
}: {
  eyebrow: string;
  status: string;
  statusColor?: string;
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

function Metric({ label, value }: { label: string; value: string }) {
  const Icon = label.includes("Ответ") ? UserRound : label.includes("Обнов") ? Clock3 : label.includes("Док") ? Layers3 : label.includes("Раздел") ? GitBranch : CheckCircle2;

  return (
    <div className={clsx("metric", value.length > 14 && "wide")}>
      <Icon size={16} />
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
