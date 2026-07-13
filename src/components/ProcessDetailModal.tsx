import { ArrowRight, FileText, Route, Settings2, UserRound, X } from "lucide-react";
import {
  getFileLabel,
  getFileTypeColor,
  getNodeById,
  getProcessStatusColor,
  getProcessStatusText,
  getStatusText,
} from "../lib/graph";
import type { BusinessProcess, DemoProject, ProcessDocument } from "../types";

type ProcessDetailModalProps = {
  project: DemoProject;
  process: BusinessProcess;
  onClose: () => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onConfigure: (processId: string) => void;
};

export function ProcessDetailModal({
  project,
  process,
  onClose,
  onOpenDocument,
  onConfigure,
}: ProcessDetailModalProps) {
  const fromNode = getNodeById(project, process.from);
  const toNode = getNodeById(project, process.to);
  const color = getProcessStatusColor(process.status);

  return (
    <div className="modal-backdrop process-detail-backdrop" role="dialog" aria-modal="true">
      <article className="process-detail-modal glass-panel">
        <header className="process-detail-header">
          <div>
            <span>
              <Route size={18} />
              Бизнес-процесс
            </span>
            <h2>{process.title}</h2>
            <p>{process.description}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть детализацию">
            <X size={20} />
          </button>
        </header>

        <section className="process-detail-summary">
          <article>
            <small>Откуда</small>
            <strong>{fromNode?.shortCode ?? fromNode?.title ?? "Источник"}</strong>
            <span>{process.sender}</span>
          </article>
          <i style={{ background: color, boxShadow: `0 0 22px ${color}` }} />
          <article>
            <small>Куда</small>
            <strong>{toNode?.shortCode ?? toNode?.title ?? "Получатель"}</strong>
            <span>{process.receiver}</span>
          </article>
          <article className="status-card">
            <small>Статус</small>
            <strong style={{ color }}>{getProcessStatusText(process.status)}</strong>
            <span>{process.validationAt ?? process.dueAt ?? "срок не задан"}</span>
          </article>
        </section>

        <section className="process-detail-map">
          <div className="process-party">
            <UserRound size={18} />
            <strong>{process.sender}</strong>
            <span>{fromNode?.title ?? "Нода-источник"}</span>
          </div>

          <div className="process-documents-lane">
            {process.documents.length ? (
              process.documents.map((document, index) => (
                <button
                  key={document.id}
                  className="process-document-node"
                  style={{ "--doc-color": getFileTypeColor(document.fileType), "--doc-index": index } as React.CSSProperties}
                  onClick={() => onOpenDocument(document)}
                >
                  <FileText size={18} />
                  <strong>{document.title}</strong>
                  <span>{getFileLabel(document.fileType)} · {getStatusText(document.status)} · {document.version}</span>
                </button>
              ))
            ) : (
              <div className="process-detail-empty">
                <strong>Документов в контейнере пока нет</strong>
                <span>Добавьте документы через конструктор бизнес-процесса или прикрепите входящие вручную.</span>
              </div>
            )}
          </div>

          <div className="process-party">
            <UserRound size={18} />
            <strong>{process.approver ?? process.receiver}</strong>
            <span>{toNode?.title ?? "Нода-получатель"}</span>
          </div>
        </section>

        <section className="process-document-table">
          <h3>Документы внутри процесса</h3>
          {process.documents.length ? (
            process.documents.map((document) => (
              <button key={document.id} onClick={() => onOpenDocument(document)}>
                <i style={{ background: getFileTypeColor(document.fileType) }} />
                <span>{document.title}</span>
                <em>{getStatusText(document.status)}</em>
                <small>{document.updatedAt}</small>
              </button>
            ))
          ) : (
            <p>Список пуст. Этот процесс пока описывает маршрут, но не содержит переданных файлов.</p>
          )}
        </section>

        <footer className="process-detail-footer">
          <span>
            Двойной клик по линии открывает этот контейнер. На верхнем уровне остается одна линия, даже если внутри много документов.
          </span>
          <button className="primary-action" onClick={() => onConfigure(process.id)}>
            <Settings2 size={17} />
            Настроить бизнес-процесс
          </button>
          <button onClick={onClose}>
            <ArrowRight size={17} />
            Вернуться к карте
          </button>
        </footer>
      </article>
    </div>
  );
}
