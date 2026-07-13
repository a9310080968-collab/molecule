import { type CSSProperties, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type SidebarMenuId } from "./components/Sidebar";
import { TopSearch } from "./components/TopSearch";
import { ProjectScene, type SceneHandle } from "./components/ProjectScene";
import { BottomControls } from "./components/BottomControls";
import { RightPanel } from "./components/RightPanel";
import { WorkspacePanel, type WorkspaceTaskDraft } from "./components/WorkspacePanel";
import { DocumentModal } from "./components/DocumentModal";
import { OrphanFilesPanel } from "./components/OrphanFilesPanel";
import { ProjectChatPanel } from "./components/ProjectChatPanel";
import { ProjectManagerModal } from "./components/ProjectManagerModal";
import { ProcessBuilderModal } from "./components/ProcessBuilderModal";
import { ProcessDetailModal } from "./components/ProcessDetailModal";
import { PersonalIntegrationsModal } from "./components/PersonalIntegrationsModal";
import { MvpGuide } from "./components/MvpGuide";
import { demoProjects, initialNotifications } from "./data/mockProject";
import {
  createDocumentNode,
  createDocumentFromName,
  createProcessId,
  formatBytes,
  getDefaultLevel,
  getLevelById,
  getLevelNodes,
  getLevelProcesses,
  getNodeById,
  getProcessById,
  getSearchMatches,
} from "./lib/graph";
import {
  addDocumentNodeToProject,
  appendUnique,
  canOpenNodeLevel,
  ensureNodeLevel,
  putDocumentIntoNode,
  removeDocumentFromNode,
} from "./lib/projectMutations";
import { createBlankProjectTemplate, createDefaultProjectTemplate, createProjectFromTemplate, createTemplateFromProject } from "./lib/projectTemplates";
import type {
  BusinessProcess,
  ChatMessage,
  DemoNotification,
  DemoProject,
  IntegrationProvider,
  NodeEdit,
  NodeStatus,
  ParticipantEdit,
  ProcessDocument,
  ProcessEdit,
  ProjectParticipantSeed,
  ProjectNode,
  ProjectTemplate,
  UserIntegration,
} from "./types";

type HistorySnapshot = {
  projects: DemoProject[];
  activeProjectId: string;
  activeLevelId: string;
  selectedNodeId: string;
  selectedProcessId: string | null;
  notifications: DemoNotification[];
};

const HISTORY_LIMIT = 60;
const STORAGE_KEY = "molecule-mvp-state-v2";
type LevelTransition = "down" | "up";

type PersistedAppState = {
  projects: DemoProject[];
  projectTemplates: ProjectTemplate[];
  activeProjectId: string;
  activeLevelId: string;
  selectedNodeId: string;
  notifications: DemoNotification[];
  fontScale: number;
  guideDismissed?: boolean;
};

let cachedPersistedState: PersistedAppState | null | undefined;

function getPersistedState() {
  if (cachedPersistedState !== undefined) {
    return cachedPersistedState;
  }

  if (typeof window === "undefined") {
    cachedPersistedState = null;
    return cachedPersistedState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cachedPersistedState = raw ? JSON.parse(raw) as PersistedAppState : null;
  } catch {
    cachedPersistedState = null;
  }

  return cachedPersistedState;
}

function mergeProjectTemplates(savedTemplates: ProjectTemplate[] | undefined, defaultTemplates: ProjectTemplate[]) {
  if (!savedTemplates?.length) {
    return defaultTemplates;
  }

  const savedIds = new Set(savedTemplates.map((template) => template.id));
  return [
    ...defaultTemplates.filter((template) => !savedIds.has(template.id)),
    ...savedTemplates,
  ];
}

export default function App() {
  const persistedState = getPersistedState();
  const defaultTemplates = useMemo(() => [
    createBlankProjectTemplate(),
    createDefaultProjectTemplate(),
    createTemplateFromProject(demoProjects[0], "Жилой комплекс / полный комплект", "Структура разделов, внутренних уровней и контейнеров связи без рабочих документов."),
    createTemplateFromProject(demoProjects[1], "Компактный офисный проект", "Легкая структура для небольшого объекта с ИРД, АР, КР, ЭОМ и сметой."),
  ], []);
  const initialProjects = persistedState?.projects?.length ? persistedState.projects : demoProjects;
  const initialActiveProject = initialProjects.find((project) => project.id === persistedState?.activeProjectId) ?? initialProjects[0];
  const initialActiveLevel = initialActiveProject.levels.find((level) => level.id === persistedState?.activeLevelId) ?? getDefaultLevel(initialActiveProject);
  const initialSelectedNode = getNodeById(initialActiveProject, persistedState?.selectedNodeId) ?? getNodeById(initialActiveProject, initialActiveLevel.centralNodeId);
  const [projects, setProjects] = useState<DemoProject[]>(initialProjects);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>(() => mergeProjectTemplates(persistedState?.projectTemplates, defaultTemplates));
  const [activeProjectId, setActiveProjectId] = useState(initialActiveProject.id);
  const [activeLevelId, setActiveLevelId] = useState(initialActiveLevel.id);
  const [selectedNodeId, setSelectedNodeId] = useState(initialSelectedNode?.id ?? initialActiveLevel.centralNodeId);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<SidebarMenuId>("map");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<DemoNotification[]>(persistedState?.notifications ?? initialNotifications);
  const [modalDocument, setModalDocument] = useState<ProcessDocument | null>(null);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [personalSettingsOpen, setPersonalSettingsOpen] = useState(false);
  const [processBuilderId, setProcessBuilderId] = useState<string | null>(null);
  const [processDetailId, setProcessDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(persistedState?.fontScale ?? 1);
  const [guideDismissed, setGuideDismissed] = useState(Boolean(persistedState?.guideDismissed));
  const [constructorHintDismissed, setConstructorHintDismissed] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [levelTransition, setLevelTransition] = useState<LevelTransition | null>(null);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const sceneRef = useRef<SceneHandle | null>(null);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const activeLevel = getLevelById(activeProject, activeLevelId);
  const levelNodes = useMemo(() => getLevelNodes(activeProject, activeLevel), [activeLevel, activeProject]);
  const levelProcesses = useMemo(() => getLevelProcesses(activeProject, activeLevel), [activeLevel, activeProject]);
  const selectedNode = getNodeById(activeProject, selectedNodeId) ?? getNodeById(activeProject, activeLevel.centralNodeId) ?? levelNodes[0];
  const selectedProcess = getProcessById(activeProject, selectedProcessId) ?? null;
  const builderProcess = getProcessById(activeProject, processBuilderId) ?? null;
  const detailProcess = getProcessById(activeProject, processDetailId) ?? null;
  const currentUser = activeProject.participants.find((participant) => participant.name === "Павел Андреев") ?? activeProject.participants.find((participant) => participant.role === "admin") ?? activeProject.participants[0];
  const matches = useMemo(() => getSearchMatches(query, activeProject, activeLevel), [activeLevel, activeProject, query]);
  const isSearching = query.trim().length > 0;
  const hasNoResults = isSearching && matches.nodeIds.size + matches.processIds.size === 0;
  const fontVars = useMemo(() => buildFontVars(fontScale), [fontScale]);
  const showConstructorHint =
    activeMenu === "map" &&
    guideDismissed &&
    !constructorHintDismissed &&
    activeProject.processes.length === 0 &&
    levelNodes.filter((node) => node.type !== "central" && node.type !== "document").length <= 4;

  useEffect(() => {
    const state: PersistedAppState = {
      projects,
      projectTemplates,
      activeProjectId,
      activeLevelId,
      selectedNodeId,
      notifications,
      fontScale,
      guideDismissed,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Local storage can be unavailable in private browser modes. The demo still works in memory.
    }
  }, [activeLevelId, activeProjectId, fontScale, guideDismissed, notifications, projectTemplates, projects, selectedNodeId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTextField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && !isTextField && event.key.toLocaleLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((event.ctrlKey || event.metaKey) && !isTextField && event.key.toLocaleLowerCase() === "y") {
        event.preventDefault();
        redo();
      }

      if (event.key === "Delete" && selectedProcessId && !isTextField) {
        event.preventDefault();
        deleteProcess(selectedProcessId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projects, activeProjectId, activeLevelId, selectedNodeId, selectedProcessId, notifications, undoStack, redoStack]);

  function getSnapshot(): HistorySnapshot {
    return {
      projects,
      activeProjectId,
      activeLevelId,
      selectedNodeId,
      selectedProcessId,
      notifications,
    };
  }

  function restoreSnapshot(snapshot: HistorySnapshot) {
    setProjects(snapshot.projects);
    setActiveProjectId(snapshot.activeProjectId);
    setActiveLevelId(snapshot.activeLevelId);
    setSelectedNodeId(snapshot.selectedNodeId);
    setSelectedProcessId(snapshot.selectedProcessId);
    setNotifications(snapshot.notifications);
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    setLevelTransition(null);
  }

  function recordHistory() {
    const snapshot = getSnapshot();
    setUndoStack((current) => [...current, snapshot].slice(-HISTORY_LIMIT));
    setRedoStack([]);
  }

  function undo() {
    setUndoStack((current) => {
      const snapshot = current[current.length - 1];
      if (!snapshot) {
        return current;
      }
      setRedoStack((redoCurrent) => [...redoCurrent, getSnapshot()].slice(-HISTORY_LIMIT));
      restoreSnapshot(snapshot);
      return current.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((current) => {
      const snapshot = current[current.length - 1];
      if (!snapshot) {
        return current;
      }
      setUndoStack((undoCurrent) => [...undoCurrent, getSnapshot()].slice(-HISTORY_LIMIT));
      restoreSnapshot(snapshot);
      return current.slice(0, -1);
    });
  }

  function updateActiveProject(updater: (project: DemoProject) => DemoProject, record = true) {
    if (record) {
      recordHistory();
    }
    setProjects((current) => current.map((project) => (project.id === activeProjectId ? updater(project) : project)));
  }

  function selectProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }
    setActiveProjectId(project.id);
    setActiveLevelId(getDefaultLevel(project).id);
    setSelectedNodeId(getDefaultLevel(project).centralNodeId);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    setPersonalSettingsOpen(false);
    setQuery("");
    setLevelTransition(null);
    setActiveMenu("map");
  }

  function createProject(title: string, address: string, templateId: string, teamMembers: ProjectParticipantSeed[] = []) {
    const template = projectTemplates.find((item) => item.id === templateId) ?? projectTemplates[0];
    if (!template) {
      return;
    }

    recordHistory();
    const project = applyProjectTeam(
      createProjectFromTemplate(template, title || `Проект ${projects.length + 1}`, address || "Адрес не указан"),
      teamMembers,
    );
    const defaultLevel = getDefaultLevel(project);
    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
    setActiveLevelId(defaultLevel.id);
    setSelectedNodeId(defaultLevel.centralNodeId);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    setQuery("");
    setActiveMenu("map");
    setConstructorHintDismissed(false);
    setProjectManagerOpen(false);
    showToast(`Проект «${project.title}» создан из шаблона «${template.title}».`);
  }

  function createTemplate(title: string, description: string) {
    const template = createTemplateFromProject(
      activeProject,
      title || `${activeProject.title}: шаблон`,
      description || "Структура проекта без рабочих документов.",
    );
    setProjectTemplates((current) => [template, ...current]);
    showToast(`Шаблон «${template.title}» сохранен.`);
    return template;
  }

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setSelectedProcessId(null);
    setProcessBuilderId(null);
  }

  function selectProcess(processId: string) {
    const process = getProcessById(activeProject, processId);
    if (!process) {
      return;
    }
    if (process.projectId !== activeProjectId) {
      selectProject(process.projectId);
    }
    setLevelTransition(null);
    setActiveLevelId(process.levelId);
    setSelectedProcessId(processId);
    setSelectedNodeId(process.from);
    setActiveMenu("map");
    setProcessBuilderId(null);
    sceneRef.current?.focusNode(process.from);
  }

  function openProcessDetails(processId: string) {
    selectProcess(processId);
    setProcessDetailId(processId);
  }

  function openNodeLevel(node: ProjectNode) {
    if (activeLevel.parentLevelId) {
      showToast("В MVP доступен один уровень детализации внутри ноды.");
      return;
    }

    if (!canOpenNodeLevel(node, activeLevel.id)) {
      return;
    }

    const prepared = ensureNodeLevel(activeProject, node.id);
    updateActiveProject(() => prepared.project);
    setLevelTransition("down");
    setActiveLevelId(prepared.levelId);
    setSelectedNodeId(node.id);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setActiveMenu("map");
  }

  function backLevel() {
    if (!activeLevel.parentLevelId) {
      return;
    }
    const parent = getLevelById(activeProject, activeLevel.parentLevelId);
    setLevelTransition("up");
    setActiveLevelId(parent.id);
    setSelectedNodeId(activeLevel.parentNodeId ?? parent.centralNodeId);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setProcessBuilderId(null);
  }

  function updateNode(nodeId: string, edit: NodeEdit) {
    updateActiveProject((project) => ({
      ...project,
      nodes: project.nodes.map((node) => (node.id === nodeId ? { ...node, ...edit, updatedAt: "только что" } : node)),
      updatedAt: "только что",
    }));
  }

  function updateProcess(processId: string, edit: ProcessEdit) {
    updateActiveProject((project) => ({
      ...project,
      processes: project.processes.map((process) =>
        process.id === processId
          ? {
              ...process,
              ...edit,
              validationAt: edit.status === "accepted" || edit.status === "in_work" ? edit.validationAt ?? process.validationAt ?? "только что" : edit.validationAt ?? process.validationAt,
            }
          : process,
      ),
      updatedAt: "только что",
    }));
  }

  function updateDocumentStatus(documentId: string, status: NodeStatus) {
    updateActiveProject((project) => ({
      ...project,
      nodes: project.nodes.map((node) =>
        node.type === "document" && node.document?.id === documentId
          ? {
              ...node,
              status,
              updatedAt: "только что",
              document: {
                ...node.document,
                status,
                updatedAt: "только что",
              },
            }
          : node,
      ),
      processes: project.processes.map((process) => ({
        ...process,
        documents: process.documents.map((document) =>
          document.id === documentId ? { ...document, status, updatedAt: "только что" } : document,
        ),
      })),
      inboxDocuments: project.inboxDocuments.map((document) =>
        document.id === documentId ? { ...document, status, updatedAt: "только что" } : document,
      ),
      updatedAt: "только что",
    }));
    showToast(status === "approved" ? "Документ согласован." : status === "comments" ? "Документ отмечен как не принятый." : "Документ принят в работу.");
  }

  function createTaggedDocument(title: string, tag: string) {
    const normalizedTitle = title.trim() || "Новый_документ.pdf";
    const normalizedTag = tag.trim();
    const targetNode = normalizedTag ? findNodeByTag(activeProject, normalizedTag) : undefined;
    const document: ProcessDocument = {
      ...createDocumentFromName(normalizedTitle, "manual"),
      from: "Тестовый импорт",
      detectedTag: normalizedTag || undefined,
      autoRouted: Boolean(targetNode),
      isNew: true,
      status: targetNode ? "review" : "draft",
      updatedAt: "только что",
    };
    const result = addDocumentNodeToProject(activeProject, activeLevel.id, document, targetNode?.id);

    updateActiveProject(() => result.project);
    setActiveLevelId(result.levelId);
    setSelectedNodeId(result.documentNode.id);
    setSelectedProcessId(null);
    setActiveMenu("map");
    window.setTimeout(() => sceneRef.current?.focusNode(result.documentNode.id), 80);

    pushNotification({
      title: targetNode ? "Документ распределен по тегу" : "Документ создан без совпадения тега",
      description: targetNode
        ? `Тег «${normalizedTag}» совпал с нодой «${targetNode.shortCode ?? targetNode.title}».`
        : "Совпадающая нода не найдена, документ остался бесхозным.",
      targetNodeId: result.documentNode.id,
    });
    showToast(targetNode ? `Документ попал в ноду «${targetNode.shortCode ?? targetNode.title}».` : "Документ создан как бесхозная малая нода.");
  }

  function createTaskDraft(edit: WorkspaceTaskDraft) {
    const from = getNodeById(activeProject, edit.fromNodeId);
    const to = getNodeById(activeProject, edit.toNodeId);
    if (!from || !to || from.id === to.id) {
      showToast("Для задания нужны две разные ноды.");
      return;
    }

    const level = activeProject.levels.find((item) => item.nodeIds.includes(from.id) && item.nodeIds.includes(to.id)) ?? getDefaultLevel(activeProject);
    const pairCount = activeProject.processes.filter(
      (process) =>
        process.levelId === level.id &&
        ((process.from === from.id && process.to === to.id) || (process.from === to.id && process.to === from.id)),
    ).length;
    const process: BusinessProcess = {
      id: createProcessId(from.id, to.id),
      projectId: activeProject.id,
      levelId: level.id,
      from: from.id,
      to: to.id,
      title: edit.title.trim() || "Новое задание",
      description: edit.description.trim() || "Черновик задания, созданный из вкладки «Задания».",
      status: "draft",
      direction: "forward",
      sender: from.responsible ?? from.title,
      receiver: to.responsible ?? to.title,
      createdAt: "только что",
      dueAt: edit.dueAt,
      parallelIndex: pairCount ? pairCount - 0.5 : 0,
      source: "manual",
      documents: [],
    };

    updateActiveProject((project) => ({
      ...project,
      processes: [process, ...project.processes],
      updatedAt: "только что",
    }));
    setActiveLevelId(level.id);
    setSelectedNodeId(from.id);
    setSelectedProcessId(process.id);
    setActiveMenu("map");
    showToast("Черновик задания создан.");
  }

  function addParticipant(edit: ParticipantEdit) {
    const participant = {
      ...edit,
      id: `participant-${Date.now()}`,
      projectId: activeProject.id,
    };

    updateActiveProject((project) => ({
      ...project,
      participants: [participant, ...project.participants],
      updatedAt: "только что",
    }));
    showToast(`Пользователь «${participant.name}» добавлен в проект.`);
  }

  function updateParticipant(participantId: string, edit: ParticipantEdit) {
    updateActiveProject((project) => ({
      ...project,
      participants: project.participants.map((participant) =>
        participant.id === participantId
          ? {
              ...participant,
              ...edit,
            }
          : participant,
      ),
      updatedAt: "только что",
    }));
    showToast(`Карточка пользователя «${edit.name}» обновлена.`);
  }

  function deleteParticipant(participantId: string) {
    const participant = activeProject.participants.find((item) => item.id === participantId);
    if (!participant) {
      return;
    }

    const adminCount = activeProject.participants.filter((item) => item.role === "admin").length;
    if (participant.role === "admin" && adminCount <= 1) {
      showToast("В проекте должен остаться хотя бы один администратор.");
      return;
    }

    updateActiveProject((project) => ({
      ...project,
      participants: project.participants.filter((item) => item.id !== participantId),
      updatedAt: "только что",
    }));
    showToast(`Пользователь «${participant.name}» удален из проекта.`);
  }

  function saveParticipantIntegrations(participantId: string, integrations: UserIntegration[]) {
    updateActiveProject(
      (project) => ({
        ...project,
        participants: project.participants.map((participant) =>
          participant.id === participantId
            ? {
                ...participant,
                integrations,
              }
            : participant,
        ),
        updatedAt: "только что",
      }),
      false,
    );
  }

  function markIntegrationSynced(participantId: string, provider: IntegrationProvider) {
    updateActiveProject(
      (project) => ({
        ...project,
        participants: project.participants.map((participant) =>
          participant.id === participantId
            ? {
                ...participant,
                integrations: upsertIntegration(participant.integrations ?? [], provider, {
                  status: "connected",
                  lastSyncAt: "только что",
                }),
              }
            : participant,
        ),
        updatedAt: "только что",
      }),
      false,
    );
  }

  function importDemoIntegration(provider: IntegrationProvider, participantId: string) {
    const documents = getDemoIntegrationFiles(provider).map((name) => createDocumentFromName(name, provider));
    markIntegrationSynced(participantId, provider);
    ingestIncomingDocuments(documents, provider, participantId);
  }

  function importIntegrationTestFile(provider: IntegrationProvider, participantId: string, mode: "tagged" | "untagged") {
    const tag = mode === "tagged" ? getRandomProjectTag(activeProject) : undefined;
    const fileName = tag ? `Входящий_${tag}.pdf` : "Входящий файл без тега.pdf";
    const document = {
      ...createDocumentFromName(fileName, provider, undefined, undefined, "application/pdf", getRandomFileSize()),
      previewText: tag
        ? `Демо-файл из ${getIntegrationProviderLabel(provider)}. Тег ${tag} найден, документ должен попасть в соответствующую ноду.`
        : `Демо-файл из ${getIntegrationProviderLabel(provider)} без тега. Документ должен попасть во входящие бесхозные файлы.`,
    };

    markIntegrationSynced(participantId, provider);
    ingestIncomingDocuments([document], provider, participantId);
  }

  async function importIntegrationFiles(provider: IntegrationProvider, participantId: string, files: File[]) {
    const documents = await Promise.all(
      files.map(async (file) =>
        createDocumentFromName(
          file.name,
          provider,
          URL.createObjectURL(file),
          file.name.toLowerCase().endsWith(".txt") ? await file.text() : undefined,
          file.type,
          formatBytes(file.size),
        ),
      ),
    );

    markIntegrationSynced(participantId, provider);
    ingestIncomingDocuments(documents, provider, participantId);
  }

  function ingestIncomingDocuments(documents: ProcessDocument[], provider: IntegrationProvider, participantId: string) {
    const recipient = activeProject.participants.find((participant) => participant.id === participantId);
    let nextProject = activeProject;
    const importedNodes: ProjectNode[] = [];
    let routedCount = 0;
    let unassignedCount = 0;

    documents.forEach((document) => {
      const detectedTag = extractDocumentTag(document.title);
      const targetNode = detectedTag ? findNodeByTag(nextProject, detectedTag) : undefined;
      const incomingDocument: ProcessDocument = {
        ...document,
        status: targetNode ? "review" : "draft",
        from: getIntegrationProviderLabel(provider),
        updatedAt: "только что",
        detectedTag,
        receivedByParticipantId: recipient?.id,
        receivedByEmail: recipient?.email,
        integrationProvider: provider,
        autoRouted: Boolean(targetNode),
        isNew: true,
      };
      const result = addDocumentNodeToProject(nextProject, activeLevel.id, incomingDocument, targetNode?.id);
      nextProject = result.project;
      importedNodes.push(result.documentNode);
      if (targetNode) {
        routedCount += 1;
      } else {
        unassignedCount += 1;
      }
    });

    updateActiveProject(() => nextProject);

    const firstNode = importedNodes[0];
    if (firstNode) {
      setActiveLevelId(firstNode.levelId);
      setSelectedNodeId(firstNode.id);
      setSelectedProcessId(null);
      window.setTimeout(() => sceneRef.current?.focusNode(firstNode.id), 80);
    }

    pushNotification({
      title: `Новые файлы из ${getIntegrationProviderLabel(provider)}`,
      description: `${recipient?.name ?? "Пользователь"} получил(а) ${documents.length} файл(а): ${routedCount} распределено по тегам, ${unassignedCount} во входящих.`,
      targetNodeId: firstNode?.id,
    });
    showToast(`${documents.length} файл(а) импортировано: ${routedCount} распределено, ${unassignedCount} во входящих.`);
  }

  function startLink(nodeId: string) {
    setLinkingFromId(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedProcessId(null);
    setProcessBuilderId(null);
    showToast("Выберите вторую ноду для бизнес-процесса.");
  }

  function completeLink(targetNodeId: string) {
    if (!linkingFromId || linkingFromId === targetNodeId) {
      setLinkingFromId(null);
      return;
    }

    const from = getNodeById(activeProject, linkingFromId);
    const to = getNodeById(activeProject, targetNodeId);
    if (!from || !to) {
      setLinkingFromId(null);
      return;
    }

    const pairCount = activeProject.processes.filter(
      (process) =>
        process.levelId === activeLevel.id &&
        ((process.from === from.id && process.to === to.id) || (process.from === to.id && process.to === from.id)),
    ).length;
    const offset = pairCount ? pairCount - 0.5 : 0;
    const process: BusinessProcess = {
      id: createProcessId(from.id, to.id),
      projectId: activeProject.id,
      levelId: activeLevel.id,
      from: from.id,
      to: to.id,
      title: `Передача задания: ${from.shortCode ?? from.title} → ${to.shortCode ?? to.title}`,
      description: "Ручной контейнер связи. Здесь можно описать, какие файлы передаются и как валидируется задание.",
      status: "draft",
      direction: "forward",
      sender: from.responsible ?? from.title,
      receiver: to.responsible ?? to.title,
      createdAt: "только что",
      parallelIndex: offset,
      source: "manual",
      documents: [],
    };

    updateActiveProject((project) => ({
      ...project,
      processes: [...project.processes, process],
      updatedAt: "только что",
    }));
    setLinkingFromId(null);
    setSelectedProcessId(process.id);
    setProcessBuilderId(process.id);
    showToast("Создан черновик процесса. Открыл конструктор маршрута.");
  }

  function deleteProcess(processId: string) {
    updateActiveProject((project) => ({
      ...project,
      processes: project.processes.filter((process) => process.id !== processId),
      updatedAt: "только что",
    }));
    setSelectedProcessId(null);
    setProcessBuilderId((current) => (current === processId ? null : current));
    setProcessDetailId((current) => (current === processId ? null : current));
    showToast("Контейнер связи удален.");
  }

  function saveProcessBuilder(processId: string, edit: ProcessEdit, mode: "draft" | "launch") {
    const currentProcess = getProcessById(activeProject, processId);
    updateProcess(processId, edit);

    if (mode === "launch") {
      setProcessBuilderId(null);
      pushNotification({
        title: "Процесс отправлен на согласование",
        description: `Маршрут «${edit.title ?? currentProcess?.title ?? "бизнес-процесс"}» собран в конструкторе и отправлен на проверку.`,
        targetProcessId: processId,
      });
      showToast("Процесс собран и отправлен на согласование.");
      return;
    }

    showToast("Черновик процесса сохранен.");
  }

  function attachInboxDocument(processId: string, documentId: string) {
    updateActiveProject((project) => {
      const document = project.inboxDocuments.find((item) => item.id === documentId);
      if (!document) {
        return project;
      }
      return {
        ...project,
        inboxDocuments: project.inboxDocuments.filter((item) => item.id !== documentId),
        processes: project.processes.map((process) =>
          process.id === processId
            ? {
                ...process,
                documents: [{ ...document, status: "review", updatedAt: "только что", source: document.source ?? "manual" }, ...process.documents],
                status: process.status === "draft" ? "sent" : process.status,
              }
            : process,
        ),
        updatedAt: "только что",
      };
    });
    showToast("Задание вручную прикручено к выбранной связи.");
  }

  function rejectProcessDocument(processId: string, documentId: string) {
    const process = getProcessById(activeProject, processId);
    const document = process?.documents.find((item) => item.id === documentId);
    if (!process || !document) {
      return;
    }

    const rejectedDocument: ProcessDocument = {
      ...document,
      status: "comments",
      updatedAt: "только что",
    };
    const documentNodeId = `node-${rejectedDocument.id}`;
    const existingNode = getNodeById(activeProject, documentNodeId);
    const rejectedNode: ProjectNode = existingNode
      ? {
          ...existingNode,
          levelId: process.levelId,
          documentOwnerNodeId: undefined,
          description: "Не принято. Документ выброшен наружу для доработки.",
          status: "comments",
          updatedAt: "только что",
          document: rejectedDocument,
        }
      : {
          ...createDocumentNode(activeProject.id, process.levelId, rejectedDocument),
          description: "Не принято. Документ выброшен наружу для доработки.",
          status: "comments",
        };

    updateActiveProject((project) => ({
      ...project,
      processes: project.processes.map((item) =>
        item.id === processId
          ? {
              ...item,
              status: "rejected",
              documents: item.documents.map((itemDocument) => (itemDocument.id === documentId ? rejectedDocument : itemDocument)),
            }
          : item,
      ),
      nodes: project.nodes.some((node) => node.id === rejectedNode.id)
        ? project.nodes.map((node) => (node.id === rejectedNode.id ? rejectedNode : node))
        : [rejectedNode, ...project.nodes],
      levels: project.levels.map((level) => ({
        ...level,
        nodeIds:
          level.id === process.levelId
            ? appendUnique(level.nodeIds.filter((id) => id !== rejectedNode.id), rejectedNode.id)
            : level.nodeIds.filter((id) => id !== rejectedNode.id),
      })),
      inboxDocuments: project.inboxDocuments.some((item) => item.id === rejectedDocument.id)
        ? project.inboxDocuments.map((item) => (item.id === rejectedDocument.id ? rejectedDocument : item))
        : [rejectedDocument, ...project.inboxDocuments],
      updatedAt: "только что",
    }));

    setActiveLevelId(process.levelId);
    setSelectedNodeId(rejectedNode.id);
    setSelectedProcessId(null);
    pushNotification({
      title: "Документ не принят",
      description: `Файл «${rejectedDocument.title}» выброшен наружу для доработки.`,
      targetNodeId: rejectedNode.id,
      targetProcessId: process.id,
    });
    showToast("Документ не принят и выброшен наружу как малая нода.");
  }

  function receiveMail(processId?: string) {
    const targetProcess = processId ? getProcessById(activeProject, processId) : findBestProcessForIncoming(activeProject, activeLevel.id, "АР");
    const document = {
      ...createDocumentFromName(targetProcess ? "АР_пакет_из_почты_новое.pdf" : "Письмо без тега.pdf", "mail"),
      status: targetProcess ? ("review" as const) : ("draft" as const),
      isNew: true,
    };
    const targetNodeId = targetProcess?.to ?? targetProcess?.from;
    const projectWithProcess = targetProcess
      ? {
          ...activeProject,
          processes: activeProject.processes.map((process) =>
            process.id === targetProcess.id
              ? {
                  ...process,
                  status: "sent" as const,
                  documents: [document, ...process.documents],
                  source: "mail" as const,
                }
              : process,
          ),
          updatedAt: "только что",
        }
      : activeProject;
    const result = addDocumentNodeToProject(projectWithProcess, activeLevel.id, document, targetNodeId);
    updateActiveProject(() => result.project);
    setActiveLevelId(result.levelId);
    setSelectedNodeId(result.documentNode.id);
    setSelectedProcessId(null);

    pushNotification({
      title: targetProcess ? "Письмо привязано к связи" : "Письмо попало во входящие",
      description: targetProcess ? `Вложение добавлено в контейнер «${targetProcess.title}».` : "Тег не распознан, задание можно прикрутить вручную.",
      targetProcessId: targetProcess?.id,
    });
    showToast(targetProcess ? "Почтовое вложение добавлено в контейнер связи." : "Письмо без тега добавлено во входящие.");
  }

  function receiveChat(processId?: string) {
    const targetProcess = processId ? getProcessById(activeProject, processId) : levelProcesses.find((process) => process.status === "sent" || process.status === "draft");
    const message: ChatMessage = {
      id: `chat-${Date.now()}`,
      projectId: activeProject.id,
      author: "Павел Андреев",
      role: "ГИП",
      text: targetProcess
        ? `Принял контейнер «${targetProcess.title}» в работу, жду финальный комплект.`
        : "Поступило новое задание без тега. Нужна ручная привязка к процессу.",
      time: "только что",
      processId: targetProcess?.id,
    };
    const document = {
      ...createDocumentFromName("сообщение_из_мессенджера.txt", "chat", undefined, message.text),
      status: targetProcess ? ("review" as const) : ("draft" as const),
      isNew: true,
    };
    const targetNodeId = targetProcess?.to ?? targetProcess?.from;
    const projectWithMessage: DemoProject = {
      ...activeProject,
      chatMessages: [message, ...activeProject.chatMessages],
      processes: targetProcess
        ? activeProject.processes.map((process) =>
            process.id === targetProcess.id
              ? {
                  ...process,
                  status: "in_work",
                  validationAt: "только что",
                  documents: [document, ...process.documents],
                  source: "chat",
                }
              : process,
          )
        : activeProject.processes,
      updatedAt: "только что",
    };
    const result = addDocumentNodeToProject(projectWithMessage, activeLevel.id, document, targetNodeId);
    updateActiveProject(() => result.project);
    setActiveLevelId(result.levelId);
    setSelectedNodeId(result.documentNode.id);
    setSelectedProcessId(null);

    pushNotification({
      title: targetProcess ? "Мессенджер изменил статус связи" : "Сообщение без тега",
      description: targetProcess ? "Контейнер принят в работу через событие мессенджера." : "Сообщение добавлено во входящие для ручной привязки.",
      targetProcessId: targetProcess?.id,
    });
    showToast(targetProcess ? "Статус связи изменен событием из мессенджера." : "Сообщение добавлено во входящие.");
  }

  function addRandomFile(targetNodeId?: string) {
    const document = createDocumentFromName(getRandomFileName(), "manual", undefined, undefined, undefined, getRandomFileSize());
    const result = addDocumentNodeToProject(activeProject, activeLevel.id, document, targetNodeId);
    const targetLabel = result.targetNode?.shortCode ?? result.targetNode?.title ?? "";
    updateActiveProject(() => result.project);

    if (targetNodeId) {
      setSelectedNodeId(targetNodeId);
    } else {
      setActiveLevelId(result.levelId);
      setSelectedNodeId(result.documentNode.id);
    }
    setSelectedProcessId(null);
    showToast(targetNodeId ? `Документ добавлен внутрь ноды «${targetLabel}».` : "Бесхозный файл добавлен на карту как малая нода.");
  }

  function moveDocumentNode(documentNodeId: string, targetNodeId: string | null) {
    if (targetNodeId) {
      const result = putDocumentIntoNode(activeProject, documentNodeId, targetNodeId);
      const targetLabel = result.targetNode?.shortCode ?? result.targetNode?.title ?? "";
      updateActiveProject(() => result.project);
      setSelectedNodeId(targetNodeId);
      setSelectedProcessId(null);
      showToast(`Файл вложен в ноду «${targetLabel}».`);
      return;
    }

    const result = removeDocumentFromNode(activeProject, documentNodeId);
    updateActiveProject(() => result.project);
    setActiveLevelId(result.levelId);
    setSelectedNodeId(documentNodeId);
    setSelectedProcessId(null);
    showToast("Файл вынесен из ноды и снова стал бесхозным.");
  }

  function focusDocumentNode(nodeId: string) {
    const node = getNodeById(activeProject, nodeId);
    if (!node) {
      return;
    }

    setActiveLevelId(node.levelId);
    setLevelTransition(null);
    setSelectedNodeId(node.id);
    setSelectedProcessId(null);
    setActiveMenu("map");
    window.setTimeout(() => sceneRef.current?.focusNode(node.id), 80);
  }

  function sendProjectChatMessage(text: string) {
    const message: ChatMessage = {
      id: `chat-${Date.now()}`,
      projectId: activeProject.id,
      author: currentUser?.name ?? "Павел Андреев",
      role: currentUser?.position ?? "Участник проекта",
      text,
      time: "только что",
    };

    updateActiveProject((project) => ({
      ...project,
      chatMessages: [message, ...project.chatMessages],
      updatedAt: "только что",
    }));
    showToast("Сообщение отправлено в мессенджер проекта.");
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDropActive(false);
    if (!event.dataTransfer.files.length) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    const documents = await Promise.all(
      files.map(async (file) =>
        createDocumentFromName(
          file.name,
          "drop",
          URL.createObjectURL(file),
          file.name.toLowerCase().endsWith(".txt") ? await file.text() : undefined,
          file.type,
          formatBytes(file.size),
        ),
      ),
    );

    let nextProject = activeProject;
    const documentNodes = documents.map((document) => {
      const result = addDocumentNodeToProject(nextProject, activeLevel.id, document);
      nextProject = result.project;
      return result.documentNode;
    });

    updateActiveProject(() => nextProject);
    if (documentNodes[0]) {
      setSelectedNodeId(documentNodes[0].id);
      setSelectedProcessId(null);
    }
    showToast("Файлы добавлены как бесхозные малые ноды. Перетащите их в нужный раздел вручную.");
  }

  function handleNotificationClick(notification: DemoNotification) {
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)),
    );

    if (notification.projectId !== activeProjectId) {
      selectProject(notification.projectId);
    }
    if (notification.targetProcessId) {
      selectProcess(notification.targetProcessId);
    }
    if (notification.targetNodeId) {
      selectNode(notification.targetNodeId);
      sceneRef.current?.focusNode(notification.targetNodeId);
    }
  }

  function pushNotification(notification: Omit<DemoNotification, "id" | "projectId" | "time" | "unread">) {
    setNotifications((current) => [
      {
        ...notification,
        id: `notif-${Date.now()}`,
        projectId: activeProject.id,
        time: "только что",
        unread: true,
      },
      ...current,
    ].slice(0, 10));
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void document.documentElement.requestFullscreen();
  }

  return (
    <div
      className="app-shell"
      style={fontVars}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDropActive(true);
      }}
      onDragLeave={() => setIsDropActive(false)}
      onDrop={handleDrop}
    >
      <div className="cosmos-backdrop" />
      {!guideDismissed ? (
        <MvpGuide
          onCreateProject={() => setProjectManagerOpen(true)}
          onClose={() => setGuideDismissed(true)}
        />
      ) : null}
      {showConstructorHint ? <ConstructorHint onClose={() => setConstructorHintDismissed(true)} /> : null}
      <Sidebar
        isOpen={mobileMenuOpen}
        activeMenu={activeMenu}
        project={activeProject}
        onMenuSelect={setActiveMenu}
        onClose={() => setMobileMenuOpen(false)}
      />
      <TopSearch
        value={query}
        onChange={setQuery}
        hasNoResults={hasNoResults}
        matchCount={matches.nodeIds.size + matches.processIds.size}
        onMenuClick={() => setMobileMenuOpen(true)}
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectChange={selectProject}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onOpenProjectManager={() => setProjectManagerOpen(true)}
        onOpenPersonalSettings={() => setPersonalSettingsOpen(true)}
      />
      <ProjectScene
        project={activeProject}
        level={activeLevel}
        nodes={levelNodes}
        processes={levelProcesses}
        selectedNodeId={selectedNode?.id ?? activeLevel.centralNodeId}
        selectedProcessId={selectedProcessId}
        linkingFromId={linkingFromId}
        matchedNodeIds={matches.nodeIds}
        matchedProcessIds={matches.processIds}
        isSearching={isSearching}
        levelTransition={levelTransition}
        onSelectNode={selectNode}
        onOpenNodeLevel={openNodeLevel}
        onBackLevel={backLevel}
        onSelectProcess={selectProcess}
        onOpenProcessDetails={openProcessDetails}
        onStartLink={startLink}
        onCompleteLink={completeLink}
        onOpenDocument={setModalDocument}
        onMoveDocumentNode={moveDocumentNode}
        onAddRandomFile={addRandomFile}
        onUpdateDocumentStatus={updateDocumentStatus}
        sceneRef={sceneRef}
      />
      <OrphanFilesPanel
        project={activeProject}
        onAddRandomFile={() => addRandomFile()}
        onFocusDocumentNode={focusDocumentNode}
        onOpenDocument={(document) => setModalDocument(document)}
      />
      <ProjectChatPanel
        messages={activeProject.chatMessages}
        onSend={sendProjectChatMessage}
        onOpenChat={() => setActiveMenu("chat")}
      />
      <WorkspacePanel
        activeMenu={activeMenu}
        project={activeProject}
        onClose={() => setActiveMenu("map")}
        onSelectProcess={selectProcess}
        onOpenDocument={setModalDocument}
        onReceiveMail={() => receiveMail()}
        onReceiveChat={() => receiveChat()}
        onSendMessage={sendProjectChatMessage}
        projectTemplates={projectTemplates}
        onCreateTemplate={createTemplate}
        onCreateTaggedDocument={createTaggedDocument}
        onCreateTaskDraft={createTaskDraft}
        onUpdateDocumentStatus={updateDocumentStatus}
        onAddParticipant={addParticipant}
        onUpdateParticipant={updateParticipant}
        onDeleteParticipant={deleteParticipant}
      />
      {selectedNode ? (
        <RightPanel
          project={activeProject}
          level={activeLevel}
          node={selectedNode}
          process={selectedProcess}
          onNodeUpdate={updateNode}
          onProcessUpdate={updateProcess}
          onDeleteProcess={deleteProcess}
          onSelectProcess={selectProcess}
          onOpenDocument={setModalDocument}
          onMoveDocumentNode={moveDocumentNode}
          onAddRandomFile={addRandomFile}
          onUpdateDocumentStatus={updateDocumentStatus}
          onRejectProcessDocument={rejectProcessDocument}
          onAttachInboxDocument={attachInboxDocument}
          onOpenProcessBuilder={(processId) => setProcessBuilderId(processId)}
        />
      ) : null}
      <BottomControls
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onNormalize={() => sceneRef.current?.normalize()}
        onReset={() => sceneRef.current?.reset()}
        onFocus={() => sceneRef.current?.focusSelected()}
        onFullscreen={toggleFullscreen}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
      />
      <DocumentModal
        document={modalDocument}
        onShowInFolder={(document) => showToast(`Демо: файл «${document.title}» лежит в контейнере проекта.`)}
        onClose={() => setModalDocument(null)}
      />
      {projectManagerOpen ? (
        <ProjectManagerModal
          templates={projectTemplates}
          onClose={() => setProjectManagerOpen(false)}
          onCreateProject={createProject}
        />
      ) : null}
      {personalSettingsOpen && currentUser ? (
        <PersonalIntegrationsModal
          project={activeProject}
          user={currentUser}
          onClose={() => setPersonalSettingsOpen(false)}
          onSaveIntegrations={saveParticipantIntegrations}
          onImportDemo={importDemoIntegration}
          onImportTestFile={importIntegrationTestFile}
          onImportFiles={(provider, participantId, files) => {
            void importIntegrationFiles(provider, participantId, files);
          }}
        />
      ) : null}
      {builderProcess ? (
        <ProcessBuilderModal
          project={activeProject}
          process={builderProcess}
          onClose={() => setProcessBuilderId(null)}
          onSave={saveProcessBuilder}
          onOpenDocument={setModalDocument}
        />
      ) : null}
      {detailProcess ? (
        <ProcessDetailModal
          project={activeProject}
          process={detailProcess}
          onClose={() => setProcessDetailId(null)}
          onOpenDocument={setModalDocument}
          onConfigure={(processId) => {
            setProcessDetailId(null);
            setProcessBuilderId(processId);
          }}
        />
      ) : null}
      {isDropActive ? (
        <div className="drop-overlay">
          <strong>Отпустите файлы</strong>
          <span>Они попадут в выбранный контейнер связи или во входящие без тега.</span>
        </div>
      ) : null}
      {toast ? <div className="toast glass-panel">{toast}</div> : null}
    </div>
  );
}

function applyProjectTeam(project: DemoProject, teamMembers: ProjectParticipantSeed[]) {
  if (!teamMembers.length) {
    return project;
  }

  const fallbackAdmin = project.participants.find((participant) => participant.role === "admin") ?? project.participants[0];
  const seeds = teamMembers.some((participant) => participant.role === "admin")
    ? teamMembers
    : [
        {
          name: fallbackAdmin.name,
          position: fallbackAdmin.position,
          role: fallbackAdmin.role,
          email: fallbackAdmin.email,
          phone: fallbackAdmin.phone,
          messenger: fallbackAdmin.messenger,
          otherContacts: fallbackAdmin.otherContacts,
          visibilityMode: fallbackAdmin.visibilityMode ?? "all",
          visibleNodeIds: fallbackAdmin.visibleNodeIds ?? [],
        },
        ...teamMembers,
      ];
  const seen = new Set<string>();
  const participants = seeds
    .filter((participant) => {
      const key = participant.email.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((participant, index) => ({
      ...participant,
      id: `participant-${project.id}-${index}`,
      projectId: project.id,
      status: "active" as const,
      integrations: [],
      visibilityMode: participant.visibilityMode ?? "all",
      visibleNodeIds: participant.visibleNodeIds ?? [],
    }));

  return {
    ...project,
    participants,
  };
}

function findBestProcessForIncoming(project: DemoProject, levelId: string, marker: string) {
  const normalized = marker.toLocaleLowerCase("ru-RU");
  return project.processes.find((process) => {
    if (process.levelId !== levelId) {
      return false;
    }
    const from = getNodeById(project, process.from);
    const to = getNodeById(project, process.to);
    const text = [process.title, process.description, process.tag, from?.shortCode, from?.title, to?.shortCode, to?.title]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ru-RU");
    return normalized.includes("ар") ? text.includes("ар") : text.includes(normalized);
  }) ?? project.processes.find((process) => process.levelId === levelId);
}

function upsertIntegration(integrations: UserIntegration[], provider: IntegrationProvider, patch: Partial<UserIntegration>): UserIntegration[] {
  const existing = integrations.find((integration) => integration.provider === provider);
  if (!existing) {
    return [
      ...integrations,
      {
        id: `integration-${provider}`,
        provider,
        label: getIntegrationProviderLabel(provider),
        status: "connected",
        ...patch,
      },
    ];
  }

  return integrations.map((integration) =>
    integration.provider === provider
      ? {
          ...integration,
          ...patch,
        }
      : integration,
  );
}

function getDemoIntegrationFiles(provider: IntegrationProvider) {
  const files: Record<IntegrationProvider, string[]> = {
    outlook: ["Расчетная_схема_КР.pdf", "Письмо_АР.docx", "Уточнение_ХЗ.xlsx"],
    yandex: ["Технические_условия_ВК.pdf", "Сметная_таблица_СМ.xlsx", "Вложение_БезТега.docx"],
    gmail: ["Пояснения_ПЗ.docx", "Сводка_ЭОМ.xlsx", "Презентация_ABC.pptx"],
    telegram: ["Скрин_ОВ.png", "Планировка_АР.pdf", "Комментарий_QA.txt"],
    folder: ["Ведомость_ВК.xlsx", "Стройгенплан_ПОС.pdf", "Материалы_UnknownTag.docx"],
  };
  return files[provider];
}

function getIntegrationProviderLabel(provider: IntegrationProvider) {
  const labels: Record<IntegrationProvider, string> = {
    outlook: "Outlook",
    yandex: "Яндекс Почта",
    gmail: "Gmail",
    telegram: "Telegram Desktop",
    folder: "Рабочая папка",
  };
  return labels[provider];
}

function ConstructorHint({ onClose }: { onClose: () => void }) {
  return (
    <aside className="constructor-hint glass-panel">
      <header>
        <div>
          <span>Пустой проект</span>
          <strong>Как начать сборку</strong>
        </div>
        <button onClick={onClose} aria-label="Скрыть подсказку">×</button>
      </header>
      <ol>
        <li>Выберите ноду и переименуйте ее в правой панели.</li>
        <li>Наведите на ноду и нажмите плюс, чтобы создать бизнес-процесс.</li>
        <li>Двойной клик по ноде открывает ее внутренний уровень.</li>
      </ol>
    </aside>
  );
}

function extractDocumentTag(title: string) {
  const base = title.replace(/\.[^.]+$/, "");
  const parts = base.split(/[_-]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return undefined;
  }
  return parts[parts.length - 1].toLocaleUpperCase("ru-RU");
}

function findNodeByTag(project: DemoProject, tag: string) {
  const normalizedTag = normalizeTag(tag);
  return project.nodes.find((node) => {
    if (node.type === "document" || node.type === "central") {
      return false;
    }

    const tokens = [node.shortCode, node.title, ...(node.tags ?? [])].map((value) => normalizeTag(value ?? ""));
    return tokens.some((token) => token === normalizedTag);
  });
}

function getRandomProjectTag(project: DemoProject) {
  const tags = Array.from(
    new Set(
      project.nodes
        .filter((node) => node.type !== "document" && node.type !== "central")
        .flatMap((node) => [node.shortCode, ...(node.tags ?? [])])
        .map((tag) => tag?.trim())
        .filter(Boolean) as string[],
    ),
  );

  return tags[Math.floor(Math.random() * tags.length)];
}

function normalizeTag(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, "");
}

function getRandomFileName() {
  const names = [
    "замечания_экспертизы_новое.pdf",
    "сводная_таблица_объемов.xlsx",
    "письмо_заказчика_без_тега.docx",
    "материалы_фасада_вариант.pptx",
    "рабочие_пометки.txt",
    "узел_крепления_черновик.dwg",
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomFileSize() {
  const sizes = ["420 КБ", "1.2 МБ", "2.8 МБ", "4.1 МБ", "740 КБ"];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

const fontSizes = [9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 34, 42, 54];

function buildFontVars(scale: number) {
  return fontSizes.reduce(
    (vars, size) => ({
      ...vars,
      [`--fs-${size}`]: `${size * scale}px`,
    }),
    { "--font-scale": String(scale) } as CSSProperties & Record<string, string>,
  );
}
