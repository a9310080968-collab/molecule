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
  getDocumentFromNode,
  getLevelById,
  getLevelNodes,
  getLevelProcesses,
  getNodeById,
  getProcessDeadlineEntries,
  getProcessById,
  formatDeadlineDistance,
  getSearchMatches,
  parseDeadline,
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
  NodeChecklistItem,
  NodeEdit,
  NodeStatus,
  ParticipantEdit,
  ProcessDocument,
  ProcessEdit,
  ProjectParticipantSeed,
  ProjectNode,
  ProjectTemplate,
  UserIntegration,
  Vec2,
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
  interfaceScale?: number;
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

function mergeDemoProjects(savedProjects: DemoProject[] | undefined, defaults: DemoProject[]) {
  if (!savedProjects?.length) {
    return defaults;
  }

  const savedIds = new Set(savedProjects.map((project) => project.id));
  return [
    ...defaults.filter((project) => !savedIds.has(project.id)),
    ...savedProjects,
  ];
}

function mergeDemoNotifications(savedNotifications: DemoNotification[] | undefined, defaults: DemoNotification[]) {
  if (!savedNotifications?.length) {
    return defaults;
  }

  const savedIds = new Set(savedNotifications.map((notification) => notification.id));
  return [
    ...defaults.filter((notification) => !savedIds.has(notification.id)),
    ...savedNotifications,
  ];
}

export default function App() {
  const persistedState = getPersistedState();
  const defaultTemplates = useMemo(() => [
    createBlankProjectTemplate(),
    createDefaultProjectTemplate(),
    createTemplateFromProject(demoProjects[0], "ЖК Рога и копыта / ТЗ с готовыми БП", "Структура по приложенному ТЗ: ИРД, РД, разделы, подразделы, участники и готовые бизнес-процессы."),
    createTemplateFromProject(demoProjects[1], "Жилой комплекс / полный комплект", "Структура разделов, внутренних уровней и контейнеров связи без рабочих документов."),
    createTemplateFromProject(demoProjects[2], "Компактный офисный проект", "Легкая структура для небольшого объекта с ИРД, АР, КР, ЭОМ и сметой."),
  ], []);
  const initialProjects = mergeDemoProjects(persistedState?.projects, demoProjects);
  const savedHasPrimaryDemo = Boolean(persistedState?.projects?.some((project) => project.id === demoProjects[0]?.id));
  const preferredActiveProjectId = savedHasPrimaryDemo ? persistedState?.activeProjectId : demoProjects[0]?.id;
  const initialActiveProject = initialProjects.find((project) => project.id === preferredActiveProjectId) ?? initialProjects[0] ?? demoProjects[0];
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
  const [notifications, setNotifications] = useState<DemoNotification[]>(() => mergeDemoNotifications(persistedState?.notifications, initialNotifications));
  const [modalDocument, setModalDocument] = useState<ProcessDocument | null>(null);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [personalSettingsOpen, setPersonalSettingsOpen] = useState(false);
  const [processBuilderId, setProcessBuilderId] = useState<string | null>(null);
  const [processDetailId, setProcessDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(persistedState?.fontScale ?? 0.94);
  const [interfaceScale, setInterfaceScale] = useState(persistedState?.interfaceScale ?? 1);
  const [guideDismissed, setGuideDismissed] = useState(Boolean(persistedState?.guideDismissed));
  const [constructorHintDismissed, setConstructorHintDismissed] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [seenChatMessageIds, setSeenChatMessageIds] = useState<Set<string>>(() => new Set());
  const [isDropActive, setIsDropActive] = useState(false);
  const [levelTransition, setLevelTransition] = useState<LevelTransition | null>(null);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const sceneRef = useRef<SceneHandle | null>(null);

  const hasProjects = projects.length > 0;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? demoProjects[0];
  const activeLevel = getLevelById(activeProject, activeLevelId);
  const levelNodes = useMemo(() => getLevelNodes(activeProject, activeLevel), [activeLevel, activeProject]);
  const levelProcesses = useMemo(() => getLevelProcesses(activeProject, activeLevel), [activeLevel, activeProject]);
  const selectedNode = getNodeById(activeProject, selectedNodeId) ?? getNodeById(activeProject, activeLevel.centralNodeId) ?? levelNodes[0];
  const selectedProcess = getProcessById(activeProject, selectedProcessId) ?? null;
  const builderProcess = getProcessById(activeProject, processBuilderId) ?? null;
  const detailProcess = getProcessById(activeProject, processDetailId) ?? null;
  const currentUser = activeProject.participants.find((participant) => participant.role === "admin") ?? activeProject.participants.find((participant) => participant.name === "Павел Андреев") ?? activeProject.participants[0];
  const chatUnreadCount = activeProject.chatMessages.filter(
    (message) => message.author !== currentUser?.name && !seenChatMessageIds.has(message.id),
  ).length;
  const matches = useMemo(() => getSearchMatches(query, activeProject, activeLevel), [activeLevel, activeProject, query]);
  const isSearching = query.trim().length > 0;
  const hasNoResults = isSearching && matches.nodeIds.size + matches.processIds.size === 0;
  const appVars = useMemo(() => buildAppVars(fontScale, interfaceScale), [fontScale, interfaceScale]);
  const showConstructorHint =
    hasProjects &&
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
      interfaceScale,
      guideDismissed,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Local storage can be unavailable in private browser modes. The demo still works in memory.
    }
  }, [activeLevelId, activeProjectId, fontScale, guideDismissed, interfaceScale, notifications, projectTemplates, projects, selectedNodeId]);

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

  useEffect(() => {
    setNotifications((current) => {
      const additions = buildDeadlineNotifications(projects, current);
      return additions.length ? [...additions, ...current].slice(0, 30) : current;
    });
  }, [projects]);

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

  function saveLevelPositions(levelId: string, positions: Record<string, Vec2>, record = true) {
    updateActiveProject((project) => ({
      ...project,
      nodePositions: {
        ...(project.nodePositions ?? {}),
        [levelId]: positions,
      },
    }), record);
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
    setNotifications((current) => current.filter((notification) => notification.projectId !== projectId));
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    setPersonalSettingsOpen(false);
    setChatPanelOpen(false);
    setSeenChatMessageIds(new Set());
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

  function deleteProject(projectId: string) {
    if (projects.length <= 1) {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        return;
      }
      recordHistory();
      setProjects([]);
      setActiveProjectId("");
      setActiveLevelId("");
      setSelectedNodeId("");
      setSelectedProcessId(null);
      setLinkingFromId(null);
      setProcessBuilderId(null);
      setProcessDetailId(null);
      setProjectManagerOpen(false);
      setPersonalSettingsOpen(false);
      setActiveMenu("map");
      showToast(`Проект «${project.title}» удален.`);
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    recordHistory();
    const remaining = projects.filter((item) => item.id !== projectId);
    const nextProject = remaining.find((item) => item.id !== projectId) ?? remaining[0];
    const nextLevel = getDefaultLevel(nextProject);

    setProjects(remaining);
    setActiveProjectId(nextProject.id);
    setActiveLevelId(nextLevel.id);
    setSelectedNodeId(nextLevel.centralNodeId);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    setProjectManagerOpen(false);
    setPersonalSettingsOpen(false);
    setActiveMenu("map");
    showToast(`Проект «${project.title}» удален.`);
  }

  function addSectionNode(position?: Vec2) {
    const sectionCount = levelNodes.filter((node) => node.type !== "central" && node.type !== "document").length + 1;
    const shortCode = `Б${sectionCount}`;
    const node: ProjectNode = {
      id: `node-section-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      projectId: activeProject.id,
      levelId: activeLevel.id,
      type: "section",
      title: `Новый блок ${sectionCount}`,
      shortCode,
      description: "Новый средний блок проекта. Переименуйте его и задайте теги автопривязки в правой панели.",
      status: "unchecked",
      responsible: currentUser?.name,
      updatedAt: "только что",
      tags: [shortCode],
    };

    updateActiveProject((project) => withNodePosition({
      ...project,
      nodes: [node, ...project.nodes],
      levels: project.levels.map((level) =>
        level.id === activeLevel.id
          ? {
              ...level,
              nodeIds: appendUnique(level.nodeIds, node.id),
            }
          : level,
      ),
      updatedAt: "только что",
    }, activeLevel.id, node.id, position));
    setSelectedNodeId(node.id);
    setSelectedProcessId(null);
    setActiveMenu("map");
    if (!position) {
      window.setTimeout(() => sceneRef.current?.focusNode(node.id), 80);
    }
    showToast(`Добавлен средний блок «${node.title}».`);
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
    updateActiveProject((project) => {
      const nodes = project.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const checklistStatus = edit.checklist ? getChecklistStatus(edit.checklist, node.status) : undefined;
        return {
          ...node,
          ...edit,
          status: checklistStatus ?? edit.status ?? node.status,
          updatedAt: "только что",
        };
      });
      const renamedNode = nodes.find((node) => node.id === nodeId);
      const levelTitle = renamedNode ? formatNodeLevelTitle(renamedNode) : undefined;

      return {
        ...project,
        nodes,
        levels: project.levels.map((level) =>
          level.centralNodeId === nodeId || level.parentNodeId === nodeId
            ? {
                ...level,
                title: levelTitle ?? level.title,
              }
            : level,
        ),
        updatedAt: "только что",
      };
    });
  }

  function navigateToNode(nodeId: string) {
    const node = getNodeById(activeProject, nodeId);
    if (!node) {
      return;
    }

    setLevelTransition(null);
    setActiveLevelId(node.levelId);
    setSelectedNodeId(node.id);
    setSelectedProcessId(null);
    setProcessBuilderId(null);
    setActiveMenu("map");
    window.setTimeout(() => sceneRef.current?.focusNode(node.id), 80);
  }

  function toggleNodePositionLock(nodeId: string) {
    const node = getNodeById(activeProject, nodeId);
    if (!node || node.type === "central") {
      return;
    }

    updateNode(nodeId, { positionLocked: !node.positionLocked });
    showToast(node.positionLocked ? "Положение ноды разблокировано." : "Положение ноды закреплено.");
  }

  function deleteNode(nodeId: string) {
    const node = getNodeById(activeProject, nodeId);
    if (!node || node.type === "central") {
      return;
    }

    if (node.type === "document") {
      deleteDocument(getDocumentFromNode(node).id, node.title);
      return;
    }

    if (!window.confirm(`Удалить ноду «${node.shortCode ?? node.title}» и связанные процессы? Документы будут сохранены во входящих.`)) {
      return;
    }

    updateActiveProject((project) => removeProjectNodeTree(project, node.id));
    setSelectedNodeId(activeLevel.centralNodeId);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    showToast(`Нода «${node.shortCode ?? node.title}» удалена. Файлы перенесены во входящие.`);
  }

  function deleteDocument(documentId: string, title: string) {
    if (!window.confirm(`Удалить файл «${title}» безвозвратно? Он исчезнет с карты, из процессов и бесхозных файлов.`)) {
      return;
    }

    updateActiveProject((project) => removeDocumentEverywhere(project, documentId));
    setSelectedNodeId(activeLevel.centralNodeId);
    setSelectedProcessId(null);
    setProcessBuilderId(null);
    setProcessDetailId(null);
    showToast(`Файл «${title}» удален.`);
  }

  function deleteInboxDocument(documentId: string) {
    const document = activeProject.inboxDocuments.find((item) => item.id === documentId);
    if (document) {
      deleteDocument(document.id, document.title);
    }
  }

  function markProjectChatRead() {
    setSeenChatMessageIds((current) => {
      const next = new Set(current);
      activeProject.chatMessages.forEach((message) => next.add(message.id));
      return next;
    });
  }

  function toggleChatPanel() {
    if (!chatPanelOpen) {
      markProjectChatRead();
    }
    setChatPanelOpen(!chatPanelOpen);
  }

  function selectSidebarMenu(menu: SidebarMenuId) {
    setActiveMenu(menu);
    if (menu === "chat") {
      markProjectChatRead();
      setChatPanelOpen(false);
    }
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

  function updateProcessDelegation(processId: string, delegatedTo: string[]) {
    const process = getProcessById(activeProject, processId);
    if (!process) {
      return;
    }
    const participantNames = Array.from(new Set([
      process.sender,
      process.receiver,
      process.approver ?? process.receiver,
      ...delegatedTo,
    ]));
    updateProcess(processId, { delegatedTo, participantNames });
    showToast(delegatedTo.length ? `Исполнители назначены: ${delegatedTo.join(", ")}.` : "Внутреннее делегирование очищено.");
  }

  function submitProcessClarification(processId: string, text: string, kind: "question" | "unclear") {
    const process = getProcessById(activeProject, processId);
    if (!process) {
      return;
    }

    const normalizedText = text.trim() || "Задание непонятно. Нужны дополнительные пояснения.";
    const author = currentUser?.name ?? process.receiver;
    const entry = {
      id: `process-message-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      author,
      text: normalizedText,
      createdAt: "только что",
      kind,
    } as const;
    const chatMessage: ChatMessage = {
      id: `chat-process-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      projectId: activeProject.id,
      author,
      role: currentUser?.position ?? "Исполнитель",
      text: `${kind === "unclear" ? "Задание непонятно" : "Вопрос по заданию"} «${process.title}»: ${normalizedText}`,
      time: "только что",
      processId,
    };

    updateActiveProject((project) => ({
      ...project,
      processes: project.processes.map((current) =>
        current.id === processId
          ? { ...current, discussion: [...(current.discussion ?? []), entry] }
          : current,
      ),
      chatMessages: [chatMessage, ...project.chatMessages],
      updatedAt: "только что",
    }));
    pushNotification({
      title: kind === "unclear" ? "Исполнителю непонятно задание" : "Вопрос по заданию",
      description: `${process.sender}: ${author} просит уточнить «${process.title}». ${normalizedText}`,
      targetProcessId: processId,
    });
    showToast(`Уведомление отправлено постановщику: ${process.sender}.`);
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
    const normalizedTag = normalizeFileTag(tag);
    const taggedTitle = appendTagToFileName(normalizedTitle, normalizedTag);
    const document: ProcessDocument = {
      ...createDocumentFromName(taggedTitle, "manual"),
      from: "Тестовый импорт",
      detectedTag: normalizedTag || undefined,
      isNew: true,
      updatedAt: "только что",
    };
    const result = routeDocumentToNodeOrInbox(activeProject, activeLevel.id, document);

    updateActiveProject(() => result.project);
    setSelectedProcessId(null);
    setActiveMenu("map");
    if (result.documentNode) {
      setActiveLevelId(result.levelId);
      setSelectedNodeId(result.documentNode.id);
      window.setTimeout(() => sceneRef.current?.focusNode(result.documentNode!.id), 80);
    }

    pushNotification({
      title: result.targetNode ? "Документ распределен по тегу" : "Документ создан без совпадения тега",
      description: result.targetNode
        ? `Тег «${normalizedTag}» совпал с нодой «${result.targetNode.shortCode ?? result.targetNode.title}».`
        : "Совпадающая нода не найдена, документ остался в бесхозных.",
      targetNodeId: result.documentNode?.id,
    });
    showToast(result.targetNode ? `Документ попал в ноду «${result.targetNode.shortCode ?? result.targetNode.title}».` : "Документ добавлен в бесхозные.");
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
      participantNames: [from.responsible ?? from.title, to.responsible ?? to.title],
      createdAt: "только что",
      dueAt: edit.dueAt || getDefaultProcessDueAt(24),
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

  function addParticipantFromDirectory(seed: ProjectParticipantSeed) {
    if (activeProject.participants.some((participant) => participant.email === seed.email)) {
      showToast(`Участник «${seed.name}» уже есть в команде проекта.`);
      return;
    }

    const participant = {
      ...seed,
      id: `participant-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      projectId: activeProject.id,
      status: "active" as const,
    };

    updateActiveProject((project) => ({
      ...project,
      participants: [participant, ...project.participants],
      updatedAt: "только что",
    }));
    showToast(`Участник «${participant.name}» добавлен в проект и доступен в процессе.`);
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

  function importIntegrationTestFile(provider: IntegrationProvider, participantId: string, mode: "tagged" | "untagged", customTag?: string) {
    const tag = mode === "tagged" ? normalizeFileTag(customTag) || getRandomProjectTag(activeProject) : undefined;
    const fileName = tag ? appendTagToFileName("Входящий файл.pdf", tag) : "Входящий файл без тега.pdf";
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
      files.map(async (file) => ({
        ...createDocumentFromName(
          file.name,
          provider,
          URL.createObjectURL(file),
          file.name.toLowerCase().endsWith(".txt") ? await file.text() : undefined,
          file.type,
          formatBytes(file.size),
        ),
        updatedAt: formatFileModifiedAt(file.lastModified),
        originPath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      })),
    );

    markIntegrationSynced(participantId, provider);
    ingestIncomingDocuments(documents, provider, participantId);
  }

  function routeDocumentToNodeOrInbox(project: DemoProject, levelId: string, document: ProcessDocument) {
    const detectedTag = detectDocumentTag(project, document.title);
    const targetNode = detectedTag ? findNodeByTag(project, detectedTag) : undefined;
    const incomingDocument: ProcessDocument = {
      ...document,
      status: targetNode ? "review" : "draft",
      detectedTag,
      autoRouted: Boolean(targetNode),
      isNew: true,
      updatedAt: "только что",
    };

    if (targetNode) {
      return {
        ...addDocumentNodeToProject(project, levelId, incomingDocument, targetNode.id),
        routed: true,
      };
    }

    return {
      project: addDocumentToInbox(project, incomingDocument),
      documentNode: undefined,
      levelId,
      targetNode: undefined,
      routed: false,
    };
  }

  function ingestIncomingDocuments(documents: ProcessDocument[], provider: IntegrationProvider, participantId: string) {
    const recipient = activeProject.participants.find((participant) => participant.id === participantId);
    let nextProject = activeProject;
    const importedNodes: ProjectNode[] = [];
    let routedCount = 0;
    let unassignedCount = 0;

    documents.forEach((document) => {
      const detectedTag = detectDocumentTag(nextProject, document.title);
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
      const result = routeDocumentToNodeOrInbox(nextProject, activeLevel.id, incomingDocument);
      nextProject = result.project;
      if (result.documentNode) {
        importedNodes.push(result.documentNode);
      }
      if (result.routed) {
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
      participantNames: [from.responsible ?? from.title, to.responsible ?? to.title],
      createdAt: "только что",
      dueAt: getDefaultProcessDueAt(24),
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
      inboxDocuments: project.inboxDocuments.filter((item) => item.id !== rejectedDocument.id),
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

  function addRandomFile(targetNodeId?: string, customTag?: string) {
    const document = createDocumentFromName(appendTagToFileName(getRandomFileName(), customTag), "manual", undefined, undefined, undefined, getRandomFileSize());
    if (!targetNodeId) {
      const result = routeDocumentToNodeOrInbox(activeProject, activeLevel.id, document);
      updateActiveProject(() => result.project);
      setSelectedProcessId(null);
      if (result.documentNode) {
        setActiveLevelId(result.levelId);
        setSelectedNodeId(result.documentNode.id);
        window.setTimeout(() => sceneRef.current?.focusNode(result.documentNode!.id), 80);
        showToast("Файл распределен по тегу и добавлен в нужную ноду.");
      } else {
        showToast("Файл добавлен в бесхозные. Перетащите его на рабочую область, когда будете готовы разобрать.");
      }
      return;
    }

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

  function moveDocumentNode(documentNodeId: string, targetNodeId: string | null, position?: Vec2) {
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
    updateActiveProject(() => withNodePosition(result.project, result.levelId, documentNodeId, position));
    setActiveLevelId(result.levelId);
    setSelectedNodeId(documentNodeId);
    setSelectedProcessId(null);
    showToast("Файл вынесен из ноды и снова стал бесхозным.");
  }

  function materializeInboxDocument(documentId: string, position?: Vec2) {
    const document = activeProject.inboxDocuments.find((item) => item.id === documentId);
    if (!document) {
      return;
    }

    const result = addDocumentNodeToProject(activeProject, activeLevel.id, { ...document, isNew: false, updatedAt: "только что" });
    updateActiveProject(() => withNodePosition(result.project, result.levelId, result.documentNode.id, position));
    setActiveLevelId(result.levelId);
    setSelectedNodeId(result.documentNode.id);
    setSelectedProcessId(null);
    setActiveMenu("map");
    if (!position) {
      window.setTimeout(() => sceneRef.current?.focusNode(result.documentNode.id), 80);
    }
    showToast("Файл вынесен из бесхозных на рабочую область.");
  }

  function moveDocumentNodeToInbox(documentNodeId: string) {
    const node = getNodeById(activeProject, documentNodeId);
    if (!node || node.type !== "document") {
      return;
    }

    const document = {
      ...getDocumentFromNode(node),
      status: "draft" as const,
      isNew: true,
      updatedAt: "только что",
    };
    updateActiveProject((project) => addDocumentToInbox(project, document));
    setSelectedNodeId(activeLevel.centralNodeId);
    setSelectedProcessId(null);
    showToast("Файл возвращен в бесхозные и убран с рабочей области.");
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

  async function createDocumentsFromDroppedFiles(files: File[]) {
    return Promise.all(
      files.map(async (file) => ({
        ...createDocumentFromName(
          file.name,
          "drop",
          URL.createObjectURL(file),
          file.name.toLowerCase().endsWith(".txt") ? await file.text() : undefined,
          file.type,
          formatBytes(file.size),
        ),
        updatedAt: formatFileModifiedAt(file.lastModified),
      })),
    );
  }

  function updateParticipantProfile(participantId: string, name: string, avatarUrl?: string) {
    const participant = activeProject.participants.find((item) => item.id === participantId);
    const normalizedName = name.trim();
    if (!participant || !normalizedName) {
      showToast("Укажите имя пользователя.");
      return;
    }

    const previousName = participant.name;
    const replaceName = (value: string | undefined) => value === previousName ? normalizedName : value;
    updateActiveProject((project) => ({
      ...project,
      participants: project.participants.map((item) =>
        item.id === participantId ? { ...item, name: normalizedName, avatarUrl } : item,
      ),
      nodes: project.nodes.map((node) => ({ ...node, responsible: replaceName(node.responsible) })),
      processes: project.processes.map((process) => ({
        ...process,
        sender: replaceName(process.sender) ?? process.sender,
        receiver: replaceName(process.receiver) ?? process.receiver,
        approver: replaceName(process.approver),
        participantNames: process.participantNames?.map((item) => replaceName(item) ?? item),
        delegatedTo: process.delegatedTo?.map((item) => replaceName(item) ?? item),
        discussion: process.discussion?.map((entry) => ({ ...entry, author: replaceName(entry.author) ?? entry.author })),
      })),
      chatMessages: project.chatMessages.map((message) => ({ ...message, author: replaceName(message.author) ?? message.author })),
      updatedAt: "только что",
    }));
    showToast("Профиль пользователя обновлен.");
  }

  async function importFilesToProjectPool(files: File[]) {
    if (!files.length) {
      return;
    }

    const documents = await createDocumentsFromDroppedFiles(files);

    let nextProject = activeProject;
    const documentNodes: ProjectNode[] = [];
    let routedCount = 0;
    let inboxCount = 0;
    documents.forEach((document) => {
      const result = routeDocumentToNodeOrInbox(nextProject, activeLevel.id, document);
      nextProject = result.project;
      if (result.documentNode) {
        documentNodes.push(result.documentNode);
      }
      if (result.routed) {
        routedCount += 1;
      } else {
        inboxCount += 1;
      }
    });

    updateActiveProject(() => nextProject);
    if (documentNodes[0]) {
      setSelectedNodeId(documentNodes[0].id);
      setSelectedProcessId(null);
    }
    showToast(`Файлы импортированы: ${routedCount} распределено по тегам, ${inboxCount} добавлено в бесхозные.`);
  }

  async function importFilesToWorkspace(files: File[], position?: Vec2 | null) {
    if (!files.length) {
      return;
    }

    if (!position) {
      await importFilesToProjectPool(files);
      return;
    }

    const documents = await createDocumentsFromDroppedFiles(files);
    let nextProject = activeProject;
    const documentNodes: ProjectNode[] = [];

    documents.forEach((document, index) => {
      const result = addDocumentNodeToProject(nextProject, activeLevel.id, { ...document, isNew: true, updatedAt: "только что" });
      nextProject = withNodePosition(result.project, result.levelId, result.documentNode.id, offsetDropPosition(position, index));
      documentNodes.push(result.documentNode);
    });

    updateActiveProject(() => nextProject);
    if (documentNodes[0]) {
      setActiveLevelId(activeLevel.id);
      setSelectedNodeId(documentNodes[0].id);
      setSelectedProcessId(null);
      setActiveMenu("map");
    }
    showToast(`Файлы добавлены на карту в точку перетаскивания: ${documents.length}.`);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDropActive(false);
    const dropPosition = sceneRef.current?.clientToWorld(event.clientX, event.clientY);

    const documentNodeId = event.dataTransfer.getData("application/x-molecule-document-node");
    if (documentNodeId) {
      moveDocumentNode(documentNodeId, null, dropPosition ?? undefined);
      return;
    }

    const inboxDocumentId = event.dataTransfer.getData("application/x-molecule-inbox-document");
    if (inboxDocumentId) {
      materializeInboxDocument(inboxDocumentId, dropPosition ?? undefined);
      return;
    }

    await importFilesToWorkspace(Array.from(event.dataTransfer.files), dropPosition);
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

  if (!hasProjects) {
    return (
      <div className="app-shell empty-project-shell" style={appVars}>
        <div className="cosmos-backdrop" />
        <main className="empty-project-state glass-panel">
          <span>Проекты не созданы</span>
          <h1>Создайте первый проект</h1>
          <p>После создания здесь появится рабочая карта проекта, ноды, документы, бизнес-процессы и мессенджер.</p>
          <button onClick={() => setProjectManagerOpen(true)}>Создать новый проект</button>
        </main>
        {projectManagerOpen ? (
          <ProjectManagerModal
            templates={projectTemplates}
            onClose={() => setProjectManagerOpen(false)}
            onCreateProject={createProject}
          />
        ) : null}
        {toast ? <div className="toast glass-panel">{toast}</div> : null}
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      style={appVars}
      onDragOver={(event) => {
        event.preventDefault();
        const types = Array.from(event.dataTransfer.types);
        setIsDropActive(types.includes("Files"));
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
        chatUnreadCount={chatUnreadCount}
        onMenuSelect={selectSidebarMenu}
        onSelectProcess={selectProcess}
        onSelectNode={navigateToNode}
        onOpenDocument={setModalDocument}
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
        user={currentUser}
        onProjectChange={selectProject}
        onProjectDelete={deleteProject}
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
        interfaceScale={interfaceScale}
        onSelectNode={selectNode}
        onOpenNodeLevel={openNodeLevel}
        onBackLevel={backLevel}
        onSelectProcess={selectProcess}
        onOpenProcessDetails={openProcessDetails}
        onStartLink={startLink}
        onCompleteLink={completeLink}
        onOpenDocument={setModalDocument}
        onMoveDocumentNode={moveDocumentNode}
        onMoveDocumentNodeToInbox={moveDocumentNodeToInbox}
        onAddRandomFile={addRandomFile}
        onAddSectionNode={addSectionNode}
        onImportFilesAtPosition={(files, position) => {
          void importFilesToWorkspace(files, position);
        }}
        onUpdateDocumentStatus={updateDocumentStatus}
        onPositionsChange={saveLevelPositions}
        onToggleNodePositionLock={toggleNodePositionLock}
        onDeleteNode={deleteNode}
        onDeleteProcess={deleteProcess}
        onDeleteProject={() => deleteProject(activeProject.id)}
        sceneRef={sceneRef}
      />
      <OrphanFilesPanel
        project={activeProject}
        onAddRandomFile={(tag) => addRandomFile(undefined, tag)}
        onMaterializeInboxDocument={materializeInboxDocument}
        onMoveDocumentNodeToInbox={moveDocumentNodeToInbox}
        onDeleteDocument={deleteInboxDocument}
        onImportFiles={(files) => {
          void importFilesToProjectPool(files);
        }}
        onOpenDocument={(document) => setModalDocument(document)}
      />
      <ProjectChatPanel
        messages={activeProject.chatMessages}
        isOpen={chatPanelOpen}
        unreadCount={chatUnreadCount}
        onSend={sendProjectChatMessage}
        onToggle={toggleChatPanel}
        onOpenChat={() => {
          markProjectChatRead();
          setChatPanelOpen(false);
          setActiveMenu("chat");
        }}
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
        fontScale={fontScale}
        interfaceScale={interfaceScale}
        onFontScaleChange={setFontScale}
        onInterfaceScaleChange={setInterfaceScale}
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
          onOpenDocument={setModalDocument}
          onMoveDocumentNode={moveDocumentNode}
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
          onSaveProfile={updateParticipantProfile}
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
          onAddParticipant={addParticipantFromDirectory}
        />
      ) : null}
      {detailProcess ? (
        <ProcessDetailModal
          project={activeProject}
          process={detailProcess}
          onClose={() => setProcessDetailId(null)}
          onOpenDocument={setModalDocument}
          onDelegationChange={updateProcessDelegation}
          onTaskCommentChange={(processId, taskComment) => updateProcess(processId, { taskComment })}
          onClarification={submitProcessClarification}
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

function addDocumentToInbox(project: DemoProject, document: ProcessDocument): DemoProject {
  const nodeIdsToRemove = new Set(
    project.nodes
      .filter((node) => node.type === "document" && node.document?.id === document.id)
      .map((node) => node.id),
  );

  const nodePositions = Object.fromEntries(
    Object.entries(project.nodePositions ?? {}).map(([levelId, positions]) => [
      levelId,
      Object.fromEntries(Object.entries(positions).filter(([nodeId]) => !nodeIdsToRemove.has(nodeId))),
    ]),
  );

  return {
    ...project,
    nodes: project.nodes.filter((node) => !nodeIdsToRemove.has(node.id)),
    levels: project.levels.map((level) => ({
      ...level,
      nodeIds: level.nodeIds.filter((id) => !nodeIdsToRemove.has(id)),
    })),
    processes: project.processes.map((process) => ({
      ...process,
      documents: process.documents.filter((item) => item.id !== document.id),
    })),
    inboxDocuments: [
      document,
      ...project.inboxDocuments.filter((item) => item.id !== document.id),
    ],
    nodePositions,
    updatedAt: "только что",
  };
}

function removeDocumentEverywhere(project: DemoProject, documentId: string): DemoProject {
  const nodeIdsToRemove = new Set(
    project.nodes
      .filter((node) => node.type === "document" && node.document?.id === documentId)
      .map((node) => node.id),
  );
  const nodePositions = Object.fromEntries(
    Object.entries(project.nodePositions ?? {}).map(([levelId, positions]) => [
      levelId,
      Object.fromEntries(Object.entries(positions).filter(([nodeId]) => !nodeIdsToRemove.has(nodeId))),
    ]),
  );

  return {
    ...project,
    nodes: project.nodes.filter((node) => !nodeIdsToRemove.has(node.id)),
    levels: project.levels.map((level) => ({
      ...level,
      nodeIds: level.nodeIds.filter((nodeId) => !nodeIdsToRemove.has(nodeId)),
    })),
    processes: project.processes.map((process) => ({
      ...process,
      documents: process.documents.filter((document) => document.id !== documentId),
    })),
    inboxDocuments: project.inboxDocuments.filter((document) => document.id !== documentId),
    nodePositions,
    updatedAt: "только что",
  };
}

function removeProjectNodeTree(project: DemoProject, rootNodeId: string): DemoProject {
  const removedNodeIds = new Set<string>([rootNodeId]);
  const removedLevelIds = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    project.levels.forEach((level) => {
      if (removedLevelIds.has(level.id) || !level.parentNodeId || !removedNodeIds.has(level.parentNodeId)) {
        return;
      }
      removedLevelIds.add(level.id);
      level.nodeIds.forEach((nodeId) => removedNodeIds.add(nodeId));
      changed = true;
    });
  }

  project.nodes.forEach((node) => {
    if (node.documentOwnerNodeId && removedNodeIds.has(node.documentOwnerNodeId)) {
      removedNodeIds.add(node.id);
    }
  });

  const removedProcesses = project.processes.filter(
    (process) => removedLevelIds.has(process.levelId) || removedNodeIds.has(process.from) || removedNodeIds.has(process.to),
  );
  const preservedDocuments = [
    ...project.nodes
      .filter((node) => removedNodeIds.has(node.id) && node.type === "document" && node.document)
      .map((node) => getDocumentFromNode(node)),
    ...removedProcesses.flatMap((process) => process.documents),
  ];
  const inboxById = new Map(project.inboxDocuments.map((document) => [document.id, document]));
  preservedDocuments.forEach((document) => {
    inboxById.set(document.id, {
      ...document,
      status: document.status === "approved" ? document.status : "draft",
      isNew: true,
      updatedAt: "только что",
    });
  });

  const nodePositions = Object.fromEntries(
    Object.entries(project.nodePositions ?? {})
      .filter(([levelId]) => !removedLevelIds.has(levelId))
      .map(([levelId, positions]) => [
        levelId,
        Object.fromEntries(Object.entries(positions).filter(([nodeId]) => !removedNodeIds.has(nodeId))),
      ]),
  );

  return {
    ...project,
    levels: project.levels
      .filter((level) => !removedLevelIds.has(level.id))
      .map((level) => ({
        ...level,
        nodeIds: level.nodeIds.filter((nodeId) => !removedNodeIds.has(nodeId)),
      })),
    nodes: project.nodes.filter((node) => !removedNodeIds.has(node.id)),
    processes: project.processes.filter((process) => !removedProcesses.some((removed) => removed.id === process.id)),
    inboxDocuments: Array.from(inboxById.values()),
    nodePositions,
    updatedAt: "только что",
  };
}

function withNodePosition(project: DemoProject, levelId: string, nodeId: string, position?: Vec2): DemoProject {
  if (!position) {
    return project;
  }

  return {
    ...project,
    nodePositions: {
      ...(project.nodePositions ?? {}),
      [levelId]: {
        ...(project.nodePositions?.[levelId] ?? {}),
        [nodeId]: position,
      },
    },
  };
}

function offsetDropPosition(position: Vec2, index: number): Vec2 {
  if (index === 0) {
    return position;
  }

  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: clampNumber(position.x + column * 1.35, -42, 42),
    y: clampNumber(position.y + row * 1.05, -26, 26),
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
  const parts = extractTagTokens(base);
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

function detectDocumentTag(project: DemoProject, title: string) {
  const tokens = extractTagTokens(title);
  if (tokens.length < 2) {
    return undefined;
  }

  const knownTags = new Set(
    project.nodes
      .filter((node) => node.type !== "document" && node.type !== "central")
      .flatMap((node) => [node.shortCode, ...(node.tags ?? [])])
      .map((tag) => normalizeTag(tag ?? ""))
      .filter(Boolean),
  );
  const knownToken = tokens.find((token) => knownTags.has(normalizeTag(token)));
  return (knownToken ?? tokens[tokens.length - 1]).toLocaleUpperCase("ru-RU");
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

function getChecklistStatus(checklist: NodeChecklistItem[], fallback?: NodeStatus): NodeStatus {
  if (!checklist.length) {
    return fallback ?? "unchecked";
  }

  if (checklist.every((item) => item.done)) {
    return "approved";
  }

  if (checklist.some((item) => item.done)) {
    return "review";
  }

  return "unchecked";
}

function formatNodeLevelTitle(node: ProjectNode) {
  const code = node.shortCode?.trim();
  return code ? `${code} / ${node.title}` : node.title;
}

function normalizeTag(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, "");
}

function appendTagToFileName(fileName: string, tag?: string) {
  const normalizedTag = normalizeFileTag(tag);
  if (!normalizedTag) {
    return fileName;
  }

  const tokens = extractTagTokens(fileName);
  if (tokens.some((token) => normalizeTag(token) === normalizeTag(normalizedTag))) {
    return fileName;
  }

  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${fileName}_${normalizedTag}`;
  }

  return `${fileName.slice(0, dotIndex)}_${normalizedTag}${fileName.slice(dotIndex)}`;
}

function normalizeFileTag(tag?: string) {
  const firstToken = tag?.trim().split(/[\s_]+/).find(Boolean) ?? "";
  return firstToken.replace(/[^0-9A-Za-zА-Яа-яЁё]+/g, "").toLocaleUpperCase("ru-RU");
}

function extractTagTokens(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .split(/[\s_]+/)
    .map((part) => part.trim())
    .filter(Boolean);
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

type DeadlineNotificationPhase = "due_soon" | "urgent" | "overdue";

function buildDeadlineNotifications(projects: DemoProject[], current: DemoNotification[]) {
  const existingIds = new Set(current.map((notification) => notification.id));
  const notifications: DemoNotification[] = [];

  projects.forEach((project) => {
    project.processes.forEach((process) => {
      if (process.status === "draft" || process.status === "accepted" || process.status === "rejected") {
        return;
      }

      getProcessDeadlineEntries(process).forEach((entry) => {
        const phase = getDeadlineNotificationPhase(entry.value);
        if (!phase) {
          return;
        }

        const id = `deadline-${project.id}-${process.id}-${entry.key}-${phase}`;
        if (existingIds.has(id)) {
          return;
        }

        notifications.push({
          id,
          projectId: project.id,
          title: getDeadlineNotificationTitle(phase),
          description: `${process.title}: ${entry.label} ${formatDeadlineDistance(entry.value)}. Передает: ${process.sender}; получает: ${process.receiver}; согласует: ${process.approver ?? process.receiver}.`,
          time: "только что",
          targetProcessId: process.id,
          unread: true,
        });
      });
    });
  });

  return notifications;
}

function getDeadlineNotificationPhase(value?: string): DeadlineNotificationPhase | null {
  const deadline = parseDeadline(value);
  if (!deadline) {
    return null;
  }

  const hoursLeft = (deadline.getTime() - Date.now()) / 36e5;
  if (hoursLeft < 0) {
    return "overdue";
  }
  if (hoursLeft <= 24) {
    return "urgent";
  }
  if (hoursLeft <= 72) {
    return "due_soon";
  }
  return null;
}

function getDeadlineNotificationTitle(phase: DeadlineNotificationPhase) {
  if (phase === "overdue") {
    return "Срок бизнес-процесса просрочен";
  }
  if (phase === "urgent") {
    return "До срока бизнес-процесса меньше суток";
  }
  return "Срок бизнес-процесса близко";
}

function getDefaultProcessDueAt(hoursFromNow: number) {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow, 0, 0, 0);
  return formatAppDateTimeLocal(date);
}

function formatAppDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatFileModifiedAt(timestamp: number) {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "только что";
  }
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fontSizes = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30, 32, 34, 42, 54];

function buildAppVars(fontScale: number, interfaceScale: number) {
  return fontSizes.reduce(
    (vars, size) => ({
      ...vars,
      [`--fs-${size}`]: `${size * fontScale}px`,
    }),
    {
      "--font-scale": String(fontScale),
      "--ui-scale": String(interfaceScale),
      "--ui-left-adjustment": `${Math.round(316 * (interfaceScale - 1))}px`,
      "--ui-right-adjustment": `${Math.round(330 * (interfaceScale - 1))}px`,
      "--ui-control-size": `${Math.round(36 * interfaceScale)}px`,
      "--ui-toolbar-height": `${Math.round(48 * interfaceScale)}px`,
      "--ui-panel-padding": `${Math.round(14 * interfaceScale)}px`,
    } as CSSProperties & Record<string, string>,
  );
}
