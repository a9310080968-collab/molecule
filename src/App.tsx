import { type CSSProperties, type DragEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Sidebar, type SidebarMenuId } from "./components/Sidebar";
import { TopSearch } from "./components/TopSearch";
import { ProjectScene, type SceneHandle } from "./components/ProjectScene";
import { BottomControls } from "./components/BottomControls";
import { RightPanel } from "./components/RightPanel";
import { DocumentModal } from "./components/DocumentModal";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { getEffectiveParentId, getFileTypeColor, getLinkId, getLinks, getManualLinkId, getNodeById, getSearchMatches, type ParentMap } from "./lib/graph";
import {
  project,
  projectNodes,
  statusColors as defaultStatusColors,
  statusLabels as defaultStatusLabels,
} from "./data/mockProject";
import type {
  AiSuggestion,
  DropPlacement,
  DemoNotification,
  DocumentSource,
  FileType,
  IntakeBucketId,
  IntakeItem,
  LinkEdit,
  LinkEdits,
  NodeEdit,
  NodeEdits,
  NodeStatus,
  ProjectLink,
  ProjectNode,
  SectionReviews,
  StatusColors,
  StatusLabels,
  Vec3,
} from "./types";

type HistorySnapshot = {
  selectedId: string;
  selectedIds: string[];
  selectedLinkId: string | null;
  parentMap: ParentMap;
  customNodes: ProjectNode[];
  nodeEdits: NodeEdits;
  linkEdits: LinkEdits;
  manualLinks: ProjectLink[];
  autoExtraLinks: ProjectLink[];
  pinnedLinkIds: string[];
  deletedAutoLinkIds: string[];
  dropPlacements: Record<string, DropPlacement>;
  sectionReviews: SectionReviews;
  notifications: DemoNotification[];
  intakeItems: IntakeItem[];
  mailConnected: boolean;
  aiSuggestions: AiSuggestion[];
  aiPanelOpen: boolean;
  statusLabels: StatusLabels;
  statusColors: StatusColors;
  fontScale: number;
  positions?: Record<string, Vec3>;
};

const HISTORY_LIMIT = 80;

const initialNotifications: DemoNotification[] = [
  {
    id: "notif-review-pz",
    title: "ПЗ ожидает решения ГИП",
    description: "Раздел содержит документы с замечаниями и готов к демонстрационной проверке.",
    time: "сегодня, 14:18",
    targetId: "sec-pz",
    unread: true,
  },
  {
    id: "notif-upload-eom",
    title: "Добавлены рабочие файлы ЭОМ",
    description: "Новые документы можно открыть из 2D-карты или списка раздела.",
    time: "сегодня, 13:45",
    targetId: "sec-eom",
    unread: true,
  },
  {
    id: "notif-storage",
    title: "Хранилище обновлено",
    description: "В демо доступно перетаскивание файлов прямо в молекулу.",
    time: "вчера, 18:10",
    unread: false,
  },
];

const initialIntakeItems: IntakeItem[] = [
  {
    id: "intake-unsorted-demo",
    nodeId: "doc-pos-6",
    bucket: "unsorted",
    title: "План совещания стройки",
    fileType: "txt",
    source: "project",
    createdAt: "демо",
  },
  {
    id: "intake-mail-demo",
    nodeId: "doc-eom-6",
    bucket: "mail",
    title: "Фото щитовой для сверки",
    fileType: "pdf",
    source: "mail",
    matchedSectionId: "sec-eom",
    createdAt: "демо",
    tag: "ЭОМ",
  },
];

export default function App() {
  const [selectedId, setSelectedId] = useState(project.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([project.id]);
  const [query, setQuery] = useState("");
  const [parentMap, setParentMap] = useState<ParentMap>({});
  const [customNodes, setCustomNodes] = useState<ProjectNode[]>([]);
  const [nodeEdits, setNodeEdits] = useState<NodeEdits>({});
  const [linkEdits, setLinkEdits] = useState<LinkEdits>({});
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [manualLinks, setManualLinks] = useState<ProjectLink[]>([]);
  const [autoExtraLinks, setAutoExtraLinks] = useState<ProjectLink[]>([]);
  const [pinnedLinkIds, setPinnedLinkIds] = useState<Set<string>>(() => new Set());
  const [deletedAutoLinkIds, setDeletedAutoLinkIds] = useState<Set<string>>(() => new Set());
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [dropPlacements, setDropPlacements] = useState<Record<string, DropPlacement>>({});
  const [sectionReviews, setSectionReviews] = useState<SectionReviews>({});
  const [notifications, setNotifications] = useState<DemoNotification[]>(initialNotifications);
  const [intakeItems, setIntakeItems] = useState<IntakeItem[]>(initialIntakeItems);
  const [mailConnected, setMailConnected] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [statusLabels, setStatusLabels] = useState<StatusLabels>(defaultStatusLabels);
  const [statusColors, setStatusColors] = useState<StatusColors>(defaultStatusColors);
  const [modalDocumentId, setModalDocumentId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<SidebarMenuId>("map");
  const [autoRotate, setAutoRotate] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const sceneRef = useRef<SceneHandle | null>(null);
  const dropNonceRef = useRef(0);
  const deadlineAlertsRef = useRef<Set<string>>(new Set());

  const editedNodes = useMemo(
    () => [...projectNodes, ...customNodes].map((node) => ({ ...node, ...nodeEdits[node.id] })),
    [customNodes, nodeEdits],
  );
  const baseLinks = useMemo(() => getLinks(parentMap, editedNodes), [editedNodes, parentMap]);
  const links = useMemo(
    () => buildDisplayLinks(baseLinks, autoExtraLinks, manualLinks, pinnedLinkIds, deletedAutoLinkIds),
    [autoExtraLinks, baseLinks, deletedAutoLinkIds, manualLinks, pinnedLinkIds],
  );
  const matches = useMemo(
    () => getSearchMatches(query, parentMap, editedNodes, statusLabels, linkEdits, links),
    [editedNodes, linkEdits, links, parentMap, query, statusLabels],
  );
  const selectedNode = getNodeById(selectedId, editedNodes) ?? editedNodes[0];
  const selectedLink = selectedLinkId ? links.find((link) => link.id === selectedLinkId) ?? null : null;
  const modalDocument = modalDocumentId ? getNodeById(modalDocumentId, editedNodes) ?? null : null;
  const isSearching = query.trim().length > 0;
  const fontVars = useMemo(() => buildFontVars(fontScale), [fontScale]);

  function getHistorySnapshot(): HistorySnapshot {
    return {
      selectedId,
      selectedIds,
      selectedLinkId,
      parentMap,
      customNodes,
      nodeEdits,
      linkEdits,
      manualLinks,
      autoExtraLinks,
      pinnedLinkIds: Array.from(pinnedLinkIds),
      deletedAutoLinkIds: Array.from(deletedAutoLinkIds),
      dropPlacements,
      sectionReviews,
      notifications,
      intakeItems,
      mailConnected,
      aiSuggestions,
      aiPanelOpen,
      statusLabels,
      statusColors,
      fontScale,
      positions: sceneRef.current?.getPositions(),
    };
  }

  function restoreHistorySnapshot(snapshot: HistorySnapshot) {
    setSelectedId(snapshot.selectedId);
    setSelectedIds(snapshot.selectedIds);
    setSelectedLinkId(snapshot.selectedLinkId);
    setParentMap(snapshot.parentMap);
    setCustomNodes(snapshot.customNodes);
    setNodeEdits(snapshot.nodeEdits);
    setLinkEdits(snapshot.linkEdits);
    setManualLinks(snapshot.manualLinks);
    setAutoExtraLinks(snapshot.autoExtraLinks);
    setPinnedLinkIds(new Set(snapshot.pinnedLinkIds));
    setDeletedAutoLinkIds(new Set(snapshot.deletedAutoLinkIds));
    setDropPlacements(snapshot.dropPlacements);
    setSectionReviews(snapshot.sectionReviews);
    setNotifications(snapshot.notifications);
    setIntakeItems(snapshot.intakeItems);
    setMailConnected(snapshot.mailConnected);
    setAiSuggestions(snapshot.aiSuggestions);
    setAiPanelOpen(snapshot.aiPanelOpen);
    setStatusLabels(snapshot.statusLabels);
    setStatusColors(snapshot.statusColors);
    setFontScale(snapshot.fontScale);
    setLinkingFromId(null);
    if (snapshot.positions) {
      sceneRef.current?.setPositions(snapshot.positions);
    }
  }

  function recordHistory() {
    const snapshot = getHistorySnapshot();
    setUndoStack((current) => {
      const serialized = serializeHistorySnapshot(snapshot);
      const previous = current[current.length - 1];
      if (previous && serializeHistorySnapshot(previous) === serialized) {
        return current;
      }

      return [...current, snapshot].slice(-HISTORY_LIMIT);
    });
    setRedoStack([]);
  }

  function selectNode(id: string, additive = false) {
    setSelectedLinkId(null);
    setSelectedId(id);
    setSelectedIds((current) => {
      if (!additive) {
        return [id];
      }

      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        return next.length ? next : [id];
      }

      return [...current, id];
    });
  }

  function undo() {
    setUndoStack((current) => {
      const snapshot = current[current.length - 1];
      if (!snapshot) {
        return current;
      }

      setRedoStack((redoCurrent) => [...redoCurrent, getHistorySnapshot()].slice(-HISTORY_LIMIT));
      restoreHistorySnapshot(snapshot);
      return current.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((current) => {
      const snapshot = current[current.length - 1];
      if (!snapshot) {
        return current;
      }

      setUndoStack((undoCurrent) => [...undoCurrent, getHistorySnapshot()].slice(-HISTORY_LIMIT));
      restoreHistorySnapshot(snapshot);
      return current.slice(0, -1);
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTextField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && !isTextField && event.key.toLocaleLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !isTextField && event.key.toLocaleLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key !== "Delete" || !selectedLinkId || isTextField) {
        return;
      }

      event.preventDefault();
      deleteLink(selectedLinkId);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [links, selectedLinkId, undoStack, redoStack]);

  useEffect(() => {
    const checkDeadlines = () => {
      const now = Date.now();
      editedNodes.forEach((node) => {
        if (!node.deadlineAt) {
          deadlineAlertsRef.current.delete(node.id);
          return;
        }

        const deadline = new Date(node.deadlineAt).getTime();
        if (Number.isNaN(deadline)) {
          return;
        }

        const diff = deadline - now;
        const alertKey = `${node.id}:${node.deadlineAt}`;
        if (diff > 0 && diff <= 24 * 60 * 60 * 1000 && !deadlineAlertsRef.current.has(alertKey)) {
          deadlineAlertsRef.current.add(alertKey);
          pushNotification({
            title: "Скоро дедлайн",
            description: `${node.title}: ${formatDeadline(node.deadlineAt)}`,
            targetId: node.id,
          });
        }
      });
    };

    checkDeadlines();
    const timer = window.setInterval(checkDeadlines, 30_000);
    return () => window.clearInterval(timer);
  }, [editedNodes]);

  function updateNode(id: string, edit: NodeEdit) {
    const currentNode = getNodeById(id, editedNodes);
    if (currentNode?.type === "central" && edit.type) {
      return;
    }

    recordHistory();
    setNodeEdits((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...edit,
      },
    }));

    if (edit.type === "document") {
      setParentMap((current) => ({
        ...current,
        [id]: current[id] ?? project.id,
      }));
    }

    if (edit.type === "section") {
      setParentMap((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  function updateStatus(status: NodeStatus, edit: { label?: string; color?: string }) {
    recordHistory();
    if (edit.label !== undefined) {
      setStatusLabels((current) => ({
        ...current,
        [status]: edit.label,
      }));
    }

    if (edit.color !== undefined) {
      setStatusColors((current) => ({
        ...current,
        [status]: edit.color,
      }));
    }
  }

  function updateLink(id: string, edit: LinkEdit) {
    recordHistory();
    setLinkEdits((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...edit,
      },
    }));
  }

  function updateFontScale(scale: number) {
    if (scale === fontScale) {
      return;
    }

    recordHistory();
    setFontScale(scale);
  }

  function createAutoLinks(nextLinks: ProjectLink[]) {
    if (!nextLinks.length) {
      return;
    }

    setAutoExtraLinks((current) => {
      const existingIds = new Set([...links, ...current].map((link) => link.id));
      return [
        ...current,
        ...nextLinks
          .filter((link) => !existingIds.has(link.id))
          .map((link) => ({ ...link, source: "auto" as const })),
      ];
    });
  }

  function createManualLink(targetId: string) {
    if (!linkingFromId || linkingFromId === targetId) {
      setLinkingFromId(null);
      return;
    }

    const from = getNodeById(linkingFromId, editedNodes);
    const to = getNodeById(targetId, editedNodes);
    if (!from || !to) {
      setLinkingFromId(null);
      return;
    }

    recordHistory();
    const link: ProjectLink = {
      id: getManualLinkId(from.id, to.id),
      from: from.id,
      to: to.id,
      strength: from.type === "central" || to.type === "section" ? "secondary" : from.type === "document" && to.type === "document" ? "tertiary" : "secondary",
      source: "manual",
      pinned: true,
    };

    setManualLinks((current) => [...current, link]);
    setSelectedLinkId(link.id);
    setLinkingFromId(null);
    setToast("Р СѓС‡РЅР°СЏ СЃРІСЏР·СЊ Р·Р°РєСЂРµРїР»РµРЅР°. РћРЅР° РЅРµ РїРѕСЂРІРµС‚СЃСЏ РѕС‚ СЂР°СЃСЃС‚РѕСЏРЅРёСЏ.");
    window.setTimeout(() => setToast(null), 2600);
  }

  function pinLink(id: string) {
    recordHistory();
    setPinnedLinkIds((current) => new Set(current).add(id));
    setToast("РЎРІСЏР·СЊ Р·Р°РєСЂРµРїР»РµРЅР°. РўРµРїРµСЂСЊ РѕРЅР° СЂР°Р·СЂС‹РІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІСЂСѓС‡РЅСѓСЋ.");
    window.setTimeout(() => setToast(null), 2600);
  }

  function deleteLink(id: string) {
    const link = links.find((item) => item.id === id);
    if (!link) {
      return;
    }

    recordHistory();
    setManualLinks((current) => current.filter((item) => item.id !== id));
    setAutoExtraLinks((current) => current.filter((item) => item.id !== id));
    setPinnedLinkIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setLinkEdits((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    if (link.source === "auto") {
      setDeletedAutoLinkIds((current) => new Set(current).add(id));
      if (getLinkId(link.from, link.to) === id) {
        setParentMap((current) => {
          const next = { ...current };
          const target = getNodeById(link.to, editedNodes);
          if (target?.type === "document") {
            next[link.to] = null;
          }
          return next;
        });
      }
    }

    setSelectedLinkId(null);
    setToast("РЎРІСЏР·СЊ СѓРґР°Р»РµРЅР°.");
    window.setTimeout(() => setToast(null), 2200);
  }

  function breakAutoLinks(ids: string[]) {
    if (!ids.length) {
      return;
    }

    setAutoExtraLinks((current) => current.filter((link) => !ids.includes(link.id)));
    setParentMap((current) => {
      const next = { ...current };
      ids.forEach((id) => {
        const link = links.find((item) => item.id === id);
        const target = link ? getNodeById(link.to, editedNodes) : undefined;
        if (link && getLinkId(link.from, link.to) === id && target?.type === "document") {
          next[link.to] = null;
        }
      });
      return next;
    });
    if (selectedLinkId && ids.includes(selectedLinkId)) {
      setSelectedLinkId(null);
    }
  }

  function showPlannedToast() {
    setToast("Функция находится в разработке и будет доступна в следующей версии.");
    window.setTimeout(() => setToast(null), 2600);
  }

  function pushNotification(notification: Omit<DemoNotification, "id" | "time" | "unread">) {
    const next: DemoNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      time: "только что",
      unread: true,
    };
    setNotifications((current) => [next, ...current].slice(0, 8));
  }

  function handleNotificationClick(notification: DemoNotification) {
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)),
    );

    if (notification.targetId) {
      selectNode(notification.targetId);
      sceneRef.current?.focusNode(notification.targetId);
    }

    setToast(`${notification.title}: ${notification.description}`);
    window.setTimeout(() => setToast(null), 3200);
  }

  function absorbDocument(documentId: string, sectionId: string, shouldRecord = false) {
    if (shouldRecord) {
      recordHistory();
    }

    setParentMap((current) => ({
      ...current,
      [documentId]: sectionId,
    }));
    setNodeEdits((current) => ({
      ...current,
      [documentId]: {
        ...current[documentId],
        absorbed: true,
        isNew: true,
        status: current[documentId]?.status === "approved" ? "approved" : "review",
      },
      [sectionId]: {
        ...current[sectionId],
        status: "review",
        isNew: true,
      },
    }));
    setIntakeItems((current) =>
      current.map((item) => (item.nodeId === documentId ? { ...item, matchedSectionId: sectionId } : item)),
    );

    const document = getNodeById(documentId, editedNodes);
    const section = getNodeById(sectionId, editedNodes);
    pushNotification({
      title: `Новый документ в ${section?.shortCode ?? "разделе"}`,
      description: `${document?.title ?? "Документ"} попал внутрь средней сферы и ждет решения ГИП.`,
      targetId: sectionId,
    });
  }

  function releaseDocument(documentId: string, status: NodeStatus = "comments", shouldRecord = true) {
    if (shouldRecord) {
      recordHistory();
    }

    const document = getNodeById(documentId, editedNodes);
    const parentId = document ? getEffectiveParentId(document, parentMap) : undefined;
    const parent = parentId ? getNodeById(parentId, editedNodes) : undefined;

    setParentMap((current) => ({
      ...current,
      [documentId]: null,
    }));
    setNodeEdits((current) => ({
      ...current,
      [documentId]: {
        ...current[documentId],
        absorbed: false,
        isNew: false,
        status,
      },
    }));

    const positions = sceneRef.current?.getPositions();
    const parentPosition = parentId ? positions?.[parentId] : undefined;
    if (positions && parent?.type === "section" && parentPosition) {
      const angle = Math.PI * 0.18 + stableNumber(documentId) * Math.PI * 1.4;
      const distance = 7.6;
      sceneRef.current?.setPositions({
        ...positions,
        [documentId]: [
          clampSceneAxis(parentPosition[0] + Math.cos(angle) * distance, "x"),
          clampSceneAxis(parentPosition[1] + Math.sin(angle) * distance, "y"),
          parentPosition[2] ?? 0,
        ],
      });
    }

    setToast("Документ вынесен из средней сферы обратно в рабочее поле.");
    window.setTimeout(() => setToast(null), 2600);
  }

  function setNodeDeadline(nodeId: string, deadlineAt?: string) {
    recordHistory();
    setNodeEdits((current) => ({
      ...current,
      [nodeId]: {
        ...current[nodeId],
        deadlineAt,
      },
    }));

    const node = getNodeById(nodeId, editedNodes);
    pushNotification({
      title: deadlineAt ? "Дедлайн установлен" : "Дедлайн снят",
      description: deadlineAt
        ? `${node?.title ?? "Нода"}: ${formatDeadline(deadlineAt)}`
        : `${node?.title ?? "Нода"} больше не имеет таймера.`,
      targetId: nodeId,
    });
    setToast(deadlineAt ? `Таймер поставлен: ${formatDeadline(deadlineAt)}` : "Таймер снят.");
    window.setTimeout(() => setToast(null), 2600);
  }

  function connectMailDemo() {
    recordHistory();
    setMailConnected(true);
    pushNotification({
      title: "Яндекс Почта подключена в демо-режиме",
      description: "Новые письма с вложениями будут попадать в верхний чан «Из почты».",
    });
    setToast("Почта подключена в демо-режиме. Нажмите «Получить письмо», чтобы увидеть сценарий.");
    window.setTimeout(() => setToast(null), 3200);
  }

  function importDemoMail() {
    recordHistory();
    setMailConnected(true);
    const nonce = Date.now();
    const imported: ProjectNode[] = [
      createDroppedNode({
        title: "[ЭОМ] Спецификация кабельных линий из письма.xlsx",
        parentId: project.id,
        nonce,
        index: 0,
        fileType: "xlsx",
        description: "Демо-вложение из письма подрядчика",
        source: "mail",
      }),
      createDroppedNode({
        title: "[ПЗ] Ответ экспертизы по замечаниям.docx",
        parentId: project.id,
        nonce,
        index: 1,
        fileType: "docx",
        description: "Демо-вложение из почтового сервиса",
        source: "mail",
      }),
      createDroppedNode({
        title: "Фото замечания подрядчика.pdf",
        parentId: project.id,
        nonce,
        index: 2,
        fileType: "pdf",
        description: "Без тега: нужно разобрать вручную",
        source: "mail",
      }),
    ];
    addImportedDocuments(imported, "mail", "mail");
    setToast("Письмо разобрано: вложения попали в почтовый чан, tagged-файлы присоединились автоматически.");
    window.setTimeout(() => setToast(null), 3200);
  }

  function addImportedDocuments(imported: ProjectNode[], source: DocumentSource, bucket: IntakeBucketId, clientX?: number, clientY?: number) {
    const sections = editedNodes.filter((node) => node.type === "section");
    const nextParentMap: ParentMap = {};
    const nextEdits: NodeEdits = {};
    const nextItems: IntakeItem[] = [];
    const prepared = imported.map((node) => {
      const match = findSectionMatch(node.title, sections);
      const parentId = match?.section.id ?? project.id;
      nextParentMap[node.id] = parentId;
      nextEdits[node.id] = {
        absorbed: Boolean(match),
        isNew: true,
        status: match ? "review" : "draft",
      };
      if (match) {
        nextEdits[match.section.id] = {
          ...nextEdits[match.section.id],
          status: "review",
          isNew: true,
        };
      }
      nextItems.push({
        id: `intake-${node.id}`,
        nodeId: node.id,
        bucket,
        title: node.title,
        fileType: node.fileType,
        source,
        matchedSectionId: match?.section.id,
        createdAt: "только что",
        tag: match?.tag,
      });

      return {
        ...node,
        parentId,
        source,
        absorbed: Boolean(match),
        isNew: true,
        status: match ? ("review" as const) : ("draft" as const),
      };
    });

    setCustomNodes((current) => [...current, ...prepared]);
    setNodeEdits((current) => ({ ...current, ...nextEdits }));
    setParentMap((current) => ({ ...current, ...nextParentMap }));
    setIntakeItems((current) => [...nextItems, ...current].slice(0, 14));

    dropNonceRef.current += 1;
    setDropPlacements((current) => ({
      ...current,
      ...Object.fromEntries(
        prepared.map((node, index) => [
          node.id,
          {
            id: node.id,
            x: clientX ?? window.innerWidth / 2,
            y: clientY ?? 112,
            offset: index,
            nonce: dropNonceRef.current,
          } satisfies DropPlacement,
        ]),
      ),
    }));

    const autoMatchedCount = nextItems.filter((item) => item.matchedSectionId).length;
    if (autoMatchedCount) {
      pushNotification({
        title: "Автосортировка по тегам",
        description: `${autoMatchedCount} документ(а) присоединены к средним сферам и помечены как новые.`,
        targetId: nextItems.find((item) => item.matchedSectionId)?.matchedSectionId,
      });
    }

    if (prepared[0]) {
      selectNode(prepared[0].id);
    }
  }

  function assignIntakeItem(itemId: string, sectionId?: string) {
    const item = intakeItems.find((entry) => entry.id === itemId);
    const targetSectionId = sectionId ?? item?.matchedSectionId;
    if (!item || !targetSectionId) {
      setToast("Выберите среднюю сферу или добавьте тег к разделу.");
      window.setTimeout(() => setToast(null), 2600);
      return;
    }

    absorbDocument(item.nodeId, targetSectionId, true);
    setIntakeItems((current) => current.filter((entry) => entry.id !== itemId));
    selectNode(targetSectionId);
    sceneRef.current?.focusNode(targetSectionId);
  }

  function runAiAnalysis() {
    if (!intakeItems.length) {
      setToast("Во входящих чанах пока нет документов для ИИ-разбора.");
      window.setTimeout(() => setToast(null), 2600);
      return;
    }

    const suggestions = intakeItems.map((item) => analyzeIntakeItem(item, editedNodes, parentMap));
    setAiSuggestions(suggestions);
    setAiPanelOpen(true);
    pushNotification({
      title: "ИИ-разбор входящих завершен",
      description: `Подготовлено ${suggestions.length} предложений: разделы, уверенность, причины и возможные связи.`,
      targetId: suggestions.find((suggestion) => suggestion.suggestedSectionId)?.suggestedSectionId,
    });
    setToast("ИИ разобрал входящие документы и подготовил предложения сортировки.");
    window.setTimeout(() => setToast(null), 3000);
  }

  function applyAiSuggestion(suggestionId: string) {
    const suggestion = aiSuggestions.find((item) => item.id === suggestionId);
    if (!suggestion || !suggestion.suggestedSectionId) {
      setToast("У предложения нет подходящего раздела. Выберите раздел вручную.");
      window.setTimeout(() => setToast(null), 2600);
      return;
    }

    assignIntakeItem(suggestion.itemId, suggestion.suggestedSectionId);
    if (suggestion.suggestedLinks.length) {
      setManualLinks((current) => [
        ...current,
        ...suggestion.suggestedLinks
          .filter((link) => link.targetId !== suggestion.nodeId)
          .map((link) => ({
            id: getManualLinkId(link.targetId, suggestion.nodeId),
            from: link.targetId,
            to: suggestion.nodeId,
            strength: "tertiary" as const,
            source: "manual" as const,
            pinned: true,
          })),
      ]);
    }
    setAiSuggestions((current) =>
      current.map((item) => (item.id === suggestionId ? { ...item, status: "applied" } : item)),
    );
  }

  function dismissAiSuggestion(suggestionId: string) {
    setAiSuggestions((current) =>
      current.map((item) => (item.id === suggestionId ? { ...item, status: "dismissed" } : item)),
    );
  }

  function sendSectionToReview(sectionId: string, documentIds: string[]) {
    recordHistory();
    setSectionReviews((current) => ({
      ...current,
      [sectionId]: {
        status: "sent",
        approvedDocumentIds: documentIds,
        submittedAt: "только что",
      },
    }));
    setNodeEdits((current) => ({
      ...current,
      [sectionId]: {
        ...current[sectionId],
        status: "review",
      },
    }));

    const section = getNodeById(sectionId, editedNodes);
    pushNotification({
      title: `${section?.shortCode ?? "Раздел"} отправлен на согласование`,
      description: `ГИП видит пакет из ${documentIds.length} документов и может принять решение по каждому.`,
      targetId: sectionId,
    });
    setToast("Пакет документов отправлен ГИП на согласование.");
    window.setTimeout(() => setToast(null), 2600);
  }

  function decideSectionReview(sectionId: string, approvedDocumentIds: string[], allDocumentIds: string[]) {
    recordHistory();
    const rejectedDocumentIds = allDocumentIds.filter((id) => !approvedDocumentIds.includes(id));
    const status = approvedDocumentIds.length === allDocumentIds.length
      ? "approved"
      : approvedDocumentIds.length > 0
        ? "partial"
        : "rejected";
    const sectionStatus: NodeStatus = status === "approved" ? "approved" : "comments";

    setSectionReviews((current) => ({
      ...current,
      [sectionId]: {
        status,
        approvedDocumentIds,
        submittedAt: current[sectionId]?.submittedAt,
        decidedAt: "только что",
      },
    }));
    setNodeEdits((current) => ({
      ...current,
      [sectionId]: {
        ...current[sectionId],
        status: sectionStatus,
        isNew: false,
      },
      ...Object.fromEntries(
        allDocumentIds.map((id) => [
          id,
          {
            ...current[id],
            absorbed: approvedDocumentIds.includes(id),
            isNew: false,
            status: approvedDocumentIds.includes(id) ? "approved" : "comments",
          } satisfies NodeEdit,
        ]),
      ),
    }));

    if (rejectedDocumentIds.length) {
      ejectRejectedDocuments(sectionId, rejectedDocumentIds);
    }

    const section = getNodeById(sectionId, editedNodes);
    pushNotification({
      title:
        status === "approved"
          ? `${section?.shortCode ?? "Раздел"} согласован`
          : status === "partial"
            ? `${section?.shortCode ?? "Раздел"} согласован частично`
            : `${section?.shortCode ?? "Раздел"} не согласован`,
      description: rejectedDocumentIds.length
        ? `${rejectedDocumentIds.length} документов выпущены обратно в рабочую зону.`
        : "Все документы остались внутри раздела.",
      targetId: sectionId,
    });
    setToast(rejectedDocumentIds.length ? "Несогласованные документы выпущены из раздела." : "Раздел согласован.");
    window.setTimeout(() => setToast(null), 3000);
  }

  function ejectRejectedDocuments(sectionId: string, rejectedDocumentIds: string[]) {
    setParentMap((current) => ({
      ...current,
      ...Object.fromEntries(rejectedDocumentIds.map((id) => [id, null])),
    }));

    setManualLinks((current) => {
      if (rejectedDocumentIds.length < 2) {
        return current;
      }

      const newLinks = rejectedDocumentIds.slice(1).map((id, index) => ({
        id: getManualLinkId(rejectedDocumentIds[index], id),
        from: rejectedDocumentIds[index],
        to: id,
        strength: "tertiary" as const,
        source: "manual" as const,
        pinned: true,
      }));
      return [...current, ...newLinks];
    });

    const positions = sceneRef.current?.getPositions();
    const sectionPosition = positions?.[sectionId];
    if (!positions || !sectionPosition) {
      return;
    }

    const nextPositions = { ...positions };
    rejectedDocumentIds.forEach((id, index) => {
      const angle = -0.7 + index * 0.55;
      const distance = 7.4 + index * 0.58;
      nextPositions[id] = [
        clampSceneAxis(sectionPosition[0] + Math.cos(angle) * distance, "x"),
        clampSceneAxis(sectionPosition[1] - 2.6 - Math.sin(angle) * 1.15, "y"),
        clampSceneAxis(sectionPosition[2] + (index % 2 === 0 ? 0.52 : -0.42), "z"),
      ];
    });
    sceneRef.current?.setPositions(nextPositions);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!hasDroppableContent(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDropActive(true);
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    if (!hasDroppableContent(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setIsDropActive(false);
    const imported = await buildDroppedNodes(event.dataTransfer, selectedNode, dropNonceRef.current + 1);
    if (!imported.length) {
      setToast("Не удалось распознать файл или ссылку для добавления в молекулу.");
      window.setTimeout(() => setToast(null), 2600);
      return;
    }

    recordHistory();
    addImportedDocuments(imported, "drop", "unsorted", event.clientX, event.clientY);
    setActiveMenu("map");
    setToast(`Добавлено в молекулу: ${imported.length}`);
    window.setTimeout(() => setToast(null), 2600);
  }

  return (
    <main
      className="app-shell"
      style={fontVars}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDropActive(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className="cosmos-backdrop" />
      <Sidebar
        isOpen={mobileMenuOpen}
        activeMenu={activeMenu}
        onMenuSelect={setActiveMenu}
        onClose={() => setMobileMenuOpen(false)}
        onPlannedClick={showPlannedToast}
      />
      <TopSearch
        value={query}
        onChange={setQuery}
        hasNoResults={isSearching && matches.nodeIds.size + matches.linkIds.size === 0}
        matchCount={matches.nodeIds.size + matches.linkIds.size}
        onMenuClick={() => setMobileMenuOpen(true)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
      />
      <IntakeTray
        items={intakeItems}
        nodes={editedNodes}
        mailConnected={mailConnected}
        onConnectMail={connectMailDemo}
        onImportMail={importDemoMail}
        onAssignItem={assignIntakeItem}
        onRunAiAnalysis={runAiAnalysis}
        onFocusNode={(id) => {
          selectNode(id);
          sceneRef.current?.focusNode(id);
        }}
        onShowAiInfo={() => setAiPanelOpen(true)}
      />
      {aiPanelOpen ? (
        <AiReviewPanel
          suggestions={aiSuggestions}
          nodes={editedNodes}
          onRun={runAiAnalysis}
          onApply={applyAiSuggestion}
          onDismiss={dismissAiSuggestion}
          onFocusNode={(id) => {
            selectNode(id);
            sceneRef.current?.focusNode(id);
          }}
          onClose={() => setAiPanelOpen(false)}
        />
      ) : null}
      <section className="scene-panel" aria-label="2D-карта документации">
        <ProjectScene
          selectedId={selectedId}
          selectedIds={new Set(selectedIds)}
          nodes={editedNodes}
          dropPlacements={dropPlacements}
          statusColors={statusColors}
          onSelect={selectNode}
          selectedLinkId={selectedLinkId}
          onSelectLink={(id) => setSelectedLinkId(id)}
          links={links}
          linkingFromId={linkingFromId}
          onCreateAutoLinks={createAutoLinks}
          onBreakAutoLinks={breakAutoLinks}
          onAbsorbDocument={absorbDocument}
          onCompleteManualLink={createManualLink}
          onHistoryCheckpoint={recordHistory}
          onOpenDocument={(node) => {
            selectNode(node.id);
            setModalDocumentId(node.id);
          }}
          matches={matches.nodeIds}
          linkMatches={matches.linkIds}
          isSearching={isSearching}
          parentMap={parentMap}
          onParentMapChange={setParentMap}
          autoRotate={autoRotate}
          sceneRef={sceneRef}
        />
      </section>
      <WorkspacePanel activeMenu={activeMenu} onClose={() => setActiveMenu("map")} />
      {isDropActive ? (
        <div className="drop-overlay">
          <div className="drop-target glass-panel">
            <strong>Отпустите файл или ссылку</strong>
            <span>В молекуле появится новая малая нода. Потом ее можно сделать средней или связать с другими нодами.</span>
          </div>
        </div>
      ) : null}
      <RightPanel
        node={selectedNode}
        link={selectedLink}
        linkEdit={selectedLink ? linkEdits[selectedLink.id] : undefined}
        nodes={editedNodes}
        parentMap={parentMap}
        statusLabels={statusLabels}
        sectionReviews={sectionReviews}
        onNodeUpdate={updateNode}
        onLinkUpdate={updateLink}
        onDeleteLink={deleteLink}
        onPinLink={pinLink}
        onDeadlineSet={setNodeDeadline}
        onReleaseDocument={(documentId) => releaseDocument(documentId)}
        onSendSectionReview={sendSectionToReview}
        onDecideSectionReview={decideSectionReview}
        onStartLink={(fromId) => {
          setLinkingFromId(fromId);
          setSelectedLinkId(null);
          setToast("Р’С‹Р±РµСЂРёС‚Рµ Р»СЋР±СѓСЋ РЅРѕРґСѓ, С‡С‚РѕР±С‹ РїСЂРѕС‚СЏРЅСѓС‚СЊ Рє РЅРµР№ СЂСѓС‡РЅСѓСЋ СЃРІСЏР·СЊ.");
          window.setTimeout(() => setToast(null), 3200);
        }}
        onCloseLink={() => setSelectedLinkId(null)}
        onOpenDocument={(node) => {
          selectNode(node.id);
          setModalDocumentId(node.id);
        }}
      />
      <BottomControls
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onNormalize={() => {
          recordHistory();
          sceneRef.current?.normalize();
          setToast("Структура нормализована: связи сохранены, расстояния выровнены.");
          window.setTimeout(() => setToast(null), 2600);
        }}
        onReset={() => {
          recordHistory();
          sceneRef.current?.reset();
        }}
        onFocus={() => sceneRef.current?.focusSelected()}
        autoRotate={autoRotate}
        fontScale={fontScale}
        onFontScaleChange={updateFontScale}
        onToggleAutoRotate={() => setAutoRotate((value) => !value)}
      />
      <DocumentModal
        node={modalDocument}
        statusLabels={statusLabels}
        onShowInFolder={(node) => {
          setToast(
            node.fileUrl
              ? "В демо браузер не раскрывает настоящий путь к локальному файлу. В продуктовой версии здесь откроется папка с файлом."
              : `Демо-путь: /ЖК Сириус/${node.title}`,
          );
          window.setTimeout(() => setToast(null), 3200);
        }}
        onClose={() => setModalDocumentId(null)}
      />
      {toast ? <div className="toast glass-panel">{toast}</div> : null}
    </main>
  );
}

function IntakeTray({
  items,
  nodes,
  mailConnected,
  onConnectMail,
  onImportMail,
  onAssignItem,
  onRunAiAnalysis,
  onFocusNode,
  onShowAiInfo,
}: {
  items: IntakeItem[];
  nodes: ProjectNode[];
  mailConnected: boolean;
  onConnectMail: () => void;
  onImportMail: () => void;
  onAssignItem: (itemId: string, sectionId?: string) => void;
  onRunAiAnalysis: () => void;
  onFocusNode: (id: string) => void;
  onShowAiInfo: () => void;
}) {
  const sections = nodes.filter((node) => node.type === "section");
  const unsorted = items.filter((item) => item.bucket === "unsorted");
  const mail = items.filter((item) => item.bucket === "mail");

  return (
    <div className="intake-tray" aria-label="Входящие документы">
      <IntakeBucket
        title="Чан файлов"
        subtitle="разгрести входящие"
        items={unsorted}
        nodes={nodes}
        sections={sections}
        onAssignItem={onAssignItem}
        onFocusNode={onFocusNode}
      />
      <IntakeBucket
        title="Из почты"
        subtitle={mailConnected ? "Яндекс Почта: демо онлайн" : "почта не подключена"}
        items={mail}
        nodes={nodes}
        sections={sections}
        onAssignItem={onAssignItem}
        onFocusNode={onFocusNode}
        actions={
          <>
            <button onClick={mailConnected ? onImportMail : onConnectMail}>
              {mailConnected ? "Получить письмо" : "Подключить"}
            </button>
            <button className="secondary" onClick={onRunAiAnalysis}>ИИ-разбор</button>
            <button className="secondary" onClick={onShowAiInfo}>панель</button>
          </>
        }
      />
    </div>
  );
}

function AiReviewPanel({
  suggestions,
  nodes,
  onRun,
  onApply,
  onDismiss,
  onFocusNode,
  onClose,
}: {
  suggestions: AiSuggestion[];
  nodes: ProjectNode[];
  onRun: () => void;
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
  onFocusNode: (id: string) => void;
  onClose: () => void;
}) {
  const pending = suggestions.filter((suggestion) => suggestion.status === "pending");

  return (
    <aside className="ai-review-panel glass-panel" aria-label="ИИ-разбор документов">
      <header>
        <div>
          <span>AI intake</span>
          <h2>ИИ-разбор входящих</h2>
          <p>Локальный демо-анализ читает название, тип, текст TXT и теги разделов, затем предлагает раздел и связи.</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Закрыть ИИ-панель">×</button>
      </header>

      <div className="ai-review-actions">
        <button onClick={onRun}>Запустить анализ</button>
        <b>{pending.length ? `${pending.length} к применению` : "нет новых предложений"}</b>
      </div>

      <div className="ai-suggestion-list">
        {suggestions.length ? (
          suggestions.map((suggestion) => {
            const node = getNodeById(suggestion.nodeId, nodes);
            return (
              <article key={suggestion.id} className={clsx("ai-suggestion", suggestion.status)}>
                <div className="ai-suggestion-top">
                  <button onClick={() => onFocusNode(suggestion.nodeId)}>
                    <strong>{suggestion.title}</strong>
                    <span>{node?.fileType?.toUpperCase() ?? "FILE"} · {suggestion.summary}</span>
                  </button>
                  <em>{suggestion.confidence}%</em>
                </div>
                <div className="ai-confidence">
                  <i style={{ width: `${suggestion.confidence}%` }} />
                </div>
                <div className="ai-target">
                  <span>Предложение</span>
                  <b>{suggestion.suggestedSectionCode ?? "?"} · {suggestion.suggestedSectionTitle ?? "требуется ручной выбор"}</b>
                </div>
                <ul>
                  {suggestion.reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                {suggestion.suggestedLinks.length ? (
                  <div className="ai-links">
                    {suggestion.suggestedLinks.map((link) => (
                      <button key={link.targetId} onClick={() => onFocusNode(link.targetId)}>
                        связь: {link.targetTitle}
                      </button>
                    ))}
                  </div>
                ) : null}
                <footer>
                  <button onClick={() => onApply(suggestion.id)} disabled={suggestion.status !== "pending" || !suggestion.suggestedSectionId}>
                    применить
                  </button>
                  <button className="muted" onClick={() => onDismiss(suggestion.id)} disabled={suggestion.status !== "pending"}>
                    отклонить
                  </button>
                </footer>
              </article>
            );
          })
        ) : (
          <div className="ai-empty">
            <strong>Предложений пока нет</strong>
            <p>Нажмите «Запустить анализ», чтобы ИИ разобрал документы из верхних чанов.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function IntakeBucket({
  title,
  subtitle,
  items,
  nodes,
  sections,
  actions,
  onAssignItem,
  onFocusNode,
}: {
  title: string;
  subtitle: string;
  items: IntakeItem[];
  nodes: ProjectNode[];
  sections: ProjectNode[];
  actions?: ReactNode;
  onAssignItem: (itemId: string, sectionId?: string) => void;
  onFocusNode: (id: string) => void;
}) {
  return (
    <section className="intake-bucket glass-panel">
      <header>
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <b>{items.length}</b>
      </header>
      <div className="intake-actions">{actions}</div>
      <div className="intake-list">
        {items.length ? (
          items.slice(0, 4).map((item) => {
            const node = getNodeById(item.nodeId, nodes);
            const matched = item.matchedSectionId ? getNodeById(item.matchedSectionId, nodes) : undefined;
            return (
              <article key={item.id} className={clsx("intake-item", matched && "matched")}>
                <i style={{ background: getFileTypeColor(item.fileType) }} />
                <button className="intake-title" onClick={() => node && onFocusNode(node.id)}>
                  <b>{item.title}</b>
                  <span>
                    {matched ? `тег ${item.tag ?? matched.shortCode} -> ${matched.shortCode ?? matched.title}` : "нужно разобрать"}
                  </span>
                </button>
                {matched ? (
                  <button className="intake-mini-action" onClick={() => onAssignItem(item.id)}>
                    в сферу
                  </button>
                ) : (
                  <select
                    value=""
                    onChange={(event) => {
                      if (event.currentTarget.value) {
                        onAssignItem(item.id, event.currentTarget.value);
                      }
                    }}
                  >
                    <option value="">куда?</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.shortCode ?? section.title}
                      </option>
                    ))}
                  </select>
                )}
              </article>
            );
          })
        ) : (
          <p>Пусто. Перетащите файл или получите письмо.</p>
        )}
      </div>
    </section>
  );
}

function analyzeIntakeItem(item: IntakeItem, nodes: ProjectNode[], parentMap: ParentMap): AiSuggestion {
  const node = getNodeById(item.nodeId, nodes);
  const sections = nodes.filter((candidate) => candidate.type === "section");
  const text = normalizeAiText([
    item.title,
    item.tag,
    item.source,
    item.fileType,
    node?.title,
    node?.description,
    node?.fileText,
    node?.responsible,
  ].filter(Boolean).join(" "));

  const scored = sections
    .map((section) => scoreSectionForDocument(section, text, item))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const hasTarget = Boolean(best && best.score > 0);
  const target = hasTarget ? best.section : undefined;
  const confidence = hasTarget ? clampInt(48 + best.score * 7, 52, 96) : 34;
  const detectedTags = hasTarget ? best.detectedTags : [];
  const suggestedLinks = target
    ? getAiSuggestedLinks(node, target, nodes, parentMap, text)
    : [];

  return {
    id: `ai-${item.id}-${Date.now()}`,
    itemId: item.id,
    nodeId: item.nodeId,
    title: item.title,
    suggestedSectionId: target?.id,
    suggestedSectionTitle: target?.title,
    suggestedSectionCode: target?.shortCode,
    confidence,
    summary: target
      ? `вероятный раздел ${target.shortCode ?? target.title}`
      : "не хватает признаков для автосортировки",
    reasons: hasTarget
      ? best.reasons
      : ["ИИ не нашел уверенного тега или предметного ключевого слова.", "Документ оставлен в чане для ручного разбора."],
    detectedTags,
    suggestedLinks,
    status: "pending",
  };
}

function scoreSectionForDocument(section: ProjectNode, text: string, item: IntakeItem) {
  const reasons: string[] = [];
  const detectedTags: string[] = [];
  let score = 0;

  if (item.matchedSectionId === section.id) {
    score += 5;
    reasons.push("Документ уже был предварительно присоединен к этому разделу по тегу.");
  }

  const tags = [section.shortCode, ...(section.tags ?? [])].filter(Boolean) as string[];
  tags.forEach((tag) => {
    const normalized = normalizeAiText(tag);
    if (normalized.length >= 2 && hasAiTerm(text, normalized)) {
      score += normalized.length <= 3 ? 5 : 3;
      detectedTags.push(tag);
      reasons.push(`Найден тег «${tag}» в названии или метаданных.`);
    }
  });

  const keywordProfile = getSectionKeywordProfile(section);
  keywordProfile.forEach((keyword) => {
    if (hasAiTerm(text, keyword)) {
      score += 2;
      reasons.push(`Найден предметный признак: ${keyword}.`);
    }
  });

  if (item.fileType === "xlsx" && keywordProfile.some((keyword) => ["смет", "спецификац", "ведом", "расчет"].includes(keyword))) {
    score += 1;
    reasons.push("Тип файла похож на расчетную таблицу или спецификацию.");
  }

  return {
    section,
    score,
    reasons: Array.from(new Set(reasons)).slice(0, 5),
    detectedTags: Array.from(new Set(detectedTags)),
  };
}

function getSectionKeywordProfile(section: ProjectNode) {
  const text = normalizeAiText(`${section.shortCode ?? ""} ${section.title}`);
  if (text.includes("архитект") || text.includes("ар")) {
    return ["архитект", "фасад", "план", "кровл", "экспликац", "обмер", "помещен"];
  }

  if (text.includes("конструк") || text.includes("кр")) {
    return ["конструк", "металл", "нагруз", "плита", "узел", "кж", "км"];
  }

  if (text.includes("поясн") || text.includes("пз")) {
    return ["поясн", "экспертиз", "тэп", "общие", "исходн", "опросн"];
  }

  if (text.includes("вент") || text.includes("ов")) {
    return ["отоп", "вент", "воздух", "система ов", "тепл", "обмен"];
  }

  if (text.includes("вод") || text.includes("канал") || text.includes("вк")) {
    return ["вода", "канал", "ситуац", "вк", "т3", "в1"];
  }

  if (text.includes("элект") || text.includes("эом")) {
    return ["элект", "кабель", "щит", "свет", "освещ", "линия", "светильн"];
  }

  if (text.includes("строит") || text.includes("пос")) {
    return ["строй", "календар", "дорог", "логист", "поставка", "генплан"];
  }

  if (text.includes("смет")) {
    return ["смет", "объем", "бюджет", "расчет", "коммерч", "кп", "ведом"];
  }

  return [];
}

function getAiSuggestedLinks(
  node: ProjectNode | undefined,
  section: ProjectNode,
  nodes: ProjectNode[],
  parentMap: ParentMap,
  normalizedDocumentText: string,
) {
  if (!node) {
    return [];
  }

  return nodes
    .filter((candidate) => candidate.type === "document" && candidate.id !== node.id)
    .filter((candidate) => getEffectiveParentId(candidate, parentMap) === section.id)
    .map((candidate) => {
      const candidateText = normalizeAiText(`${candidate.title} ${candidate.description ?? ""} ${candidate.fileType ?? ""}`);
      const common = getCommonAiWords(normalizedDocumentText, candidateText);
      const typeBonus = candidate.fileType && candidate.fileType === node.fileType ? 1 : 0;
      return {
        targetId: candidate.id,
        targetTitle: candidate.title,
        reason: common.length ? `общие признаки: ${common.slice(0, 3).join(", ")}` : "один раздел и близкий тип документа",
        score: common.length + typeBonus,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ score: _score, ...link }) => link);
}

function getCommonAiWords(first: string, second: string) {
  const stopWords = new Set(["версия", "файл", "документ", "письмо", "демо", "для", "из", "по", "на", "the"]);
  const firstWords = first.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word));
  const secondWords = new Set(second.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word)));
  return Array.from(new Set(firstWords.filter((word) => secondWords.has(word))));
}

function normalizeAiText(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

function hasAiTerm(text: string, term: string) {
  if (!term) {
    return false;
  }

  if (term.length <= 3) {
    return text.split(/\s+/).includes(term);
  }

  return text.includes(term);
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hasDroppableContent(dataTransfer: DataTransfer) {
  return (
    dataTransfer.files.length > 0 ||
    dataTransfer.types.includes("text/uri-list") ||
    dataTransfer.types.includes("text/plain") ||
    dataTransfer.types.includes("text/html")
  );
}

async function buildDroppedNodes(dataTransfer: DataTransfer, selectedNode: ProjectNode, nonce: number) {
  const parentId = selectedNode.type === "section" || selectedNode.type === "document" ? selectedNode.id : project.id;
  const fileNodes = await Promise.all(
    Array.from(dataTransfer.files).map(async (file, index) =>
      createDroppedNode({
      title: file.name,
      parentId,
      nonce,
      index,
      fileType: inferFileType(file.name),
      description: `${formatBytes(file.size)} · ${file.type || "тип не указан"}`,
      fileUrl: URL.createObjectURL(file),
      fileText: inferFileType(file.name) === "txt" ? await file.text() : undefined,
      fileSize: formatBytes(file.size),
      mimeType: file.type,
    }),
    ),
  );

  const urls = extractDroppedUrls(dataTransfer);
  const urlNodes = urls.map((url, index) =>
    createDroppedNode({
      title: prettifyUrl(url),
      parentId,
      nonce,
      index: fileNodes.length + index,
      fileType: inferFileType(url),
      description: url,
      fileUrl: url,
      sourceUrl: url,
    }),
  );

  return [...fileNodes, ...urlNodes];
}

function createDroppedNode({
  title,
  parentId,
  nonce,
  index,
  fileType,
  description,
  fileUrl,
  fileText,
  fileSize,
  mimeType,
  sourceUrl,
  source = "drop",
}: {
  title: string;
  parentId: string;
  nonce: number;
  index: number;
  fileType: FileType;
  description: string;
  fileUrl?: string;
  fileText?: string;
  fileSize?: string;
  mimeType?: string;
  sourceUrl?: string;
  source?: DocumentSource;
}): ProjectNode {
  return {
    id: `drop-${Date.now()}-${nonce}-${index}`,
    type: "document",
    title,
    description,
    fileUrl,
    fileText,
    fileSize,
    mimeType,
    sourceUrl,
    parentId,
    status: "draft",
    version: "v1",
    fileType,
    source,
    isNew: true,
    absorbed: false,
    responsible: "Импортировано",
    updatedAt: "только что",
  };
}

function extractDroppedUrls(dataTransfer: DataTransfer) {
  const raw = [
    dataTransfer.getData("text/uri-list"),
    dataTransfer.getData("text/plain"),
    extractUrlFromHtml(dataTransfer.getData("text/html")),
  ]
    .join("\n")
    .split(/\s+/)
    .filter(Boolean);

  return Array.from(
    new Set(
      raw.filter((value) => {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }),
    ),
  );
}

function extractUrlFromHtml(html: string) {
  return html.match(/(?:src|href)=["']([^"']+)["']/i)?.[1] ?? "";
}

function prettifyUrl(value: string) {
  const url = new URL(value);
  const lastPath = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  return lastPath || url.hostname;
}

function inferFileType(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "docx";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "xlsx";
  if (ext === "ppt" || ext === "pptx" || ext === "pptm" || ext === "potx") return "pptx";
  if (ext === "txt" || ext === "md" || ext === "rtf") return "txt";
  if (ext === "dwg" || ext === "dxf") return "dwg";
  return "unknown";
}

function findSectionMatch(title: string, sections: ProjectNode[]) {
  const normalizedTitle = normalizeImportText(title);
  for (const section of sections) {
    const tags = [section.shortCode, ...(section.tags ?? [])].filter(Boolean) as string[];
    const matchedTag = tags.find((tag) => normalizeImportText(tag).length >= 2 && normalizedTitle.includes(normalizeImportText(tag)));
    if (matchedTag) {
      return { section, tag: matchedTag };
    }
  }

  return null;
}

function normalizeImportText(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
}

function formatDeadline(deadlineAt: string) {
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return deadlineAt;
  }

  const diffMs = deadline.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const year = 365 * day;
  const unit =
    absMs >= year ? { label: "год", value: Math.round(absMs / year) }
      : absMs >= day ? { label: "дн.", value: Math.round(absMs / day) }
        : absMs >= hour ? { label: "ч.", value: Math.round(absMs / hour) }
          : { label: "мин.", value: Math.max(1, Math.round(absMs / minute)) };
  return diffMs >= 0 ? `до сдачи осталось ${unit.value} ${unit.label}` : `просрочено на ${unit.value} ${unit.label}`;
}

function stableNumber(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000;
  }
  return hash / 1000;
}

function clampSceneAxis(value: number, axis: "x" | "y" | "z") {
  const limits = { x: 38, y: 23, z: 3.2 };
  return Math.max(-limits[axis], Math.min(limits[axis], value));
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 Б";
  }
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function buildDisplayLinks(
  baseLinks: ProjectLink[],
  autoExtraLinks: ProjectLink[],
  manualLinks: ProjectLink[],
  pinnedLinkIds: Set<string>,
  deletedAutoLinkIds: Set<string>,
) {
  const byId = new Map<string, ProjectLink>();

  [...baseLinks, ...autoExtraLinks, ...manualLinks].forEach((link) => {
    if (link.source === "auto" && deletedAutoLinkIds.has(link.id)) {
      return;
    }

    byId.set(link.id, {
      ...link,
      pinned: link.source === "manual" || pinnedLinkIds.has(link.id) || link.pinned,
    });
  });

  const links = Array.from(byId.values());
  const pairGroups = links.reduce<Record<string, ProjectLink[]>>((groups, link) => {
    const pairKey = [link.from, link.to].sort().join("::");
    groups[pairKey] = [...(groups[pairKey] ?? []), link];
    return groups;
  }, {});

  return links.map((link) => {
    const pairKey = [link.from, link.to].sort().join("::");
    const group = pairGroups[pairKey] ?? [link];
    const index = group.findIndex((item) => item.id === link.id);
    const center = (group.length - 1) / 2;

    return {
      ...link,
      parallelOffset: (index - center) * 0.34,
    };
  });
}

function serializeHistorySnapshot(snapshot: HistorySnapshot) {
  return JSON.stringify({
    ...snapshot,
    pinnedLinkIds: [...snapshot.pinnedLinkIds].sort(),
    deletedAutoLinkIds: [...snapshot.deletedAutoLinkIds].sort(),
  });
}

const fontSizes = [9, 10, 11, 11.5, 12, 13, 14, 15, 16, 17, 18, 20, 21, 23, 24, 28, 30, 42, 52];

function buildFontVars(scale: number) {
  return fontSizes.reduce(
    (vars, size) => ({
      ...vars,
      [`--fs-${String(size).replace(".", "-")}`]: `${size * scale}px`,
    }),
    { "--font-scale": String(scale) } as CSSProperties & Record<string, string>,
  );
}
