import clsx from "clsx";
import {
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FolderInput,
  Layers3,
  LockKeyhole,
  Pin,
  PinOff,
  Plus,
  SquarePlus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  getFileLabel,
  getDocumentFromNode,
  getNodeVisualTone,
  getProcessDeadlineLabel,
  getProcessRuntimeColor,
  getProcessStatusColor,
  getProcessStatusText,
  getProjectProgress,
} from "../lib/graph";
import type { BusinessProcess, DemoProject, MapLevel, NodeStatus, ProcessDocument, ProjectNode, Vec2 } from "../types";

export type SceneHandle = {
  reset: () => void;
  normalize: () => void;
  focusNode: (id: string) => void;
  focusSelected: () => void;
  clientToWorld: (clientX: number, clientY: number) => Vec2 | null;
};

type ProjectSceneProps = {
  project: DemoProject;
  level: MapLevel;
  nodes: ProjectNode[];
  processes: BusinessProcess[];
  selectedNodeId: string;
  selectedProcessId: string | null;
  linkingFromId: string | null;
  matchedNodeIds: Set<string>;
  matchedProcessIds: Set<string>;
  isSearching: boolean;
  levelTransition: "down" | "up" | null;
  interfaceScale: number;
  onSelectNode: (nodeId: string) => void;
  onOpenNodeLevel: (node: ProjectNode) => void;
  onBackLevel: () => void;
  onSelectProcess: (processId: string) => void;
  onOpenProcessDetails: (processId: string) => void;
  onStartLink: (nodeId: string) => void;
  onCompleteLink: (nodeId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
  onMoveDocumentNode: (documentNodeId: string, targetNodeId: string | null) => void;
  onMoveDocumentNodeToInbox: (documentNodeId: string) => void;
  onAddRandomFile: (targetNodeId?: string) => void;
  onAddSectionNode: (position?: Vec2) => void;
  onImportFilesAtPosition: (files: File[], position: Vec2) => void;
  onUpdateDocumentStatus: (documentId: string, status: NodeStatus) => void;
  onPositionsChange: (levelId: string, positions: Record<string, Vec2>, record?: boolean) => void;
  onToggleNodePositionLock: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteProcess: (processId: string) => void;
  onDeleteProject: () => void;
  sceneRef: MutableRefObject<SceneHandle | null>;
};

type ViewState = {
  zoom: number;
  panX: number;
  panY: number;
};

type DragState = {
  nodeId: string;
  pointerId: number;
  startPointer: Vec2;
  originalPosition: Vec2;
  startPosition: Vec2;
  currentPosition: Vec2;
  moved: boolean;
};

type DragUiState = {
  nodeId: string;
  ownerNodeId?: string;
  targetNodeId?: string;
  overExit: boolean;
  overInbox: boolean;
};

type NodeContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
};

type SceneContextMenuState = {
  x: number;
  y: number;
  position: Vec2;
};

type ProcessContextMenuState = {
  processId: string;
  x: number;
  y: number;
};

type ProcessGroup = {
  key: string;
  processes: BusinessProcess[];
};

const INITIAL_VIEW: ViewState = { zoom: 1, panX: 0, panY: 42 };
const MIN_ZOOM = 0.34;
const MAX_ZOOM = 4.8;

export function ProjectScene({
  project,
  level,
  nodes,
  processes,
  selectedNodeId,
  selectedProcessId,
  linkingFromId,
  matchedNodeIds,
  matchedProcessIds,
  isSearching,
  levelTransition,
  interfaceScale,
  onSelectNode,
  onOpenNodeLevel,
  onBackLevel,
  onSelectProcess,
  onOpenProcessDetails,
  onStartLink,
  onCompleteLink,
  onOpenDocument,
  onMoveDocumentNode,
  onMoveDocumentNodeToInbox,
  onAddRandomFile,
  onAddSectionNode,
  onImportFilesAtPosition,
  onUpdateDocumentStatus,
  onPositionsChange,
  onToggleNodePositionLock,
  onDeleteNode,
  onDeleteProcess,
  onDeleteProject,
  sceneRef,
}: ProjectSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const exitZoneRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const uploadPositionRef = useRef<Vec2 | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const clickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const suppressClickRef = useRef(false);
  const panRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const fittedLevelRef = useRef<string | null>(null);
  const centerNodeId = level.centralNodeId;
  const nodeIdsKey = useMemo(() => nodes.map((node) => node.id).join("|"), [nodes]);
  const savedPositions = project.nodePositions?.[level.id];
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [positions, setPositions] = useState<Record<string, Vec2>>(() => buildLevelPositions(nodes, level.id, centerNodeId, savedPositions));
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragUi, setDragUi] = useState<DragUiState | null>(null);
  const [contextMenu, setContextMenu] = useState<NodeContextMenuState | null>(null);
  const [sceneContextMenu, setSceneContextMenu] = useState<SceneContextMenuState | null>(null);
  const [processContextMenu, setProcessContextMenu] = useState<ProcessContextMenuState | null>(null);
  const [openProcessGroupKey, setOpenProcessGroupKey] = useState<string | null>(null);
  const [openProcessIndex, setOpenProcessIndex] = useState(0);
  const [levelMotion, setLevelMotion] = useState<"down" | "up" | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const processGroups = useMemo(() => groupProcesses(processes), [processes]);
  const contextNode = contextMenu ? nodeMap.get(contextMenu.nodeId) : undefined;
  const contextProcess = processContextMenu
    ? processes.find((process) => process.id === processContextMenu.processId)
    : undefined;
  const projectProgress = getProjectProgress(project, level);
  const nodeVisualScale = getNodeVisualScale(view.zoom);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPositions(buildLevelPositions(nodes, level.id, centerNodeId, savedPositions));
  }, [centerNodeId, level.id, nodeIdsKey, nodes, savedPositions]);

  useEffect(() => {
    setView(INITIAL_VIEW);
    setOpenProcessGroupKey(null);
  }, [level.id]);

  useEffect(() => {
    const closeContextMenus = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".context-menu")) {
        return;
      }
      setContextMenu(null);
      setSceneContextMenu(null);
      setProcessContextMenu(null);
    };
    window.addEventListener("pointerdown", closeContextMenus);
    return () => window.removeEventListener("pointerdown", closeContextMenus);
  }, []);

  useEffect(() => {
    const fitKey = `${level.id}:${interfaceScale}`;
    if (!size.width || !size.height || fittedLevelRef.current === fitKey) {
      return;
    }

    fittedLevelRef.current = fitKey;
    setView(buildFittedView(positions, size, interfaceScale));
  }, [interfaceScale, level.id, positions, size]);

  useEffect(() => {
    if (!levelTransition) {
      setLevelMotion(null);
      return undefined;
    }

    setLevelMotion(null);
    const start = window.setTimeout(() => setLevelMotion(levelTransition), 0);
    const timeout = window.setTimeout(() => setLevelMotion(null), 720);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(timeout);
    };
  }, [level.id, levelTransition]);

  const rawScreenPositions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(positions).map(([id, position]) => [id, worldToScreen(position, size, view)]),
    ) as Record<string, Vec2>;
  }, [positions, size, view]);
  const screenPositions = useMemo(
    () => resolveNodeScreenCollisions(rawScreenPositions, nodes, centerNodeId, nodeVisualScale, draggingNodeId),
    [centerNodeId, draggingNodeId, nodeVisualScale, nodes, rawScreenPositions],
  );
  const openProcessGroup = openProcessGroupKey
    ? processGroups.find((group) => group.key === openProcessGroupKey)
    : undefined;
  const boundedOpenProcessIndex = openProcessGroup
    ? Math.min(openProcessIndex, openProcessGroup.processes.length - 1)
    : 0;
  const openProcess = openProcessGroup?.processes[boundedOpenProcessIndex];
  const openProcessAnchor = openProcessGroup
    ? getProcessGroupAnchor(openProcessGroup, screenPositions, nodeMap, centerNodeId, nodeVisualScale)
    : undefined;
  const taskPopoverPosition = openProcessAnchor ? getTaskPopoverPosition(openProcessAnchor, size) : undefined;

  useEffect(() => {
    if (openProcessGroupKey && !openProcessGroup) {
      setOpenProcessGroupKey(null);
      return;
    }
    const selectedIndex = openProcessGroup?.processes.findIndex((process) => process.id === selectedProcessId) ?? -1;
    if (selectedIndex >= 0 && selectedIndex !== openProcessIndex) {
      setOpenProcessIndex(selectedIndex);
    }
  }, [openProcessGroup, openProcessGroupKey, openProcessIndex, selectedProcessId]);

  const focusNode = useCallback((nodeId: string) => {
    const position = positions[nodeId];
    if (!position || !size.width || !size.height) {
      return;
    }

    const baseScale = getBaseScale(size);
    setView((current) => ({
      ...current,
      panX: -position.x * baseScale * current.zoom,
      panY: -position.y * baseScale * current.zoom,
    }));
  }, [positions, size]);

  useEffect(() => {
    sceneRef.current = {
      reset: () => {
        const next = buildInitialPositions(nodes, level.id, centerNodeId);
        setPositions(next);
        onPositionsChange(level.id, next, true);
        setView(buildFittedView(next, size, interfaceScale));
      },
      normalize: () => {
        const next = buildNormalizedPositions(nodes, processes, level.id, centerNodeId, positions);
        setPositions(next);
        onPositionsChange(level.id, next, true);
        setView(buildFittedView(next, size, interfaceScale));
      },
      focusNode,
      focusSelected: () => focusNode(selectedNodeId),
      clientToWorld: (clientX, clientY) => {
        const rect = containerRef.current?.getBoundingClientRect();
        return rect ? clientToWorld(clientX, clientY, rect, view) : null;
      },
    };
  }, [centerNodeId, focusNode, interfaceScale, level.id, nodes, onPositionsChange, positions, processes, sceneRef, selectedNodeId, size, view]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const before = clientToWorld(event.clientX, event.clientY, rect, view);
    const nextZoom = clamp(view.zoom * (event.deltaY < 0 ? 1.12 : 0.88), MIN_ZOOM, MAX_ZOOM);
    const baseScale = getBaseScale({ width: rect.width, height: rect.height });
    setView({
      zoom: nextZoom,
      panX: event.clientX - rect.left - rect.width / 2 - before.x * baseScale * nextZoom,
      panY: event.clientY - rect.top - rect.height / 2 - before.y * baseScale * nextZoom,
    });
  };

  const handleScenePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".context-menu")) {
      return;
    }
    setContextMenu(null);
    setSceneContextMenu(null);
    setProcessContextMenu(null);
    if (event.button !== 0 || target.closest(".map-node, .process-hit, .node-plus, .level-chip, .linking-hint")) {
      return;
    }

    event.preventDefault();
    setOpenProcessGroupKey(null);
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: view.panX,
      panY: view.panY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleScenePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setView((current) => ({
      ...current,
      panX: pan.panX + event.clientX - pan.x,
      panY: pan.panY + event.clientY - pan.y,
    }));
  };

  const handleScenePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null;
    }
  };

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    if (node.id === centerNodeId || node.type === "central") {
      return;
    }
    if (node.positionLocked) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const position = positions[node.id];
    if (!rect || !position) {
      return;
    }

    const renderedPosition = screenPositions[node.id];
    const displayedWorldPosition = renderedPosition
      ? screenToWorld(renderedPosition, size, view)
      : position;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingNodeId(node.id);
    setPositions((current) => ({ ...current, [node.id]: displayedWorldPosition }));
    dragRef.current = {
      nodeId: node.id,
      pointerId: event.pointerId,
      startPointer: clientToWorld(event.clientX, event.clientY, rect, view),
      originalPosition: position,
      startPosition: displayedWorldPosition,
      currentPosition: displayedWorldPosition,
      moved: false,
    };
    if (node.type === "document") {
      setDragUi({ nodeId: node.id, ownerNodeId: node.documentOwnerNodeId, overExit: false, overInbox: false });
    } else {
      setDragUi(null);
    }
  };

  const handleNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
    const drag = dragRef.current;
    if (!drag || drag.nodeId !== node.id || drag.pointerId !== event.pointerId) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const pointer = clientToWorld(event.clientX, event.clientY, rect, view);
    const next = {
      x: clamp(drag.startPosition.x + pointer.x - drag.startPointer.x, -42, 42),
      y: clamp(drag.startPosition.y + pointer.y - drag.startPointer.y, -26, 26),
    };

    drag.moved = true;
    drag.currentPosition = next;
    setPositions((current) => ({ ...current, [node.id]: next }));

    if (node.type === "document") {
      const target = findDocumentDropTargetAtScreen(
        node,
        nodes,
        screenPositions,
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        centerNodeId,
        nodeVisualScale,
      );
      const overExit = Boolean(node.documentOwnerNodeId && isPointerInsideElement(event.clientX, event.clientY, exitZoneRef.current));
      const overInbox = isPointerInsideElement(
        event.clientX,
        event.clientY,
        document.querySelector<HTMLElement>(".orphan-files-panel"),
      );
      setDragUi({
        nodeId: node.id,
        ownerNodeId: node.documentOwnerNodeId,
        targetNodeId: target?.id,
        overExit,
        overInbox,
      });
    }
  };

  const finishNodeDrag = (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
    const drag = dragRef.current;
    if (!drag || drag.nodeId !== node.id || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDraggingNodeId(null);

    if (drag.moved && node.type === "document") {
      const dropPositions = { ...positions, [node.id]: drag.currentPosition };
      const rect = containerRef.current?.getBoundingClientRect();
      const target = rect
        ? findDocumentDropTargetAtScreen(
            node,
            nodes,
            screenPositions,
            { x: event.clientX - rect.left, y: event.clientY - rect.top },
            centerNodeId,
            nodeVisualScale,
          )
        : undefined;
      const overExit = Boolean(node.documentOwnerNodeId && isPointerInsideElement(event.clientX, event.clientY, exitZoneRef.current));
      const overInbox = isPointerInsideElement(
        event.clientX,
        event.clientY,
        document.querySelector<HTMLElement>(".orphan-files-panel"),
      );
      setDragUi(null);
      suppressClickRef.current = true;
      if (overInbox) {
        onMoveDocumentNodeToInbox(node.id);
      } else if (overExit) {
        onMoveDocumentNode(node.id, null);
      } else if (target && target.id !== node.documentOwnerNodeId) {
        onMoveDocumentNode(node.id, target.id);
      } else {
        setPositions(dropPositions);
        onPositionsChange(level.id, dropPositions, true);
      }
      return;
    }

    setDragUi(null);
    if (drag.moved) {
      suppressClickRef.current = true;
      const nextPositions = { ...positions, [node.id]: drag.currentPosition };
      setPositions(nextPositions);
      onPositionsChange(level.id, nextPositions, true);
    } else {
      setPositions((current) => ({ ...current, [node.id]: drag.originalPosition }));
    }
  };

  const handleNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
    finishNodeDrag(event, node);
  };

  const handleNodeClick = (event: ReactMouseEvent<HTMLButtonElement>, node: ProjectNode) => {
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const now = Date.now();
    const isDoubleClick = event.detail >= 2 || (clickRef.current?.nodeId === node.id && now - clickRef.current.time < 1200);
    clickRef.current = { nodeId: node.id, time: now };

    if (isDoubleClick) {
      clickRef.current = null;
      if (node.type === "document" && node.document) {
        onOpenDocument(node.document);
        return;
      }
      if (canDrillIntoNode(node, level)) {
        onOpenNodeLevel(node);
        return;
      }
    }

    if (linkingFromId && linkingFromId !== node.id) {
      onCompleteLink(node.id);
    } else {
      onSelectNode(node.id);
    }
  };

  const handleNodeDoubleClick = (event: ReactMouseEvent<HTMLButtonElement>, node: ProjectNode) => {
    event.stopPropagation();
    clickRef.current = null;

    if (node.type === "document" && node.document) {
      onOpenDocument(node.document);
      return;
    }

    if (canDrillIntoNode(node, level)) {
      onOpenNodeLevel(node);
    }
  };

  const handleNodeContextMenu = (event: ReactMouseEvent<HTMLButtonElement>, node: ProjectNode) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectNode(node.id);
    setSceneContextMenu(null);
    setProcessContextMenu(null);
    setContextMenu({
      nodeId: node.id,
      ...getContextMenuPosition(event.clientX, event.clientY, 236, 430),
    });
  };

  const handleProcessContextMenu = (processId: string, clientX: number, clientY: number) => {
    onSelectProcess(processId);
    setContextMenu(null);
    setSceneContextMenu(null);
    setProcessContextMenu({
      processId,
      ...getContextMenuPosition(clientX, clientY, 236, 142),
    });
  };

  const handleSceneContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.closest(".map-node, .process-hit, .process-label, .context-menu, .process-task-popover, .level-chip, .linking-hint, .document-exit-zone")) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setContextMenu(null);
    setProcessContextMenu(null);
    setSceneContextMenu({
      position: clientToWorld(event.clientX, event.clientY, rect, view),
      ...getContextMenuPosition(event.clientX, event.clientY, 236, 106),
    });
  };

  const toggleProcessGroup = (group: ProcessGroup) => {
    if (openProcessGroupKey === group.key) {
      setOpenProcessGroupKey(null);
      return;
    }
    const selectedIndex = group.processes.findIndex((process) => process.id === selectedProcessId);
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setOpenProcessIndex(nextIndex);
    setOpenProcessGroupKey(group.key);
    onSelectProcess(group.processes[nextIndex].id);
  };

  const shiftOpenProcess = (delta: number) => {
    if (!openProcessGroup?.processes.length) {
      return;
    }
    const nextIndex = (boundedOpenProcessIndex + delta + openProcessGroup.processes.length) % openProcessGroup.processes.length;
    setOpenProcessIndex(nextIndex);
    onSelectProcess(openProcessGroup.processes[nextIndex].id);
  };

  return (
    <main
      ref={containerRef}
      className={clsx(
        "scene-panel",
        linkingFromId && "is-linking",
        draggingNodeId && "is-node-dragging",
        dragUi && "is-document-dragging",
        dragUi?.overInbox && "is-inbox-drop",
        view.zoom < 0.78 && "zoom-overview",
        view.zoom >= 1.35 && "zoom-detailed",
        levelMotion && `level-transition-${levelMotion}`,
      )}
      onWheel={handleWheel}
      onPointerDown={handleScenePointerDown}
      onPointerMove={handleScenePointerMove}
      onPointerUp={handleScenePointerUp}
      onContextMenu={handleSceneContextMenu}
    >
      <input
        ref={uploadInputRef}
        className="scene-file-input"
        type="file"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          const position = uploadPositionRef.current;
          if (files.length && position) {
            onImportFilesAtPosition(files, position);
          }
          event.currentTarget.value = "";
          uploadPositionRef.current = null;
        }}
      />
      <div className="level-chip glass-panel">
        <div>
          <span>{project.title}</span>
          <strong>{level.title}</strong>
          <small>{level.subtitle}</small>
        </div>
        {level.parentLevelId ? (
          <div className="level-chip-actions">
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onBackLevel();
              }}
            >
              <ChevronUp size={17} />
              Уровень выше
            </button>
          </div>
        ) : null}
      </div>

      {linkingFromId ? (
        <div className="linking-hint glass-panel">
          Выберите вторую ноду для контейнера связи
        </div>
      ) : null}

      {dragUi?.ownerNodeId ? (
        <div ref={exitZoneRef} className={clsx("document-exit-zone glass-panel", dragUi.overExit && "active")}>
          <strong>Вынести наружу</strong>
          <span>Отпустите файл здесь, чтобы вернуть его на уровень выше</span>
        </div>
      ) : null}

      <svg className="process-layer" aria-hidden="true">
        <defs>
          <marker id="arrow-end" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0.9 L 4.8 2.5 L 0 4.1 z" fill="context-stroke" />
          </marker>
          <marker id="arrow-start" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 4.8 0.9 L 0 2.5 L 4.8 4.1 z" fill="context-stroke" />
          </marker>
        </defs>
        {processGroups.map((group) => (
          <ProcessPath
            key={group.key}
            processes={group.processes}
            selectedProcessId={selectedProcessId}
            from={screenPositions[group.processes[0].from]}
            to={screenPositions[group.processes[0].to]}
            fromNode={nodeMap.get(group.processes[0].from)}
            toNode={nodeMap.get(group.processes[0].to)}
            centralNodeId={centerNodeId}
            zoom={view.zoom}
            selected={group.processes.some((process) => selectedProcessId === process.id)}
            matched={group.processes.some((process) => matchedProcessIds.has(process.id))}
            dimmed={isSearching && !group.processes.some((process) => matchedProcessIds.has(process.id)) && !matchedNodeIds.has(group.processes[0].from) && !matchedNodeIds.has(group.processes[0].to)}
            onToggle={() => toggleProcessGroup(group)}
            onOpenDetails={() => onOpenProcessDetails(group.processes.find((process) => process.id === selectedProcessId)?.id ?? group.processes[0].id)}
            onOpenContextMenu={(clientX, clientY) => handleProcessContextMenu(
              group.processes.find((process) => process.id === selectedProcessId)?.id ?? group.processes[0].id,
              clientX,
              clientY,
            )}
          />
        ))}
      </svg>

      {openProcessGroup && openProcess && taskPopoverPosition ? (
        <aside
          className="process-task-popover glass-panel"
          style={{ left: taskPopoverPosition.x, top: taskPopoverPosition.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <span>Задания на связи</span>
              <strong>{getProcessRouteLabel(openProcessGroup, nodeMap)}</strong>
            </div>
            <button onClick={() => setOpenProcessGroupKey(null)} aria-label="Закрыть список заданий">
              <X size={16} />
            </button>
          </header>
          <div className="process-task-carousel">
            <button onClick={() => shiftOpenProcess(-1)} disabled={openProcessGroup.processes.length <= 1} aria-label="Предыдущее задание">
              <ChevronLeft size={17} />
            </button>
            <button
              className="process-task-card"
              onClick={() => onSelectProcess(openProcess.id)}
              onDoubleClick={() => onOpenProcessDetails(openProcess.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleProcessContextMenu(openProcess.id, event.clientX, event.clientY);
              }}
              title="Двойной клик: открыть бизнес-процесс"
            >
              <span>{boundedOpenProcessIndex + 1} из {openProcessGroup.processes.length}</span>
              <strong>{openProcess.title}</strong>
              <small>{getProcessStatusText(openProcess.status)} · {getProcessDeadlineLabel(openProcess)}</small>
            </button>
            <button onClick={() => shiftOpenProcess(1)} disabled={openProcessGroup.processes.length <= 1} aria-label="Следующее задание">
              <ChevronRight size={17} />
            </button>
          </div>
          <footer>
            <span>{openProcess.documents.length} файлов</span>
            <button onClick={() => onOpenProcessDetails(openProcess.id)}>
              <ExternalLink size={15} />
              Открыть процесс
            </button>
          </footer>
        </aside>
      ) : null}

      {nodes.map((node, index) => {
        const position = screenPositions[node.id];
        if (!position) {
          return null;
        }

        const isCenter = node.id === centerNodeId;
        const tone = getNodeVisualTone(isCenter ? { ...node, type: "central" } : node);
        const selected = selectedNodeId === node.id;
        const matched = matchedNodeIds.has(node.id);
        const dimmed = isSearching && !matched;
        const canDrill = canDrillIntoNode(node, level);
        const progress = isCenter ? projectProgress : undefined;
        const isLinkSource = linkingFromId === node.id;
        const canCompleteLink = linkingFromId && linkingFromId !== node.id;
        const isDocumentDropTarget = dragUi?.targetNodeId === node.id;
        const isIncomingNew = node.type === "document" && getDocumentFromNode(node).isNew;
        const label = getNodeDisplayLabel(node, isCenter, progress);

        return (
          <button
            key={node.id}
            data-node-id={node.id}
            data-node-type={isCenter ? "central" : node.type}
            className={clsx(
              "map-node",
              `node-${isCenter ? "central" : node.type}`,
              selected && "selected",
              matched && "matched",
              dimmed && "dimmed",
              canDrill && "can-drill",
              isLinkSource && "link-source",
              canCompleteLink && "link-target",
              isDocumentDropTarget && "document-drop-target",
              isIncomingNew && "incoming-new",
              node.positionLocked && "position-locked",
            )}
            style={{
              left: position.x,
              top: position.y,
              "--node-fill": tone.fill,
              "--node-glow": tone.glow,
              "--node-index": index,
              "--node-delay": `${Math.min(index * 16, 140)}ms`,
              "--node-visual-scale": nodeVisualScale,
            } as React.CSSProperties}
            onPointerDown={(event) => handleNodePointerDown(event, node)}
            onPointerMove={(event) => handleNodePointerMove(event, node)}
            onPointerUp={(event) => handleNodePointerUp(event, node)}
            onPointerCancel={(event) => handleNodePointerUp(event, node)}
            onClick={(event) => handleNodeClick(event, node)}
            onDoubleClick={(event) => handleNodeDoubleClick(event, node)}
            onContextMenu={(event) => handleNodeContextMenu(event, node)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
            title={canDrill ? "Двойной клик: провалиться внутрь" : tone.label}
          >
            <span className="node-orb">
              {isCenter ? <i style={{ height: `${progress}%` }} /> : null}
            </span>
            <span className="node-label">
              <strong>{label.primary}</strong>
              <em>{label.secondary}</em>
            </span>
            {node.type === "document" && node.status === "comments" ? <span className="node-status-badge">Не принято</span> : null}
            {node.positionLocked ? (
              <span className="node-lock-badge" title="Положение закреплено">
                <LockKeyhole size={13} />
              </span>
            ) : null}
            {node.type !== "central" && node.type !== "document" ? (
              <span
                className={clsx("node-plus", (hoveredNodeId === node.id || linkingFromId) && "visible")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  if (linkingFromId && linkingFromId !== node.id) {
                    onCompleteLink(node.id);
                  } else {
                    onStartLink(node.id);
                  }
                }}
              >
                <Plus size={16} />
              </span>
            ) : null}
          </button>
        );
      })}
      {contextMenu && contextNode ? createPortal(
        <div
          className="node-context-menu context-menu glass-panel"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>{contextNode.shortCode ?? contextNode.title}</strong>
          {contextNode.type !== "central" ? (
            <button
              onClick={() => {
                onToggleNodePositionLock(contextNode.id);
                setContextMenu(null);
              }}
            >
              {contextNode.positionLocked ? <PinOff size={15} /> : <Pin size={15} />}
              {contextNode.positionLocked ? "Открепить положение" : "Закрепить положение"}
            </button>
          ) : null}
          {contextNode.type === "document" && contextNode.document ? (
            <>
              <button
                onClick={() => {
                  onOpenDocument(contextNode.document!);
                  setContextMenu(null);
                }}
              >
                Открыть документ
              </button>
              <button
                onClick={() => {
                  onUpdateDocumentStatus(contextNode.document!.id, "review");
                  setContextMenu(null);
                }}
              >
                На проверке
              </button>
              <button
                onClick={() => {
                  onUpdateDocumentStatus(contextNode.document!.id, "approved");
                  setContextMenu(null);
                }}
              >
                Согласовано
              </button>
              <button
                className="danger"
                onClick={() => {
                  onUpdateDocumentStatus(contextNode.document!.id, "comments");
                  setContextMenu(null);
                }}
              >
                Не принято
              </button>
              {contextNode.documentOwnerNodeId ? (
                <button
                  onClick={() => {
                    onMoveDocumentNode(contextNode.id, null);
                    setContextMenu(null);
                  }}
                >
                  Вынести из ноды
                </button>
              ) : null}
              <button
                onClick={() => {
                  onMoveDocumentNodeToInbox(contextNode.id);
                  setContextMenu(null);
                }}
              >
                <FolderInput size={15} />
                В бесхозные
              </button>
            </>
          ) : null}
          {contextNode.type !== "central" && contextNode.type !== "document" ? (
            <>
              {canDrillIntoNode(contextNode, level) ? (
                <button
                  onClick={() => {
                    onOpenNodeLevel(contextNode);
                    setContextMenu(null);
                  }}
                >
                  <Layers3 size={15} />
                  {contextNode.childrenLevelId ? "Открыть уровень ноды" : "Добавить уровень"}
                </button>
              ) : null}
              <button
                onClick={() => {
                  onStartLink(contextNode.id);
                  setContextMenu(null);
                }}
              >
                Создать бизнес-процесс
              </button>
              <button
                onClick={() => {
                  onAddRandomFile(contextNode.id);
                  setContextMenu(null);
                }}
              >
                Положить тестовый файл
              </button>
            </>
          ) : null}
          {contextNode.type !== "central" ? (
            <button
              className="danger"
              onClick={() => {
                onDeleteNode(contextNode.id);
                setContextMenu(null);
              }}
            >
              <Trash2 size={15} />
              {contextNode.type === "document" ? "Удалить файл" : "Удалить ноду"}
            </button>
          ) : (
            <button
              className="danger"
              onClick={() => {
                onDeleteProject();
                setContextMenu(null);
              }}
            >
              <Trash2 size={15} />
              Удалить проект
            </button>
          )}
        </div>,
        document.body,
      ) : null}
      {processContextMenu && contextProcess ? createPortal(
        <div
          className="process-context-menu context-menu glass-panel"
          style={{ left: processContextMenu.x, top: processContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>{contextProcess.title}</strong>
          <button
            onClick={() => {
              onOpenProcessDetails(contextProcess.id);
              setProcessContextMenu(null);
            }}
          >
            <ExternalLink size={15} />
            Открыть процесс
          </button>
          <button
            className="danger"
            onClick={() => {
              onDeleteProcess(contextProcess.id);
              setProcessContextMenu(null);
            }}
          >
            <Trash2 size={15} />
            Удалить процесс
          </button>
        </div>,
        document.body,
      ) : null}
      {sceneContextMenu ? createPortal(
        <div
          className="scene-context-menu context-menu glass-panel"
          style={{ left: sceneContextMenu.x, top: sceneContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            onClick={() => {
              onAddSectionNode(sceneContextMenu.position);
              setSceneContextMenu(null);
            }}
          >
            <SquarePlus size={15} />
            Создать ноду
          </button>
          <button
            onClick={() => {
              uploadPositionRef.current = sceneContextMenu.position;
              uploadInputRef.current?.click();
              setSceneContextMenu(null);
            }}
          >
            <Upload size={15} />
            Загрузить файл сюда
          </button>
        </div>,
        document.body,
      ) : null}
    </main>
  );
}

function getContextMenuPosition(clientX: number, clientY: number, width: number, height: number) {
  return {
    x: Math.max(12, Math.min(clientX, window.innerWidth - width - 12)),
    y: Math.max(12, Math.min(clientY, window.innerHeight - height - 12)),
  };
}

function ProcessPath({
  processes,
  selectedProcessId,
  from,
  to,
  fromNode,
  toNode,
  centralNodeId,
  zoom,
  selected,
  matched,
  dimmed,
  onToggle,
  onOpenDetails,
  onOpenContextMenu,
}: {
  processes: BusinessProcess[];
  selectedProcessId: string | null;
  from?: Vec2;
  to?: Vec2;
  fromNode?: ProjectNode;
  toNode?: ProjectNode;
  centralNodeId: string;
  zoom: number;
  selected: boolean;
  matched: boolean;
  dimmed: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
  onOpenContextMenu: (clientX: number, clientY: number) => void;
}) {
  if (!from || !to || !fromNode || !toNode || !processes.length) {
    return null;
  }

  const visualScale = getNodeVisualScale(zoom);
  const radiusFrom = getNodeRadius(fromNode, centralNodeId) * visualScale;
  const radiusTo = getNodeRadius(toNode, centralNodeId) * visualScale;
  const geometry = buildProcessGeometry(from, to, radiusFrom, radiusTo, 0);
  const color = getProcessGroupColor(processes, selectedProcessId);
  const statuses = Array.from(new Set(processes.map((process) => process.status)));
  const statusColors = statuses.map((status) => getProcessStatusColor(status));
  const hasMixedStatuses = statuses.length > 1;
  const hasForward = processes.some((item) => item.direction === "forward" || item.direction === "both");
  const hasBackward = processes.some((item) => item.direction === "backward" || item.direction === "both");
  const activeCount = processes.filter((item) => item.status !== "accepted").length;
  const taskCount = activeCount || processes.length;
  const representative = processes.find((process) => process.id === selectedProcessId) ?? processes[0];
  const overview = zoom < 0.78;
  const detailed = zoom >= 1.35;
  const labelWidth = detailed ? 310 : overview ? 126 : 232;
  const labelHeight = detailed ? 62 : overview ? 32 : 44;

  return (
    <g className={clsx("process-group", selected && "selected", matched && "matched", dimmed && "dimmed")}>
      <path className="process-glow" d={geometry.path} style={{ stroke: color }} />
      <path
        className={clsx("process-line", hasMixedStatuses && "mixed")}
        d={geometry.path}
        style={{ stroke: color }}
        markerEnd={hasForward ? "url(#arrow-end)" : undefined}
        markerStart={hasBackward ? "url(#arrow-start)" : undefined}
      />
      {hasMixedStatuses ? statusColors.map((statusColor, index) => {
        const segmentLength = 9;
        const cycleLength = segmentLength * statusColors.length;
        return (
          <path
            key={statusColor}
            className="process-status-line"
            d={geometry.path}
            style={{
              stroke: statusColor,
              strokeDasharray: `${segmentLength} ${cycleLength - segmentLength}`,
              strokeDashoffset: -segmentLength * index,
            }}
          />
        );
      }) : null}
      <path
        className="process-hit"
        d={geometry.path}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onOpenDetails();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenContextMenu(event.clientX, event.clientY);
        }}
      />
      {!overview || selected ? (
        <foreignObject
          x={geometry.label.x - labelWidth / 2}
          y={geometry.label.y - labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
        >
          <button
            className={clsx("process-label process-group-label", overview && "overview", detailed && "detailed")}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onOpenDetails();
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenContextMenu(event.clientX, event.clientY);
            }}
            title="Двойной клик: открыть бизнес-процесс"
          >
            <span className="process-status-dots" title={statuses.map((status) => getProcessStatusText(status)).join(", ")}>
              {statusColors.map((statusColor) => <i key={statusColor} style={{ background: statusColor }} />)}
            </span>
            <b>
              {overview
                ? `${taskCount} ${pluralizeTasks(taskCount)}`
                : `${fromNode.shortCode ?? fromNode.title} ↔ ${toNode.shortCode ?? toNode.title}`}
            </b>
            {!overview ? <em>{taskCount} {pluralizeTasks(taskCount)}</em> : null}
            {detailed ? (
              <small>
                {representative.title} · {representative.documents.length} файлов · {getProcessStatusText(representative.status)}
              </small>
            ) : null}
          </button>
        </foreignObject>
      ) : null}
    </g>
  );
}

function groupProcesses(processes: BusinessProcess[]): ProcessGroup[] {
  const groups = new Map<string, BusinessProcess[]>();
  processes.forEach((process) => {
    const key = [process.from, process.to].sort().join("::");
    const group = groups.get(key) ?? [];
    group.push(process);
    groups.set(key, group);
  });
  return Array.from(groups, ([key, groupedProcesses]) => ({ key, processes: groupedProcesses }));
}

function getProcessGroupColor(processes: BusinessProcess[], selectedProcessId: string | null) {
  const selected = processes.find((process) => process.id === selectedProcessId);
  if (selected) {
    return getProcessRuntimeColor(selected);
  }
  const priority = ["rejected", "in_work", "sent", "draft", "accepted"] as const;
  const representative = priority
    .map((status) => processes.find((process) => process.status === status))
    .find(Boolean) ?? processes[0];
  return getProcessRuntimeColor(representative);
}

function getProcessGroupAnchor(
  group: ProcessGroup,
  screenPositions: Record<string, Vec2>,
  nodeMap: Map<string, ProjectNode>,
  centralNodeId: string,
  visualScale: number,
) {
  const process = group.processes[0];
  const from = screenPositions[process.from];
  const to = screenPositions[process.to];
  const fromNode = nodeMap.get(process.from);
  const toNode = nodeMap.get(process.to);
  if (!from || !to || !fromNode || !toNode) {
    return undefined;
  }
  return buildProcessGeometry(
    from,
    to,
    getNodeRadius(fromNode, centralNodeId) * visualScale,
    getNodeRadius(toNode, centralNodeId) * visualScale,
    0,
  ).label;
}

function getTaskPopoverPosition(anchor: Vec2, size: { width: number; height: number }) {
  const desktop = size.width >= 1120;
  const minX = desktop ? 340 : 12;
  const maxX = Math.max(minX, size.width - (desktop ? 684 : 326));
  return {
    x: clamp(anchor.x + 22, minX, maxX),
    y: clamp(anchor.y + 28, 130, Math.max(130, size.height - 300)),
  };
}

function getProcessRouteLabel(group: ProcessGroup, nodeMap: Map<string, ProjectNode>) {
  const process = group.processes[0];
  const from = nodeMap.get(process.from);
  const to = nodeMap.get(process.to);
  return `${from?.shortCode ?? from?.title ?? "Источник"} ↔ ${to?.shortCode ?? to?.title ?? "Получатель"}`;
}

function pluralizeTasks(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "задание";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задания";
  return "заданий";
}

function buildInitialPositions(nodes: ProjectNode[], levelId: string, centralNodeId: string) {
  const positions: Record<string, Vec2> = {};
  const central = nodes.find((node) => node.id === centralNodeId) ?? nodes.find((node) => node.type === "central");
  if (central) {
    positions[central.id] = { x: 0, y: 0 };
  }

  const orbitNodes = nodes.filter((node) => node.id !== central?.id);
  const structureNodes = orbitNodes.filter((node) => node.type !== "document");
  const documentNodes = orbitNodes.filter((node) => node.type === "document");
  const wide = levelId.includes("root");
  const radiusX = wide ? 18.5 : 14.5;
  const radiusY = wide ? 11.5 : 9.2;

  structureNodes.forEach((node, index) => {
    const angle = index * ((Math.PI * 2) / Math.max(structureNodes.length, 1)) - Math.PI / 2.35;
    const jitter = seededJitter(node.id);
    const uneven = 0.86 + ((index % 3) * 0.12);
    positions[node.id] = {
      x: Math.cos(angle) * radiusX * uneven + jitter.x * (wide ? 2.8 : 1.7),
      y: Math.sin(angle) * radiusY * uneven + jitter.y * (wide ? 2.1 : 1.3),
    };
  });

  documentNodes.forEach((node, index) => {
    const angle = index * ((Math.PI * 2) / Math.max(documentNodes.length, 1)) + Math.PI / 6;
    const jitter = seededJitter(node.id);
    const x = Math.cos(angle) * (radiusX + (wide ? 7.2 : 5.2)) + jitter.x * 1.6;
    const y = Math.sin(angle) * (radiusY + (wide ? 4.2 : 3.4)) + jitter.y * 1.4;
    positions[node.id] = {
      x: clamp(x, wide ? -24 : -18, wide ? 24 : 18),
      y: clamp(y, wide ? -7.2 : -6.8, wide ? 14.2 : 11.4),
    };
  });

  return positions;
}

function buildLevelPositions(
  nodes: ProjectNode[],
  levelId: string,
  centralNodeId: string,
  savedPositions?: Record<string, Vec2>,
) {
  const fallback = buildInitialPositions(nodes, levelId, centralNodeId);
  const result: Record<string, Vec2> = {};

  nodes.forEach((node) => {
    if (node.id === centralNodeId || node.type === "central") {
      result[node.id] = { x: 0, y: 0 };
      return;
    }

    const saved = savedPositions?.[node.id];
    result[node.id] = isFinitePosition(saved) ? saved : fallback[node.id] ?? { x: 0, y: 0 };
  });

  return result;
}

function buildNormalizedPositions(
  nodes: ProjectNode[],
  processes: BusinessProcess[],
  levelId: string,
  centralNodeId: string,
  currentPositions: Record<string, Vec2>,
) {
  const positions = buildInitialPositions(nodes, levelId, centralNodeId);
  const ids = nodes.map((node) => node.id);
  const lockedIds = new Set(
    nodes
      .filter((node) => node.id === centralNodeId || node.type === "central" || node.positionLocked)
      .map((node) => node.id),
  );
  const vectors = Object.fromEntries(ids.map((id) => [
    id,
    { ...((lockedIds.has(id) && currentPositions[id]) || positions[id] || { x: 0, y: 0 }) },
  ])) as Record<string, Vec2>;
  const central = nodes.some((node) => node.id === centralNodeId) ? centralNodeId : nodes.find((node) => node.type === "central")?.id;

  for (let iteration = 0; iteration < 88; iteration += 1) {
    const deltas = Object.fromEntries(ids.map((id) => [id, { x: 0, y: 0 }])) as Record<string, Vec2>;

    processes.forEach((process) => {
      const from = vectors[process.from];
      const to = vectors[process.to];
      if (!from || !to) {
        return;
      }

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(Math.hypot(dx, dy), 0.001);
      const target = process.status === "accepted" ? 19.5 : 17.5;
      const force = (distance - target) * 0.012;
      const ux = dx / distance;
      const uy = dy / distance;
      addDelta(deltas, process.from, ux * force, uy * force, lockedIds);
      addDelta(deltas, process.to, -ux * force, -uy * force, lockedIds);
    });

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const first = vectors[ids[i]];
        const second = vectors[ids[j]];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.max(Math.hypot(dx, dy), 0.001);
        const firstNode = nodes.find((node) => node.id === ids[i]);
        const secondNode = nodes.find((node) => node.id === ids[j]);
        const min = getNormalizationSeparation(firstNode, secondNode, central);
        if (distance >= min) {
          continue;
        }
        const force = (min - distance) * 0.055;
        const ux = dx / distance;
        const uy = dy / distance;
        addDelta(deltas, ids[i], -ux * force, -uy * force, lockedIds);
        addDelta(deltas, ids[j], ux * force, uy * force, lockedIds);
      }
    }

    ids.forEach((id) => {
      if (lockedIds.has(id)) {
        vectors[id] = id === central ? { x: 0, y: 0 } : { ...(currentPositions[id] ?? vectors[id]) };
        return;
      }
      vectors[id].x = clamp(vectors[id].x + deltas[id].x, -56, 56);
      vectors[id].y = clamp(vectors[id].y + deltas[id].y, -34, 34);
    });
  }

  minimizeProcessCrossings(vectors, nodes, processes, lockedIds);
  return vectors;
}

function minimizeProcessCrossings(
  positions: Record<string, Vec2>,
  nodes: ProjectNode[],
  processes: BusinessProcess[],
  lockedIds: Set<string>,
) {
  const candidates = nodes.filter((node) => !lockedIds.has(node.id) && node.type !== "document").map((node) => node.id);
  let bestScore = getProcessLayoutScore(positions, processes);

  for (let pass = 0; pass < 3; pass += 1) {
    let improved = false;
    for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        const firstId = candidates[firstIndex];
        const secondId = candidates[secondIndex];
        const firstPosition = positions[firstId];
        const secondPosition = positions[secondId];
        if (!firstPosition || !secondPosition) {
          continue;
        }

        positions[firstId] = secondPosition;
        positions[secondId] = firstPosition;
        const nextScore = getProcessLayoutScore(positions, processes);
        if (nextScore + 0.01 < bestScore) {
          bestScore = nextScore;
          improved = true;
        } else {
          positions[firstId] = firstPosition;
          positions[secondId] = secondPosition;
        }
      }
    }
    if (!improved) {
      break;
    }
  }
}

function getProcessLayoutScore(positions: Record<string, Vec2>, processes: BusinessProcess[]) {
  let crossings = 0;
  let totalLength = 0;

  processes.forEach((process) => {
    const from = positions[process.from];
    const to = positions[process.to];
    if (from && to) {
      totalLength += Math.hypot(to.x - from.x, to.y - from.y);
    }
  });

  for (let firstIndex = 0; firstIndex < processes.length; firstIndex += 1) {
    const first = processes[firstIndex];
    const firstFrom = positions[first.from];
    const firstTo = positions[first.to];
    if (!firstFrom || !firstTo) {
      continue;
    }
    for (let secondIndex = firstIndex + 1; secondIndex < processes.length; secondIndex += 1) {
      const second = processes[secondIndex];
      if ([first.from, first.to].some((nodeId) => nodeId === second.from || nodeId === second.to)) {
        continue;
      }
      const secondFrom = positions[second.from];
      const secondTo = positions[second.to];
      if (secondFrom && secondTo && segmentsIntersect(firstFrom, firstTo, secondFrom, secondTo)) {
        crossings += 1;
      }
    }
  }

  return crossings * 1000 + totalLength * 0.12;
}

function segmentsIntersect(firstStart: Vec2, firstEnd: Vec2, secondStart: Vec2, secondEnd: Vec2) {
  const orientation = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const firstSideA = orientation(firstStart, firstEnd, secondStart);
  const firstSideB = orientation(firstStart, firstEnd, secondEnd);
  const secondSideA = orientation(secondStart, secondEnd, firstStart);
  const secondSideB = orientation(secondStart, secondEnd, firstEnd);
  return firstSideA * firstSideB < 0 && secondSideA * secondSideB < 0;
}

function addDelta(deltas: Record<string, Vec2>, id: string, x: number, y: number, lockedIds: Set<string>) {
  if (lockedIds.has(id) || !deltas[id]) {
    return;
  }
  deltas[id].x += x;
  deltas[id].y += y;
}

function getNormalizationSeparation(first?: ProjectNode, second?: ProjectNode, central?: string) {
  if (!first || !second) {
    return 10.5;
  }
  if (first.id === central || second.id === central || first.type === "central" || second.type === "central") {
    return 17.5;
  }
  if (first.type === "document" && second.type === "document") {
    return 6.2;
  }
  if (first.type === "document" || second.type === "document") {
    return 8.8;
  }
  return 12.8;
}

function findDocumentDropTargetAtScreen(
  documentNode: ProjectNode,
  nodes: ProjectNode[],
  screenPositions: Record<string, Vec2>,
  pointer: Vec2,
  centralNodeId: string,
  visualScale: number,
) {
  let best: { node: ProjectNode; distance: number } | undefined;
  nodes.forEach((node) => {
    if (node.id === documentNode.id || node.type === "document" || node.type === "central") {
      return;
    }

    const position = screenPositions[node.id];
    if (!position) {
      return;
    }

    const distancePx = Math.hypot(pointer.x - position.x, pointer.y - position.y);
    const hitRadiusPx = getNodeAbsorbRadius(node, centralNodeId) * visualScale;
    if (distancePx <= hitRadiusPx && (!best || distancePx < best.distance)) {
      best = { node, distance: distancePx };
    }
  });

  return best?.node;
}

function canDrillIntoNode(node: ProjectNode, currentLevel: MapLevel) {
  return node.type !== "document" && node.type !== "central" && node.childrenLevelId !== currentLevel.id;
}

function getNodeAbsorbRadius(node: ProjectNode, centralNodeId: string) {
  if (node.type === "central") return 0;
  if (node.id === centralNodeId) return 62;
  if (node.type === "section" || node.type === "ird") return 50;
  if (node.type === "subsection" || node.type === "package") return 44;
  return Math.max(34, getNodeRadius(node, centralNodeId) - 12);
}

function isPointerInsideElement(clientX: number, clientY: number, element: HTMLElement | null) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function getDocumentFlowDirection(process: BusinessProcess, document?: ProcessDocument) {
  if (document?.status === "comments" || process.status === "rejected") {
    return "backward";
  }

  return process.direction;
}

function getDocumentFlowColor(process: BusinessProcess, document?: ProcessDocument) {
  if (!document) {
    return getProcessStatusColor(process.status);
  }

  if (document.status === "approved") return "#2ed8a3";
  if (document.status === "comments") return "#ff657a";
  if (document.status === "review") return "#35d9ff";
  if (document.status === "draft") return "#8b93a6";
  return getProcessStatusColor(process.status);
}

function getShortDocumentLabel(document: ProcessDocument) {
  const cleanTitle = document.title.replace(/\.[a-z0-9]+$/i, "");
  return `${getFileLabel(document.fileType)} · ${cleanTitle.slice(0, 18)}`;
}

function buildProcessGeometry(from: Vec2, to: Vec2, radiusFrom: number, radiusTo: number, offsetIndex: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 0.001);
  const ux = dx / distance;
  const uy = dy / distance;
  const start = { x: from.x + ux * radiusFrom, y: from.y + uy * radiusFrom };
  const end = { x: to.x - ux * radiusTo, y: to.y - uy * radiusTo };
  const normal = { x: -uy, y: ux };
  const bend = offsetIndex * 94;
  const mid = {
    x: (start.x + end.x) / 2 + normal.x * bend,
    y: (start.y + end.y) / 2 + normal.y * bend,
  };

  return {
    path: `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`,
    label: {
      x: (start.x + end.x) / 2 + normal.x * bend * 0.62,
      y: (start.y + end.y) / 2 + normal.y * bend * 0.62,
    },
  };
}

function worldToScreen(position: Vec2, size: { width: number; height: number }, view: ViewState): Vec2 {
  const scale = getBaseScale(size) * view.zoom;
  return {
    x: size.width / 2 + view.panX + position.x * scale,
    y: size.height / 2 + view.panY + position.y * scale,
  };
}

function clientToWorld(clientX: number, clientY: number, rect: DOMRect, view: ViewState): Vec2 {
  const scale = getBaseScale({ width: rect.width, height: rect.height }) * view.zoom;
  return {
    x: (clientX - rect.left - rect.width / 2 - view.panX) / scale,
    y: (clientY - rect.top - rect.height / 2 - view.panY) / scale,
  };
}

function screenToWorld(position: Vec2, size: { width: number; height: number }, view: ViewState): Vec2 {
  const scale = getBaseScale(size) * view.zoom;
  return {
    x: (position.x - size.width / 2 - view.panX) / scale,
    y: (position.y - size.height / 2 - view.panY) / scale,
  };
}

function resolveNodeScreenCollisions(
  source: Record<string, Vec2>,
  nodes: ProjectNode[],
  centralNodeId: string,
  visualScale: number,
  draggingNodeId: string | null,
) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const ids = Object.keys(source).filter((id) => nodeMap.has(id));
  const result = Object.fromEntries(ids.map((id) => [id, { ...source[id] }])) as Record<string, Vec2>;
  const fixedIds = new Set(
    nodes
      .filter((node) => node.id === centralNodeId || node.type === "central" || node.positionLocked || node.id === draggingNodeId)
      .map((node) => node.id),
  );

  for (let iteration = 0; iteration < 42; iteration += 1) {
    const deltas = Object.fromEntries(ids.map((id) => [id, { x: 0, y: 0 }])) as Record<string, Vec2>;

    for (let firstIndex = 0; firstIndex < ids.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < ids.length; secondIndex += 1) {
        const firstId = ids[firstIndex];
        const secondId = ids[secondIndex];
        const first = result[firstId];
        const second = result[secondId];
        const firstNode = nodeMap.get(firstId);
        const secondNode = nodeMap.get(secondId);
        if (!firstNode || !secondNode) {
          continue;
        }

        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.01) {
          const jitter = seededJitter(`${firstId}:${secondId}`);
          dx = jitter.x || 0.7;
          dy = jitter.y || 0.4;
          distance = Math.hypot(dx, dy);
        }

        const minimum = (getScreenCollisionRadius(firstNode, centralNodeId) + getScreenCollisionRadius(secondNode, centralNodeId)) * visualScale + 12;
        if (distance >= minimum) {
          continue;
        }

        const push = (minimum - distance) * 0.46;
        const ux = dx / distance;
        const uy = dy / distance;
        const firstFixed = fixedIds.has(firstId);
        const secondFixed = fixedIds.has(secondId);
        if (!firstFixed) {
          deltas[firstId].x -= ux * (secondFixed ? push : push / 2);
          deltas[firstId].y -= uy * (secondFixed ? push : push / 2);
        }
        if (!secondFixed) {
          deltas[secondId].x += ux * (firstFixed ? push : push / 2);
          deltas[secondId].y += uy * (firstFixed ? push : push / 2);
        }
      }
    }

    ids.forEach((id) => {
      if (fixedIds.has(id)) {
        result[id] = { ...source[id] };
        return;
      }
      const anchor = source[id];
      result[id].x += deltas[id].x + (anchor.x - result[id].x) * 0.018;
      result[id].y += deltas[id].y + (anchor.y - result[id].y) * 0.018;
    });
  }

  return result;
}

function getScreenCollisionRadius(node: ProjectNode, centralNodeId: string) {
  if (node.id === centralNodeId || node.type === "central") return 92;
  if (node.type === "document") return 45;
  if (node.type === "subsection" || node.type === "package") return 62;
  return 70;
}

function buildFittedView(positions: Record<string, Vec2>, size: { width: number; height: number }, interfaceScale = 1): ViewState {
  const points = Object.values(positions).filter(isFinitePosition);
  if (!points.length || !size.width || !size.height) {
    return INITIAL_VIEW;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const desktop = size.width >= 1120;
  const safeArea = desktop
    ? {
        left: Math.round(352 * interfaceScale),
        right: Math.round(376 * interfaceScale),
        top: Math.round(128 * interfaceScale),
        bottom: Math.round(118 * interfaceScale),
      }
    : { left: 28, right: 28, top: 126, bottom: 112 };
  const safeWidth = Math.max(260, size.width - safeArea.left - safeArea.right);
  const safeHeight = Math.max(240, size.height - safeArea.top - safeArea.bottom);
  const baseScale = getBaseScale(size);
  const worldWidth = Math.max(10, maxX - minX);
  const worldHeight = Math.max(8, maxY - minY);
  const zoom = clamp(
    Math.min((safeWidth - 150) / (worldWidth * baseScale), (safeHeight - 150) / (worldHeight * baseScale)),
    MIN_ZOOM,
    1.28,
  );
  const worldCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const screenCenter = {
    x: safeArea.left + safeWidth / 2,
    y: safeArea.top + safeHeight / 2,
  };

  return {
    zoom,
    panX: screenCenter.x - size.width / 2 - worldCenter.x * baseScale * zoom,
    panY: screenCenter.y - size.height / 2 - worldCenter.y * baseScale * zoom,
  };
}

function getNodeVisualScale(zoom: number) {
  if (zoom <= 0.5) {
    return 0.68;
  }
  if (zoom < 1) {
    return 0.68 + (zoom - 0.5) * 0.64;
  }
  return Math.min(1.12, 1 + (zoom - 1) * 0.045);
}

function getBaseScale(size: { width: number; height: number }) {
  return Math.max(12, Math.min(size.width / 54, size.height / 34));
}

function getNodeRadius(node: ProjectNode, centralNodeId?: string) {
  if (node.id === centralNodeId || node.type === "central") return 82;
  if (node.type === "document") return 39;
  if (node.type === "section" || node.type === "ird") return 62;
  if (node.type === "package") return 54;
  return 56;
}

function getNodeDisplayLabel(node: ProjectNode, isCenter: boolean, progress?: number) {
  if (isCenter) {
    return {
      primary: node.title,
      secondary: `${progress ?? 0}%`,
    };
  }

  const code = node.shortCode?.trim();
  const isPlaceholderCode = Boolean(code && /^(б|b)\d+$/i.test(code));

  if (isPlaceholderCode) {
    return {
      primary: node.title,
      secondary: code,
    };
  }

  return {
    primary: code || node.title,
    secondary: node.title,
  };
}

function seededJitter(seed: string): Vec2 {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const first = ((hash >>> 0) % 1000) / 1000;
  hash = Math.imul(hash ^ 0x9e3779b9, 16777619);
  const second = ((hash >>> 0) % 1000) / 1000;
  return { x: first * 2 - 1, y: second * 2 - 1 };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isFinitePosition(position?: Vec2): position is Vec2 {
  return Boolean(position && Number.isFinite(position.x) && Number.isFinite(position.y));
}
