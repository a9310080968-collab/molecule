import { documents, project, projectNodes, sections, statusLabels } from "../data/mockProject";
import type { LinkEdits, ProjectLink, ProjectNode, SearchMatches, StatusLabels, Vec3 } from "../types";

export type ParentMap = Record<string, string | null>;

export const centralNode = projectNodes.find((node) => node.type === "central")!;

export function getProjectProgress(nodes = projectNodes, parentMap: ParentMap = {}) {
  const sceneSections = nodes.filter((node) => node.type === "section");
  const sectionIds = new Set(sceneSections.map((section) => section.id));
  const reviewDocuments = nodes.filter((node) => {
    if (node.type !== "document") {
      return false;
    }

    const parentId = getEffectiveParentId(node, parentMap);
    return parentId ? sectionIds.has(parentId) : false;
  });

  if (reviewDocuments.length) {
    const approvedDocuments = reviewDocuments.filter((document) => document.status === "approved").length;
    return Math.round((approvedDocuments / reviewDocuments.length) * 100);
  }

  const approved = sceneSections.filter((section) => section.status === "approved").length;
  return sceneSections.length ? Math.round((approved / sceneSections.length) * 100) : 0;
}

export function getEffectiveParentId(node: ProjectNode, parentMap: ParentMap) {
  if (Object.prototype.hasOwnProperty.call(parentMap, node.id)) {
    return parentMap[node.id] ?? undefined;
  }

  return node.parentId;
}

export function getSectionDocuments(sectionId: string, parentMap: ParentMap, nodes = projectNodes) {
  return nodes.filter((node) => node.type === "document" && getEffectiveParentId(node, parentMap) === sectionId);
}

export function buildInitialPositions(): Record<string, Vec3> {
  const positions: Record<string, Vec3> = {
    [project.id]: [0, 0, 0],
  };
  const radius = 3.72;
  const zOffsets = [0.15, -0.15, 0.45, -0.45, 0.25, -0.25, 0.55, -0.55];

  sections.forEach((section, index) => {
    const angle = index * ((Math.PI * 2) / sections.length) - Math.PI / 9;
    const sectionPosition: Vec3 = [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      zOffsets[index] ?? 0,
    ];
    positions[section.id] = sectionPosition;

    const sectionDocs = documents.filter((doc) => doc.parentId === section.id);
    const outward = normalize2(sectionPosition[0], sectionPosition[1]);
    const tangent = [-outward[1], outward[0]];
    const docSpread = 0.68;
    const baseOffset = sectionDocs.length > 4 ? 1.72 : 1.58;

    sectionDocs.forEach((document, docIndex) => {
      const local = (docIndex - (sectionDocs.length - 1) / 2) * docSpread;
      const depth = docIndex % 2 === 0 ? 0.45 : -0.28;
      positions[document.id] = [
        sectionPosition[0] + outward[0] * baseOffset + tangent[0] * local,
        sectionPosition[1] + outward[1] * baseOffset + tangent[1] * local,
        sectionPosition[2] + depth,
      ];
    });
  });

  return positions;
}

export function getLinkId(from: string, to: string) {
  return `${from}__${to}`;
}

export function getManualLinkId(from: string, to: string) {
  return `manual__${from}__${to}__${Date.now()}__${Math.round(Math.random() * 10000)}`;
}

export function getLinks(parentMap: ParentMap, nodes = projectNodes): ProjectLink[] {
  const sceneSections = nodes.filter((node) => node.type === "section");
  const sceneDocuments = nodes.filter((node) => node.type === "document");

  const sectionLinks = sceneSections.map((section) => ({
    id: getLinkId(project.id, section.id),
    from: project.id,
    to: section.id,
    strength: "primary" as const,
    source: "auto" as const,
  }));

  const docLinks = sceneDocuments.flatMap((document) => {
    const parentId = getEffectiveParentId(document, parentMap);
    if (!parentId) {
      return [];
    }
    const parent = nodes.find((node) => node.id === parentId);

    return [{
      id: getLinkId(parentId, document.id),
      from: parentId,
      to: document.id,
      strength: parent?.type === "document" ? ("tertiary" as const) : ("secondary" as const),
      source: "auto" as const,
    }];
  });

  return [...sectionLinks, ...docLinks];
}

export function getSearchMatches(
  query: string,
  parentMap: ParentMap,
  nodes = projectNodes,
  labels: StatusLabels = statusLabels,
  linkEdits: LinkEdits = {},
  links: ProjectLink[] = getLinks(parentMap, nodes),
): SearchMatches {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return { nodeIds: new Set<string>(), linkIds: new Set<string>() };
  }

  const directMatches = nodes.filter((node) => nodeMatches(node, normalizedQuery, labels));
  const nodeIds = new Set(directMatches.map((node) => node.id));
  const linkIds = new Set<string>();

  directMatches.forEach((node) => {
    if (node.type === "section") {
      getSectionDocuments(node.id, parentMap, nodes).forEach((document) => nodeIds.add(document.id));
    }

    if (node.type === "document") {
      const parentId = getEffectiveParentId(node, parentMap);
      if (parentId) {
        nodeIds.add(parentId);
      }
    }
  });

  links.forEach((link) => {
    const linkText = getLinkSearchText(link, nodes, linkEdits);
    if (!normalizeText(linkText).includes(normalizedQuery)) {
      return;
    }

    linkIds.add(link.id);
    nodeIds.add(link.from);
    nodeIds.add(link.to);
  });

  return { nodeIds, linkIds };
}

export function getNodeById(id: string, nodes = projectNodes) {
  return nodes.find((node) => node.id === id);
}

export function getFileLabel(fileType?: ProjectNode["fileType"]) {
  if (!fileType || fileType === "unknown") {
    return "Файл";
  }

  if (fileType === "docx") {
    return "DOC/DOCX";
  }

  if (fileType === "xlsx") {
    return "XLS/XLSX";
  }

  if (fileType === "pptx") {
    return "PPT/PPTX";
  }

  return fileType.toUpperCase();
}

export function getFileTypeColor(fileType?: ProjectNode["fileType"]) {
  switch (fileType) {
    case "txt":
      return "#f4f8ff";
    case "docx":
      return "#2f80ff";
    case "xlsx":
      return "#1fcf7a";
    case "pptx":
      return "#ffd43b";
    case "pdf":
      return "#ff4c5f";
    default:
      return "#8ea0bf";
  }
}

export function getLinkDefaults(link: ProjectLink, nodes = projectNodes) {
  const from = getNodeById(link.from, nodes);
  const to = getNodeById(link.to, nodes);

  if (link.strength === "primary") {
    return {
      title: "Состав проектного трека",
      description: `${to?.title ?? "Раздел"} входит в общую структуру проекта и влияет на готовность центральной ноды.`,
    };
  }

  if (link.strength === "tertiary") {
    return {
      title: "Связанный документ",
      description: `${to?.title ?? "Документ"} зависит от документа ${from?.title ?? "выше"} и используется как уточнение или приложение.`,
    };
  }

  return {
    title: "Документ внутри раздела",
    description: `${to?.title ?? "Документ"} относится к разделу ${from?.title ?? "проекта"} и наследует его контекст согласования.`,
  };
}

function nodeMatches(node: ProjectNode, normalizedQuery: string, labels: StatusLabels) {
  const status = node.status ? labels[node.status] : "";
  const searchable = [
    node.title,
    node.shortCode,
    node.description,
    node.version,
    status,
    node.fileType,
    node.responsible,
    node.fileText,
    node.sourceUrl,
    node.source,
    node.tags?.join(" "),
    node.deadlineAt,
    node.isNew ? "новое new" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeText(searchable).includes(normalizedQuery);
}

function getLinkSearchText(link: ProjectLink, nodes: ProjectNode[], linkEdits: LinkEdits) {
  const defaults = getLinkDefaults(link, nodes);
  const edit = linkEdits[link.id];
  const from = getNodeById(link.from, nodes);
  const to = getNodeById(link.to, nodes);

  return [
    defaults.title,
    defaults.description,
    edit?.title,
    edit?.description,
    from?.title,
    from?.shortCode,
    to?.title,
    to?.shortCode,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").trim();
}

function normalize2(x: number, y: number): [number, number] {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}
