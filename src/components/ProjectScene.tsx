import clsx from "clsx";
import {
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronUp, Plus } from "lucide-react";
import {
  getNodeVisualTone,
  getProcessStatusColor,
  getProcessStatusText,
  getProjectProgress,
} from "../lib/graph";
import type { BusinessProcess, DemoProject, MapLevel, ProjectNode, Vec2 } from "../types";

export type SceneHandle = {
  reset: () => void;
  normalize: () => void;
  focusNode: (id: string) => void;
  focusSelected: () => void;
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
  onSelectNode: (nodeId: string) => void;
  onOpenNodeLevel: (node: ProjectNode) => void;
  onBackLevel: () => void;
  onSelectProcess: (processId: string) => void;
  onStartLink: (nodeId: string) => void;
  onCompleteLink: (nodeId: string) => void;
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
  startPosition: Vec2;
  moved: boolean;
};

const INITIAL_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 };
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
  onSelectNode,
  onOpenNodeLevel,
  onBackLevel,
  onSelectProcess,
  onStartLink,
  onCompleteLink,
  sceneRef,
}: ProjectSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [positions, setPositions] = useState<Record<string, Vec2>>(() => buildInitialPositions(nodes, level.id, level.centralNodeId));
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const centerNodeId = level.centralNodeId;
  const projectProgress = getProjectProgress(project, level);
  const scale = getBaseScale(size) * view.zoom;

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
    setPositions((current) => {
      const next = { ...current };
      const ids = new Set(nodes.map((node) => node.id));
      let changed = false;

      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      const fallback = buildInitialPositions(nodes, level.id, centerNodeId);
      nodes.forEach((node) => {
        if (!next[node.id]) {
          next[node.id] = fallback[node.id] ?? { x: 0, y: 0 };
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [centerNodeId, level.id, nodes]);

  const screenPositions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(positions).map(([id, position]) => [id, worldToScreen(position, size, view)]),
    ) as Record<string, Vec2>;
  }, [positions, size, view]);

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
        setPositions(buildInitialPositions(nodes, level.id, centerNodeId));
        setView(INITIAL_VIEW);
      },
      normalize: () => {
        setPositions(buildNormalizedPositions(nodes, processes, level.id, centerNodeId));
      },
      focusNode,
      focusSelected: () => focusNode(selectedNodeId),
    };
  }, [centerNodeId, focusNode, level.id, nodes, processes, sceneRef, selectedNodeId]);

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
    if (event.button !== 0 || (event.target as HTMLElement).closest(".map-node, .process-hit, .node-plus")) {
      return;
    }

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
    if (node.id === centerNodeId || node.type === "central") {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const position = positions[node.id];
    if (!rect || !position) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      nodeId: node.id,
      pointerId: event.pointerId,
      startPointer: clientToWorld(event.clientX, event.clientY, rect, view),
      startPosition: position,
      moved: false,
    };
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
    setPositions((current) => ({ ...current, [node.id]: next }));
  };

  const handleNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
    const drag = dragRef.current;
    if (!drag || drag.nodeId !== node.id || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;

    if (!drag.moved) {
      if (linkingFromId && linkingFromId !== node.id) {
        onCompleteLink(node.id);
      } else {
        onSelectNode(node.id);
      }
    }
  };

  return (
    <main
      ref={containerRef}
      className={clsx("scene-panel", linkingFromId && "is-linking")}
      onWheel={handleWheel}
      onPointerDown={handleScenePointerDown}
      onPointerMove={handleScenePointerMove}
      onPointerUp={handleScenePointerUp}
    >
      <div className="level-chip glass-panel">
        <div>
          <span>{project.title}</span>
          <strong>{level.title}</strong>
          <small>{level.subtitle}</small>
        </div>
        {level.parentLevelId ? (
          <button onClick={onBackLevel}>
            <ChevronUp size={17} />
            Уровень выше
          </button>
        ) : null}
      </div>

      {linkingFromId ? (
        <div className="linking-hint glass-panel">
          Выберите вторую ноду для контейнера связи
        </div>
      ) : null}

      <svg className="process-layer" aria-hidden="true">
        <defs>
          <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="rgba(242,247,255,0.88)" />
          </marker>
          <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto" markerUnits="strokeWidth">
            <path d="M 9 1 L 0 5 L 9 9 z" fill="rgba(242,247,255,0.88)" />
          </marker>
        </defs>
        {processes.map((process) => (
          <ProcessPath
            key={process.id}
            process={process}
            from={screenPositions[process.from]}
            to={screenPositions[process.to]}
            fromNode={nodeMap.get(process.from)}
            toNode={nodeMap.get(process.to)}
            centralNodeId={centerNodeId}
            selected={selectedProcessId === process.id}
            matched={matchedProcessIds.has(process.id)}
            dimmed={isSearching && !matchedProcessIds.has(process.id) && !matchedNodeIds.has(process.from) && !matchedNodeIds.has(process.to)}
            onSelect={() => onSelectProcess(process.id)}
          />
        ))}
      </svg>

      {nodes.map((node) => {
        const position = screenPositions[node.id];
        if (!position) {
          return null;
        }

        const isCenter = node.id === centerNodeId;
        const tone = getNodeVisualTone(isCenter ? { ...node, type: "central" } : node);
        const selected = selectedNodeId === node.id;
        const matched = matchedNodeIds.has(node.id);
        const dimmed = isSearching && !matched;
        const canDrill = Boolean(node.childrenLevelId && node.childrenLevelId !== level.id);
        const progress = isCenter ? projectProgress : undefined;
        const isLinkSource = linkingFromId === node.id;
        const canCompleteLink = linkingFromId && linkingFromId !== node.id;

        return (
          <button
            key={node.id}
            className={clsx(
              "map-node",
              `node-${isCenter ? "central" : node.type}`,
              selected && "selected",
              matched && "matched",
              dimmed && "dimmed",
              canDrill && "can-drill",
              isLinkSource && "link-source",
              canCompleteLink && "link-target",
            )}
            style={{
              left: position.x,
              top: position.y,
              "--node-fill": tone.fill,
              "--node-glow": tone.glow,
            } as React.CSSProperties}
            onPointerDown={(event) => handleNodePointerDown(event, node)}
            onPointerMove={(event) => handleNodePointerMove(event, node)}
            onPointerUp={(event) => handleNodePointerUp(event, node)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (canDrill) {
                onOpenNodeLevel(node);
              }
            }}
            title={canDrill ? "Двойной клик: провалиться внутрь" : tone.label}
          >
            <span className="node-orb">
              {isCenter ? <i style={{ height: `${progress}%` }} /> : null}
            </span>
            <span className="node-label">
              <strong>{isCenter ? node.title : node.shortCode ?? node.title}</strong>
              <em>{isCenter ? `${progress}%` : node.title}</em>
            </span>
            {node.type !== "central" ? (
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
    </main>
  );
}

function ProcessPath({
  process,
  from,
  to,
  fromNode,
  toNode,
  centralNodeId,
  selected,
  matched,
  dimmed,
  onSelect,
}: {
  process: BusinessProcess;
  from?: Vec2;
  to?: Vec2;
  fromNode?: ProjectNode;
  toNode?: ProjectNode;
  centralNodeId: string;
  selected: boolean;
  matched: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  if (!from || !to || !fromNode || !toNode) {
    return null;
  }

  const radiusFrom = getNodeRadius(fromNode, centralNodeId);
  const radiusTo = getNodeRadius(toNode, centralNodeId);
  const path = buildProcessPath(from, to, radiusFrom, radiusTo, process.parallelIndex ?? 0);
  const color = getProcessStatusColor(process.status);
  const inactive = process.status === "accepted" || process.status === "in_work";

  return (
    <g className={clsx("process-group", selected && "selected", matched && "matched", dimmed && "dimmed", inactive && "inactive")}>
      <path className="process-glow" d={path} style={{ stroke: color }} />
      <path
        className="process-line"
        d={path}
        style={{ stroke: color }}
        markerEnd={process.direction === "forward" || process.direction === "both" ? "url(#arrow-end)" : undefined}
        markerStart={process.direction === "backward" || process.direction === "both" ? "url(#arrow-start)" : undefined}
      />
      <path className="process-hit" d={path} onClick={onSelect} />
      <foreignObject x={(from.x + to.x) / 2 - 92} y={(from.y + to.y) / 2 - 18} width="184" height="36">
        <button className="process-label" onClick={onSelect} title={process.description}>
          <span style={{ background: color }} />
          {getProcessStatusText(process.status)}
        </button>
      </foreignObject>
    </g>
  );
}

function buildInitialPositions(nodes: ProjectNode[], levelId: string, centralNodeId: string) {
  const positions: Record<string, Vec2> = {};
  const central = nodes.find((node) => node.id === centralNodeId) ?? nodes.find((node) => node.type === "central");
  if (central) {
    positions[central.id] = { x: 0, y: 0 };
  }

  const orbitNodes = nodes.filter((node) => node.id !== central?.id);
  const wide = levelId.includes("root");
  const radiusX = wide ? 18.5 : 14.5;
  const radiusY = wide ? 11.5 : 9.2;

  orbitNodes.forEach((node, index) => {
    const angle = index * ((Math.PI * 2) / Math.max(orbitNodes.length, 1)) - Math.PI / 2.35;
    const jitter = seededJitter(node.id);
    const uneven = 0.86 + ((index % 3) * 0.12);
    positions[node.id] = {
      x: Math.cos(angle) * radiusX * uneven + jitter.x * (wide ? 2.8 : 1.7),
      y: Math.sin(angle) * radiusY * uneven + jitter.y * (wide ? 2.1 : 1.3),
    };
  });

  return positions;
}

function buildNormalizedPositions(nodes: ProjectNode[], processes: BusinessProcess[], levelId: string, centralNodeId: string) {
  const positions = buildInitialPositions(nodes, levelId, centralNodeId);
  const ids = nodes.map((node) => node.id);
  const vectors = Object.fromEntries(ids.map((id) => [id, { ...(positions[id] ?? { x: 0, y: 0 }) }])) as Record<string, Vec2>;
  const central = nodes.some((node) => node.id === centralNodeId) ? centralNodeId : nodes.find((node) => node.type === "central")?.id;

  for (let iteration = 0; iteration < 44; iteration += 1) {
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
      const target = process.status === "accepted" ? 12.4 : 10.2;
      const force = (distance - target) * 0.018;
      const ux = dx / distance;
      const uy = dy / distance;
      addDelta(deltas, process.from, ux * force, uy * force, central);
      addDelta(deltas, process.to, -ux * force, -uy * force, central);
    });

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const first = vectors[ids[i]];
        const second = vectors[ids[j]];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.max(Math.hypot(dx, dy), 0.001);
        const min = ids[i] === central || ids[j] === central ? 8.8 : 5.4;
        if (distance >= min) {
          continue;
        }
        const force = (min - distance) * 0.035;
        const ux = dx / distance;
        const uy = dy / distance;
        addDelta(deltas, ids[i], -ux * force, -uy * force, central);
        addDelta(deltas, ids[j], ux * force, uy * force, central);
      }
    }

    ids.forEach((id) => {
      if (id === central) {
        vectors[id] = { x: 0, y: 0 };
        return;
      }
      vectors[id].x = clamp(vectors[id].x + deltas[id].x, -42, 42);
      vectors[id].y = clamp(vectors[id].y + deltas[id].y, -26, 26);
    });
  }

  return vectors;
}

function addDelta(deltas: Record<string, Vec2>, id: string, x: number, y: number, central?: string) {
  if (id === central || !deltas[id]) {
    return;
  }
  deltas[id].x += x;
  deltas[id].y += y;
}

function buildProcessPath(from: Vec2, to: Vec2, radiusFrom: number, radiusTo: number, offsetIndex: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 0.001);
  const ux = dx / distance;
  const uy = dy / distance;
  const start = { x: from.x + ux * radiusFrom, y: from.y + uy * radiusFrom };
  const end = { x: to.x - ux * radiusTo, y: to.y - uy * radiusTo };
  const normal = { x: -uy, y: ux };
  const bend = offsetIndex * 56;
  const mid = {
    x: (start.x + end.x) / 2 + normal.x * bend,
    y: (start.y + end.y) / 2 + normal.y * bend,
  };

  return `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`;
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

function getBaseScale(size: { width: number; height: number }) {
  return Math.max(12, Math.min(size.width / 54, size.height / 34));
}

function getNodeRadius(node: ProjectNode, centralNodeId?: string) {
  if (node.id === centralNodeId || node.type === "central") return 82;
  if (node.type === "section" || node.type === "ird") return 62;
  if (node.type === "package") return 54;
  return 56;
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
