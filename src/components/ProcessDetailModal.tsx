import { ArrowRight, CircleHelp, FileText, MessageSquareText, Plus, Route, Send, Settings2, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getFileLabel,
  getFileTypeColor,
  getNodeById,
  getProcessDeadlineLabel,
  getProcessRuntimeColor,
  getProcessStatusText,
  getStatusText,
} from "../lib/graph";
import type { BusinessProcess, DemoProject, ProcessDocument } from "../types";
import { useI18n } from "../lib/i18n";

type ProcessDetailModalProps = {
  project: DemoProject;
  process: BusinessProcess;
  canEdit: boolean;
  canConfigure: boolean;
  onClose: () => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onConfigure: (processId: string) => void;
  onDelegationChange: (processId: string, delegates: string[]) => void;
  onTaskCommentChange: (processId: string, comment: string) => void;
  onClarification: (processId: string, text: string, kind: "question" | "unclear") => void;
};

export function ProcessDetailModal({
  project,
  process,
  canEdit,
  canConfigure,
  onClose,
  onOpenDocument,
  onConfigure,
  onDelegationChange,
  onTaskCommentChange,
  onClarification,
}: ProcessDetailModalProps) {
  const { t, system } = useI18n();
  const fromNode = getNodeById(project, process.from);
  const toNode = getNodeById(project, process.to);
  const color = getProcessRuntimeColor(process);
  const delegates = process.delegatedTo ?? [];
  const delegateOptions = project.participants.filter(
    (participant) => !delegates.includes(participant.name) && participant.name !== process.sender && participant.name !== process.receiver,
  );
  const [delegateCandidate, setDelegateCandidate] = useState(delegateOptions[0]?.name ?? "");
  const [taskComment, setTaskComment] = useState(process.taskComment ?? "");
  const [question, setQuestion] = useState("");
  const selectedDelegateCandidate = delegateOptions.some((participant) => participant.name === delegateCandidate)
    ? delegateCandidate
    : delegateOptions[0]?.name ?? "";
  const executorName = delegates[delegates.length - 1] ?? process.receiver;

  useEffect(() => {
    setTaskComment(process.taskComment ?? "");
    setQuestion("");
  }, [process.id, process.taskComment]);

  function addDelegate() {
    if (!selectedDelegateCandidate) {
      return;
    }
    onDelegationChange(process.id, [...delegates, selectedDelegateCandidate]);
    const nextCandidate = delegateOptions.find((participant) => participant.name !== selectedDelegateCandidate)?.name ?? "";
    setDelegateCandidate(nextCandidate);
  }

  function saveTaskComment() {
    if (taskComment !== (process.taskComment ?? "")) {
      onTaskCommentChange(process.id, taskComment.trim());
    }
  }

  function sendQuestion() {
    const text = question.trim();
    if (!text) {
      return;
    }
    onClarification(process.id, text, "question");
    setQuestion("");
  }

  return (
    <div className="modal-backdrop process-detail-backdrop" role="dialog" aria-modal="true">
      <article className="process-detail-modal glass-panel">
        <header className="process-detail-header">
          <div>
            <span>
              <Route size={18} />
              {t("Бизнес-процесс")}
            </span>
            <h2>{process.title}</h2>
            <p>{process.description}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Закрыть детализацию")}>
            <X size={20} />
          </button>
        </header>

        <section className="process-detail-summary">
          <article>
            <small>{t("Откуда")}</small>
            <strong>{fromNode?.shortCode ?? fromNode?.title ?? t("Источник")}</strong>
            <span>{process.sender}</span>
          </article>
          <i style={{ background: color, boxShadow: `0 0 22px ${color}` }} />
          <article>
            <small>{t("Куда")}</small>
            <strong>{toNode?.shortCode ?? toNode?.title ?? t("Получатель")}</strong>
            <span>{process.receiver}</span>
          </article>
          <article className="status-card">
            <small>{t("Статус")}</small>
            <strong style={{ color }}>{t(getProcessStatusText(process.status))}</strong>
            <span>{system(getProcessDeadlineLabel(process))}</span>
          </article>
        </section>

        <section className="process-detail-map">
          <div className="process-party">
            <UserRound size={18} />
            <strong>{process.sender}</strong>
            <span>{fromNode?.title ?? t("Нода-источник")}</span>
          </div>

          <div className="process-transfer-workspace">
            <section className="process-task-comment">
              <header>
                <span><MessageSquareText size={15} /> {t("Комментарий к заданию")}</span>
                <small>{t("Исполнитель: {name}", { name: executorName })}</small>
              </header>
              <textarea
                disabled={!canEdit}
                value={taskComment}
                onChange={(event) => setTaskComment(event.currentTarget.value)}
                onBlur={saveTaskComment}
                placeholder={t("Передать нужный файл ответственному и сообщить результат...")}
              />
              {canEdit ? <button onClick={saveTaskComment} disabled={taskComment === (process.taskComment ?? "")}>{t("Сохранить")}</button> : null}
            </section>

            <div className="process-documents-lane">
              {process.documents.length ? (
                process.documents.map((document, index) => (
                  <button
                    key={document.id}
                    className="process-document-node"
                    style={{ "--doc-color": getFileTypeColor(document.fileType), "--doc-index": index } as React.CSSProperties}
                    onClick={() => onOpenDocument(document)}
                  >
                    <FileText size={16} />
                    <strong>{document.title}</strong>
                    <span>{t(getFileLabel(document.fileType))} · {t(getStatusText(document.status))} · {document.version}</span>
                  </button>
                ))
              ) : (
                <div className="process-detail-empty">
                  <strong>{t("Документов в контейнере пока нет")}</strong>
                  <span>{t("Добавьте документы через конструктор бизнес-процесса.")}</span>
                </div>
              )}
            </div>

            <section className="process-clarification">
              {canEdit ? <div className="process-question-row">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendQuestion();
                    }
                  }}
                  placeholder={t("Задать вопрос постановщику...")}
                />
                <button onClick={sendQuestion} disabled={!question.trim()} aria-label={t("Отправить вопрос")}>
                  <Send size={15} />
                </button>
                <button className="unclear-action" onClick={() => onClarification(process.id, t("Задание непонятно. Нужны дополнительные пояснения."), "unclear")}>
                  <CircleHelp size={15} />
                  {t("Задание непонятно")}
                </button>
              </div> : null}
              {process.discussion?.length ? (
                <div className="process-discussion-list">
                  {process.discussion.slice(-3).reverse().map((entry) => (
                    <article key={entry.id}>
                      <strong>{entry.author}</strong>
                      <span>{entry.text}</span>
                      <small>{system(entry.createdAt)}</small>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <div className="process-party">
            <UserRound size={18} />
            <strong>{process.approver ?? process.receiver}</strong>
            <span>{toNode?.title ?? t("Нода-получатель")}</span>
          </div>
        </section>

        <section className="process-document-table">
          <h3>{t("Документы внутри процесса")}</h3>
          {process.documents.length ? (
            process.documents.map((document) => (
              <button key={document.id} onClick={() => onOpenDocument(document)}>
                <i style={{ background: getFileTypeColor(document.fileType) }} />
                <span>{document.title}</span>
                <em>{t(getStatusText(document.status))}</em>
                <small>{system(document.updatedAt)}</small>
              </button>
            ))
          ) : (
            <p>{t("Список пуст. Этот процесс пока описывает маршрут, но не содержит переданных файлов.")}</p>
          )}
        </section>

        <section className="process-delegation">
          <header>
            <div>
              <h3>{t("Делегирование внутри отдела")}</h3>
              <p>{t("Получатель может передать задание исполнителям, не меняя маршрут файла между основными нодами.")}</p>
            </div>
          </header>
          <div className="process-delegation-chain">
            <article>
              <UserRound size={17} />
              <div>
                <span>{t("Ответственный")}</span>
                <strong>{process.receiver}</strong>
              </div>
            </article>
            {delegates.map((delegate) => (
              <article key={delegate}>
                <ArrowRight size={15} />
                <div>
                  <span>{t("Исполнитель")}</span>
                  <strong>{delegate}</strong>
                </div>
                {canEdit ? (
                  <button
                    onClick={() => onDelegationChange(process.id, delegates.filter((name) => name !== delegate))}
                    aria-label={t("Убрать исполнителя {name}", { name: delegate })}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          {delegateOptions.length && canEdit ? (
            <div className="process-delegation-add">
              <select value={selectedDelegateCandidate} onChange={(event) => setDelegateCandidate(event.currentTarget.value)}>
                {delegateOptions.map((participant) => (
                  <option key={participant.id} value={participant.name}>{participant.name} · {participant.position}</option>
                ))}
              </select>
              <button onClick={addDelegate} disabled={!selectedDelegateCandidate}>
                <Plus size={16} />
                {t("Передать исполнителю")}
              </button>
            </div>
          ) : canEdit ? (
            <p className="process-delegation-empty">{t("Все доступные участники уже добавлены в цепочку исполнения.")}</p>
          ) : null}
        </section>

        <footer className="process-detail-footer">
          <span>
            {t("Двойной клик по линии открывает этот контейнер. На верхнем уровне остается одна линия, даже если внутри много документов.")}
          </span>
          {canConfigure ? (
            <button className="primary-action" onClick={() => onConfigure(process.id)}>
              <Settings2 size={17} />
              {t("Настроить бизнес-процесс")}
            </button>
          ) : null}
          <button onClick={onClose}>
            <ArrowRight size={17} />
            {t("Вернуться к карте")}
          </button>
        </footer>
      </article>
    </div>
  );
}
