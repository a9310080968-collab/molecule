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

  const approved = nodes.filter((node) => node.status === "approved").length;
  return Math.round((approved / nodes.length) * 100);
}

export function getStatusText(status?: ProjectNode["status"]) {
  return status ? nodeStatusLabels[status] : "Без статуса";
}

export function getProcessStatusText(status: ProcessStatus) {
  return processStatusLabels[status];
}

export function getProcessStatusColor(status: ProcessStatus) {
  return processStatusColors[status];
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
      label: "Центральная нода",
    };
  }

  if (node.status === "approved") {
    return {
      fill: "#d7bb78",
      glow: "#ffe2a4",
      label: "Согласовано",
    };
  }

  if (node.status === "comments") {
    return {
      fill: "#8f91a0",
      glow: "#ff9a6c",
      label: "Есть замечания",
    };
  }

  if (node.status === "review") {
    return {
      fill: "#929caf",
      glow: "#35d9ff",
      label: "На проверке",
    };
  }

  return {
    fill: "#747d91",
    glow: "#9aa5bd",
    label: "Не согласовано",
  };
}

export function getFileLabel(fileType?: FileType) {
  if (!fileType || fileType === "unknown") return "Файл";
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

  return [...processDocs, ...project.inboxDocuments.map((document) => ({ ...document, processId: "", processTitle: "Входящие без связи" }))];
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
        processTitle: node.documentOwnerNodeId ? `Внутри ноды: ${getNodeById(project, node.documentOwnerNodeId)?.title ?? "раздел"}` : "Бесхозный файл",
      };
    });

  const inboxDocs = project.inboxDocuments
    .filter((document) => !seen.has(document.id))
    .map((document) => ({ ...document, processId: "", processTitle: "Входящие без связи" }));

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
  return {
    id: `doc-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    title: name,
    fileType: inferFileType(name),
    version: "v1",
    status: "draft",
    from: source === "mail" ? "Почта" : source === "chat" ? "Чат" : "Импорт",
    updatedAt: "только что",
    source,
    fileUrl,
    fileText,
    mimeType,
    size,
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
    description: ownerNodeId ? "Файл находится внутри ноды раздела." : "Бесхозный файл. Перетащите его в раздел, чтобы разобрать.",
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
    from: node.responsible ?? "Документ",
    updatedAt: node.updatedAt ?? "сегодня",
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
  if (!bytes) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
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
    process.tag,
    from?.title,
    from?.shortCode,
    to?.title,
    to?.shortCode,
    ...process.documents.flatMap((document) => [
      document.title,
      getFileLabel(document.fileType),
      document.version,
      document.from,
      nodeStatusLabels[document.status],
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}
