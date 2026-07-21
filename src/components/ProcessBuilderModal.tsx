import {
  ArrowLeftRight,
  ExternalLink,
  FileCheck2,
  Route,
  Save,
  Send,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { teamDirectory } from "./ProjectManagerModal";
import {
  getDocumentFromNode,
  getFileLabel,
  getFileTypeColor,
  getNodeById,
  parseDeadline,
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
  ProcessFieldRequirement,
  ProjectParticipantSeed,
} from "../types";
import { useI18n, type TranslationParams } from "../lib/i18n";

type BuilderMode = "draft" | "launch";

type ProcessBuilderModalProps = {
  project: DemoProject;
  process: BusinessProcess;
  onClose: () => void;
  onSave: (processId: string, edit: ProcessEdit, mode: BuilderMode) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onAddParticipant: (participant: ProjectParticipantSeed) => void;
};

type DocumentChoice = {
  document: ProcessDocument;
  origin: "process" | "node" | "inbox";
  ownerTitle?: string;
};

type ParticipantOption = {
  name: string;
  label: string;
  inProject: boolean;
  seed?: ProjectParticipantSeed;
};

const fieldDefaults: ProcessFieldRequirement[] = [
  { key: "documents", label: "Документы для проверки", required: true },
  { key: "sender", label: "Кто передает", required: true },
  { key: "approver", label: "Кто согласует", required: true },
  { key: "deadline", label: "Срок согласования", required: true },
  { key: "comment", label: "Комментарий к заданию", required: false },
  { key: "result", label: "Результат проверки", required: false },
];

export function ProcessBuilderModal({ project, process, onClose, onSave, onOpenDocument, onAddParticipant }: ProcessBuilderModalProps) {
  const { t } = useI18n();
  const fromNode = getNodeById(project, process.from);
  const toNode = getNodeById(project, process.to);
  const documentChoices = useMemo(() => getDocumentChoices(project, process), [project, process]);
  const participantOptions = useMemo(() => getParticipantOptions(project, process), [project, process]);
  const [title, setTitle] = useState(process.title);
  const [description, setDescription] = useState(process.description);
  const [direction, setDirection] = useState<ProcessDirection>(process.direction);
  const [sender, setSender] = useState(() => getInitialPerson(process.sender, participantOptions));
  const [receiver, setReceiver] = useState(() => getInitialPerson(process.receiver, participantOptions));
  const [approver, setApprover] = useState(() => getInitialPerson(process.approver ?? process.receiver, participantOptions));
  const [dueAt, setDueAt] = useState(() => toDateTimeLocalValue(process.dueAt) || getDefaultDeadlineInput(24));
  const [dueBackAt, setDueBackAt] = useState(() => toDateTimeLocalValue(process.dueBackAt) || getDefaultDeadlineInput(48));
  const [fieldRequirements, setFieldRequirements] = useState<ProcessFieldRequirement[]>(() => buildFieldRequirements(process));
  const [documentRequirements, setDocumentRequirements] = useState<Record<string, { selected: boolean; required: boolean }>>(() =>
    buildDocumentRequirements(process, documentChoices),
  );

  useEffect(() => {
    setTitle(process.title);
    setDescription(process.description);
    setDirection(process.direction);
    setSender(getInitialPerson(process.sender, participantOptions));
    setReceiver(getInitialPerson(process.receiver, participantOptions));
    setApprover(getInitialPerson(process.approver ?? process.receiver, participantOptions));
    setDueAt(toDateTimeLocalValue(process.dueAt) || getDefaultDeadlineInput(24));
    setDueBackAt(toDateTimeLocalValue(process.dueBackAt) || getDefaultDeadlineInput(48));
    setFieldRequirements(buildFieldRequirements(process));
    setDocumentRequirements(buildDocumentRequirements(process, documentChoices));
  }, [documentChoices, process]);

  const selectedDocuments = documentChoices
    .filter((choice) => documentRequirements[choice.document.id]?.selected)
    .map((choice) => choice.document);
  const selectedRequiredCount = selectedDocuments.filter((document) => documentRequirements[document.id]?.required).length;
  const canSave = Boolean(sender && receiver && approver && dueAt && (direction !== "both" || dueBackAt));

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
    if (!canSave) {
      return;
    }

    ensureSelectedPersonInProject(sender);
    ensureSelectedPersonInProject(receiver);
    ensureSelectedPersonInProject(approver);
    const participantNames = uniqueNames([sender, receiver, approver]);
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
        participantNames,
        approver,
        dueAt,
        dueBackAt: direction === "both" ? dueBackAt : undefined,
        requiredFields: fieldRequirements,
        documentRequirements: documentRequirementList,
        documents,
        status: mode === "launch" ? "sent" : process.status,
        validationAt: mode === "launch" ? dueAt || t("ожидает проверки") : process.validationAt,
      },
      mode,
    );
  }

  function setDirectionValue(value: ProcessDirection) {
    setDirection(value);
    if (value === "both" && !dueBackAt) {
      setDueBackAt(getDefaultDeadlineInput(48));
    }
  }

  function handlePersonChange(role: "sender" | "receiver" | "approver", name: string) {
    ensureSelectedPersonInProject(name);
    if (role === "sender") setSender(name);
    if (role === "receiver") setReceiver(name);
    if (role === "approver") setApprover(name);
  }

  function ensureSelectedPersonInProject(name: string) {
    const option = participantOptions.find((item) => item.name === name);
    if (option?.seed && !option.inProject) {
      onAddParticipant(option.seed);
    }
  }

  return (
    <div className="modal-backdrop process-builder-backdrop" role="dialog" aria-modal="true">
      <article className="process-builder-modal glass-panel">
        <header className="process-builder-header">
          <div>
            <span>
              <Route size={18} />
              {t("Конструктор процесса")}
            </span>
            <h2>{process.status === "draft" ? t("Черновик процесса") : t(getProcessStatusText(process.status))}</h2>
            <p>{t("Соберите маршрут: какие документы передаются, кто согласует, к какому сроку и какие поля обязательны.")}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Закрыть конструктор")}>
            <X size={20} />
          </button>
        </header>

        <div className="process-builder-body">
          <section className="builder-section builder-route-section">
            <div className="section-title">
              <ArrowLeftRight size={18} />
              <div>
                <h3>{t("Маршрут")}</h3>
                <p>{t("Связь остается бизнес-процессом между выбранными нодами.")}</p>
              </div>
            </div>

            <div className="builder-route">
              <article>
                <span>{t("Откуда")}</span>
                <strong>{fromNode?.shortCode ?? fromNode?.title ?? t("Источник")}</strong>
                <small>{fromNode?.title}</small>
              </article>
              <i />
              <article>
                <span>{t("Куда")}</span>
                <strong>{toNode?.shortCode ?? toNode?.title ?? t("Получатель")}</strong>
                <small>{toNode?.title}</small>
              </article>
            </div>

            <div className="builder-form-grid">
              <label>
                <span>{t("Название процесса")}</span>
                <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
              </label>
              <label>
                <span>{t("Направление")}</span>
                <select value={direction} onChange={(event) => setDirectionValue(event.currentTarget.value as ProcessDirection)}>
                  <option value="forward">{t("В одну сторону")}</option>
                  <option value="backward">{t("Обратно")}</option>
                  <option value="both">{t("В обе стороны")}</option>
                </select>
              </label>
              <label className="wide">
                <span>{t("Описание / суть передачи")}</span>
                <input value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder={t("Коротко: что передается и зачем")} />
              </label>
            </div>
          </section>

          <section className="builder-section">
            <div className="section-title">
              <UserCheck size={18} />
              <div>
                <h3>{t("Ответственные")}</h3>
                <p>{t("Кто передает, кто получает и кто должен согласовать пакет.")}</p>
              </div>
            </div>

            <div className="builder-form-grid">
              <label>
                <span>{t("Кто передает")}</span>
                <PersonSelect value={sender} options={participantOptions} onChange={(value) => handlePersonChange("sender", value)} />
              </label>
              <label>
                <span>{t("Кому передается")}</span>
                <PersonSelect value={receiver} options={participantOptions} onChange={(value) => handlePersonChange("receiver", value)} />
              </label>
              <label>
                <span>{t("Кто согласует")}</span>
                <PersonSelect value={approver} options={participantOptions} onChange={(value) => handlePersonChange("approver", value)} />
              </label>
              <label>
                <span>{direction === "backward" ? t("Срок обратно") : t("Срок передачи")}</span>
                <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.currentTarget.value)} />
              </label>
              {direction === "both" ? (
                <label>
                  <span>{t("Срок обратной передачи")}</span>
                  <input type="datetime-local" value={dueBackAt} onChange={(event) => setDueBackAt(event.currentTarget.value)} />
                </label>
              ) : null}
            </div>
            {!canSave ? <p className="builder-required-note">{t("Выберите передающего, получателя, согласующего и срок.")}</p> : null}
          </section>

          <section className="builder-section builder-documents-section">
            <div className="section-title">
              <FileCheck2 size={18} />
              <div>
                <h3>{t("Документы")}</h3>
                <p>{t("Выберите файлы из процесса, вложенных в ноды документов или входящих без связи.")}</p>
              </div>
            </div>

            <div className="builder-document-summary">
              <b>{selectedDocuments.length}</b>
              <span>{t("выбрано")}</span>
              <b>{selectedRequiredCount}</b>
              <span>{t("обязательных")}</span>
            </div>

            <div className="builder-document-list">
              {documentChoices.length ? (
                documentChoices.map((choice) => {
                  const state = documentRequirements[choice.document.id] ?? { selected: false, required: true };
                  return (
                    <article key={`${choice.origin}-${choice.document.id}`} className={state.selected ? "selected" : ""}>
                      <label>
                        <input type="checkbox" checked={state.selected} onChange={() => toggleDocument(choice.document.id)} />
                        <span style={{ color: getFileTypeColor(choice.document.fileType) }}>{t(getFileLabel(choice.document.fileType))}</span>
                        <div>
                          <strong>{choice.document.title}</strong>
                          <small>{getOriginText(choice, t)}</small>
                        </div>
                      </label>
                      <button disabled={!state.selected} onClick={() => toggleDocumentRequired(choice.document.id)}>
                        {state.required ? t("обязательный") : t("необязательный")}
                      </button>
                      <button className="icon-only" onClick={() => onOpenDocument(choice.document)} title={t("Открыть документ")}>
                        <ExternalLink size={15} />
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="builder-empty">{t("Документов пока нет. Добавьте файл в одну из нод или во входящие, затем вернитесь к конструктору.")}</p>
              )}
            </div>
          </section>

        </div>

        <footer className="process-builder-footer">
          <div>
            <span style={{ color: getProcessStatusColor(process.status) }}>{t(getProcessStatusText(process.status))}</span>
            <small>{selectedDocuments.length ? t("Можно сохранить или отправить на проверку.") : t("Процесс можно сохранить без документов как черновик.")}</small>
          </div>
          <button onClick={() => save("draft")} disabled={!canSave}>
            <Save size={17} />
            {t("Сохранить черновик")}
          </button>
          <button className="primary-action" onClick={() => save("launch")} disabled={!canSave}>
            <Send size={17} />
            {t("Отправить на согласование")}
          </button>
        </footer>
      </article>
    </div>
  );
}

function PersonSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ParticipantOption[];
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const projectOptions = options.filter((option) => option.inProject);
  const directoryOptions = options.filter((option) => !option.inProject);

  return (
    <select value={value} onChange={(event) => onChange(event.currentTarget.value)} required>
      <option value="" disabled>{t("Выберите участника")}</option>
      <optgroup label={t("Команда проекта")}>
        {projectOptions.map((option) => (
          <option key={option.name} value={option.name}>{option.label}</option>
        ))}
      </optgroup>
      {directoryOptions.length ? (
        <optgroup label={t("Добавить из справочника")}>
          {directoryOptions.slice(0, 12).map((option) => (
            <option key={option.name} value={option.name}>{option.label}</option>
          ))}
        </optgroup>
      ) : null}
    </select>
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

function getOriginText(choice: DocumentChoice, t: (source: string, params?: TranslationParams) => string) {
  if (choice.origin === "process") {
    return t("уже в процессе · {version}", { version: choice.document.version });
  }
  if (choice.origin === "node") {
    return t("внутри ноды: {owner} · {version}", { owner: choice.ownerTitle ?? t("раздел"), version: choice.document.version });
  }
  return t("входящие без связи · {version}", { version: choice.document.version });
}

function uniqueNames(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function getParticipantOptions(project: DemoProject, process: BusinessProcess): ParticipantOption[] {
  const projectEmails = new Set(project.participants.map((participant) => participant.email));
  const byName = new Map<string, ParticipantOption>();

  project.participants.forEach((participant) => {
    byName.set(participant.name, {
      name: participant.name,
      label: `${participant.name} · ${participant.position}`,
      inProject: true,
    });
  });

  teamDirectory.forEach((participant) => {
    if (byName.has(participant.name)) {
      return;
    }
    byName.set(participant.name, {
      name: participant.name,
      label: `${participant.name} · ${participant.position}`,
      inProject: projectEmails.has(participant.email),
      seed: participant,
    });
  });

  [process.sender, process.receiver, process.approver, ...(process.participantNames ?? [])].forEach((name) => {
    if (name && !byName.has(name)) {
      byName.set(name, {
        name,
        label: name,
        inProject: true,
      });
    }
  });

  return Array.from(byName.values());
}

function getInitialPerson(value: string | undefined, options: ParticipantOption[]) {
  if (value && options.some((option) => option.name === value)) {
    return value;
  }
  return options[0]?.name ?? "";
}

function toDateTimeLocalValue(value?: string) {
  const date = parseDeadline(value);
  if (!date) return "";
  return formatDateTimeLocal(date);
}

function getDefaultDeadlineInput(hoursFromNow: number) {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow, 0, 0, 0);
  return formatDateTimeLocal(date);
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
