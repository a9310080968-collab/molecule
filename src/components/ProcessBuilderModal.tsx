import {
  ArrowLeftRight,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  Route,
  Save,
  Send,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getDocumentFromNode,
  getFileLabel,
  getFileTypeColor,
  getNodeById,
  getProcessStatusColor,
  getProcessStatusText,
} from "../lib/graph";
import type {
  BusinessProcess,
  DemoProject,
  ProcessDirection,
  ProcessDocument,
  ProcessDocumentRequirement,
  ProcessEdit,
  ProcessFieldKey,
  ProcessFieldRequirement,
} from "../types";

type BuilderMode = "draft" | "launch";

type ProcessBuilderModalProps = {
  project: DemoProject;
  process: BusinessProcess;
  onClose: () => void;
  onSave: (processId: string, edit: ProcessEdit, mode: BuilderMode) => void;
  onOpenDocument: (document: ProcessDocument) => void;
};

type DocumentChoice = {
  document: ProcessDocument;
  origin: "process" | "node" | "inbox";
  ownerTitle?: string;
};

const fieldDefaults: ProcessFieldRequirement[] = [
  { key: "documents", label: "Документы для проверки", required: true },
  { key: "sender", label: "Кто передает", required: true },
  { key: "approver", label: "Кто согласует", required: true },
  { key: "deadline", label: "Срок согласования", required: true },
  { key: "comment", label: "Комментарий к заданию", required: false },
  { key: "result", label: "Результат проверки", required: false },
];

export function ProcessBuilderModal({ project, process, onClose, onSave, onOpenDocument }: ProcessBuilderModalProps) {
  const fromNode = getNodeById(project, process.from);
  const toNode = getNodeById(project, process.to);
  const documentChoices = useMemo(() => getDocumentChoices(project, process), [project, process]);
  const participants = useMemo(() => getParticipants(project, process), [project, process]);
  const [title, setTitle] = useState(process.title);
  const [description, setDescription] = useState(process.description);
  const [direction, setDirection] = useState<ProcessDirection>(process.direction);
  const [sender, setSender] = useState(process.sender);
  const [receiver, setReceiver] = useState(process.receiver);
  const [approver, setApprover] = useState(process.approver ?? process.receiver);
  const [dueAt, setDueAt] = useState(process.dueAt ?? "");
  const [fieldRequirements, setFieldRequirements] = useState<ProcessFieldRequirement[]>(() => buildFieldRequirements(process));
  const [documentRequirements, setDocumentRequirements] = useState<Record<string, { selected: boolean; required: boolean }>>(() =>
    buildDocumentRequirements(process, documentChoices),
  );

  useEffect(() => {
    setTitle(process.title);
    setDescription(process.description);
    setDirection(process.direction);
    setSender(process.sender);
    setReceiver(process.receiver);
    setApprover(process.approver ?? process.receiver);
    setDueAt(process.dueAt ?? "");
    setFieldRequirements(buildFieldRequirements(process));
    setDocumentRequirements(buildDocumentRequirements(process, documentChoices));
  }, [documentChoices, process]);

  const selectedDocuments = documentChoices
    .filter((choice) => documentRequirements[choice.document.id]?.selected)
    .map((choice) => choice.document);
  const selectedRequiredCount = selectedDocuments.filter((document) => documentRequirements[document.id]?.required).length;

  function toggleField(key: ProcessFieldKey) {
    setFieldRequirements((current) =>
      current.map((field) => (field.key === key ? { ...field, required: !field.required } : field)),
    );
  }

  function toggleDocument(documentId: string) {
    setDocumentRequirements((current) => {
      const currentValue = current[documentId] ?? { selected: false, required: true };
      return {
        ...current,
        [documentId]: {
          ...currentValue,
          selected: !currentValue.selected,
        },
      };
    });
  }

  function toggleDocumentRequired(documentId: string) {
    setDocumentRequirements((current) => {
      const currentValue = current[documentId] ?? { selected: false, required: true };
      return {
        ...current,
        [documentId]: {
          ...currentValue,
          required: !currentValue.required,
        },
      };
    });
  }

  function save(mode: BuilderMode) {
    const documentRequirementList: ProcessDocumentRequirement[] = selectedDocuments.map((document) => ({
      documentId: document.id,
      required: documentRequirements[document.id]?.required ?? true,
    }));
    const documents = selectedDocuments.map((document) => ({
      ...document,
      status: document.status === "draft" ? ("review" as const) : document.status,
      updatedAt: "только что",
    }));

    onSave(
      process.id,
      {
        title,
        description,
        direction,
        sender,
        receiver,
        approver,
        dueAt,
        requiredFields: fieldRequirements,
        documentRequirements: documentRequirementList,
        documents,
        status: mode === "launch" ? "sent" : process.status,
        validationAt: mode === "launch" ? dueAt || "ожидает проверки" : process.validationAt,
      },
      mode,
    );
  }

  return (
    <div className="modal-backdrop process-builder-backdrop" role="dialog" aria-modal="true">
      <article className="process-builder-modal glass-panel">
        <header className="process-builder-header">
          <div>
            <span>
              <Route size={18} />
              Конструктор процесса
            </span>
            <h2>{process.status === "draft" ? "Черновик процесса" : getProcessStatusText(process.status)}</h2>
            <p>Соберите маршрут: какие документы передаются, кто согласует, к какому сроку и какие поля обязательны.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть конструктор">
            <X size={20} />
          </button>
        </header>

        <div className="process-builder-body">
          <section className="builder-section builder-route-section">
            <div className="section-title">
              <ArrowLeftRight size={18} />
              <div>
                <h3>Маршрут</h3>
                <p>Связь остается бизнес-процессом между выбранными нодами.</p>
              </div>
            </div>

            <div className="builder-route">
              <article>
                <span>Откуда</span>
                <strong>{fromNode?.shortCode ?? fromNode?.title ?? "Источник"}</strong>
                <small>{fromNode?.title}</small>
              </article>
              <i />
              <article>
                <span>Куда</span>
                <strong>{toNode?.shortCode ?? toNode?.title ?? "Получатель"}</strong>
                <small>{toNode?.title}</small>
              </article>
            </div>

            <div className="builder-form-grid">
              <label>
                <span>Название процесса</span>
                <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
              </label>
              <label>
                <span>Направление</span>
                <select value={direction} onChange={(event) => setDirection(event.currentTarget.value as ProcessDirection)}>
                  <option value="forward">В одну сторону</option>
                  <option value="backward">Обратно</option>
                  <option value="both">В обе стороны</option>
                </select>
              </label>
              <label className="wide">
                <span>Описание / суть передачи</span>
                <textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
              </label>
            </div>
          </section>

          <section className="builder-section">
            <div className="section-title">
              <UserCheck size={18} />
              <div>
                <h3>Ответственные</h3>
                <p>Кто передает, кто получает и кто должен согласовать пакет.</p>
              </div>
            </div>

            <div className="builder-form-grid">
              <label>
                <span>Кто передает</span>
                <input list="process-builder-participants" value={sender} onChange={(event) => setSender(event.currentTarget.value)} />
              </label>
              <label>
                <span>Кому передается</span>
                <input list="process-builder-participants" value={receiver} onChange={(event) => setReceiver(event.currentTarget.value)} />
              </label>
              <label>
                <span>Кто согласует</span>
                <input list="process-builder-participants" value={approver} onChange={(event) => setApprover(event.currentTarget.value)} />
              </label>
              <label>
                <span>Срок согласования</span>
                <input value={dueAt} onChange={(event) => setDueAt(event.currentTarget.value)} placeholder="например: 21.06, 18:00" />
              </label>
            </div>
            <datalist id="process-builder-participants">
              {participants.map((participant) => (
                <option key={participant} value={participant} />
              ))}
            </datalist>
          </section>

          <section className="builder-section builder-documents-section">
            <div className="section-title">
              <FileCheck2 size={18} />
              <div>
                <h3>Документы</h3>
                <p>Выберите файлы из процесса, вложенных в ноды документов или входящих без связи.</p>
              </div>
            </div>

            <div className="builder-document-summary">
              <b>{selectedDocuments.length}</b>
              <span>выбрано</span>
              <b>{selectedRequiredCount}</b>
              <span>обязательных</span>
            </div>

            <div className="builder-document-list">
              {documentChoices.length ? (
                documentChoices.map((choice) => {
                  const state = documentRequirements[choice.document.id] ?? { selected: false, required: true };
                  return (
                    <article key={`${choice.origin}-${choice.document.id}`} className={state.selected ? "selected" : ""}>
                      <label>
                        <input type="checkbox" checked={state.selected} onChange={() => toggleDocument(choice.document.id)} />
                        <span style={{ color: getFileTypeColor(choice.document.fileType) }}>{getFileLabel(choice.document.fileType)}</span>
                        <div>
                          <strong>{choice.document.title}</strong>
                          <small>{getOriginText(choice)}</small>
                        </div>
                      </label>
                      <button disabled={!state.selected} onClick={() => toggleDocumentRequired(choice.document.id)}>
                        {state.required ? "обязательный" : "необязательный"}
                      </button>
                      <button className="icon-only" onClick={() => onOpenDocument(choice.document)} title="Открыть документ">
                        <ExternalLink size={15} />
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="builder-empty">Документов пока нет. Добавьте файл в одну из нод или во входящие, затем вернитесь к конструктору.</p>
              )}
            </div>
          </section>

          <section className="builder-section">
            <div className="section-title">
              <CalendarClock size={18} />
              <div>
                <h3>Обязательность полей</h3>
                <p>Можно задать, какие поля обязательно заполнить перед отправкой и при проверке.</p>
              </div>
            </div>

            <div className="builder-field-list">
              {fieldRequirements.map((field) => (
                <button key={field.key} className={field.required ? "required" : ""} onClick={() => toggleField(field.key)}>
                  <span>{field.label}</span>
                  <em>{field.required ? "обязательное" : "необязательное"}</em>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="process-builder-footer">
          <div>
            <span style={{ color: getProcessStatusColor(process.status) }}>{getProcessStatusText(process.status)}</span>
            <small>{selectedDocuments.length ? "Можно сохранить или отправить на проверку." : "Процесс можно сохранить без документов как черновик."}</small>
          </div>
          <button onClick={() => save("draft")}>
            <Save size={17} />
            Сохранить черновик
          </button>
          <button className="primary-action" onClick={() => save("launch")}>
            <Send size={17} />
            Отправить на согласование
          </button>
        </footer>
      </article>
    </div>
  );
}

function buildFieldRequirements(process: BusinessProcess) {
  const saved = new Map(process.requiredFields?.map((field) => [field.key, field.required]));
  return fieldDefaults.map((field) => ({
    ...field,
    required: saved.get(field.key) ?? field.required,
  }));
}

function buildDocumentRequirements(process: BusinessProcess, choices: DocumentChoice[]) {
  const selectedIds = new Set(process.documents.map((document) => document.id));
  const saved = new Map(process.documentRequirements?.map((item) => [item.documentId, item.required]));
  return Object.fromEntries(
    choices.map((choice) => [
      choice.document.id,
      {
        selected: selectedIds.has(choice.document.id),
        required: saved.get(choice.document.id) ?? true,
      },
    ]),
  );
}

function getDocumentChoices(project: DemoProject, process: BusinessProcess): DocumentChoice[] {
  const choices: DocumentChoice[] = [];
  const seen = new Set<string>();

  const add = (document: ProcessDocument, origin: DocumentChoice["origin"], ownerTitle?: string) => {
    if (seen.has(document.id)) {
      return;
    }
    seen.add(document.id);
    choices.push({ document, origin, ownerTitle });
  };

  process.documents.forEach((document) => add(document, "process"));

  const relatedNodeIds = new Set([process.from, process.to]);
  project.nodes.forEach((node) => {
    if (node.type !== "document" || !node.documentOwnerNodeId || !relatedNodeIds.has(node.documentOwnerNodeId)) {
      return;
    }
    const owner = getNodeById(project, node.documentOwnerNodeId);
    add(getDocumentFromNode(node), "node", owner?.title);
  });

  project.inboxDocuments.forEach((document) => add(document, "inbox"));
  return choices;
}

function getOriginText(choice: DocumentChoice) {
  if (choice.origin === "process") {
    return `уже в процессе · ${choice.document.version}`;
  }
  if (choice.origin === "node") {
    return `внутри ноды: ${choice.ownerTitle ?? "раздел"} · ${choice.document.version}`;
  }
  return `входящие без связи · ${choice.document.version}`;
}

function getParticipants(project: DemoProject, process: BusinessProcess) {
  return Array.from(
    new Set(
      [
        process.sender,
        process.receiver,
        process.approver,
        ...project.nodes.map((node) => node.responsible),
        ...project.processes.flatMap((item) => [item.sender, item.receiver, item.approver]),
      ].filter(Boolean) as string[],
    ),
  );
}
