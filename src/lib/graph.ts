import { nodeStatusLabels, processStatusColors, processStatusLabels } from "../data/mockProject";
import type {
  BusinessProcess,
  DemoProject,
  FileType,
  MapLevel,
  ProcessDocument,
  ProcessStatus,
  ProjectNode,
  SearchMatches,
} from "../types";

export function getDefaultLevel(project: DemoProject) {
  return project.levels[0];
}

export function getLevelById(project: DemoProject, levelId: string) {
  return project.levels.find((level) => level.id === levelId) ?? getDefaultLevel(project);
}

export function getNodeById(project: DemoProject, nodeId?: string | null) {
  if (!nodeId) {
    return undefined;
  }

  return project.nodes.find((node) => node.id === nodeId);
}

export function getProcessById(project: DemoProject, processId?: string | null) {
  if (!processId) {
    return undefined;
  }

  return project.processes.find((process) => process.id === processId);
}

export function getLevelNodes(project: DemoProject, level: MapLevel) {
  const byId = new Map(project.nodes.map((node) => [node.id, node]));
  return level.nodeIds.map((id) => byId.get(id)).filter(Boolean) as ProjectNode[];
}

export function getLevelProcesses(project: DemoProject, level: MapLevel) {
  return project.processes.filter((process) => process.levelId === level.id);
}

export function getOrphanDocumentNodes(project: DemoProject) {
  return project.nodes.filter((node) => node.type === "document" && !node.documentOwnerNodeId);
}

export function getOwnedDocumentNodes(project: DemoProject, nodeId: string) {
  return project.nodes.filter((node) => node.type === "document" && node.documentOwnerNodeId === nodeId);
}

function getDescendantLevelIds(project: DemoProject, rootLevelId: string) {
  const result = new Set<string>();
  const queue = [rootLevelId];

  while (queue.length) {
    const levelId = queue.shift();
    if (!levelId || result.has(levelId)) {
      continue;
    }

    result.add(levelId);
    project.levels
      .filter((level) => level.parentLevelId === levelId)
      .forEach((level) => queue.push(level.id));
  }

  return result;
}

export function getNodeProcesses(project: DemoProject, nodeId: string) {
  const node = getNodeById(project, nodeId);
  const processesById = new Map<string, BusinessProcess>();

  project.processes
    .filter((process) => process.from === nodeId || process.to === nodeId)
    .forEach((process) => processesById.set(process.id, process));

  if (node?.childrenLevelId) {
    const nestedLevelIds = getDescendantLevelIds(project, node.childrenLevelId);
    project.processes
      .filter((process) => nestedLevelIds.has(process.levelId))
      .forEach((process) => processesById.set(process.id, process));
  }

  if (node?.id === getDefaultLevel(project).centralNodeId) {
    project.processes.forEach((process) => processesById.set(process.id, process));
  }

  return Array.from(processesById.values());
}

export function getNodeDocuments(project: DemoProject, nodeId: string) {
  return [
    ...getOwnedDocumentNodes(project, nodeId).map((node) => getDocumentFromNode(node)),
    ...getNodeProcesses(project, nodeId).flatMap((process) => process.documents),
  ];
}

export function getProjectProgress(project: DemoProject, level: MapLevel) {
  const nodes = getLevelNodes(project, level).filter((node) => node.id !== level.centralNodeId && node.type !== "document");
  if (!nodes.length) {
    return 0;
  }

  const total = nodes.reduce((sum, node) => sum + getNodeCompletion(node), 0);
  return Math.round(total / nodes.length);
}

export function getNodeCompletion(node: ProjectNode) {
  if (node.type === "document") {
    return node.status === "approved" ? 100 : 0;
  }

  const checklist = node.checklist ?? [];
  if (checklist.length) {
    const done = checklist.filter((item) => item.done).length;
    return Math.round((done / checklist.length) * 100);
  }

  return node.status === "approved" ? 100 : 0;
}

export function getStatusText(status?: ProjectNode["status"]) {
  return status ? nodeStatusLabels[status] : "No status";
}

export function getProcessStatusText(status: ProcessStatus) {
  return processStatusLabels[status];
}

export function getProcessStatusColor(status: ProcessStatus) {
  return processStatusColors[status];
}

export type ProcessRuntimeState = "draft" | "active" | "due_soon" | "urgent" | "overdue" | "done" | "rejected";

export function getProcessRuntimeState(process: BusinessProcess): ProcessRuntimeState {
  if (process.status === "accepted") return "done";
  if (process.status === "rejected") return "rejected";
  if (process.status === "draft") return "draft";

  const deadlines = getProcessDeadlineEntries(process)
    .map((entry) => parseDeadline(entry.value))
    .filter((date): date is Date => Boolean(date));

  if (!deadlines.length) return "active";

  const now = Date.now();
  const minMs = Math.min(...deadlines.map((date) => date.getTime() - now));
  const hours = minMs / 36e5;

  if (hours < 0) return "overdue";
  if (hours <= 24) return "urgent";
  if (hours <= 72) return "due_soon";
  return "active";
}

export function getProcessRuntimeColor(process: BusinessProcess) {
  return getProcessStatusColor(process.status);
}

export function getProcessDeadlineLabel(process: BusinessProcess) {
  const entries = getProcessDeadlineEntries(process);
  if (!entries.length) {
    return getProcessStatusText(process.status);
  }

  return entries.map((entry) => `${entry.label} ${formatDeadlineDistance(entry.value)}`).join(" / ");
}

export function getProcessDeadlineEntries(process: BusinessProcess) {
  if (process.direction === "both") {
    return [
      { key: "forward" as const, label: "→", value: process.dueAt },
      { key: "backward" as const, label: "←", value: process.dueBackAt },
    ].filter((entry) => entry.value);
  }

  return [{ key: process.direction, label: process.direction === "backward" ? "←" : "→", value: process.dueAt }]
    .filter((entry) => entry.value);
}

export function parseDeadline(value?: string) {
  if (!value?.trim()) return undefined;
  const text = value.trim();
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;

  const now = new Date();
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (/(?:сегодня|today)/i.test(text) && timeMatch) {
    const date = new Date(now);
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return date;
  }
  if (/(?:завтра|tomorrow)/i.test(text) && timeMatch) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return date;
  }

  const dateMatch = text.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!dateMatch) return undefined;
  const year = dateMatch[3] ? normalizeYear(Number(dateMatch[3])) : now.getFullYear();
  const hours = dateMatch[4] ? Number(dateMatch[4]) : 18;
  const minutes = dateMatch[5] ? Number(dateMatch[5]) : 0;
  const date = new Date(year, Number(dateMatch[2]) - 1, Number(dateMatch[1]), hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDeadlineDistance(value?: string) {
  const deadline = parseDeadline(value);
  if (!deadline) return value || "no deadline";

  const diffMs = deadline.getTime() - Date.now();
  const absHours = Math.abs(diffMs) / 36e5;
  const prefix = diffMs < 0 ? "overdue by " : "remaining ";

  if (absHours < 1) {
    return `${prefix}${Math.max(1, Math.round(absHours * 60))} min`;
  }
  if (absHours < 48) {
    return `${prefix}${Math.round(absHours)} h`;
  }
  return `${prefix}${Math.round(absHours / 24)} d`;
}

function normalizeYear(year: number) {
  return year < 100 ? 2000 + year : year;
}

export function getNodeVisualTone(node: ProjectNode) {
  if (node.type === "document") {
    const color = getFileTypeColor(node.fileType ?? node.document?.fileType);
    return {
      fill: color,
      glow: color,
      label: getFileLabel(node.fileType ?? node.document?.fileType),
    };
  }

  if (node.type === "central") {
    return {
      fill: "#7f8798",
      glow: "#35d9ff",
      label: "Central node",
    };
  }

  if (node.status === "approved") {
    return {
      fill: "#d7bb78",
      glow: "#ffe2a4",
      label: "Approved",
    };
  }

  if (node.status === "comments") {
    return {
      fill: "#8f91a0",
      glow: "#ff9a6c",
      label: "Changes requested",
    };
  }

  if (node.status === "review") {
    return {
      fill: "#929caf",
      glow: "#35d9ff",
      label: "Under review",
    };
  }

  return {
    fill: "#747d91",
    glow: "#9aa5bd",
    label: "Not approved",
  };
}

export function getFileLabel(fileType?: FileType) {
  if (!fileType || fileType === "unknown") return "File";
  if (fileType === "docx") return "DOC/DOCX";
  if (fileType === "xlsx") return "XLS/XLSX";
  if (fileType === "pptx") return "PPT/PPTX";
  return fileType.toUpperCase();
}

export function getFileTypeColor(fileType?: FileType) {
  switch (fileType) {
    case "txt":
      return "#f5f8ff";
    case "docx":
      return "#2f80ff";
    case "xlsx":
      return "#22c96f";
    case "pptx":
      return "#ffd43b";
    case "pdf":
      return "#ff4c5f";
    case "dwg":
      return "#42d6c8";
    default:
      return "#9aa5bd";
  }
}

export function getFileExtension(fileType?: FileType) {
  switch (fileType) {
    case "docx":
      return "docx";
    case "xlsx":
      return "xlsx";
    case "pptx":
      return "pptx";
    case "pdf":
      return "pdf";
    case "txt":
      return "txt";
    case "dwg":
      return "dwg";
    default:
      return "file";
  }
}

export function getProcessDocuments(project: DemoProject, processId: string) {
  return getProcessById(project, processId)?.documents ?? [];
}

export function getAcceptedAssignments(project: DemoProject) {
  return project.processes
    .filter((process) => process.status === "accepted" || process.status === "in_work")
    .sort((a, b) => (b.validationAt ?? b.createdAt).localeCompare(a.validationAt ?? a.createdAt));
}

export function getChecks(project: DemoProject) {
  return project.processes.filter((process) => process.status === "sent" || process.status === "rejected");
}

export function getAllDocuments(project: DemoProject) {
  const processDocs = project.processes.flatMap((process) =>
    process.documents.map((document) => ({
      ...document,
      processId: process.id,
      processTitle: process.title,
    })),
  );

  return [...processDocs, ...project.inboxDocuments.map((document) => ({ ...document, processId: "", processTitle: "Unassigned incoming" }))];
}

export function getAllVisibleDocuments(project: DemoProject) {
  const seen = new Set<string>();
  const processDocs = project.processes.flatMap((process) =>
    process.documents.map((document) => {
      seen.add(document.id);
      return {
        ...document,
        processId: process.id,
        processTitle: process.title,
      };
    }),
  );

  const nodeDocs = project.nodes
    .filter((node) => node.type === "document" && node.document && !seen.has(node.document.id))
    .map((node) => {
      const document = getDocumentFromNode(node);
      seen.add(document.id);
      return {
        ...document,
        processId: "",
        processTitle: node.documentOwnerNodeId ? `Inside node: ${getNodeById(project, node.documentOwnerNodeId)?.title ?? "section"}` : "Unassigned file",
      };
    });

  const inboxDocs = project.inboxDocuments
    .filter((document) => !seen.has(document.id))
    .map((document) => ({ ...document, processId: "", processTitle: "Unassigned incoming" }));

  return [...processDocs, ...nodeDocs, ...inboxDocs];
}

export function getSearchMatches(query: string, project: DemoProject, level: MapLevel): SearchMatches {
  const normalized = normalizeText(query);
  if (!normalized) {
    return { nodeIds: new Set(), processIds: new Set() };
  }

  const nodes = getLevelNodes(project, level);
  const processes = getLevelProcesses(project, level);
  const nodeIds = new Set<string>();
  const processIds = new Set<string>();

  nodes.forEach((node) => {
    if (normalizeText(getNodeSearchText(node)).includes(normalized)) {
      nodeIds.add(node.id);
    }

    if (node.childrenLevelId) {
      const nestedLevelIds = getDescendantLevelIds(project, node.childrenLevelId);
      const hasNestedMatch = project.processes.some(
        (process) => nestedLevelIds.has(process.levelId) && normalizeText(getProcessSearchText(process, project)).includes(normalized),
      );
      if (hasNestedMatch) {
        nodeIds.add(node.id);
      }
    }
  });

  processes.forEach((process) => {
    const processText = normalizeText(getProcessSearchText(process, project));
    if (processText.includes(normalized)) {
      processIds.add(process.id);
      nodeIds.add(process.from);
      nodeIds.add(process.to);
    }
  });

  project.chatMessages.forEach((message) => {
    if (!normalizeText(message.text).includes(normalized)) {
      return;
    }
    if (message.processId) {
      processIds.add(message.processId);
      const process = getProcessById(project, message.processId);
      if (process) {
        nodeIds.add(process.from);
        nodeIds.add(process.to);
      }
    }
    if (message.nodeId) {
      nodeIds.add(message.nodeId);
    }
  });

  return { nodeIds, processIds };
}

export function createProcessId(from: string, to: string) {
  return `bp-${from}-${to}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

export function createDocumentFromName(name: string, source: ProcessDocument["source"] = "drop", fileUrl?: string, fileText?: string, mimeType?: string, size?: string): ProcessDocument {
  const fileType = inferFileType(name);
  const preview = buildDocumentPreview(name, fileType);
  return {
    id: `doc-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    title: name,
    fileType,
    version: "v1",
    status: "draft",
    from: source === "mail" ? "Mail" : source === "chat" ? "Messenger" : "Import",
    updatedAt: "just now",
    source,
    fileUrl: fileUrl ?? getDemoFileUrl(fileType),
    fileText: fileText ?? preview.text,
    mimeType,
    size,
    previewRows: preview.rows,
  };
}

export function createDocumentNode(projectId: string, levelId: string, document: ProcessDocument, ownerNodeId?: string): ProjectNode {
  return {
    id: `node-${document.id}`,
    projectId,
    levelId,
    type: "document",
    title: document.title,
    shortCode: getFileLabel(document.fileType),
    description: ownerNodeId ? "The file is stored inside a section node." : "Unassigned file. Drag it into a section to organize it.",
    status: document.status,
    responsible: document.from,
    updatedAt: document.updatedAt,
    documentOwnerNodeId: ownerNodeId,
    fileType: document.fileType,
    document,
  };
}

export function getDocumentFromNode(node: ProjectNode): ProcessDocument {
  return node.document ?? {
    id: node.id,
    title: node.title,
    fileType: node.fileType ?? "unknown",
    version: "v1",
    status: node.status ?? "draft",
    from: node.responsible ?? "Document",
    updatedAt: node.updatedAt ?? "today",
    source: "manual",
  };
}

export function inferFileType(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "docx";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "xlsx";
  if (ext === "ppt" || ext === "pptx" || ext === "pptm") return "pptx";
  if (ext === "txt" || ext === "md" || ext === "rtf") return "txt";
  if (ext === "dwg" || ext === "dxf") return "dwg";
  return "unknown";
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function getDemoFileUrl(fileType: FileType) {
  const files: Partial<Record<FileType, string>> = {
    pdf: "demo-plan.pdf",
    docx: "demo-task.docx",
    xlsx: "demo-register.xlsx",
    txt: "demo-note.txt",
  };
  const file = files[fileType];
  return file ? `${import.meta.env.BASE_URL}demo-files/${file}` : undefined;
}

function buildDocumentPreview(title: string, fileType: FileType): { text?: string; rows?: string[][] } {
  if (fileType === "xlsx") {
    return {
      rows: [
        ["Section", "Document", "Version", "Status", "Responsible"],
        ["AR", "First-floor plan", "v4", "Under review", "Alisa Bishop"],
        ["KR", "Load calculation", "v2", "Changes requested", "Ian Miller"],
        ["PZ", "Technical and economic indicators", "v1", "In progress", "Maria Stone"],
        ["HVAC/WS", "Riser summary", "v1", "Accepted", "Ryan Fields"],
      ],
    };
  }

  if (fileType === "docx") {
    return {
      text: [
        title,
        "",
        "1. Document purpose",
        "This document records the initial requirements, responsible participants, and data package for the business process.",
        "",
        "2. Review materials",
        "The package includes the current file version, the assignee's comment, the approval deadline, and the required fields.",
        "",
        "3. Result",
        "After review, the lead project engineer accepts the document, returns it with comments, or marks the task as partially approved.",
      ].join("\n"),
    };
  }

  if (fileType === "pdf") {
    return {
      text: [
        title,
        "Demo PDF sheet",
        "The sheet shows the document frame, title block, approval area, and change log. The production version displays the actual PDF here.",
      ].join("\n"),
    };
  }

  return {};
}

function getNodeSearchText(node: ProjectNode) {
  const document = node.type === "document" ? getDocumentFromNode(node) : undefined;
  return [
    node.title,
    node.shortCode,
    node.description,
    node.status ? nodeStatusLabels[node.status] : "",
    node.responsible,
    node.tags?.join(" "),
    node.deadlineAt,
    document?.title,
    document ? getFileLabel(document.fileType) : "",
    document?.version,
    document?.from,
    document?.detectedTag,
    document?.receivedByEmail,
    document?.integrationProvider,
  ]
    .filter(Boolean)
    .join(" ");
}

function getProcessSearchText(process: BusinessProcess, project: DemoProject) {
  const from = getNodeById(project, process.from);
  const to = getNodeById(project, process.to);
  return [
    process.title,
    process.description,
    processStatusLabels[process.status],
    process.sender,
    process.receiver,
    process.approver,
    process.dueAt,
    process.tag,
    process.requiredFields?.map((field) => `${field.label} ${field.required ? "required" : "optional"}`).join(" "),
    from?.title,
    from?.shortCode,
    to?.title,
    to?.shortCode,
    ...process.documents.flatMap((document) => [
      document.title,
      getFileLabel(document.fileType),
      document.version,
      document.from,
      document.detectedTag,
      document.receivedByEmail,
      document.integrationProvider,
      nodeStatusLabels[document.status],
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}
