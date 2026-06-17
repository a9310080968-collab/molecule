import { type CSSProperties, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type SidebarMenuId } from "./components/Sidebar";
import { TopSearch } from "./components/TopSearch";
import { ProjectScene, type SceneHandle } from "./components/ProjectScene";
import { BottomControls } from "./components/BottomControls";
import { RightPanel } from "./components/RightPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { DocumentModal } from "./components/DocumentModal";
import { OrphanFilesPanel } from "./components/OrphanFilesPanel";
import { ProjectChatPanel } from "./components/ProjectChatPanel";
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
import type {
  BusinessProcess,
  ChatMessage,
  DemoNotification,
  DemoProject,
  NodeEdit,
  ProcessDocument,
  ProcessEdit,
  ProjectNode,
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

export default function App() {
  const [projects, setProjects] = useState<DemoProject[]>(demoProjects);
  const [activeProjectId, setActiveProjectId] = useState(demoProjects[0].id);
  const [activeLevelId, setActiveLevelId] = useState(demoProjects[0].levels[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(demoProjects[0].levels[0].centralNodeId);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<SidebarMenuId>("map");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<DemoNotification[]>(initialNotifications);
  const [modalDocument, setModalDocument] = useState<ProcessDocument | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [isDropActive, setIsDropActive] = useState(false);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const sceneRef = useRef<SceneHandle | null>(null);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const activeLevel = getLevelById(activeProject, activeLevelId);
  const levelNodes = useMemo(() => getLevelNodes(activeProject, activeLevel), [activeLevel, activeProject]);
  const levelProcesses = useMemo(() => getLevelProcesses(activeProject, activeLevel), [activeLevel, activeProject]);
  const selectedNode = getNodeById(activeProject, selectedNodeId) ?? getNodeById(activeProject, activeLevel.centralNodeId) ?? levelNodes[0];
  const selectedProcess = getProcessById(activeProject, selectedProcessId) ?? null;
  const matches = useMemo(() => getSearchMatches(query, activeProject, activeLevel), [activeLevel, activeProject, query]);
  const isSearching = query.trim().length > 0;
  const hasNoResults = isSearching && matches.nodeIds.size + matches.processIds.size === 0;
  const fontVars = useMemo(() => buildFontVars(fontScale), [fontScale]);

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
    setQuery("");
    setActiveMenu("map");
  }

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setSelectedProcessId(null);
  }

  function selectProcess(processId: string) {
    const process = getProcessById(activeProject, processId);
    if (!process) {
      return;
    }
    if (process.projectId !== activeProjectId) {
      selectProject(process.projectId);
    }
    setActiveLevelId(process.levelId);
    setSelectedProcessId(processId);
    setSelectedNodeId(process.from);
    setActiveMenu("map");
    sceneRef.current?.focusNode(process.from);
  }

  function openNodeLevel(node: ProjectNode) {
    if (!canOpenNodeLevel(node, activeLevel.id)) {
      return;
    }

    const prepared = ensureNodeLevel(activeProject, node.id);
    updateActiveProject(() => prepared.project);
    setActiveLevelId(prepared.levelId);
    setSelectedNodeId(node.id);
    setSelectedProcessId(null);
    setLinkingFromId(null);
    setActiveMenu("map");
  }

  function backLevel() {
    if (!activeLevel.parentLevelId) {
      return;
    }
    const parent = getLevelById(activeProject, activeLevel.parentLevelId);
    setActiveLevelId(parent.id);
    setSelectedNodeId(activeLevel.parentNodeId ?? parent.centralNodeId);
    setSelectedProcessId(null);
    setLinkingFromId(null);
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

  function startLink(nodeId: string) {
    setLinkingFromId(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedProcessId(null);
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
    showToast("Создан ручной контейнер связи. Его можно наполнить документами и описанием.");
  }

  function deleteProcess(processId: string) {
    updateActiveProject((project) => ({
      ...project,
      processes: project.processes.filter((process) => process.id !== processId),
      updatedAt: "только что",
    }));
    setSelectedProcessId(null);
    showToast("Контейнер связи удален.");
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
    const document = createDocumentFromName("АР_пакет_из_почты_новое.pdf", "mail");
    updateActiveProject((project) => {
      if (!targetProcess) {
        return {
          ...project,
          inboxDocuments: [{ ...document, title: "Письмо без тега.pdf" }, ...project.inboxDocuments],
          updatedAt: "только что",
        };
      }

      return {
        ...project,
        processes: project.processes.map((process) =>
          process.id === targetProcess.id
            ? {
                ...process,
                status: "sent",
                documents: [{ ...document, status: "review" }, ...process.documents],
                source: "mail",
              }
            : process,
        ),
        updatedAt: "только что",
      };
    });

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
    const document = createDocumentFromName("сообщение_из_чата.txt", "chat", undefined, message.text);

    updateActiveProject((project) => ({
      ...project,
      chatMessages: [message, ...project.chatMessages],
      inboxDocuments: targetProcess ? project.inboxDocuments : [document, ...project.inboxDocuments],
      processes: targetProcess
        ? project.processes.map((process) =>
            process.id === targetProcess.id
              ? {
                  ...process,
                  status: "in_work",
                  validationAt: "только что",
                  documents: [{ ...document, status: "review" }, ...process.documents],
                  source: "chat",
                }
              : process,
          )
        : project.processes,
      updatedAt: "только что",
    }));

    pushNotification({
      title: targetProcess ? "Чат изменил статус связи" : "Сообщение без тега",
      description: targetProcess ? "Контейнер принят в работу через событие чата." : "Сообщение добавлено во входящие для ручной привязки.",
      targetProcessId: targetProcess?.id,
    });
    showToast(targetProcess ? "Статус связи изменен событием из чата." : "Сообщение добавлено во входящие.");
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
    setSelectedNodeId(node.id);
    setSelectedProcessId(null);
    setActiveMenu("map");
    window.setTimeout(() => sceneRef.current?.focusNode(node.id), 80);
  }

  function sendProjectChatMessage(text: string) {
    const message: ChatMessage = {
      id: `chat-${Date.now()}`,
      projectId: activeProject.id,
      author: "Анна Лебедева",
      role: "АР",
      text,
      time: "только что",
    };

    updateActiveProject((project) => ({
      ...project,
      chatMessages: [message, ...project.chatMessages],
      updatedAt: "только что",
    }));
    showToast("Сообщение добавлено в чат проекта.");
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
      <Sidebar
        isOpen={mobileMenuOpen}
        activeMenu={activeMenu}
        project={activeProject}
        onMenuSelect={setActiveMenu}
        onClose={() => setMobileMenuOpen(false)}
        onPlannedClick={() => showToast("Функция находится в разработке и будет доступна в следующей версии.")}
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
        onSelectNode={selectNode}
        onOpenNodeLevel={openNodeLevel}
        onBackLevel={backLevel}
        onSelectProcess={selectProcess}
        onStartLink={startLink}
        onCompleteLink={completeLink}
        onOpenDocument={setModalDocument}
        onMoveDocumentNode={moveDocumentNode}
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
          onStartLink={startLink}
          onOpenNodeLevel={openNodeLevel}
          onOpenDocument={setModalDocument}
          onMoveDocumentNode={moveDocumentNode}
          onAddRandomFile={addRandomFile}
          onRejectProcessDocument={rejectProcessDocument}
          onAttachInboxDocument={attachInboxDocument}
          onReceiveMail={receiveMail}
          onReceiveChat={receiveChat}
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
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
      />
      <DocumentModal
        document={modalDocument}
        onShowInFolder={(document) => showToast(`Демо: файл «${document.title}» лежит в контейнере проекта.`)}
        onClose={() => setModalDocument(null)}
      />
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
