import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  Activity,
  Atom,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Clock3,
  FilePlus2,
  FileText,
  Flag,
  Focus,
  GitBranch,
  Link2,
  ListTodo,
  LogOut,
  Maximize2,
  MessageCircle,
  Megaphone,
  Minus,
  Network,
  Paperclip,
  Palette,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import {
  buildEmployeeWorkMap,
  diagnoseEmployeeTasks,
  employeeMapKindLabels,
  employeeWorkProfiles,
  formatTaskDate,
  type EmployeeMapNode,
  type EmployeeWorkAlarm,
  type EmployeeWorkProfile,
  type EmployeeWorkTask,
  type EmployeeWorkTaskStatus,
  type EmployeeMapEdge,
} from "./data/employeeWorkMap";
import { teamById, teams } from "./data/tsumPrototype";

type AccountRole = "manager" | "employee";
type DemoAccount = { id: string; role: AccountRole; name: string; title: string; initials: string; login: string; employeeId?: string };
type WorkspaceWindow = "employees" | "accounts" | "analytics" | "optimization" | "tasks" | "cost" | "process" | "node" | "project-detail" | "create-task" | "create-node" | "create-link" | null;
type WorkspaceMode = "employee" | "fashion-show";
type WorkspaceNodeKind = EmployeeMapNode["kind"] | "custom";
type WorkspaceNodeData = Omit<EmployeeMapNode, "kind"> & { kind: WorkspaceNodeKind; customType?: string };
type NodePosition = { x: number; y: number };
type NodeFile = { id: string; name: string; size: number; type: string };
type NodeMeta = { description?: string; files: NodeFile[] };
type TaskQuestion = { id: string; author: string; role: AccountRole; text: string; time: string };
type OpportunityCard = { id: string; title: string; evidence: string; effect: string; action: string; tone: "critical" | "warning" | "positive" };
type DragState = { nodeId: string; pointerId: number; startClientX: number; startClientY: number; startPosition: NodePosition; moved: boolean };
type FashionNodeKind = "owner" | "stream" | "checkpoint" | "milestone" | "risk" | "event" | "result";
type FashionNodeStatus = "done" | "active" | "upcoming" | "risk";
type FashionProjectNode = {
  id: string;
  kind: FashionNodeKind;
  title: string;
  eyebrow: string;
  date: string;
  owner: string;
  status: FashionNodeStatus;
  progress: number;
  x: number;
  y: number;
  description: string;
  input: string;
  result: string;
  recipients: string[];
  tasks: string[];
  impact?: string[];
};

const accounts: DemoAccount[] = [
  { id: "manager", role: "manager", name: "Виктория Соколова", title: "Директор по маркетингу", initials: "ВС", login: "manager@tsum.demo" },
  { id: "employee", role: "employee", name: "Елена Крылова", title: "CRM-редактор", initials: "ЕК", login: "employee@tsum.demo", employeeId: "employee-27" },
];

const initialQuestions: Record<string, TaskQuestion[]> = {
  "employee-27-task-sms": [
    { id: "question-1", author: "Елена Крылова", role: "employee", text: "Кто принимает финальную версию текста: руководитель маркетинга или CRM?", time: "сегодня, 10:14" },
    { id: "question-2", author: "Виктория Соколова", role: "manager", text: "Финальное решение остается на уровне руководителя редакции. Генерального директора исключаем из маршрута.", time: "сегодня, 10:28" },
  ],
};

const surfaceWidth = 1160;
const surfaceHeight = 640;

const fashionProjectNodes: FashionProjectNode[] = [
  { id: "project-owner", kind: "owner", title: "Руководитель проекта", eyebrow: "Операционный владелец", date: "15.08–31.10", owner: "Руководитель направления мероприятий", status: "active", progress: 38, x: 500, y: 58, description: "Управляет общим планом, зависимостями, бюджетом, подрядчиками и критическим путем проекта.", input: "Цели, формат, бюджет и KPI от директора по маркетингу", result: "Единый календарный план проекта", recipients: ["Все подразделения", "Подрядчики", "Руководство"], tasks: ["Назначить ответственных", "Собрать сроки и зависимости", "Проводить регулярный контроль"] },
  { id: "fashion-stream", kind: "stream", title: "Производство показа", eyebrow: "Поток 01", date: "15.08–15.10", owner: "Директор по моде", status: "active", progress: 44, x: 135, y: 158, description: "От креативной идеи и брендов до образов, моделей и финального технического сценария.", input: "Цели проекта и утвержденный бюджет", result: "Готовый сценарий показа", recipients: ["Режиссер", "Продакшен", "Технические команды"], tasks: ["Подтвердить бренды", "Собрать образы", "Утвердить модели"] },
  { id: "concept", kind: "checkpoint", title: "Концепция утверждена", eyebrow: "Контрольная точка №1", date: "20 августа", owner: "Креативный директор", status: "done", progress: 100, x: 365, y: 158, description: "Фиксирует идею, сценографию, подиум, световое и музыкальное направление.", input: "Бизнес-цели и формат мероприятия", result: "Утвержденная креативная концепция", recipients: ["Директор по моде", "Продакшен", "PR", "Social media"], tasks: ["Собрать референсы", "Зафиксировать сценографию", "Передать концепцию командам"] },
  { id: "technical-sequence", kind: "milestone", title: "Образы и техсценарий", eyebrow: "Критический путь", date: "7–9 октября", owner: "Стилист + режиссер показа", status: "upcoming", progress: 58, x: 635, y: 158, description: "Финальная книга образов превращается в последовательность выходов, музыку, свет и видео.", input: "Образы, модели, технические чертежи", result: "Финальная последовательность выходов", recipients: ["Свет", "Звук", "Видео", "Закулисная команда"], tasks: ["7.10 зафиксировать образы", "8.10 собрать выходы", "9.10 утвердить техсценарий"] },
  { id: "guest-stream", kind: "stream", title: "Клиентский контур", eyebrow: "Поток 02", date: "20.08–15.10", owner: "Отдел по работе с VIP-клиентами", status: "active", progress: 51, x: 135, y: 310, description: "Формирует аудиторию события: приглашения, подтверждения, рассадка и сервис гостей.", input: "Целевая аудитория и лимит гостей", result: "Подтвержденная клиентская аудитория", recipients: ["Руководитель проекта", "Службы мероприятия"], tasks: ["Сегментировать базу", "Отправить приглашения", "Собрать подтверждения"] },
  { id: "guest-list", kind: "risk", title: "Финальный список гостей", eyebrow: "Критический риск", date: "Срок 11.10 · +2 дня", owner: "VIP-клиенты", status: "risk", progress: 82, x: 365, y: 310, description: "Список задержан на два дня. Система рассчитывает не только просрочку, но и влияние на зависимые процессы.", input: "Подтверждения гостей и категории сервиса", result: "Окончательный список гостей", recipients: ["Безопасность", "Регистрация", "Хостес", "Кейтеринг"], tasks: ["Закрыть неподтвержденные RSVP", "Зафиксировать категории гостей", "Передать единую версию службам"], impact: ["Рассадка", "Безопасность", "Регистрация", "Количество персонала", "Кейтеринг", "VIP-сервис"] },
  { id: "guest-readiness", kind: "milestone", title: "Готовность гостевого сервиса", eyebrow: "Зависимый результат", date: "12–14 октября", owner: "Регистрация + безопасность", status: "risk", progress: 63, x: 635, y: 310, description: "Единый план доступа, рассадки, регистрации, хостес и обслуживания гостей.", input: "Финальный список гостей", result: "Готовность клиентского контура", recipients: ["Руководитель проекта", "Площадка"], tasks: ["Обновить план рассадки", "Загрузить списки регистрации", "Пересчитать кейтеринг"], impact: ["Репетиция гостевого пути", "Готовность площадки"] },
  { id: "communications-stream", kind: "stream", title: "Коммуникации", eyebrow: "Поток 03", date: "20.08–31.10", owner: "Директор по PR", status: "active", progress: 47, x: 135, y: 462, description: "PR, social media, digital и медиаразмещение превращают проект в коммуникацию с аудиторией.", input: "Концепция и список брендов", result: "Единый коммуникационный план", recipients: ["СМИ", "Клиенты", "Digital-аудитория"], tasks: ["Согласовать PR-стратегию", "Собрать контент-план", "Запустить анонсы"] },
  { id: "content", kind: "checkpoint", title: "Контент и приглашения", eyebrow: "Производство материалов", date: "20.09–10.10", owner: "Арт-отдел + PR", status: "active", progress: 61, x: 365, y: 462, description: "Приглашения, анонсы, баннеры, навигация, экранная графика и материалы для СМИ.", input: "Креативная концепция, бренды, список гостей", result: "Пакет материалов кампании", recipients: ["PR", "Social media", "Digital marketing"], tasks: ["Собрать key visual", "Подготовить приглашения", "Адаптировать digital-форматы"] },
  { id: "media", kind: "milestone", title: "Медиа и digital готовы", eyebrow: "Коммуникационная готовность", date: "10–15 октября", owner: "PR + Social + Digital", status: "upcoming", progress: 54, x: 635, y: 462, description: "Команды готовы к освещению события, оперативной публикации фото, видео и материалов для СМИ.", input: "Финальные материалы и сценарий события", result: "План публикаций и дистрибуции", recipients: ["Аудитория", "СМИ", "Руководство"], tasks: ["Утвердить публикации дня показа", "Подготовить каналы передачи файлов", "Назначить ответственных"] },
  { id: "rehearsal", kind: "checkpoint", title: "Генеральная репетиция", eyebrow: "Статус: готово к показу", date: "14 октября", owner: "Руководитель проекта", status: "upcoming", progress: 35, x: 850, y: 190, description: "Все творческие, технические и операционные команды проверяют единый сценарий.", input: "Образы, модели, музыка, свет, видео и площадка", result: "Статус «Готово к показу»", recipients: ["Все команды проекта"], tasks: ["Провести полный прогон", "Зафиксировать замечания", "Подтвердить готовность"] },
  { id: "fashion-show", kind: "event", title: "МОДНЫЙ ПОКАЗ", eyebrow: "Единая точка сборки", date: "15 октября · 20:00", owner: "ЦУМ", status: "upcoming", progress: 38, x: 850, y: 380, description: "Три потока сходятся в одном событии: производство, клиентский сервис и коммуникации.", input: "Готовность всех подразделений и подрядчиков", result: "Проведенный модный показ", recipients: ["Гости", "Медиа", "Клиенты", "Руководство"], tasks: ["18:00 готовность площадки", "19:00 прибытие гостей", "20:00 начало показа"] },
  { id: "analytics-result", kind: "result", title: "Результаты и KPI", eyebrow: "Завершение проекта", date: "16–31 октября", owner: "Аналитики маркетинга", status: "upcoming", progress: 0, x: 850, y: 545, description: "Охват, посещаемость, вовлеченность, фактические расходы и коммерческий эффект.", input: "Данные PR, social, VIP, finance и digital", result: "Итоговый отчет по эффективности", recipients: ["Директор по маркетингу", "Руководство"], tasks: ["Собрать фактические показатели", "Сравнить план и факт", "Зафиксировать выводы"] },
];

const fashionProjectEdges: EmployeeMapEdge[] = [
  { from: "project-owner", to: "fashion-stream", label: "управляет", tone: "manager" },
  { from: "project-owner", to: "guest-stream", tone: "manager" },
  { from: "project-owner", to: "communications-stream", tone: "manager" },
  { from: "fashion-stream", to: "concept", tone: "work" },
  { from: "concept", to: "technical-sequence", label: "критический путь", tone: "manager" },
  { from: "technical-sequence", to: "rehearsal", tone: "manager" },
  { from: "guest-stream", to: "guest-list", tone: "work" },
  { from: "guest-list", to: "guest-readiness", label: "+2 дня", tone: "risk", dashed: true },
  { from: "guest-readiness", to: "fashion-show", tone: "risk", dashed: true },
  { from: "communications-stream", to: "content", tone: "work" },
  { from: "concept", to: "content", label: "концепция", tone: "interaction" },
  { from: "content", to: "media", tone: "work" },
  { from: "technical-sequence", to: "media", label: "сценарий", tone: "interaction" },
  { from: "rehearsal", to: "fashion-show", label: "готово", tone: "manager" },
  { from: "media", to: "fashion-show", tone: "work" },
  { from: "fashion-show", to: "analytics-result", label: "факт", tone: "result" },
];

function App() {
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("employee");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("employee-27");
  const [taskOverrides, setTaskOverrides] = useState<Record<string, EmployeeWorkTask[]>>({});
  const [activeWindow, setActiveWindow] = useState<WorkspaceWindow>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState("employee");
  const [activeProjectNodeId, setActiveProjectNodeId] = useState("fashion-show");
  const [zoom, setZoom] = useState(1);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("2026-08-19");
  const [collaborationTeamId, setCollaborationTeamId] = useState("editorial");
  const [customNodesByEmployee, setCustomNodesByEmployee] = useState<Record<string, WorkspaceNodeData[]>>({});
  const [customEdgesByEmployee, setCustomEdgesByEmployee] = useState<Record<string, EmployeeMapEdge[]>>({});
  const [positionOverrides, setPositionOverrides] = useState<Record<string, Record<string, NodePosition>>>({});
  const [projectPositionOverrides, setProjectPositionOverrides] = useState<Record<string, NodePosition>>({});
  const [nodeMetaByEmployee, setNodeMetaByEmployee] = useState<Record<string, Record<string, NodeMeta>>>({});
  const [questionsByTask, setQuestionsByTask] = useState<Record<string, TaskQuestion[]>>(initialQuestions);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ from: string; to: string } | null>(null);
  const [linkLabel, setLinkLabel] = useState("рабочая связь");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeDescription, setNewNodeDescription] = useState("");
  const [newNodeType, setNewNodeType] = useState("Рабочий объект");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const projectDragRef = useRef<DragState | null>(null);

  const profile = employeeWorkProfiles.find((item) => item.employee.id === selectedEmployeeId) ?? employeeWorkProfiles[0];
  const tasks = taskOverrides[profile.employee.id] ?? profile.tasks;
  const alarms = useMemo(() => diagnoseEmployeeTasks(profile.employee, profile.managerName, tasks), [profile, tasks]);
  const baseMap = useMemo(() => buildEmployeeWorkMap(profile, tasks, alarms), [profile, tasks, alarms]);
  const customNodes = customNodesByEmployee[profile.employee.id] ?? [];
  const overrides = positionOverrides[profile.employee.id] ?? {};
  const nodes: WorkspaceNodeData[] = [...baseMap.nodes, ...customNodes].map((node) => ({ ...node, ...(overrides[node.id] ?? {}) }));
  const edges = [...baseMap.edges, ...(customEdgesByEmployee[profile.employee.id] ?? [])];
  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : undefined;
  const activeNode = nodes.find((node) => node.id === activeNodeId) ?? nodes[0];
  const projectNodes = fashionProjectNodes.map((node) => ({ ...node, ...(projectPositionOverrides[node.id] ?? {}) }));
  const activeProjectNode = projectNodes.find((node) => node.id === activeProjectNodeId) ?? projectNodes[0];
  const opportunities = useMemo(() => buildOpportunities(profile, tasks, alarms), [profile, tasks, alarms]);
  const canManage = account?.role === "manager";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = window.requestAnimationFrame(() => {
      canvas.scrollLeft = Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2);
      canvas.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedEmployeeId, workspaceMode, zoom]);

  function login(nextAccount: DemoAccount) {
    setAccount(nextAccount);
    setWorkspaceMode("employee");
    setSelectedEmployeeId(nextAccount.employeeId ?? "employee-27");
    setActiveWindow(null);
    setActiveNodeId("employee");
    setActiveTaskId(null);
    setLinkingSourceId(null);
  }

  function logout() {
    setAccount(null);
    setActiveWindow(null);
    setLinkingSourceId(null);
  }

  function selectEmployee(employeeId: string) {
    if (!canManage) return;
    const nextProfile = employeeWorkProfiles.find((item) => item.employee.id === employeeId);
    if (!nextProfile) return;
    setSelectedEmployeeId(employeeId);
    setWorkspaceMode("employee");
    setCollaborationTeamId(nextProfile.team.id);
    setActiveWindow(null);
    setActiveNodeId("employee");
    setActiveTaskId(null);
    setLinkingSourceId(null);
    setZoom(1);
  }

  function openProcess(taskId: string) {
    setActiveTaskId(taskId);
    setActiveWindow("process");
  }

  function openNode(node: WorkspaceNodeData) {
    if (linkingSourceId !== null) {
      if (linkingSourceId === node.id) return;
      setPendingLink({ from: linkingSourceId, to: node.id });
      setLinkLabel("рабочая связь");
      setActiveWindow("create-link");
      return;
    }
    if (node.kind === "task") {
      openProcess(node.id.replace("task-", ""));
      return;
    }
    if (node.kind === "alarm") {
      setActiveWindow("analytics");
      return;
    }
    setActiveNodeId(node.id);
    setActiveWindow("node");
  }

  function openCreateTask() {
    if (!canManage) return;
    setWorkspaceMode("employee");
    setTaskTitle("");
    setTaskDeadline("2026-08-19");
    setCollaborationTeamId(profile.team.id);
    setActiveWindow("create-task");
  }

  function assignTask() {
    if (!canManage || !taskTitle.trim() || !taskDeadline) return;
    const task: EmployeeWorkTask = {
      id: `${profile.employee.id}-manual-${Date.now()}`,
      title: taskTitle.trim(),
      assignedBy: profile.managerName,
      assignedByRole: profile.managerRole,
      assignedByIsManager: true,
      deadline: taskDeadline,
      status: "not_started",
      progress: 0,
      teamIds: collaborationTeamId === profile.team.id ? [profile.team.id] : [profile.team.id, collaborationTeamId],
      workFunction: profile.functions[0],
      result: "Ожидается",
      kpi: "Будет определен после завершения",
    };
    setTaskOverrides((current) => ({ ...current, [profile.employee.id]: [task, ...tasks] }));
    setActiveTaskId(task.id);
    setActiveWindow("process");
  }

  function updateTaskStatus(taskId: string, status: EmployeeWorkTaskStatus) {
    const nextTasks = tasks.map((task) => task.id === taskId ? {
      ...task,
      status,
      progress: status === "accepted" ? 100 : status === "not_started" ? 0 : status === "in_progress" && task.progress === 0 ? 10 : task.progress,
      result: status === "accepted" ? (task.result === "Ожидается" ? "Результат принят руководителем" : task.result) : task.result,
    } : task);
    setTaskOverrides((current) => ({ ...current, [profile.employee.id]: nextTasks }));
  }

  function addQuestion(taskId: string, text: string) {
    if (!account || !text.trim()) return;
    const question: TaskQuestion = { id: `question-${Date.now()}`, author: account.name, role: account.role, text: text.trim(), time: "только что" };
    setQuestionsByTask((current) => ({ ...current, [taskId]: [...(current[taskId] ?? []), question] }));
  }

  function openCreateNode() {
    if (!canManage) return;
    setNewNodeTitle("");
    setNewNodeDescription("");
    setNewNodeType("Рабочий объект");
    setActiveWindow("create-node");
  }

  function createNode() {
    if (!canManage || !newNodeTitle.trim()) return;
    const existing = customNodesByEmployee[profile.employee.id] ?? [];
    const index = existing.length;
    const node: WorkspaceNodeData = {
      id: `custom-${profile.employee.id}-${Date.now()}`,
      kind: "custom",
      customType: newNodeType,
      label: newNodeTitle.trim(),
      caption: newNodeType,
      metric: "Добавлено руководителем",
      x: 365 + (index % 3) * 135,
      y: 210 + Math.floor(index / 3) * 110,
      status: "normal",
      description: newNodeDescription.trim() || "Описание пока не добавлено.",
    };
    setCustomNodesByEmployee((current) => ({ ...current, [profile.employee.id]: [...existing, node] }));
    setNodeMetaByEmployee((current) => ({ ...current, [profile.employee.id]: { ...(current[profile.employee.id] ?? {}), [node.id]: { description: node.description, files: [] } } }));
    setActiveNodeId(node.id);
    setActiveWindow("node");
  }

  function startLinking() {
    if (!canManage) return;
    setLinkingSourceId("");
    setActiveWindow(null);
  }

  function chooseLinkNode(node: WorkspaceNodeData) {
    if (linkingSourceId === "") {
      setLinkingSourceId(node.id);
      return true;
    }
    return false;
  }

  function createLink() {
    if (!canManage || !pendingLink) return;
    const edge: EmployeeMapEdge = { from: pendingLink.from, to: pendingLink.to, label: linkLabel.trim() || "связь", tone: "work" };
    setCustomEdgesByEmployee((current) => ({ ...current, [profile.employee.id]: [...(current[profile.employee.id] ?? []), edge] }));
    setPendingLink(null);
    setLinkingSourceId(null);
    setActiveWindow(null);
  }

  function getNodeMeta(nodeId: string, fallbackDescription: string): NodeMeta {
    return nodeMetaByEmployee[profile.employee.id]?.[nodeId] ?? { description: fallbackDescription, files: [] };
  }

  function updateNodeDescription(nodeId: string, description: string) {
    const currentMeta = getNodeMeta(nodeId, "");
    setNodeMetaByEmployee((current) => ({ ...current, [profile.employee.id]: { ...(current[profile.employee.id] ?? {}), [nodeId]: { ...currentMeta, description } } }));
  }

  function addNodeFiles(nodeId: string, files: FileList) {
    if (!canManage || files.length === 0) return;
    const currentMeta = getNodeMeta(nodeId, "");
    const nextFiles = Array.from(files).map((file) => ({ id: `file-${Date.now()}-${file.name}`, name: file.name, size: file.size, type: file.type || "Файл" }));
    setNodeMetaByEmployee((current) => ({ ...current, [profile.employee.id]: { ...(current[profile.employee.id] ?? {}), [nodeId]: { ...currentMeta, files: [...currentMeta.files, ...nextFiles] } } }));
  }

  function removeNodeFile(nodeId: string, fileId: string) {
    if (!canManage) return;
    const currentMeta = getNodeMeta(nodeId, "");
    setNodeMetaByEmployee((current) => ({ ...current, [profile.employee.id]: { ...(current[profile.employee.id] ?? {}), [nodeId]: { ...currentMeta, files: currentMeta.files.filter((file) => file.id !== fileId) } } }));
  }

  function startNodeDrag(event: ReactPointerEvent<HTMLButtonElement>, node: WorkspaceNodeData) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { nodeId: node.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startPosition: { x: node.x, y: node.y }, moved: false };
  }

  function moveNode(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const surface = surfaceRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !surface) return;
    const rect = surface.getBoundingClientRect();
    const dx = (event.clientX - drag.startClientX) / rect.width * 1000;
    const dy = (event.clientY - drag.startClientY) / rect.height * 620;
    if (Math.abs(event.clientX - drag.startClientX) > 3 || Math.abs(event.clientY - drag.startClientY) > 3) drag.moved = true;
    const next = { x: clamp(drag.startPosition.x + dx, 55, 945), y: clamp(drag.startPosition.y + dy, 45, 580) };
    setPositionOverrides((current) => ({ ...current, [profile.employee.id]: { ...(current[profile.employee.id] ?? {}), [drag.nodeId]: next } }));
  }

  function finishNodeDrag(event: ReactPointerEvent<HTMLButtonElement>, node: WorkspaceNodeData) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    if (drag.moved) return;
    if (linkingSourceId !== null && chooseLinkNode(node)) return;
    openNode(node);
  }

  function focusCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollTo({ left: Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2), top: 0, behavior: "smooth" });
  }

  function openFashionProject() {
    if (!canManage) return;
    setWorkspaceMode("fashion-show");
    setActiveWindow(null);
    setLinkingSourceId(null);
    setZoom(1);
  }

  function startProjectNodeDrag(event: ReactPointerEvent<HTMLButtonElement>, node: FashionProjectNode) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    projectDragRef.current = { nodeId: node.id, pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startPosition: { x: node.x, y: node.y }, moved: false };
  }

  function moveProjectNode(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = projectDragRef.current;
    const surface = surfaceRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !surface) return;
    const rect = surface.getBoundingClientRect();
    const dx = (event.clientX - drag.startClientX) / rect.width * 1000;
    const dy = (event.clientY - drag.startClientY) / rect.height * 620;
    if (Math.abs(event.clientX - drag.startClientX) > 3 || Math.abs(event.clientY - drag.startClientY) > 3) drag.moved = true;
    const next = { x: clamp(drag.startPosition.x + dx, 65, 935), y: clamp(drag.startPosition.y + dy, 45, 575) };
    setProjectPositionOverrides((current) => ({ ...current, [drag.nodeId]: next }));
  }

  function finishProjectNodeDrag(event: ReactPointerEvent<HTMLButtonElement>, node: FashionProjectNode) {
    const drag = projectDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    projectDragRef.current = null;
    if (drag.moved) return;
    setActiveProjectNodeId(node.id);
    setActiveWindow("project-detail");
  }

  if (!account) return <LoginScreen onLogin={login} />;

  return (
    <div className={`molecule-app role-${account.role}`}>
      <header className="workspace-topbar">
        <div className="workspace-brand"><strong>ЦУМ</strong><i /><span>MOLECULE</span></div>
        <button className={`employee-switch-button ${!canManage ? "is-locked" : ""} ${workspaceMode === "fashion-show" ? "project-mode" : ""}`} onClick={() => canManage && (workspaceMode === "fashion-show" ? (setWorkspaceMode("employee"), setActiveWindow(null)) : setActiveWindow("employees"))} aria-label={workspaceMode === "fashion-show" ? "Вернуться к картам сотрудников" : canManage ? "Выбрать сотрудника" : "Моя рабочая карта"}>
          <span className="employee-switch-avatar">{workspaceMode === "fashion-show" ? <CalendarDays size={18} /> : profile.employee.initials}</span>
          <span>{workspaceMode === "fashion-show" ? <><small>Конкретный процесс</small><strong>Модный показ «Осень–зима 2026»</strong><em>15 августа — 31 октября</em></> : <><small>{canManage ? "Рабочая карта сотрудника" : "Моя рабочая карта"}</small><strong>{profile.employee.name}</strong><em>{profile.team.shortTitle} · {profile.employee.role}</em></>}</span>
          {canManage ? <ChevronRight size={18} /> : <ShieldCheck size={17} />}
        </button>
        <div className="workspace-top-actions">
          <span className={`workspace-health ${workspaceMode === "fashion-show" || alarms.length ? "has-alarm" : "is-clear"}`}><i />{workspaceMode === "fashion-show" ? "1 критический риск" : alarms.length ? countLabel(alarms.length, "сигнал", "сигнала", "сигналов") : "Отклонений нет"}</span>
          {canManage && workspaceMode === "employee" && <button onClick={openCreateTask}><Plus size={17} /><span>Задача</span></button>}
          <button className="workspace-account" onClick={() => setActiveWindow("accounts")} aria-label="Учетная запись"><span>{account.initials}</span><em>{account.role === "manager" ? "Руководитель" : "Исполнитель"}</em></button>
        </div>
      </header>

      <nav className="workspace-dock" aria-label="Инструменты MOLECULE">
        <button className={workspaceMode === "employee" && (!activeWindow || ["node", "process", "employees"].includes(activeWindow)) ? "active" : ""} onClick={() => { setWorkspaceMode("employee"); setActiveWindow(null); }}><Atom size={20} /><span>Карта</span></button>
        {canManage && <button className={workspaceMode === "fashion-show" ? "active" : ""} onClick={openFashionProject}><Clapperboard size={20} /><span>Показ</span><em className="orange">1</em></button>}
        <button className={activeWindow === "tasks" || activeWindow === "create-task" ? "active" : ""} onClick={() => { setWorkspaceMode("employee"); setActiveWindow("tasks"); }}><ListTodo size={20} /><span>Задачи</span><em>{tasks.length}</em></button>
        {canManage && <button className={activeWindow === "analytics" ? "active" : ""} onClick={() => { setWorkspaceMode("employee"); setActiveWindow("analytics"); }}><BarChart3 size={20} /><span>Аналитика</span></button>}
        {canManage && <button className={activeWindow === "optimization" ? "active" : ""} onClick={() => { setWorkspaceMode("employee"); setActiveWindow("optimization"); }}><Sparkles size={20} /><span>Оптимизация</span><em className="orange">{opportunities.length}</em></button>}
        {canManage && <button className={activeWindow === "cost" ? "active" : ""} onClick={() => { setWorkspaceMode("employee"); setActiveWindow("cost"); }}><WalletCards size={20} /><span>Расходы</span></button>}
      </nav>

      <main className="visual-workspace">
        <div className="workspace-context">{workspaceMode === "fashion-show" ? <><span>Проект / Fashion show</span><strong>3 параллельных потока</strong><em>Критический путь до 15 октября 2026</em></> : <><span>Marketing / {profile.team.shortTitle}</span><strong>{countLabel(tasks.length, "бизнес-процесс", "бизнес-процесса", "бизнес-процессов")}</strong><em>Перетащите ноду, чтобы изменить карту</em></>}</div>
        {canManage && workspaceMode === "employee" && <div className="map-edit-actions"><button onClick={openCreateNode}><Plus size={16} />Нода</button><button className={linkingSourceId !== null ? "active" : ""} onClick={linkingSourceId !== null ? () => setLinkingSourceId(null) : startLinking}><Link2 size={16} />{linkingSourceId !== null ? "Отмена" : "Связь"}</button></div>}
        {workspaceMode === "fashion-show" && <div className="project-legend"><span><i className="done" />Готово</span><span><i className="active" />В работе</span><span><i className="risk" />Критический риск</span></div>}
        {workspaceMode === "employee" && linkingSourceId !== null && <div className="linking-banner"><Link2 size={16} /><span>{linkingSourceId === "" ? "Выберите первую ноду" : `Источник: ${nodeLabel(nodes, linkingSourceId)}. Теперь выберите вторую ноду.`}</span><button onClick={() => setLinkingSourceId(null)}><X size={15} /></button></div>}

        <div className="visual-canvas" ref={canvasRef}>
          <div className="visual-surface" ref={surfaceRef} style={{ width: `${surfaceWidth * zoom}px`, height: `${surfaceHeight * zoom}px` }}>
            <div className="visual-aura visual-aura--one" /><div className="visual-aura visual-aura--two" />
            <svg className="visual-edges" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <defs><filter id="edgeGlow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
              {(workspaceMode === "fashion-show" ? fashionProjectEdges : edges).map((edge, index) => {
                const currentNodes = workspaceMode === "fashion-show" ? projectNodes : nodes;
                const from = currentNodes.find((node) => node.id === edge.from);
                const to = currentNodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const middle = (from.x + to.x) / 2;
                return <g key={`${edge.from}-${edge.to}-${edge.label ?? "edge"}-${index}`} className={`visual-edge visual-edge--${edge.tone} ${edge.dashed ? "is-dashed" : ""}`}><path d={`M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`} /><circle cx={to.x} cy={to.y} r="4" />{edge.label && <text x={middle} y={(from.y + to.y) / 2 - 8} textAnchor="middle">{edge.label}</text>}</g>;
              })}
            </svg>
            {workspaceMode === "fashion-show" ? projectNodes.map((node) => <FashionProjectNodeView key={node.id} node={node} dragging={projectDragRef.current?.nodeId === node.id} onPointerDown={(event) => startProjectNodeDrag(event, node)} onPointerMove={moveProjectNode} onPointerUp={(event) => finishProjectNodeDrag(event, node)} />) : nodes.map((node) => <WorkspaceNode key={node.id} node={node} profile={profile} dragging={dragRef.current?.nodeId === node.id} linkSource={linkingSourceId === node.id} onPointerDown={(event) => startNodeDrag(event, node)} onPointerMove={moveNode} onPointerUp={(event) => finishNodeDrag(event, node)} />)}
          </div>
        </div>

        <div className="workspace-controls"><button aria-label="Уменьшить" onClick={() => setZoom((current) => Math.max(0.78, Number((current - 0.1).toFixed(2))))} disabled={zoom <= 0.78}><Minus size={18} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Увеличить" onClick={() => setZoom((current) => Math.min(1.32, Number((current + 0.1).toFixed(2))))} disabled={zoom >= 1.32}><Plus size={18} /></button><button aria-label="Центрировать карту" onClick={focusCanvas}><Focus size={18} /></button><button aria-label="Сбросить масштаб" onClick={() => { setZoom(1); window.setTimeout(focusCanvas, 20); }}><Maximize2 size={17} /></button></div>
      </main>

      {activeWindow === "employees" && canManage && <EmployeePicker profile={profile} taskOverrides={taskOverrides} onSelect={selectEmployee} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "accounts" && <AccountsWindow account={account} onSwitch={login} onLogout={logout} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "analytics" && canManage && <AnalyticsWindow profile={profile} tasks={tasks} alarms={alarms} onOpenProcess={openProcess} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "optimization" && canManage && <OptimizationWindow profile={profile} opportunities={opportunities} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "tasks" && <TasksWindow profile={profile} tasks={tasks} alarms={alarms} role={account.role} onCreate={openCreateTask} onOpenProcess={openProcess} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "cost" && canManage && <CostWindow profile={profile} tasks={tasks} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "process" && activeTask && <ProcessWindow profile={profile} task={activeTask} alarms={alarms.filter((alarm) => alarm.taskId === activeTask.id)} role={account.role} meta={getNodeMeta(`task-${activeTask.id}`, `${activeTask.workFunction}. ${activeTask.result}.`)} questions={questionsByTask[activeTask.id] ?? []} onStatusChange={(status) => updateTaskStatus(activeTask.id, status)} onDescriptionChange={(description) => updateNodeDescription(`task-${activeTask.id}`, description)} onAddFiles={(files) => addNodeFiles(`task-${activeTask.id}`, files)} onRemoveFile={(fileId) => removeNodeFile(`task-${activeTask.id}`, fileId)} onAddQuestion={(text) => addQuestion(activeTask.id, text)} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "node" && activeNode && <NodeWindow profile={profile} node={activeNode} tasks={tasks} role={account.role} meta={getNodeMeta(activeNode.id, activeNode.description)} onDescriptionChange={(description) => updateNodeDescription(activeNode.id, description)} onAddFiles={(files) => addNodeFiles(activeNode.id, files)} onRemoveFile={(fileId) => removeNodeFile(activeNode.id, fileId)} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "project-detail" && workspaceMode === "fashion-show" && activeProjectNode && <FashionProjectWindow node={activeProjectNode} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "create-task" && canManage && <CreateTaskWindow profile={profile} taskTitle={taskTitle} taskDeadline={taskDeadline} collaborationTeamId={collaborationTeamId} onTitleChange={setTaskTitle} onDeadlineChange={setTaskDeadline} onTeamChange={setCollaborationTeamId} onSubmit={assignTask} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "create-node" && canManage && <CreateNodeWindow title={newNodeTitle} description={newNodeDescription} type={newNodeType} onTitleChange={setNewNodeTitle} onDescriptionChange={setNewNodeDescription} onTypeChange={setNewNodeType} onSubmit={createNode} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "create-link" && canManage && pendingLink && <CreateLinkWindow from={nodeLabel(nodes, pendingLink.from)} to={nodeLabel(nodes, pendingLink.to)} label={linkLabel} onLabelChange={setLinkLabel} onSubmit={createLink} onClose={() => { setPendingLink(null); setLinkingSourceId(null); setActiveWindow(null); }} />}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (account: DemoAccount) => void }) {
  return <main className="login-screen"><div className="login-ambient" /><header><div className="workspace-brand"><strong>ЦУМ</strong><i /><span>MOLECULE</span></div><em>Marketing workspace · demo</em></header><section className="login-panel"><span className="login-kicker"><ShieldCheck size={17} />Выбор учетной записи</span><h1>Войдите в рабочее пространство</h1><p>Роль определяет доступные действия на карте и в бизнес-процессах.</p><div className="account-cards">{accounts.map((item) => <article key={item.id} className={`account-card role-${item.role}`}><span className="account-avatar">{item.initials}</span><div className="account-role"><i>{item.role === "manager" ? "Руководитель" : "Исполнитель"}</i><strong>{item.name}</strong><small>{item.title}</small></div><dl>{item.role === "manager" ? <><div><Check size={13} />Ставит и принимает задачи</div><div><Check size={13} />Редактирует ноды и связи</div><div><Check size={13} />Добавляет файлы и описания</div></> : <><div><Check size={13} />Видит только свою работу</div><div><Check size={13} />Меняет рабочий статус</div><div><Check size={13} />Задает вопросы по задачам</div></>}</dl><span className="account-login">{item.login}</span><button onClick={() => onLogin(item)}>Войти <ChevronRight size={16} /></button></article>)}</div><small className="login-note">Демонстрационные учетные записи · пароль не требуется</small></section></main>;
}

function WorkspaceNode({ node, profile, dragging, linkSource, onPointerDown, onPointerMove, onPointerUp }: { node: WorkspaceNodeData; profile: EmployeeWorkProfile; dragging: boolean; linkSource: boolean; onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const isProcess = node.kind === "task";
  return <button data-node-id={node.id} className={`workspace-node workspace-node--${node.kind} status-${node.status} ${isProcess ? "is-process" : "is-orb"} ${dragging ? "is-dragging" : ""} ${linkSource ? "link-source" : ""}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 6.2}%` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label={`${node.kind === "task" ? "Бизнес-процесс" : nodeKindLabel(node.kind)}: ${node.label}`}>
    {isProcess ? <><span className="process-node-status"><i />{node.status === "risk" ? "Требует внимания" : node.status === "done" ? "Принято" : "В работе"}</span><strong>{node.label}</strong><small>{node.metric}</small><ChevronRight size={15} /></> : <><span className="workspace-orb">{nodeIcon(node, profile)}</span><span className="workspace-node-copy"><em>{nodeKindLabel(node.kind)}</em><strong>{node.label}</strong><small>{node.metric}</small></span>{node.status === "risk" && <i className="node-alert"><CircleAlert size={12} /></i>}</>}
  </button>;
}

function FashionProjectNodeView({ node, dragging, onPointerDown, onPointerMove, onPointerUp }: { node: FashionProjectNode; dragging: boolean; onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  const isOrb = ["owner", "event", "result"].includes(node.kind);
  return <button data-project-node-id={node.id} className={`workspace-node fashion-project-node fashion-project-node--${node.kind} status-${node.status} ${isOrb ? "is-project-orb" : "is-project-card"} ${dragging ? "is-dragging" : ""}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 6.2}%` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label={`Проектный узел: ${node.title}`}>
    {isOrb ? <><span className="project-orb">{fashionNodeIcon(node)}</span><span className="workspace-node-copy"><em>{node.eyebrow}</em><strong>{node.title}</strong><small>{node.date}</small></span>{node.status === "risk" && <i className="node-alert"><CircleAlert size={12} /></i>}</> : <><span className="project-node-status"><i />{fashionStatusLabel(node.status)}</span><strong>{node.title}</strong><small>{node.owner}</small><em>{node.date}</em><span className="project-node-progress"><i><b style={{ width: `${node.progress}%` }} /></i><strong>{node.progress}%</strong></span><ChevronRight size={15} /></>}
  </button>;
}

function FashionProjectWindow({ node, onClose }: { node: FashionProjectNode; onClose: () => void }) {
  return <WorkspaceModal eyebrow={node.eyebrow} title={node.title} icon={fashionNodeIcon(node)} onClose={onClose}><div className={`process-window-hero project-window-hero status-${node.status}`}><div><span>{fashionStatusLabel(node.status)}</span><strong>{node.progress}%</strong><small>готовность результата</small></div><i><b style={{ width: `${node.progress}%` }} /></i><dl><div><dt>Ответственный</dt><dd>{node.owner}<small>Операционный владелец результата</small></dd></div><div><dt>Срок</dt><dd>{node.date}</dd></div></dl></div>
    <section className="project-node-overview"><header><span>Роль в общем процессе</span><h3>Входящие данные → работа → результат</h3></header><p>{node.description}</p><div className="project-dependency-route"><article><i><Paperclip size={17} /></i><span>Что поступает</span><strong>{node.input}</strong></article><ChevronRight size={20} /><article><i><BriefcaseBusiness size={17} /></i><span>Ответственный</span><strong>{node.owner}</strong></article><ChevronRight size={20} /><article><i><Flag size={17} /></i><span>Результат</span><strong>{node.result}</strong></article></div></section>
    {node.impact && <section className="project-impact"><header><TriangleAlert size={19} /><div><span>Автоматический расчет влияния</span><h3>{node.status === "risk" ? "Задержка распространяется на зависимые процессы" : "Зависимые процессы требуют контроля"}</h3></div></header><div>{node.impact.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}</div><p>MOLECULE повышает риск проекта и показывает руководителю не только просрочку, но и все затронутые команды и результаты.</p></section>}
    <div className="project-detail-columns"><section><header><span>Задачи узла</span><h3>Что должно быть выполнено</h3></header><div className="project-task-list">{node.tasks.map((task, index) => <article key={task}><span>{String(index + 1).padStart(2, "0")}</span><strong>{task}</strong><em>{index < Math.round(node.tasks.length * node.progress / 100) ? "Готово" : "В работе"}</em></article>)}</div></section><section><header><span>Передача результата</span><h3>Кто зависит от результата</h3></header><div className="project-recipient-list">{node.recipients.map((recipient) => <span key={recipient}><UsersRound size={16} />{recipient}</span>)}</div></section></div>
  </WorkspaceModal>;
}

function WorkspaceModal({ eyebrow, title, icon, onClose, size = "wide", children }: { eyebrow: string; title: string; icon: ReactNode; onClose: () => void; size?: "wide" | "compact"; children: ReactNode }) {
  return <div className="workspace-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`workspace-modal workspace-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title"><header><div className="modal-title-icon">{icon}</div><div><span>{eyebrow}</span><h2 id="workspace-modal-title">{title}</h2></div><button aria-label="Закрыть" onClick={onClose}><X size={20} /></button></header><div className="workspace-modal-content">{children}</div></section></div>;
}

function AccountsWindow({ account, onSwitch, onLogout, onClose }: { account: DemoAccount; onSwitch: (account: DemoAccount) => void; onLogout: () => void; onClose: () => void }) {
  return <WorkspaceModal eyebrow="Демо-доступ" title="Учетные записи" icon={<ShieldCheck size={20} />} onClose={onClose} size="compact"><div className="account-switch-list">{accounts.map((item) => <button key={item.id} className={item.id === account.id ? "active" : ""} onClick={() => onSwitch(item)}><span>{item.initials}</span><div><em>{item.role === "manager" ? "Руководитель" : "Исполнитель"}</em><strong>{item.name}</strong><small>{item.login}</small></div>{item.id === account.id ? <CheckCircle2 size={19} /> : <ChevronRight size={18} />}</button>)}</div><button className="logout-button" onClick={onLogout}><LogOut size={17} />Выйти из пространства</button></WorkspaceModal>;
}

function EmployeePicker({ profile, taskOverrides, onSelect, onClose }: { profile: EmployeeWorkProfile; taskOverrides: Record<string, EmployeeWorkTask[]>; onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  const visible = employeeWorkProfiles.filter((item) => (teamFilter === "all" || item.team.id === teamFilter) && (!normalized || `${item.employee.name} ${item.employee.role} ${item.team.shortTitle}`.toLocaleLowerCase("ru-RU").includes(normalized)));
  return <WorkspaceModal eyebrow="88 сотрудников" title="Выберите рабочую карту" icon={<Search size={20} />} onClose={onClose}><div className="employee-picker-toolbar"><label><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или должность" /></label><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="all">Все отделы</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}</select></div><div className="workspace-employee-list">{visible.map((item) => { const itemTasks = taskOverrides[item.employee.id] ?? item.tasks; const itemAlarms = diagnoseEmployeeTasks(item.employee, item.managerName, itemTasks); return <button key={item.employee.id} data-employee-id={item.employee.id} className={item.employee.id === profile.employee.id ? "selected" : ""} onClick={() => onSelect(item.employee.id)}><span>{item.employee.initials}</span><div><strong>{item.employee.name}</strong><small>{item.employee.role}</small><em>{item.team.shortTitle} · загрузка {item.employee.utilization}%</em></div><i className={itemAlarms.length ? "has-alarm" : "is-clear"}>{itemAlarms.length || <Check size={13} />}</i></button>; })}</div></WorkspaceModal>;
}

function AnalyticsWindow({ profile, tasks, alarms, onOpenProcess, onClose }: { profile: EmployeeWorkProfile; tasks: EmployeeWorkTask[]; alarms: EmployeeWorkAlarm[]; onOpenProcess: (id: string) => void; onClose: () => void }) {
  const completed = tasks.filter((task) => task.status === "done" || task.status === "accepted").length;
  const teamsCount = new Set(tasks.flatMap((task) => task.teamIds)).size;
  const averageProgress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  return <WorkspaceModal eyebrow="Запрос MOLECULE" title={`Аналитика · ${profile.employee.name}`} icon={<BarChart3 size={20} />} onClose={onClose}><div className="analysis-summary"><div className={alarms.length ? "has-alarm" : "is-clear"}><span>{alarms.length ? "Нужна проверка руководителя" : "Работа организована устойчиво"}</span><strong>{alarms.length ? countLabel(alarms.length, "отклонение", "отклонения", "отклонений") : "Отклонений нет"}</strong><p>Анализ построен по задачам, срокам, постановщикам и межкомандным связям сотрудника.</p></div><button><Sparkles size={17} />Пересчитать анализ</button></div><div className="analysis-metrics"><MetricCard label="Загрузка" value={`${profile.employee.utilization}%`} note="Текущий рабочий срез" /><MetricCard label="Средний прогресс" value={`${averageProgress}%`} note={`${completed} завершено`} /><MetricCard label="Процессы" value={String(tasks.length)} note={`${teamsCount} команд вовлечено`} /><MetricCard label="В срок" value={`${profile.employee.onTime}%`} note="По истории выполнения" /></div><div className="analysis-columns"><section><header><span>Диагностика</span><h3>Что требует внимания</h3></header>{alarms.length ? <div className="analysis-alarm-list">{alarms.map((alarm) => <button key={alarm.id} onClick={() => alarm.taskId && onOpenProcess(alarm.taskId)}><CircleAlert size={17} /><span><strong>{alarm.title}</strong><small>{alarm.description}</small></span><ChevronRight size={16} /></button>)}</div> : <div className="analysis-clear"><Check size={20} /><span><strong>Критичных сигналов нет</strong><small>Все процессы имеют владельца и срок.</small></span></div>}</section><section><header><span>Бизнес-процессы</span><h3>Текущая работа</h3></header><div className="analysis-process-list">{tasks.map((task) => <button key={task.id} onClick={() => onOpenProcess(task.id)}><span className={`task-dot status-${task.status}`} /><div><strong>{task.title}</strong><small>{task.deadline ? `до ${formatTaskDate(task.deadline)}` : "без дедлайна"}</small></div><em>{task.progress}%</em></button>)}</div></section></div></WorkspaceModal>;
}

function OptimizationWindow({ profile, opportunities, onClose }: { profile: EmployeeWorkProfile; opportunities: OpportunityCard[]; onClose: () => void }) {
  return <WorkspaceModal eyebrow="Optimization opportunities" title={`Потенциал · ${profile.employee.name}`} icon={<Sparkles size={20} />} onClose={onClose}><div className="optimization-intro"><div><span>Найдено</span><strong>{countLabel(opportunities.length, "возможность", "возможности", "возможностей")}</strong><p>Это гипотезы для проверки с руководителем, а не готовое кадровое решение.</p></div><button><Sparkles size={17} />Обновить рекомендации</button></div><div className="opportunity-window-list">{opportunities.map((item, index) => <article key={item.id} className={`tone-${item.tone}`}><header><span>{String(index + 1).padStart(2, "0")}</span><em>{item.tone === "critical" ? "Высокий приоритет" : item.tone === "warning" ? "Проверить" : "Возможность"}</em></header><h3>{item.title}</h3><dl><div><dt>Наблюдение</dt><dd>{item.evidence}</dd></div><div><dt>Ожидаемый эффект</dt><dd>{item.effect}</dd></div><div><dt>Следующий шаг</dt><dd>{item.action}</dd></div></dl><button>Добавить в план <ChevronRight size={15} /></button></article>)}</div></WorkspaceModal>;
}

function TasksWindow({ profile, tasks, alarms, role, onCreate, onOpenProcess, onClose }: { profile: EmployeeWorkProfile; tasks: EmployeeWorkTask[]; alarms: EmployeeWorkAlarm[]; role: AccountRole; onCreate: () => void; onOpenProcess: (id: string) => void; onClose: () => void }) {
  return <WorkspaceModal eyebrow={role === "manager" ? "Рабочий контур" : "Мои задачи"} title={`Задачи · ${profile.employee.name}`} icon={<ListTodo size={20} />} onClose={onClose}><div className="tasks-window-header"><div><strong>{countLabel(tasks.length, "процесс", "процесса", "процессов")}</strong><span>{alarms.length ? `${countLabel(alarms.length, "сигнал", "сигнала", "сигналов")} требуют внимания` : "отклонений не найдено"}</span></div>{role === "manager" && <button onClick={onCreate}><Plus size={17} />Поставить задачу</button>}</div>{tasks.length ? <div className="tasks-window-list">{tasks.map((task) => { const taskAlarms = alarms.filter((alarm) => alarm.taskId === task.id); return <button key={task.id} onClick={() => onOpenProcess(task.id)}><span className={`task-window-state status-${task.status}`}><i />{taskStatusLabel(task.status)}</span><div><strong>{task.title}</strong><small>Поставил: {task.assignedBy}{task.assignedByIsManager ? " · руководитель" : " · не подтверждено"}</small><em>{task.teamIds.map((id) => teamById(id)?.shortTitle).filter(Boolean).join(" → ")}</em></div><span className="task-window-progress"><b>{task.progress}%</b><i><em style={{ width: `${task.progress}%` }} /></i></span><span className={task.deadline ? "task-window-deadline" : "task-window-deadline missing"}><Clock3 size={14} />{formatTaskDate(task.deadline)}</span>{taskAlarms.length > 0 && <span className="task-window-alarm"><CircleAlert size={13} />{taskAlarms.length}</span>}<ChevronRight size={18} /></button>; })}</div> : <div className="empty-work-plan"><CircleAlert size={23} /><h3>У сотрудника нет задач</h3><p>{role === "manager" ? "Сформируйте рабочий план." : "Руководитель пока не сформировал рабочий план."}</p>{role === "manager" && <button onClick={onCreate}><Plus size={16} />Поставить первую задачу</button>}</div>}</WorkspaceModal>;
}

function CostWindow({ profile, tasks, onClose }: { profile: EmployeeWorkProfile; tasks: EmployeeWorkTask[]; onClose: () => void }) {
  const monthly = profile.employee.cost;
  const annual = monthly * 12;
  const perProcess = tasks.length ? Math.round(monthly / tasks.length) : monthly;
  return <WorkspaceModal eyebrow="Ресурсная модель" title={`Расходы · ${profile.employee.name}`} icon={<WalletCards size={20} />} onClose={onClose}><div className="cost-hero"><div><span>Стоимость позиции / месяц</span><strong>₽{monthly} тыс.</strong><small>Демонстрационная оценка полной стоимости позиции</small></div><div><span>Годовая стоимость</span><strong>₽{(annual / 1000).toFixed(2)} млн</strong><small>Без учета агентств и production-бюджетов</small></div></div><div className="cost-grid"><MetricCard label="На один процесс" value={`₽${perProcess} тыс.`} note="Условное распределение" /><MetricCard label="Бюджет команды" value={`₽${profile.team.budget} млн`} note="В месяц" /><MetricCard label="Загрузка" value={`${profile.employee.utilization}%`} note="Фактический срез" /></div><section className="resource-allocation"><header><span>Распределение ресурса</span><h3>На что уходит рабочее время</h3></header>{tasks.length ? tasks.map((task) => <div key={task.id}><span><strong>{task.title}</strong><small>{task.workFunction}</small></span><i><b style={{ width: `${Math.max(12, Math.round(100 / tasks.length))}%` }} /></i><em>≈ ₽{perProcess} тыс.</em></div>) : <p>Невозможно распределить стоимость: рабочий план не сформирован.</p>}</section></WorkspaceModal>;
}

function ProcessWindow({ profile, task, alarms, role, meta, questions, onStatusChange, onDescriptionChange, onAddFiles, onRemoveFile, onAddQuestion, onClose }: { profile: EmployeeWorkProfile; task: EmployeeWorkTask; alarms: EmployeeWorkAlarm[]; role: AccountRole; meta: NodeMeta; questions: TaskQuestion[]; onStatusChange: (status: EmployeeWorkTaskStatus) => void; onDescriptionChange: (description: string) => void; onAddFiles: (files: FileList) => void; onRemoveFile: (fileId: string) => void; onAddQuestion: (text: string) => void; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  return <WorkspaceModal eyebrow="Бизнес-процесс" title={task.title} icon={<GitBranch size={20} />} onClose={onClose}><div className={`process-window-hero status-${task.status}`}><div><span>{taskStatusLabel(task.status)}</span><strong>{task.progress}%</strong><small>готовность процесса</small></div><i><b style={{ width: `${task.progress}%` }} /></i><dl><div><dt>Постановщик</dt><dd>{task.assignedBy}<small>{task.assignedByIsManager ? "Приоритет подтвержден руководителем" : "Нет подтверждения руководителя"}</small></dd></div><div><dt>Дедлайн</dt><dd>{formatTaskDate(task.deadline)}</dd></div></dl></div>
    <TaskStatusControls role={role} status={task.status} onChange={onStatusChange} />
    <section className="process-chain-section"><header><span>Маршрут процесса</span><h3>От задачи до бизнес-результата</h3></header><div className="process-chain"><span><i><UserRound size={18} /></i><em>Сотрудник</em><strong>{profile.employee.name}</strong></span><ChevronRight size={18} /><span><i><BriefcaseBusiness size={18} /></i><em>Функция</em><strong>{task.workFunction}</strong></span><ChevronRight size={18} /><span><i><Network size={18} /></i><em>Команды</em><strong>{task.teamIds.map((id) => teamById(id)?.shortTitle).filter(Boolean).join(" · ")}</strong></span><ChevronRight size={18} /><span><i><Target size={18} /></i><em>Результат</em><strong>{task.result}</strong></span><ChevronRight size={18} /><span><i><Activity size={18} /></i><em>KPI</em><strong>{task.kpi}</strong></span></div></section>
    {task.loopPath && <div className="process-loop"><CircleAlert size={19} /><div><span>Обнаружен повторяющийся маршрут</span><strong>{task.loopPath}</strong><p>Процесс возвращается на предыдущий уровень без зафиксированного решения.</p></div></div>}
    {alarms.length > 0 && <section className="process-alarm-section"><header><span>Диагностика MOLECULE</span><h3>Отклонения процесса</h3></header>{alarms.map((alarm) => <article key={alarm.id}><CircleAlert size={17} /><div><strong>{alarm.title}</strong><p>{alarm.description}</p></div><em>{alarmSeverityLabel(alarm.severity)}</em></article>)}</section>}
    <NodeContentSection role={role} meta={meta} onDescriptionChange={onDescriptionChange} onAddFiles={onAddFiles} onRemoveFile={onRemoveFile} />
    <section className="task-discussion"><header><span><MessageCircle size={16} />Обсуждение задачи</span><strong>{countLabel(questions.length, "сообщение", "сообщения", "сообщений")}</strong></header><div className="question-thread">{questions.length ? questions.map((item) => <article key={item.id} className={`role-${item.role}`}><span>{initials(item.author)}</span><div><header><strong>{item.author}</strong><em>{item.role === "manager" ? "Руководитель" : "Исполнитель"} · {item.time}</em></header><p>{item.text}</p></div></article>) : <p className="question-empty">Вопросов по задаче пока нет.</p>}</div><form onSubmit={(event) => { event.preventDefault(); onAddQuestion(question); setQuestion(""); }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={role === "employee" ? "Задать вопрос руководителю по задаче…" : "Ответить исполнителю…"} /><button type="submit" disabled={!question.trim()}><Send size={16} />Отправить</button></form></section>
  </WorkspaceModal>;
}

function TaskStatusControls({ role, status, onChange }: { role: AccountRole; status: EmployeeWorkTaskStatus; onChange: (status: EmployeeWorkTaskStatus) => void }) {
  return <section className={`task-status-controls role-${role}`}><div><span>{role === "manager" ? "Решение руководителя" : "Мой рабочий статус"}</span><strong>{taskStatusLabel(status)}</strong></div><div>{role === "manager" ? <><button className={status === "accepted" ? "active accepted" : "accepted"} onClick={() => onChange("accepted")}><CheckCircle2 size={17} />Принято</button><button className={status === "rejected" ? "active rejected" : "rejected"} onClick={() => onChange("rejected")}><XCircle size={17} />Не принято</button></> : <><button className={status === "not_started" ? "active" : ""} onClick={() => onChange("not_started")}><PauseCircle size={17} />Не в работе</button><button className={status === "in_progress" ? "active" : ""} onClick={() => onChange("in_progress")}><PlayCircle size={17} />В работе</button><button className={status === "review" ? "active review" : "review"} onClick={() => onChange("review")}><Send size={17} />Передано на проверку</button></>}</div></section>;
}

function NodeWindow({ profile, node, tasks, role, meta, onDescriptionChange, onAddFiles, onRemoveFile, onClose }: { profile: EmployeeWorkProfile; node: WorkspaceNodeData; tasks: EmployeeWorkTask[]; role: AccountRole; meta: NodeMeta; onDescriptionChange: (description: string) => void; onAddFiles: (files: FileList) => void; onRemoveFile: (fileId: string) => void; onClose: () => void }) {
  const relatedTasks = node.kind === "team" ? tasks.filter((task) => task.teamIds.includes(node.id.replace("team-", ""))) : tasks;
  return <WorkspaceModal eyebrow={nodeKindLabel(node.kind)} title={node.label} icon={nodeIcon(node, profile)} onClose={onClose} size="compact"><div className={`node-window-summary status-${node.status}`}><span>{node.metric}</span><p>{meta.description ?? node.description}</p></div><dl className="node-window-facts"><div><dt>Сотрудник</dt><dd>{profile.employee.name}</dd></div><div><dt>Команда</dt><dd>{profile.team.shortTitle}</dd></div><div><dt>Руководитель</dt><dd>{profile.managerName}</dd></div><div><dt>Связанные процессы</dt><dd>{relatedTasks.length}</dd></div></dl><NodeContentSection role={role} meta={meta} onDescriptionChange={onDescriptionChange} onAddFiles={onAddFiles} onRemoveFile={onRemoveFile} /></WorkspaceModal>;
}

function NodeContentSection({ role, meta, onDescriptionChange, onAddFiles, onRemoveFile }: { role: AccountRole; meta: NodeMeta; onDescriptionChange: (description: string) => void; onAddFiles: (files: FileList) => void; onRemoveFile: (fileId: string) => void }) {
  const [description, setDescription] = useState(meta.description ?? "");
  useEffect(() => setDescription(meta.description ?? ""), [meta.description]);
  return <section className="node-content-section"><header><div><span>Материалы объекта</span><h3>Описание и файлы</h3></div>{role === "manager" && <label className="attach-file-button"><FilePlus2 size={16} />Добавить файлы<input type="file" multiple onChange={(event) => event.currentTarget.files && onAddFiles(event.currentTarget.files)} /></label>}</header>{role === "manager" ? <label className="node-description-editor"><span>Описание</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /><button onClick={() => onDescriptionChange(description)}>Сохранить описание</button></label> : <div className="node-description-view"><span>Описание</span><p>{description || "Описание не добавлено."}</p></div>}<div className="node-file-list">{meta.files.length ? meta.files.map((file) => <article key={file.id}><span><FileText size={18} /></span><div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · {file.type || "Файл"}</small></div>{role === "manager" && <button aria-label={`Удалить ${file.name}`} onClick={() => onRemoveFile(file.id)}><X size={15} /></button>}</article>) : <div className="no-node-files"><Paperclip size={18} /><span>Файлы пока не добавлены</span></div>}</div></section>;
}

function CreateTaskWindow({ profile, taskTitle, taskDeadline, collaborationTeamId, onTitleChange, onDeadlineChange, onTeamChange, onSubmit, onClose }: { profile: EmployeeWorkProfile; taskTitle: string; taskDeadline: string; collaborationTeamId: string; onTitleChange: (value: string) => void; onDeadlineChange: (value: string) => void; onTeamChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  return <WorkspaceModal eyebrow="Постановка руководителя" title="Новая задача" icon={<Plus size={20} />} onClose={onClose} size="compact"><form className="create-task-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><div className="create-task-person"><span>{profile.employee.initials}</span><div><strong>{profile.employee.name}</strong><small>{profile.employee.role}</small></div></div><div className="manager-confirm"><Check size={17} /><p><span>Постановщик</span><strong>{profile.managerName} · {profile.managerRole}</strong></p></div><label><span>Что нужно сделать</span><input autoFocus value={taskTitle} onChange={(event) => onTitleChange(event.target.value)} placeholder="Например, подготовить отчет кампании" /></label><div className="form-columns"><label><span>Дедлайн</span><input type="date" min="2026-08-12" value={taskDeadline} onChange={(event) => onDeadlineChange(event.target.value)} /></label><label><span>Смежная команда</span><select value={collaborationTeamId} onChange={(event) => onTeamChange(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}</select></label></div><div className="modal-form-actions"><button type="button" onClick={onClose}>Отмена</button><button type="submit" disabled={!taskTitle.trim() || !taskDeadline}><Plus size={16} />Поставить задачу</button></div></form></WorkspaceModal>;
}

function CreateNodeWindow({ title, description, type, onTitleChange, onDescriptionChange, onTypeChange, onSubmit, onClose }: { title: string; description: string; type: string; onTitleChange: (value: string) => void; onDescriptionChange: (value: string) => void; onTypeChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  return <WorkspaceModal eyebrow="Редактор карты" title="Новая нода" icon={<Plus size={20} />} onClose={onClose} size="compact"><form className="create-task-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label><span>Название ноды</span><input autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Например, Бриф кампании" /></label><label><span>Тип объекта</span><select value={type} onChange={(event) => onTypeChange(event.target.value)}><option>Рабочий объект</option><option>Документ</option><option>Контрольная точка</option><option>Внешний участник</option></select></label><label><span>Описание</span><textarea className="form-textarea" value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="Для чего нужен этот объект и какой результат ожидается" /></label><div className="modal-form-actions"><button type="button" onClick={onClose}>Отмена</button><button type="submit" disabled={!title.trim()}><Plus size={16} />Добавить на карту</button></div></form></WorkspaceModal>;
}

function CreateLinkWindow({ from, to, label, onLabelChange, onSubmit, onClose }: { from: string; to: string; label: string; onLabelChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  return <WorkspaceModal eyebrow="Редактор карты" title="Новая связь" icon={<Link2 size={20} />} onClose={onClose} size="compact"><form className="create-task-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><div className="link-preview"><span>{from}</span><i><Link2 size={18} /></i><span>{to}</span></div><label><span>Подпись связи</span><input autoFocus value={label} onChange={(event) => onLabelChange(event.target.value)} placeholder="Например, передает результат" /></label><div className="modal-form-actions"><button type="button" onClick={onClose}>Отмена</button><button type="submit"><Link2 size={16} />Создать связь</button></div></form></WorkspaceModal>;
}

function nodeIcon(node: WorkspaceNodeData, profile: EmployeeWorkProfile) {
  if (node.kind === "employee") return <b>{profile.employee.initials}</b>;
  if (node.kind === "manager") return <UserRound size={23} />;
  if (node.kind === "function") return <BriefcaseBusiness size={21} />;
  if (node.kind === "team") return <UsersRound size={22} />;
  if (node.kind === "result") return <Target size={22} />;
  if (node.kind === "kpi") return <Activity size={22} />;
  if (node.kind === "custom") return <FileText size={21} />;
  return <CircleAlert size={22} />;
}

function fashionNodeIcon(node: FashionProjectNode) {
  if (node.kind === "owner") return <UserRound size={22} />;
  if (node.kind === "event") return <Clapperboard size={24} />;
  if (node.kind === "result") return <Activity size={22} />;
  if (node.id.includes("communications") || node.id === "media") return <Megaphone size={21} />;
  if (node.id.includes("guest")) return <UsersRound size={21} />;
  if (node.id === "concept" || node.id === "content") return <Palette size={21} />;
  if (node.kind === "risk") return <TriangleAlert size={21} />;
  return <Flag size={21} />;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) { return <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }

function buildOpportunities(profile: EmployeeWorkProfile, tasks: EmployeeWorkTask[], alarms: EmployeeWorkAlarm[]): OpportunityCard[] {
  const items: OpportunityCard[] = alarms.map((alarm) => {
    const task = tasks.find((item) => item.id === alarm.taskId);
    if (alarm.type === "no_tasks") return { id: alarm.id, title: "Сформировать измеримый рабочий план", evidence: "У сотрудника нет активных задач и подтвержденного вклада в текущий план.", effect: "Появится понятная загрузка и ответственность за результат.", action: `Руководитель ${profile.managerName} ставит первую задачу с дедлайном.`, tone: "critical" };
    if (alarm.type === "loop_no_deadline") return { id: alarm.id, title: "Разорвать цикл согласований", evidence: task?.loopPath ?? alarm.description, effect: "Сократить ожидание и убрать повторные возвраты.", action: "Назначить уровень финального решения и зафиксировать дедлайн.", tone: "critical" };
    if (alarm.type === "wrong_assigner") return { id: alarm.id, title: "Вернуть приоритизацию руководителю", evidence: alarm.description, effect: "Убрать конфликт приоритетов между смежными командами.", action: "Подтвердить или снять задачу на уровне непосредственного руководителя.", tone: "warning" };
    if (alarm.type === "rejected") return { id: alarm.id, title: "Уточнить критерии приемки", evidence: alarm.description, effect: "Сократить повторные возвраты результата.", action: "Зафиксировать комментарий руководителя и критерии повторной проверки.", tone: "warning" };
    return { id: alarm.id, title: alarm.type === "overload" ? "Перераспределить параллельную работу" : "Вернуть процесс в управляемый контур", evidence: alarm.description, effect: "Снизить задержки и сделать результат измеримым.", action: "Проверить владельца, срок и следующий шаг.", tone: alarm.severity === "critical" ? "critical" : "warning" };
  });
  if (items.length === 0) items.push({ id: "healthy-capacity", title: "Масштабировать устойчивую практику", evidence: "Все процессы имеют постановщика, срок и измеримый результат.", effect: "Использовать рабочую схему как эталон для команды.", action: "Сравнить маршрут с похожими ролями и зафиксировать шаблон.", tone: "positive" });
  return items.slice(0, 5);
}

function taskStatusLabel(status: EmployeeWorkTaskStatus) { return { active: "В работе", blocked: "Заблокирован", done: "Завершен", looped: "Зациклен", overdue: "Просрочен", not_started: "Не в работе", in_progress: "В работе", review: "Передано на проверку", accepted: "Принято", rejected: "Не принято" }[status]; }
function fashionStatusLabel(status: FashionNodeStatus) { return { done: "Готово", active: "В работе", upcoming: "Предстоит", risk: "Критический риск" }[status]; }
function alarmSeverityLabel(severity: EmployeeWorkAlarm["severity"]) { return { critical: "Критично", warning: "Внимание", info: "Информация" }[severity]; }
function nodeKindLabel(kind: WorkspaceNodeKind) { return kind === "custom" ? "Нода" : employeeMapKindLabels[kind]; }
function nodeLabel(nodes: WorkspaceNodeData[], id: string) { return nodes.find((node) => node.id === id)?.label ?? "Нода"; }
function initials(name: string) { return name.split(" ").slice(0, 2).map((item) => item[0]).join(""); }
function formatFileSize(bytes: number) { return bytes < 1024 ? `${bytes} Б` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`; }
function countLabel(value: number, one: string, few: string, many: string) { const lastTwo = value % 100; const last = value % 10; const word = lastTwo >= 11 && lastTwo <= 19 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many; return `${value} ${word}`; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

export default App;
