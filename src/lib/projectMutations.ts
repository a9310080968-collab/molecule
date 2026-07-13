import { createDocumentNode, getDefaultLevel, getDocumentFromNode, getLevelById, getNodeById } from "./graph";
import type { DemoProject, MapLevel, ProcessDocument, ProjectNode } from "../types";

const NOW = "только что";

export function appendUnique(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function isContainerNode(node?: ProjectNode | null) {
  return Boolean(node && node.type !== "document" && node.type !== "central");
}

export function canOpenNodeLevel(node?: ProjectNode | null, currentLevelId?: string) {
  return isContainerNode(node) && node?.childrenLevelId !== currentLevelId;
}

export function ensureNodeLevel(project: DemoProject, nodeId: string): { project: DemoProject; levelId: string } {
  const node = getNodeById(project, nodeId);
  if (!node || !isContainerNode(node)) {
    return { project, levelId: getDefaultLevel(project).id };
  }

  const levelId = node.childrenLevelId ?? createLevelId(node.id);
  const existingLevel = project.levels.find((level) => level.id === levelId);
  if (existingLevel) {
    const projectWithLink = node.childrenLevelId
      ? project
      : {
          ...project,
          nodes: project.nodes.map((item) => (item.id === node.id ? { ...item, childrenLevelId: levelId } : item)),
        };
    return { project: projectWithLink, levelId };
  }

  const parentLevel = findNodeParentLevel(project, node) ?? getLevelById(project, node.levelId);
  const childNodes = createDefaultLevelNodes(project.id, levelId, node);
  const childNodeIds = childNodes.map((item) => item.id);
  const ownedDocumentIds = project.nodes
    .filter((item) => item.type === "document" && item.documentOwnerNodeId === node.id)
    .map((item) => item.id);
  const level: MapLevel = {
    id: levelId,
    projectId: project.id,
    title: node.shortCode ? `${node.shortCode} / ${node.title}` : node.title,
    subtitle: "Рабочий уровень ноды: документы, проверка, замечания и передача заданий",
    centralNodeId: node.id,
    nodeIds: [node.id, ...childNodeIds, ...ownedDocumentIds],
    parentLevelId: parentLevel.id,
    parentNodeId: node.id,
  };

  return {
    levelId,
    project: {
      ...project,
      levels: [...project.levels, level],
      nodes: [
        ...project.nodes.map((item) => (item.id === node.id ? { ...item, childrenLevelId: levelId } : item)),
        ...childNodes,
      ],
      updatedAt: NOW,
    },
  };
}

export function addDocumentNodeToProject(
  project: DemoProject,
  activeLevelId: string,
  document: ProcessDocument,
  targetNodeId?: string,
): { project: DemoProject; documentNode: ProjectNode; levelId: string; targetNode?: ProjectNode } {
  if (!targetNodeId) {
    const documentNode = createDocumentNode(project.id, activeLevelId, document);
    return {
      documentNode,
      levelId: activeLevelId,
      project: {
        ...project,
        nodes: [documentNode, ...project.nodes],
        levels: project.levels.map((level) =>
          level.id === activeLevelId ? { ...level, nodeIds: appendUnique(level.nodeIds, documentNode.id) } : level,
        ),
        inboxDocuments: project.inboxDocuments.filter((item) => item.id !== document.id),
        updatedAt: NOW,
      },
    };
  }

  const prepared = ensureNodeLevel(project, targetNodeId);
  const targetNode = getNodeById(prepared.project, targetNodeId);
  if (!targetNode) {
    const documentNode = createDocumentNode(project.id, activeLevelId, document);
    return { project, documentNode, levelId: activeLevelId };
  }

  const documentNode = createDocumentNode(prepared.project.id, prepared.levelId, { ...document, status: "review", updatedAt: NOW }, targetNode.id);
  return {
    documentNode,
    levelId: prepared.levelId,
    targetNode,
    project: {
      ...prepared.project,
      nodes: [documentNode, ...prepared.project.nodes],
      levels: moveNodeToLevel(prepared.project.levels, documentNode.id, prepared.levelId),
      inboxDocuments: prepared.project.inboxDocuments.filter((item) => item.id !== document.id),
      updatedAt: NOW,
    },
  };
}

export function putDocumentIntoNode(
  project: DemoProject,
  documentNodeId: string,
  targetNodeId: string,
): { project: DemoProject; levelId: string; targetNode?: ProjectNode } {
  const documentNode = getNodeById(project, documentNodeId);
  if (!documentNode || documentNode.type !== "document") {
    return { project, levelId: getDefaultLevel(project).id };
  }

  const prepared = ensureNodeLevel(project, targetNodeId);
  const targetNode = getNodeById(prepared.project, targetNodeId);
  if (!targetNode) {
    return { project, levelId: documentNode.levelId };
  }

  const document = {
    ...getDocumentFromNode(documentNode),
    status: "review" as const,
    updatedAt: NOW,
  };

  return {
    levelId: prepared.levelId,
    targetNode,
    project: {
      ...prepared.project,
      nodes: prepared.project.nodes.map((node) =>
        node.id === documentNodeId
          ? {
              ...node,
              levelId: prepared.levelId,
              documentOwnerNodeId: targetNode.id,
              description: "Файл находится внутри ноды раздела.",
              status: "review",
              updatedAt: NOW,
              document,
            }
          : node,
      ),
      levels: moveNodeToLevel(prepared.project.levels, documentNodeId, prepared.levelId),
      inboxDocuments: prepared.project.inboxDocuments.filter((item) => item.id !== document.id),
      updatedAt: NOW,
    },
  };
}

export function removeDocumentFromNode(project: DemoProject, documentNodeId: string): { project: DemoProject; levelId: string } {
  const documentNode = getNodeById(project, documentNodeId);
  if (!documentNode || documentNode.type !== "document") {
    return { project, levelId: getDefaultLevel(project).id };
  }

  const document = {
    ...getDocumentFromNode(documentNode),
    status: "draft" as const,
    updatedAt: NOW,
  };
  const currentLevel = getLevelById(project, documentNode.levelId);
  const destinationLevelId = currentLevel.parentLevelId ?? getDefaultLevel(project).id;

  return {
    levelId: destinationLevelId,
    project: {
      ...project,
      nodes: project.nodes.map((node) =>
        node.id === documentNodeId
          ? {
              ...node,
              levelId: destinationLevelId,
              documentOwnerNodeId: undefined,
              description: "Бесхозный файл. Перетащите его в раздел, чтобы разобрать.",
              status: "draft",
              updatedAt: NOW,
              document,
            }
          : node,
      ),
      levels: moveNodeToLevel(project.levels, documentNodeId, destinationLevelId),
      inboxDocuments: project.inboxDocuments.filter((item) => item.id !== document.id),
      updatedAt: NOW,
    },
  };
}

export function moveNodeToLevel(levels: MapLevel[], nodeId: string, destinationLevelId: string) {
  return levels.map((level) => {
    const withoutNode = level.nodeIds.filter((id) => id !== nodeId);
    return level.id === destinationLevelId ? { ...level, nodeIds: appendUnique(withoutNode, nodeId) } : { ...level, nodeIds: withoutNode };
  });
}

function createLevelId(nodeId: string) {
  return `level-auto-${nodeId.replace(/^node-/, "")}`;
}

function createDefaultLevelNodes(projectId: string, levelId: string, parentNode: ProjectNode): ProjectNode[] {
  const base = parentNode.id.replace(/^node-/, "");
  return [
    createInnerNode(projectId, levelId, `node-${base}-inbox`, "package", "Документы на проверку", "Вход", "Файлы, которые сотрудники положили внутрь ноды.", "review", parentNode.responsible),
    createInnerNode(projectId, levelId, `node-${base}-work`, "subsection", "Рабочие материалы", "Работа", "Черновики, расчеты и материалы в работе.", "draft", parentNode.responsible),
    createInnerNode(projectId, levelId, `node-${base}-accepted`, "package", "Согласовано", "OK", "Документы, которые прошли проверку.", "approved", parentNode.responsible),
    createInnerNode(projectId, levelId, `node-${base}-comments`, "package", "Замечания", "Зам", "Возвраты, замечания и файлы на доработку.", "comments", parentNode.responsible),
  ];
}

function createInnerNode(
  projectId: string,
  levelId: string,
  id: string,
  type: ProjectNode["type"],
  title: string,
  shortCode: string,
  description: string,
  status: ProjectNode["status"],
  responsible?: string,
): ProjectNode {
  return {
    id,
    projectId,
    levelId,
    type,
    title,
    shortCode,
    description,
    status,
    responsible,
    updatedAt: NOW,
  };
}

function findNodeParentLevel(project: DemoProject, node: ProjectNode) {
  return project.levels.find((level) => level.nodeIds.includes(node.id) && level.id !== node.childrenLevelId);
}
