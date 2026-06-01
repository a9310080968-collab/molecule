import clsx from "clsx";
import {
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { project } from "../data/mockProject";
import {
  buildInitialPositions,
  getEffectiveParentId,
  getFileLabel,
  getFileTypeColor,
  getLinkId,
  getNodeById,
  getProjectProgress,
  type ParentMap,
} from "../lib/graph";
import type { DropPlacement, ProjectLink, ProjectNode, StatusColors, Vec3 } from "../types";

export type SceneHandle = {
  reset: () => void;
  normalize: () => void;
  focusSelected: () => void;
  focusNode: (id: string) => void;
  getPositions: () => Record<string, Vec3>;
  setPositions: (positions: Record<string, Vec3>) => void;
};

type ProjectSceneProps = {
  selectedId: string;
  selectedIds: Set<string>;
  nodes: ProjectNode[];
  dropPlacements: Record<string, DropPlacement>;
  statusColors: StatusColors;
  onSelect: (id: string, additive?: boolean) => void;
  selectedLinkId: string | null;
  onSelectLink: (id: string) => void;
  links: ProjectLink[];
  linkingFromId: string | null;
  onCreateAutoLinks: (links: ProjectLink[]) => void;
  onBreakAutoLinks: (ids: string[]) => void;
  onAbsorbDocument: (documentId: string, sectionId: string) => void;
  onCompleteManualLink: (targetId: string) => void;
  onHistoryCheckpoint: () => void;
  onOpenDocument: (node: ProjectNode) => void;
  matches: Set<string>;
  linkMatches: Set<string>;
  isSearching: boolean;
  parentMap: ParentMap;
  onParentMapChange: (map: ParentMap) => void;
  autoRotate: boolean;
  sceneRef: MutableRefObject<SceneHandle | null>;
};

type Point = {
  x: number;
  y: number;
};

type ViewState = {
  zoom: number;
  panX: number;
  panY: number;
};

type DragState = {
  id: string;
  groupIds: string[];
  startPointer: Point;
  startPositions: Record<string, Vec3>;
  lastPosition: Point;
  lastTime: number;
  velocity: Point;
  moved: boolean;
  wasAttached: boolean;
  attachTargetId: string | null;
};

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
};

const MAP_LIMIT = { x: 38, y: 23 };
const INITIAL_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 };
const MIN_ZOOM = 0.24;
const MAX_ZOOM = 5.8;
const INERTIA_MIN_SPEED = 0.035;
const INERTIA_MAX_SPEED = 8.2;
const INERTIA_DAMPING = 5.4;
const DOCUMENT_COLLISION_GAP = 1.22;
const SECTION_ABSORPTION_RANGE = 1.82;
const SECTION_APPROVED_COLOR = "#a970ff";
const SECTION_LOCKED_COLOR = "#8b93a6";
const CENTRAL_LOCKED_COLOR = "#8992a5";
const CENTRAL_LIQUID_COLOR = "#38d8ff";

export function ProjectScene(props: ProjectSceneProps) {
  const {
    selectedId,
    selectedIds,
    nodes,
    dropPlacements,
    statusColors,
    onSelect,
    selectedLinkId,
    onSelectLink,
    links,
    linkingFromId,
    onCreateAutoLinks,
    onBreakAutoLinks,
    onAbsorbDocument,
    onCompleteManualLink,
    onHistoryCheckpoint,
    onOpenDocument,
    matches,
    linkMatches,
    isSearching,
    parentMap,
    onParentMapChange,
    autoRotate,
    sceneRef,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const inertiaRef = useRef<Record<string, Point>>({});
  const animationRef = useRef<number | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [positions, setPositions] = useState<Record<string, Vec3>>(() => buildInitialMapPositions(nodes));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<Set<string>>(() => new Set());
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null);
  const projectProgress = useMemo(() => getProjectProgress(nodes, parentMap), [nodes, parentMap]);
  const scale = getBaseScale(size) * view.zoom;

  useEffect(() => {
    if (!size.width || !size.height) {
      return;
    }

    setPositions((current) =>
      resolveDocumentCollisions(current, nodes, {
        iterations: 10,
        parentMap,
        scale,
      }),
    );
  }, [nodes, parentMap, size.width, size.height]);

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
    setPositions((previous) => {
      let changed = false;
      const nextPositions = { ...previous };
      const existingIds = new Set(nodes.map((node) => node.id));

      Object.keys(nextPositions).forEach((id) => {
        if (!existingIds.has(id)) {
          delete nextPositions[id];
          changed = true;
        }
      });

      nodes.forEach((node, index) => {
        if (nextPositions[node.id]) {
          return;
        }

        const placement = dropPlacements[node.id];
        nextPositions[node.id] = placement && containerRef.current
          ? getDropWorldPosition(placement, containerRef.current.getBoundingClientRect(), view)
          : getFallbackNodePosition(index, nodes.length);
        changed = true;
      });

      return changed ? resolveDocumentCollisions(nextPositions, nodes, { iterations: 8 }) : previous;
    });
  }, [dropPlacements, nodes, view]);

  const focusNode = useCallback((id: string) => {
    const position = positions[id];
    if (!position || !size.width || !size.height) {
      return;
    }

    const baseScale = getBaseScale(size);
    setView((current) => ({
      ...current,
      panX: -position[0] * baseScale * current.zoom,
      panY: position[1] * baseScale * current.zoom,
    }));
  }, [positions, size]);

  useEffect(() => {
    sceneRef.current = {
      reset: () => {
        inertiaRef.current = {};
        setPositions(buildInitialMapPositions(nodes));
        setView(INITIAL_VIEW);
        setAttachTargetId(null);
        onParentMapChange({});
      },
      normalize: () => {
        inertiaRef.current = {};
        setPositions((current) => resolveDocumentCollisions(buildNormalizedPositions2D(nodes, links, current), nodes, { iterations: 16 }));
        setAttachTargetId(null);
      },
      focusSelected: () => focusNode(selectedId),
      focusNode,
      getPositions: () => positions,
      setPositions: (nextPositions) => {
        inertiaRef.current = {};
        setPositions(nextPositions);
      },
    };
  }, [focusNode, links, nodes, onParentMapChange, positions, sceneRef, selectedId]);

  useEffect(() => {
    const activeIds = new Set([...Object.keys(inertiaRef.current), ...draggingIds]);
    const brokenIds = findBrokenLinks(positions, nodes, links, activeIds);
    if (brokenIds.length) {
      onBreakAutoLinks(brokenIds);
    }
  }, [draggingIds, links, nodes, onBreakAutoLinks, positions]);

  useEffect(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    let lastTime = performance.now();
    const tick = (now: number) => {
      const ids = Object.keys(inertiaRef.current);
      if (!ids.length) {
        animationRef.current = null;
        return;
      }

      const delta = Math.min((now - lastTime) / 1000, 0.034);
      lastTime = now;
      setPositions((current) => {
        let changed = false;
        const nextPositions = { ...current };

        ids.forEach((id) => {
          if (draggingIds.has(id)) {
            return;
          }

          const velocity = inertiaRef.current[id];
          const position = nextPositions[id];
          if (!velocity || !position) {
            delete inertiaRef.current[id];
            return;
          }

          const next = constrainPoint({
            x: position[0] + velocity.x * delta,
            y: position[1] + velocity.y * delta,
          });
          nextPositions[id] = [next.x, next.y, position[2] ?? 0];
          velocity.x *= Math.exp(-INERTIA_DAMPING * delta);
          velocity.y *= Math.exp(-INERTIA_DAMPING * delta);

          if (Math.hypot(velocity.x, velocity.y) < INERTIA_MIN_SPEED) {
            delete inertiaRef.current[id];
          }

          changed = true;
        });

        return changed ? resolveDocumentCollisions(nextPositions, nodes, {
          activeIds: new Set(ids),
          iterations: 3,
          parentMap,
          scale,
        }) : current;
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    if (Object.keys(inertiaRef.current).length) {
      animationRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draggingIds, nodes, parentMap, scale]);

  const screenPositions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(positions).map(([id, position]) => [id, worldToScreen(position, size, view)]),
    ) as Record<string, Point>;
  }, [positions, size, view]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const updateDragTarget = useCallback(
    (node: ProjectNode, nextPosition: Point, nextPositions: Record<string, Vec3>) => {
      const targetIds = findNearbyAttachTargets(node, nextPosition, nextPositions, nodes, parentMap, links);
      const nextTargetId = targetIds[0] ?? null;
      setAttachTargetId(nextTargetId);
      if (dragRef.current?.id === node.id) {
        dragRef.current.attachTargetId = nextTargetId;
      }
      return nextTargetId;
    },
    [links, nodes, parentMap],
  );

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const before = clientToWorld(event.clientX, event.clientY, rect, view);
    const zoomFactor = event.deltaY < 0 ? 1.14 : 0.88;
    const nextZoom = clamp(view.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
    const baseScale = getBaseScale({ width: rect.width, height: rect.height });

    setView({
      zoom: nextZoom,
      panX: event.clientX - rect.left - rect.width / 2 - before.x * baseScale * nextZoom,
      panY: event.clientY - rect.top - rect.height / 2 + before.y * baseScale * nextZoom,
    });
  };

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(".map-node, .map-link-hit")) {
      return;
    }

    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: view.panX,
      panY: view.panY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) {
      return;
    }

    setView((current) => ({
      ...current,
      panX: pan.panX + event.clientX - pan.startX,
      panY: pan.panY + event.clientY - pan.startY,
    }));
  };

  const handleViewportPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null;
    }
  };

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
      if (node.type === "central") {
        return;
      }

      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onHistoryCheckpoint();
      delete inertiaRef.current[node.id];

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !positions[node.id]) {
        return;
      }

      const selectedGroupIds = selectedIds.has(node.id) && selectedIds.size > 1
        ? Array.from(selectedIds).filter((id) => nodeById.get(id)?.type !== "central" && positions[id])
        : [node.id];
      const startPositions = Object.fromEntries(
        selectedGroupIds.map((id) => [id, positions[id]]),
      ) as Record<string, Vec3>;
      const startPointer = clientToWorld(event.clientX, event.clientY, rect, view);
      const startPosition = vecToPoint(positions[node.id]);

      dragRef.current = {
        id: node.id,
        groupIds: selectedGroupIds,
        startPointer,
        startPositions,
        lastPosition: startPosition,
        lastTime: performance.now(),
        velocity: { x: 0, y: 0 },
        moved: false,
        wasAttached: hasNonCentralLink(node.id, links),
        attachTargetId: null,
      };
      setDraggingIds(new Set(selectedGroupIds));
    },
    [links, nodeById, onHistoryCheckpoint, positions, selectedIds, view],
  );

  const handleNodePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== node.id) {
        return;
      }

      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const pointer = clientToWorld(event.clientX, event.clientY, rect, view);
      const delta = {
        x: pointer.x - drag.startPointer.x,
        y: pointer.y - drag.startPointer.y,
      };
      drag.moved = true;

      setPositions((current) => {
        const nextPositions = { ...current };

        drag.groupIds.forEach((id) => {
          const start = drag.startPositions[id];
          if (!start) {
            return;
          }

          const nextPoint = constrainPoint({ x: start[0] + delta.x, y: start[1] + delta.y });
          nextPositions[id] = [nextPoint.x, nextPoint.y, start[2] ?? 0];
        });

        const collidedPositions = resolveDocumentCollisions(nextPositions, nodes, {
          activeIds: new Set(drag.groupIds),
          lockedIds: new Set(drag.groupIds),
          iterations: 3,
          parentMap,
          scale,
        });

        const currentPrimary = collidedPositions[node.id];
        if (currentPrimary) {
          const primaryPoint = vecToPoint(currentPrimary);
          updateDragVelocity(drag, primaryPoint);
          updateDragTarget(node, primaryPoint, collidedPositions);
        }

        return collidedPositions;
      });
    },
    [nodes, parentMap, scale, updateDragTarget, view],
  );

  const handleNodePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== node.id) {
        return;
      }

      event.stopPropagation();
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDraggingIds(new Set());
      setAttachTargetId(null);

      if (!drag.moved) {
        dragRef.current = null;
        if (linkingFromId && linkingFromId !== node.id) {
          onCompleteManualLink(node.id);
        } else {
          onSelect(node.id, event.shiftKey);
        }
        return;
      }

      if (node.type === "document") {
        const currentPosition = positions[node.id] ? vecToPoint(positions[node.id]) : drag.lastPosition;
        const absorptionSectionId = findSectionAbsorptionTarget(node, currentPosition, positions, nodes);
        if (absorptionSectionId) {
          onAbsorbDocument(node.id, absorptionSectionId);
          dragRef.current = null;
          onSelect(node.id, event.shiftKey);
          return;
        }

        const nearbyTargetIds = findNearbyAttachTargets(node, currentPosition, positions, nodes, parentMap, links);
        const primaryTargetId = drag.attachTargetId ?? nearbyTargetIds[0] ?? null;

        if (primaryTargetId) {
          onParentMapChange({
            ...parentMap,
            [node.id]: primaryTargetId,
          });

          if (drag.wasAttached) {
            const extraLinks = nearbyTargetIds
              .filter((id) => id !== primaryTargetId)
              .slice(0, 2)
              .map((targetId) => {
                const targetNode = getNodeById(targetId, nodes);
                return {
                  id: getLinkId(targetId, node.id),
                  from: targetId,
                  to: node.id,
                  strength: targetNode?.type === "document" ? ("tertiary" as const) : ("secondary" as const),
                  source: "auto" as const,
                };
              });

            onCreateAutoLinks(extraLinks);
          }
        } else {
          const parentId = getEffectiveParentId(node, parentMap);
          const parentNode = parentId ? getNodeById(parentId, nodes) : undefined;
          const parentPosition = parentId ? positions[parentId] : undefined;
          if (parentNode && parentNode.type !== "central" && parentPosition) {
            const distance = distancePoints(currentPosition, vecToPoint(parentPosition));
            if (distance > getLinkBreakDistance(parentNode) * 0.62) {
              onParentMapChange({
                ...parentMap,
                [node.id]: null,
              });
            }
          }
        }
      }

      const releaseVelocity = limitVelocity(drag.velocity, INERTIA_MAX_SPEED);
      if (Math.hypot(releaseVelocity.x, releaseVelocity.y) > 0.18) {
        drag.groupIds.forEach((id) => {
          inertiaRef.current[id] = { ...releaseVelocity };
        });
      }

      dragRef.current = null;
      onSelect(node.id, event.shiftKey);
    },
    [
      linkingFromId,
      links,
      nodes,
      onAbsorbDocument,
      onCompleteManualLink,
      onCreateAutoLinks,
      onParentMapChange,
      onSelect,
      parentMap,
      positions,
    ],
  );

  const handleNodeClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, node: ProjectNode) => {
      event.stopPropagation();
      if (linkingFromId) {
        return;
      }

      onSelect(node.id, event.shiftKey);
    },
    [linkingFromId, onSelect],
  );

  const renderLink = (link: ProjectLink, preview = false) => {
    const fromPosition = positions[link.from];
    const toPosition = positions[link.to];
    const fromScreen = screenPositions[link.from];
    const toScreen = screenPositions[link.to];
    const fromNode = nodeById.get(link.from);
    const toNode = nodeById.get(link.to);

    if (!fromPosition || !toPosition || !fromScreen || !toScreen || !fromNode || !toNode) {
      return null;
    }

    if ((fromNode.type === "document" && fromNode.absorbed) || (toNode.type === "document" && toNode.absorbed)) {
      return null;
    }

    const path = buildLinkPath({
      link,
      fromScreen,
      toScreen,
      fromRadius: getNodeRadiusPx(fromNode, parentMap, nodes, scale),
      toRadius: getNodeRadiusPx(toNode, parentMap, nodes, scale, fromNode.id),
      scale,
    });
    if (!path) {
      return null;
    }

    const worldDistance = distancePoints(vecToPoint(fromPosition), vecToPoint(toPosition));
    const breakDistance = link.source === "auto" && !link.pinned ? getLinkBreakDistance(fromNode) : undefined;
    const rubberFactor = breakDistance ? getRubberFactor(worldDistance, breakDistance) : 1;
    const selected = selectedLinkId === link.id;
    const highlighted = selected || preview || (isSearching && linkMatches.has(link.id));
    const dimmed = isSearching && !matches.has(link.from) && !matches.has(link.to) && !highlighted;
    const color = preview ? "#f5fbff" : getLinkColor(link, fromNode, toNode, statusColors);
    const width = getLinkWidth(link, selected, highlighted) * rubberFactor;

    return (
      <g key={preview ? `${link.id}-preview` : link.id} className={clsx(preview && "is-preview")}>
        {!preview ? (
          <path
            className="map-link-hit"
            d={path}
            stroke="transparent"
            strokeWidth={Math.max(22, width + 18)}
            fill="none"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSelectLink(link.id);
            }}
          />
        ) : null}
        <path
          className={clsx(
            "map-link-glow",
            selected && "selected",
            highlighted && "highlighted",
            dimmed && "dimmed",
            link.pinned && "pinned",
          )}
          d={path}
          stroke={color}
          strokeWidth={width + 7}
          strokeOpacity={preview ? 0.32 : selected ? 0.44 : 0.24 * rubberFactor}
          fill="none"
        />
        <path
          className={clsx(
            "map-link-line",
            selected && "selected",
            highlighted && "highlighted",
            dimmed && "dimmed",
            link.pinned && "pinned",
          )}
          d={path}
          stroke={color}
          strokeWidth={width}
          strokeOpacity={dimmed ? 0.2 : selected || highlighted ? 1 : 0.68 * rubberFactor}
          fill="none"
        />
      </g>
    );
  };

  const attachPreview = (() => {
    if (!attachTargetId || !dragRef.current) {
      return null;
    }

    const sourceNode = nodeById.get(attachTargetId);
    const targetNode = nodeById.get(dragRef.current.id);
    if (!sourceNode || !targetNode || targetNode.type !== "document") {
      return null;
    }

    return renderLink(
      {
        id: `preview-${attachTargetId}-${targetNode.id}`,
        from: attachTargetId,
        to: targetNode.id,
        strength: sourceNode.type === "document" ? "tertiary" : "secondary",
        source: "auto",
      },
      true,
    );
  })();

  const manualPreview = (() => {
    if (!linkingFromId || !hoveredId || linkingFromId === hoveredId) {
      return null;
    }

    return renderLink(
      {
        id: `manual-preview-${linkingFromId}-${hoveredId}`,
        from: linkingFromId,
        to: hoveredId,
        strength: "secondary",
        source: "manual",
        pinned: true,
      },
      true,
    );
  })();

  return (
    <div
      ref={containerRef}
      className={clsx("scene-wrap map2d-wrap", autoRotate && "is-scanning", draggingIds.size > 0 && "is-dragging")}
      onWheel={handleWheel}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onPointerCancel={handleViewportPointerUp}
    >
      <div className="map2d-stars" />
      <div className="map2d-grid" />
      <div className="map2d-clearance-layer" aria-hidden="true">
        {nodes.map((node) => {
          if (node.type === "document" || node.absorbed) {
            return null;
          }

          const position = screenPositions[node.id];
          if (!position) {
            return null;
          }

          const diameter = getNodeDiameterPx(node, parentMap, nodes, scale) * (draggingIds.has(node.id) ? 1.85 : 1.48);
          return (
            <i
              key={node.id}
              style={{
                left: position.x,
                top: position.y,
                width: diameter,
                height: diameter,
              }}
            />
          );
        })}
      </div>

      <svg className="map2d-links" width={size.width} height={size.height} aria-hidden="true">
        {links.map((link) => renderLink(link))}
        {attachPreview}
        {manualPreview}
      </svg>

      <div className="map2d-nodes">
        {nodes.map((node) => {
          if (node.type === "document" && node.absorbed) {
            return null;
          }

          const position = screenPositions[node.id];
          if (!position) {
            return null;
          }

          const parentId = getEffectiveParentId(node, parentMap);
          const parentNode = parentId ? nodeById.get(parentId) : undefined;
          const compact = node.type === "document" && parentNode?.type === "document";
          const insideSection = node.type === "document" && parentNode?.type === "section" && isInsideParent(node.id, parentNode.id, positions);
          const diameter = getNodeDiameterPx(node, parentMap, nodes, scale, parentId);
          const isMatched = matches.has(node.id);
          const highlighted =
            attachTargetId === node.id ||
            linkingFromId === node.id ||
            (isSearching && isMatched);

          return (
            <MapNode
              key={node.id}
              node={node}
              position={position}
              diameter={diameter}
              selected={selectedIds.has(node.id)}
              primarySelected={selectedId === node.id}
              hovered={hoveredId === node.id}
              highlighted={highlighted}
              dimmed={isSearching && !isMatched}
              dragging={draggingIds.has(node.id)}
              compact={compact}
              insideSection={insideSection}
              parentId={parentId}
              projectProgress={projectProgress}
              statusColors={statusColors}
              linkingActive={Boolean(linkingFromId)}
              onHover={setHoveredId}
              onPointerDown={handleNodePointerDown}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerUp}
              onClick={handleNodeClick}
              onOpenDocument={onOpenDocument}
            />
          );
        })}
      </div>

      <div className="map2d-corner glass-panel">
        <span>2D-карта документации</span>
        <b>{projectProgress}%</b>
      </div>
      <div className="map2d-zoom glass-panel">{Math.round(view.zoom * 100)}%</div>
      <div className="scene-vignette" />
    </div>
  );
}

type MapNodeProps = {
  node: ProjectNode;
  position: Point;
  diameter: number;
  selected: boolean;
  primarySelected: boolean;
  hovered: boolean;
  highlighted: boolean;
  dimmed: boolean;
  dragging: boolean;
  compact: boolean;
  insideSection: boolean;
  parentId?: string;
  projectProgress: number;
  statusColors: StatusColors;
  linkingActive: boolean;
  onHover: (id: string | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectNode) => void;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>, node: ProjectNode) => void;
  onOpenDocument: (node: ProjectNode) => void;
};

const MapNode = memo(function MapNode({
  node,
  position,
  diameter,
  selected,
  primarySelected,
  hovered,
  highlighted,
  dimmed,
  dragging,
  compact,
  insideSection,
  projectProgress,
  statusColors,
  linkingActive,
  onHover,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
  onOpenDocument,
}: MapNodeProps) {
  const status = node.status ?? "draft";
  const isCentral = node.type === "central";
  const isSection = node.type === "section";
  const isDocument = node.type === "document";
  const baseColor = isCentral
    ? CENTRAL_LOCKED_COLOR
    : isSection
      ? status === "approved"
        ? SECTION_APPROVED_COLOR
        : SECTION_LOCKED_COLOR
      : getFileTypeColor(node.fileType);
  const haloColor = isSection && status !== "approved" ? statusColors[status] : baseColor;

  return (
    <button
      type="button"
      className={clsx(
        "map-node",
        node.type,
        selected && "selected",
        primarySelected && "primary-selected",
        hovered && "hovered",
        highlighted && "highlighted",
        dimmed && "dimmed",
        dragging && "dragging",
        compact && "compact",
        insideSection && "inside-section",
        node.isNew && "new-node",
        linkingActive && "linking-active",
      )}
      style={{
        left: position.x,
        top: position.y,
        width: diameter,
        height: diameter,
        ["--node-color" as string]: baseColor,
        ["--halo-color" as string]: haloColor,
        ["--fill" as string]: `${projectProgress}%`,
      }}
      onPointerEnter={() => onHover(node.id)}
      onPointerLeave={() => onHover(null)}
      onPointerDown={(event) => onPointerDown(event, node)}
      onPointerMove={(event) => onPointerMove(event, node)}
      onPointerUp={(event) => onPointerUp(event, node)}
      onPointerCancel={(event) => onPointerUp(event, node)}
      onClick={(event) => onClick(event, node)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (isDocument) {
          onOpenDocument(node);
        }
      }}
      aria-label={node.title}
    >
      {isCentral ? <span className="central-liquid" /> : null}
      <span className="node-sheen" />
      <span className="map-node-content">
        {isCentral ? (
          <>
            <strong>{node.title}</strong>
            <span>Готовность документации</span>
            <b>{projectProgress}%</b>
            <em>{node.updatedAt}</em>
          </>
        ) : isSection ? (
          <>
            <strong>{node.shortCode ?? buildShortCode(node.title)}</strong>
            <span>{node.title}</span>
          </>
        ) : (
          <>
            <strong>{shortenTitle(node.title)}</strong>
            <span>{getFileLabel(node.fileType)}</span>
          </>
        )}
      </span>
    </button>
  );
});

function buildInitialMapPositions(nodes: ProjectNode[]): Record<string, Vec3> {
  const base = buildInitialPositions();
  const spread = 2.45;
  const positions = Object.fromEntries(
    Object.entries(base).map(([id, position], index) => {
      if (id === project.id) {
        return [id, [0, 0, 0]];
      }

      const jitter = seededJitter(id);
      const point = constrainPoint({
        x: (position[0] * 1.58 + position[1] * 0.18 + jitter.x * 0.92) * spread,
        y: (position[1] * 0.96 + jitter.y * 0.68 + ((index % 3) - 1) * 0.18) * spread,
      });

      return [id, [point.x, point.y, 0]];
    }),
  ) as Record<string, Vec3>;

  return resolveDocumentCollisions(positions, nodes, { iterations: 26 });
}

function getBaseScale(size: { width: number; height: number }) {
  if (!size.width || !size.height) {
    return 72;
  }

  return Math.min(size.width / 24, size.height / 20);
}

function worldToScreen(position: Vec3, size: { width: number; height: number }, view: ViewState): Point {
  const scale = getBaseScale(size) * view.zoom;
  return {
    x: size.width / 2 + view.panX + position[0] * scale,
    y: size.height / 2 + view.panY - position[1] * scale,
  };
}

function clientToWorld(clientX: number, clientY: number, rect: DOMRect, view: ViewState): Point {
  const scale = getBaseScale({ width: rect.width, height: rect.height }) * view.zoom;
  return {
    x: (clientX - rect.left - rect.width / 2 - view.panX) / scale,
    y: -(clientY - rect.top - rect.height / 2 - view.panY) / scale,
  };
}

function getDropWorldPosition(placement: DropPlacement, rect: DOMRect, view: ViewState): Vec3 {
  const world = clientToWorld(placement.x, placement.y, rect, view);
  const angle = placement.offset * 1.18;
  const radius = placement.offset ? 0.62 + placement.offset * 0.18 : 0;
  const next = constrainPoint({
    x: world.x + Math.cos(angle) * radius,
    y: world.y + Math.sin(angle) * radius,
  });

  return [next.x, next.y, 0];
}

function getFallbackNodePosition(index: number, total: number): Vec3 {
  const angle = index * 1.16 + total * 0.19;
  const radius = 16.2 + (index % 7) * 1.16;
  const point = constrainPoint({
    x: Math.cos(angle) * radius * 1.38 + ((index % 4) - 1.5) * 1.72,
    y: Math.sin(angle) * Math.min(radius, 17.2) * 0.76 + ((index % 5) - 2) * 0.58,
  });
  return [point.x, point.y, 0];
}

function getNodeRadiusWorld(node: ProjectNode, parentMap: ParentMap, nodes: ProjectNode[], parentOverrideId?: string) {
  if (node.type === "central") {
    return 1.52;
  }

  if (node.type === "section") {
    return 0.94;
  }

  const parentId = parentOverrideId ?? getEffectiveParentId(node, parentMap);
  const parentNode = parentId ? getNodeById(parentId, nodes) : undefined;
  return parentNode?.type === "document" ? 0.32 : 0.42;
}

function getNodeRadiusPx(node: ProjectNode, parentMap: ParentMap, nodes: ProjectNode[], scale: number, parentOverrideId?: string) {
  return getNodeDiameterPx(node, parentMap, nodes, scale, parentOverrideId) / 2;
}

function getNodeDiameterPx(node: ProjectNode, parentMap: ParentMap, nodes: ProjectNode[], scale: number, parentOverrideId?: string) {
  const worldDiameter = getNodeRadiusWorld(node, parentMap, nodes, parentOverrideId) * 2 * scale;

  if (node.type === "central") {
    return clamp(worldDiameter, 184, 292);
  }

  if (node.type === "section") {
    return clamp(worldDiameter, 112, 184);
  }

  const parentId = parentOverrideId ?? getEffectiveParentId(node, parentMap);
  const parentNode = parentId ? getNodeById(parentId, nodes) : undefined;
  return parentNode?.type === "document" ? clamp(worldDiameter, 48, 70) : clamp(worldDiameter, 64, 92);
}

function buildLinkPath({
  link,
  fromScreen,
  toScreen,
  fromRadius,
  toRadius,
  scale,
}: {
  link: ProjectLink;
  fromScreen: Point;
  toScreen: Point;
  fromRadius: number;
  toRadius: number;
  scale: number;
}) {
  const dx = toScreen.x - fromScreen.x;
  const dy = toScreen.y - fromScreen.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) {
    return null;
  }

  const ux = dx / distance;
  const uy = dy / distance;
  const nx = -uy;
  const ny = ux;
  const offset = (link.parallelOffset ?? 0) * scale * 0.46;
  const start = {
    x: fromScreen.x + ux * fromRadius * 0.82 + nx * offset,
    y: fromScreen.y + uy * fromRadius * 0.82 + ny * offset,
  };
  const end = {
    x: toScreen.x - ux * toRadius * 0.82 + nx * offset,
    y: toScreen.y - uy * toRadius * 0.82 + ny * offset,
  };
  const curve = {
    x: (start.x + end.x) / 2 + nx * offset * 1.8,
    y: (start.y + end.y) / 2 + ny * offset * 1.8,
  };

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${curve.x.toFixed(2)} ${curve.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function getLinkColor(link: ProjectLink, fromNode: ProjectNode, toNode: ProjectNode, statusColors: StatusColors) {
  if (link.source === "manual") {
    return "#e8f5ff";
  }

  if (link.strength === "primary") {
    return toNode.status === "approved" ? SECTION_APPROVED_COLOR : "#9aa4ba";
  }

  if (toNode.type === "document") {
    return getFileTypeColor(toNode.fileType);
  }

  if (fromNode.type === "document") {
    return getFileTypeColor(fromNode.fileType);
  }

  return statusColors[toNode.status ?? "unchecked"];
}

function getLinkWidth(link: ProjectLink, selected: boolean, highlighted: boolean) {
  const base = link.strength === "primary" ? 4.2 : link.strength === "secondary" ? 3.6 : 2.8;
  return base + (selected ? 3.4 : highlighted ? 2.2 : 0) + (link.pinned ? 0.8 : 0);
}

function findNearbyAttachTargets(
  node: ProjectNode,
  position: Point,
  positions: Record<string, Vec3>,
  nodes: ProjectNode[],
  parentMap: ParentMap,
  links: ProjectLink[],
) {
  if (node.type !== "document") {
    return [];
  }

  const candidates = nodes.filter(
    (candidate) =>
      candidate.id !== node.id &&
      (candidate.type === "section" || candidate.type === "document") &&
      !hasExistingPair(candidate.id, node.id, links) &&
      !isDescendantOf(candidate.id, node.id, nodes, parentMap),
  );

  return candidates
    .map((candidate) => {
      const target = positions[candidate.id];
      const distance = target ? distancePoints(position, vecToPoint(target)) : Number.POSITIVE_INFINITY;
      const attachRange = candidate.type === "section" ? SECTION_ABSORPTION_RANGE : 2.65;
      const sectionBias = candidate.type === "section" ? 0.18 : 0;

      return {
        id: candidate.id,
        distance,
        score: distance - sectionBias,
        attachRange,
      };
    })
    .filter((candidate) => candidate.distance <= candidate.attachRange)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((candidate) => candidate.id);
}

function findSectionAbsorptionTarget(
  node: ProjectNode,
  position: Point,
  positions: Record<string, Vec3>,
  nodes: ProjectNode[],
) {
  if (node.type !== "document") {
    return null;
  }

  return nodes
    .filter((candidate) => candidate.type === "section")
    .map((section) => {
      const sectionPosition = positions[section.id];
      const distance = sectionPosition ? distancePoints(position, vecToPoint(sectionPosition)) : Number.POSITIVE_INFINITY;
      const absorptionRange = SECTION_ABSORPTION_RANGE;

      return {
        id: section.id,
        distance,
        absorptionRange,
      };
    })
    .filter((candidate) => candidate.distance <= candidate.absorptionRange)
    .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
}

function placeAbsorbedDocument(
  documentId: string,
  sectionId: string,
  positions: Record<string, Vec3>,
  nodes: ProjectNode[],
  parentMap: ParentMap,
) {
  const sectionPosition = positions[sectionId];
  if (!sectionPosition) {
    return positions[documentId] ?? [0, 0, 0];
  }

  const absorbedIds = nodes
    .filter((node) => node.type === "document" && node.id !== documentId && getEffectiveParentId(node, parentMap) === sectionId)
    .filter((node) => isInsideParent(node.id, sectionId, positions))
    .map((node) => node.id);
  const index = absorbedIds.length;
  const angle = stableAngle(`${sectionId}-${documentId}`) + index * 1.58;
  const ring = Math.floor(index / 5);
  const radius = 1.72 + ring * 0.72;
  const point = constrainPoint({
    x: sectionPosition[0] + Math.cos(angle) * radius,
    y: sectionPosition[1] + Math.sin(angle) * radius,
  });

  return [point.x, point.y, sectionPosition[2] ?? 0] as Vec3;
}

function hasExistingPair(from: string, to: string, links: ProjectLink[]) {
  return links.some((link) => {
    const first = link.from === from && link.to === to;
    const second = link.from === to && link.to === from;
    return first || second;
  });
}

function hasNonCentralLink(id: string, links: ProjectLink[]) {
  return links.some((link) => {
    if (link.from !== id && link.to !== id) {
      return false;
    }

    const otherId = link.from === id ? link.to : link.from;
    return otherId !== project.id;
  });
}

function findBrokenLinks(
  positions: Record<string, Vec3>,
  nodes: ProjectNode[],
  links: ProjectLink[],
  activeIds: Set<string>,
) {
  if (!activeIds.size) {
    return [];
  }

  return links
    .filter((link) => link.source === "auto" && !link.pinned && link.strength !== "primary")
    .filter((link) => {
      const fromNode = getNodeById(link.from, nodes);
      const toNode = getNodeById(link.to, nodes);
      const movingDocumentId = [link.from, link.to].find((id) => activeIds.has(id) && getNodeById(id, nodes)?.type === "document");
      if (!fromNode || !toNode || !movingDocumentId) {
        return false;
      }

      const from = positions[link.from];
      const to = positions[link.to];
      if (!from || !to) {
        return false;
      }

      return distancePoints(vecToPoint(from), vecToPoint(to)) > getLinkBreakDistance(fromNode);
    })
    .map((link) => link.id);
}

function getLinkBreakDistance(parentNode?: ProjectNode) {
  if (parentNode?.type === "document") {
    return 13.4;
  }

  if (parentNode?.type === "central") {
    return 20.4;
  }

  return 16.8;
}

function getRubberFactor(distance: number, breakDistance: number) {
  const tensionStart = breakDistance * 0.46;
  if (distance <= tensionStart) {
    return 1;
  }

  return clamp((breakDistance - distance) / (breakDistance - tensionStart), 0.18, 1);
}

function getDocumentCollisionDistance(
  first: ProjectNode,
  second: ProjectNode,
  nodes: ProjectNode[],
  parentMap: ParentMap,
  scale?: number,
) {
  if (scale && scale > 0) {
    const firstRadius = getNodeRadiusPx(first, parentMap, nodes, scale) / scale;
    const secondRadius = getNodeRadiusPx(second, parentMap, nodes, scale) / scale;
    return firstRadius + secondRadius + 0.08;
  }

  return DOCUMENT_COLLISION_GAP;
}

function resolveDocumentCollisions(
  positions: Record<string, Vec3>,
  nodes: ProjectNode[],
  options: { activeIds?: Set<string>; lockedIds?: Set<string>; iterations?: number; parentMap?: ParentMap; scale?: number } = {},
) {
  const activeIds = options.activeIds;
  const lockedIds = options.lockedIds ?? new Set<string>();
  const iterations = options.iterations ?? 6;
  const collisionParentMap = options.parentMap ?? {};
  const result = { ...positions };
  const documents = nodes.filter((node) => node.type === "document" && !node.absorbed && result[node.id]);
  let anyChanged = false;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let changed = false;

    for (let firstIndex = 0; firstIndex < documents.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < documents.length; secondIndex += 1) {
        const first = documents[firstIndex];
        const second = documents[secondIndex];
        if (activeIds?.size && !activeIds.has(first.id) && !activeIds.has(second.id)) {
          continue;
        }

        const firstPosition = result[first.id];
        const secondPosition = result[second.id];
        if (!firstPosition || !secondPosition) {
          continue;
        }

        const firstPoint = vecToPoint(firstPosition);
        const secondPoint = vecToPoint(secondPosition);
        const distance = distancePoints(firstPoint, secondPoint);
        const minDistance = getDocumentCollisionDistance(first, second, nodes, collisionParentMap, options.scale);
        if (distance >= minDistance || distance > minDistance + 0.9) {
          continue;
        }

        const direction = distance > 0.001
          ? normalizePoint({ x: secondPoint.x - firstPoint.x, y: secondPoint.y - firstPoint.y })
          : { x: Math.cos(stableAngle(`${first.id}-${second.id}`)), y: Math.sin(stableAngle(`${first.id}-${second.id}`)) };
        const overlap = minDistance - distance;
        const firstLocked = lockedIds.has(first.id);
        const secondLocked = lockedIds.has(second.id);

        if (firstLocked && secondLocked) {
          const firstMove = overlap * 0.5;
          const secondMove = overlap * 0.5;
          const nextFirst = constrainPoint({
            x: firstPoint.x - direction.x * firstMove,
            y: firstPoint.y - direction.y * firstMove,
          });
          const nextSecond = constrainPoint({
            x: secondPoint.x + direction.x * secondMove,
            y: secondPoint.y + direction.y * secondMove,
          });
          result[first.id] = [nextFirst.x, nextFirst.y, firstPosition[2] ?? 0];
          result[second.id] = [nextSecond.x, nextSecond.y, secondPosition[2] ?? 0];
          changed = true;
          anyChanged = true;
          continue;
        }

        if (!firstLocked) {
          const firstMove = secondLocked ? overlap : overlap * 0.5;
          const nextFirst = constrainPoint({
            x: firstPoint.x - direction.x * firstMove,
            y: firstPoint.y - direction.y * firstMove,
          });
          result[first.id] = [nextFirst.x, nextFirst.y, firstPosition[2] ?? 0];
        }

        if (!secondLocked) {
          const secondMove = firstLocked ? overlap : overlap * 0.5;
          const nextSecond = constrainPoint({
            x: secondPoint.x + direction.x * secondMove,
            y: secondPoint.y + direction.y * secondMove,
          });
          result[second.id] = [nextSecond.x, nextSecond.y, secondPosition[2] ?? 0];
        }

        changed = true;
        anyChanged = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return anyChanged ? result : positions;
}

function buildNormalizedPositions2D(
  nodes: ProjectNode[],
  links: ProjectLink[],
  currentPositions: Record<string, Vec3>,
) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const next: Record<string, Vec3> = {};
  const anchors = new Set<string>();
  const centralNode = nodes.find((node) => node.type === "central");
  const sections = nodes.filter((node) => node.type === "section");

  if (centralNode) {
    next[centralNode.id] = [0, 0, 0];
    anchors.add(centralNode.id);
  }

  const sectionRadiusX = clamp(14.6 + sections.length * 0.16, 14.8, 16.4);
  const sectionRadiusY = clamp(9.8 + sections.length * 0.12, 9.9, 11.2);
  sections.forEach((section, index) => {
    const angle = index * ((Math.PI * 2) / Math.max(sections.length, 1)) - Math.PI / 2.3 + seededJitter(section.id).x * 0.12;
    next[section.id] = [
      Math.cos(angle) * sectionRadiusX,
      Math.sin(angle) * sectionRadiusY,
      0,
    ];
    anchors.add(section.id);
  });

  const placed = new Set(Object.keys(next));
  sections.forEach((section) => {
    const sectionPosition = next[section.id];
    if (!sectionPosition) {
      return;
    }

    const docs = links
      .filter((link) => link.from === section.id && nodeMap.get(link.to)?.type === "document")
      .map((link) => nodeMap.get(link.to)!)
      .filter((document, index, array) => array.findIndex((item) => item.id === document.id) === index);
    const outward = normalizePoint({ x: sectionPosition[0], y: sectionPosition[1] });
    const tangent = { x: -outward.y, y: outward.x };

    docs.forEach((document, index) => {
      const local = index - (docs.length - 1) / 2;
      const distance = 3.9 + Math.floor(index / 5) * 1.25;
      const spread = clamp(1.52 - docs.length * 0.024, 0.95, 1.52);
      const jitter = seededJitter(document.id);
      const point = constrainPoint({
        x: sectionPosition[0] + outward.x * distance + tangent.x * local * spread + jitter.x * 0.22,
        y: sectionPosition[1] + outward.y * distance + tangent.y * local * spread + jitter.y * 0.18,
      });
      next[document.id] = [point.x, point.y, 0];
      placed.add(document.id);
    });
  });

  for (let pass = 0; pass < 4; pass += 1) {
    links.forEach((link) => {
      const parent = nodeMap.get(link.from);
      const child = nodeMap.get(link.to);
      if (parent?.type !== "document" || child?.type !== "document" || placed.has(child.id) || !next[parent.id]) {
        return;
      }

      const parentPosition = next[parent.id];
      const angle = stableAngle(child.id);
      const point = constrainPoint({
        x: parentPosition[0] + Math.cos(angle) * 2.24,
        y: parentPosition[1] + Math.sin(angle) * 2.24,
      });
      next[child.id] = [point.x, point.y, 0];
      placed.add(child.id);
    });
  }

  nodes
    .filter((node) => !next[node.id])
    .forEach((node, index, looseNodes) => {
      const current = currentPositions[node.id];
      if (current) {
        next[node.id] = current;
        return;
      }

      const angle = index * ((Math.PI * 2) / Math.max(looseNodes.length, 1)) + Math.PI / 8;
      const radius = 15.6 + (index % 4) * 0.82;
      const point = constrainPoint({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      next[node.id] = [point.x, point.y, 0];
    });

  return relaxPositions(next, nodes, links, anchors);
}

function relaxPositions(
  basePositions: Record<string, Vec3>,
  nodes: ProjectNode[],
  links: ProjectLink[],
  anchors: Set<string>,
) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const vectors = Object.fromEntries(
    Object.entries(basePositions).map(([id, position]) => [id, { x: position[0], y: position[1] }]),
  ) as Record<string, Point>;
  const ids = Object.keys(vectors);

  for (let iteration = 0; iteration < 42; iteration += 1) {
    const deltas = new Map<string, Point>();

    links.forEach((link) => {
      const from = vectors[link.from];
      const to = vectors[link.to];
      if (!from || !to) {
        return;
      }

      const direction = normalizePoint({ x: to.x - from.x, y: to.y - from.y });
      const distance = Math.max(distancePoints(from, to), 0.001);
      const target = link.strength === "primary" ? 11.6 : link.strength === "secondary" ? 3.95 : 2.45;
      const correction = (distance - target) * 0.032;
      addDelta(deltas, nodeMap, anchors, link.from, { x: direction.x * correction, y: direction.y * correction });
      addDelta(deltas, nodeMap, anchors, link.to, { x: -direction.x * correction, y: -direction.y * correction });
    });

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const first = nodeMap.get(ids[i]);
        const second = nodeMap.get(ids[j]);
        if (!first || !second) {
          continue;
        }

        const firstPoint = vectors[ids[i]];
        const secondPoint = vectors[ids[j]];
        const distance = Math.max(distancePoints(firstPoint, secondPoint), 0.001);
        const minDistance = getMinimumGap(first, second);
        if (distance >= minDistance) {
          continue;
        }

        const direction = normalizePoint({ x: secondPoint.x - firstPoint.x, y: secondPoint.y - firstPoint.y });
        const correction = (minDistance - distance) * 0.045;
        addDelta(deltas, nodeMap, anchors, first.id, { x: -direction.x * correction, y: -direction.y * correction });
        addDelta(deltas, nodeMap, anchors, second.id, { x: direction.x * correction, y: direction.y * correction });
      }
    }

    deltas.forEach((delta, id) => {
      const point = vectors[id];
      if (!point) {
        return;
      }

      const next = constrainPoint({ x: point.x + delta.x, y: point.y + delta.y });
      point.x = next.x;
      point.y = next.y;
    });
  }

  return Object.fromEntries(
    Object.entries(vectors).map(([id, point]) => [id, [point.x, point.y, 0] as Vec3]),
  );
}

function addDelta(
  deltas: Map<string, Point>,
  nodeMap: Map<string, ProjectNode>,
  anchors: Set<string>,
  id: string,
  delta: Point,
) {
  if (anchors.has(id) || nodeMap.get(id)?.type === "central") {
    return;
  }

  const existing = deltas.get(id);
  if (existing) {
    existing.x += delta.x;
    existing.y += delta.y;
  } else {
    deltas.set(id, { ...delta });
  }
}

function getMinimumGap(first: ProjectNode, second: ProjectNode) {
  if (first.type === "section" && second.type === "section") {
    return 5.35;
  }

  if (first.type === "document" && second.type === "document") {
    return 1.72;
  }

  if (first.type === "central" || second.type === "central") {
    return 5.35;
  }

  return 2.82;
}

function updateDragVelocity(drag: DragState, position: Point) {
  const now = performance.now();
  const deltaSeconds = Math.max((now - drag.lastTime) / 1000, 0.016);
  const velocity = {
    x: (position.x - drag.lastPosition.x) / deltaSeconds,
    y: (position.y - drag.lastPosition.y) / deltaSeconds,
  };

  drag.velocity = limitVelocity(velocity, INERTIA_MAX_SPEED * 1.35);
  drag.lastPosition = position;
  drag.lastTime = now;
}

function limitVelocity(velocity: Point, maxSpeed: number) {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= maxSpeed) {
    return { ...velocity };
  }

  const scale = maxSpeed / speed;
  return {
    x: velocity.x * scale,
    y: velocity.y * scale,
  };
}

function constrainPoint(point: Point) {
  return {
    x: clamp(point.x, -MAP_LIMIT.x, MAP_LIMIT.x),
    y: clamp(point.y, -MAP_LIMIT.y, MAP_LIMIT.y),
  };
}

function vecToPoint(position: Vec3): Point {
  return { x: position[0], y: position[1] };
}

function distancePoints(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function normalizePoint(point: Point): Point {
  const length = Math.hypot(point.x, point.y) || 1;
  return {
    x: point.x / length,
    y: point.y / length,
  };
}

function isInsideParent(nodeId: string, parentId: string, positions: Record<string, Vec3>) {
  const nodePosition = positions[nodeId];
  const parentPosition = positions[parentId];
  if (!nodePosition || !parentPosition) {
    return false;
  }

  return distancePoints(vecToPoint(nodePosition), vecToPoint(parentPosition)) < SECTION_ABSORPTION_RANGE;
}

function isDescendantOf(id: string, ancestorId: string, nodes: ProjectNode[], parentMap: ParentMap) {
  let current = getNodeById(id, nodes);
  const visited = new Set<string>();

  while (current) {
    const parentId = getEffectiveParentId(current, parentMap);
    if (!parentId || visited.has(parentId)) {
      return false;
    }
    if (parentId === ancestorId) {
      return true;
    }
    visited.add(parentId);
    current = getNodeById(parentId, nodes);
  }

  return false;
}

function stableAngle(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }

  return (hash / 360) * Math.PI * 2;
}

function seededJitter(seed: string): Point {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const first = ((hash >>> 0) % 1000) / 1000;
  hash = Math.imul(hash ^ 0x9e3779b9, 16777619);
  const second = ((hash >>> 0) % 1000) / 1000;

  return {
    x: first * 2 - 1,
    y: second * 2 - 1,
  };
}

function buildShortCode(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("ru-RU")
    .slice(0, 3) || "НД";
}

function shortenTitle(title: string) {
  return title
    .replace("Спецификация", "Спец.")
    .replace("Пояснительная", "Пояснит.")
    .replace("Календарный", "Календ.")
    .replace("Ведомость", "Ведом.")
    .replace("Оборудования", "оборуд.")
    .replace("оборудования", "оборуд.");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
