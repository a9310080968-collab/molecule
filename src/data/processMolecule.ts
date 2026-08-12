import { teams } from "./tsumPrototype";

export type ProcessMapMode = "department" | "fashion" | "approval";
export type MapNodeKind = "department" | "team" | "employee" | "function" | "process" | "task" | "resource" | "result" | "kpi" | "issue";
export type MapNodeStatus = "normal" | "active" | "done" | "waiting" | "queued" | "risk";

export type ProcessMapNode = {
  id: string;
  label: string;
  caption: string;
  kind: MapNodeKind;
  status: MapNodeStatus;
  x: number;
  y: number;
  metric?: string;
  description: string;
  owner: string;
  resource: string;
  result: string;
  kpi: string;
  chain: string[];
};

export type ProcessMapEdge = {
  from: string;
  to: string;
  label?: string;
  tone: "primary" | "neutral" | "risk" | "positive";
  dashed?: boolean;
};

export type ProcessMap = {
  title: string;
  subtitle: string;
  rootLabel: string;
  defaultSelectedId: string;
  nodes: ProcessMapNode[];
  edges: ProcessMapEdge[];
};

const teamPositions = [
  [500, 62], [700, 92], [850, 190], [900, 320], [840, 468], [665, 548],
  [455, 558], [270, 520], [130, 430], [92, 290], [160, 150], [325, 78],
];

const departmentRoot: ProcessMapNode = {
  id: "marketing-root",
  label: "Marketing",
  caption: "Департамент",
  kind: "department",
  status: "active",
  x: 500,
  y: 310,
  metric: "88 сотрудников · 12 команд",
  description: "Живая карта маркетинга: команды связаны с процессами, расходами и измеримым результатом, а не только со штатным расписанием.",
  owner: "Виктория Соколова",
  resource: "₽312,4 млн / год",
  result: "149 активных процессов",
  kpi: "72 / 100 индекс эффективности",
  chain: ["ЦУМ", "Marketing", "12 команд", "Бизнес-результат"],
};

const departmentNodes: ProcessMapNode[] = teams.map((team, index) => {
  const signal = team.utilization > 90 || team.utilization < 58 || team.issues > 3;
  return {
    id: `team-${team.id}`,
    label: team.shortTitle,
    caption: team.direction === "online" ? "Онлайн-команда" : "Офлайн-команда",
    kind: "team",
    status: signal ? "risk" : team.utilization > 84 ? "active" : "normal",
    x: teamPositions[index][0],
    y: teamPositions[index][1],
    metric: `${team.count} чел. · ${team.utilization}%`,
    description: `${team.title}. Основные функции: ${team.functions.join(", ")}.`,
    owner: team.lead,
    resource: `₽${team.budget.toLocaleString("ru-RU")} млн / мес.`,
    result: `${team.onTime}% задач выполнено в срок`,
    kpi: `${team.impact}% вклада в маркетинг`,
    chain: ["ЦУМ", "Marketing", team.shortTitle, "Процессы", "Бизнес-результат"],
  } satisfies ProcessMapNode;
});

const departmentEdges: ProcessMapEdge[] = departmentNodes.map((node, index) => ({
  from: departmentRoot.id,
  to: node.id,
  label: index === 0 ? "онлайн" : index === 6 ? "офлайн" : undefined,
  tone: index < 6 ? "primary" : "neutral",
}));

const fashionNodes: ProcessMapNode[] = [
  {
    id: "fashion-process", label: "New season edit", caption: "Сквозной процесс", kind: "process", status: "active", x: 500, y: 310,
    metric: "71% · ₽4,8 млн", description: "Один производственный процесс создает пакет контента для семи маркетинговых каналов.", owner: "Дарья Орлова", resource: "12 сотрудников · ₽4,8 млн", result: "46 единиц контента", kpi: "7 каналов-потребителей", chain: ["Fashion production", "New season edit", "7 каналов", "Продажи"],
  },
  {
    id: "fashion-brief", label: "Задание", caption: "Задача", kind: "task", status: "done", x: 260, y: 78,
    metric: "4 часа", description: "Campaign manager фиксирует бизнес-задачу, целевую аудиторию, каналы и срок запуска.", owner: "Campaign manager", resource: "4 часа", result: "Утвержденный brief", kpi: "Полнота входных данных 96%", chain: ["Сотрудник", "Задание", "Fashion story", "Кампания"],
  },
  {
    id: "fashion-concept", label: "Креативная концепция", caption: "Функция", kind: "function", status: "done", x: 500, y: 55,
    metric: "2 дня", description: "Арт-директор переводит коммерческую задачу в визуальную идею и набор master-assets.", owner: "Арт-директор", resource: "2 рабочих дня", result: "Concept board", kpi: "1 раунд правок", chain: ["Арт-директор", "Концепция", "Съемка", "Кампанийный результат"],
  },
  {
    id: "fashion-products", label: "Товары и бренды", caption: "Межкомандная связь", kind: "resource", status: "done", x: 742, y: 82,
    metric: "18 брендов", description: "Brand team и e-commerce подтверждают ассортимент, приоритеты партнеров и наличие товара.", owner: "Brand partnerships", resource: "54 SKU · 18 брендов", result: "Подтвержденная selection", kpi: "100% товара в наличии", chain: ["Бренды", "Товары", "Стилизация", "Контент"],
  },
  {
    id: "fashion-styling", label: "Стилизация", caption: "Функция", kind: "function", status: "done", x: 882, y: 210,
    metric: "1 день", description: "Стилист собирает образы и обеспечивает соответствие концепции коммерческим приоритетам.", owner: "Стилист", resource: "14 образов", result: "Утвержденные looks", kpi: "0 замен в день съемки", chain: ["Стилист", "Образы", "Съемка", "Master-assets"],
  },
  {
    id: "fashion-approval", label: "Согласование", caption: "Контрольная точка", kind: "task", status: "done", x: 890, y: 392,
    metric: "6 часов", description: "Fashion producer проверяет бюджет, команду, тайминг и обязательства перед брендами.", owner: "Fashion producer", resource: "6 часов", result: "Go на производство", kpi: "В пределах SLA", chain: ["Producer", "Согласование", "Производство", "Каналы"],
  },
  {
    id: "fashion-shoot", label: "Съемка", caption: "Процесс", kind: "process", status: "done", x: 720, y: 530,
    metric: "1 съемочный день", description: "Фото- и video crew производят исходники одновременно для digital, CRM, PR и in-store.", owner: "Production crew", resource: "11 специалистов", result: "312 исходников", kpi: "98% shot list", chain: ["Crew", "Съемка", "Исходники", "Постпродакшн"],
  },
  {
    id: "fashion-post", label: "Ретушь / монтаж", caption: "Узкое место", kind: "issue", status: "risk", x: 474, y: 560,
    metric: "+2 дня", description: "Два специалиста одновременно обрабатывают 29 срочных материалов. Задержка блокирует четыре команды.", owner: "Post-production", resource: "2 специалиста · 29 материалов", result: "Задержка передачи", kpi: "SLA нарушен на 48 часов", chain: ["Post-production", "Задержка", "4 команды", "Поздний запуск"],
  },
  {
    id: "fashion-delivery", label: "Передача материалов", caption: "Задача", kind: "task", status: "queued", x: 245, y: 520,
    metric: "46 assets", description: "Content operations раскладывает master-assets по форматам и владельцам каналов.", owner: "Content operations", resource: "46 готовых файлов", result: "Channel-ready pack", kpi: "24% повторного использования", chain: ["Материалы", "Адаптация", "7 каналов", "Кампания"],
  },
  {
    id: "fashion-channels", label: "7 каналов", caption: "Влияние", kind: "result", status: "queued", x: 95, y: 385,
    metric: "Social · Site · CRM…", description: "Один пакет расходится в социальные сети, сайт, рекламу, CRM, экраны ЦУМа, PR и партнерские размещения.", owner: "7 владельцев каналов", resource: "46 единиц контента", result: "Единый запуск кампании", kpi: "Охват 8,4 млн", chain: ["Master-assets", "7 каналов", "Клиенты", "Выручка"],
  },
  {
    id: "fashion-kpi", label: "Результат кампании", caption: "KPI", kind: "kpi", status: "active", x: 115, y: 205,
    metric: "+3,8% GMV", description: "Коммерческий результат связывает работу production с трафиком, конверсией и продажами кампании.", owner: "E-commerce analytics", resource: "7 источников данных", result: "+3,8% GMV кампании", kpi: "ROAS 4,2×", chain: ["Контент", "Трафик", "Конверсия", "GMV"],
  },
];

const fashionSequence = ["fashion-brief", "fashion-concept", "fashion-products", "fashion-styling", "fashion-approval", "fashion-shoot", "fashion-post", "fashion-delivery", "fashion-channels", "fashion-kpi"];
const fashionEdges: ProcessMapEdge[] = fashionSequence.slice(0, -1).map((from, index) => ({
  from,
  to: fashionSequence[index + 1],
  label: index === 5 ? "задержка" : undefined,
  tone: index === 5 ? "risk" : index > 6 ? "positive" : "primary",
}));
fashionEdges.push(
  { from: "fashion-process", to: "fashion-brief", label: "старт", tone: "neutral", dashed: true },
  { from: "fashion-process", to: "fashion-channels", label: "результат", tone: "positive", dashed: true },
  { from: "fashion-post", to: "fashion-process", label: "влияет на 4 команды", tone: "risk", dashed: true },
);

const approvalNodes: ProcessMapNode[] = [
  {
    id: "sms-process", label: "SMS private sale", caption: "Операционный процесс", kind: "process", status: "active", x: 500, y: 70,
    metric: "62% · 31 час ожидания", description: "Повторяющийся маршрут клиентской коммуникации, который доходит до высшего руководства.", owner: "CRM + Редакция", resource: "5 участников", result: "SMS-кампания не запущена", kpi: "Ожидаемый uplift +3,1%", chain: ["CRM", "SMS", "Согласование", "Запуск", "Выручка"],
  },
  {
    id: "sms-copy", label: "Копирайтер", caption: "Сотрудник", kind: "employee", status: "done", x: 80, y: 315,
    metric: "1 ч 20 мин", description: "Готовит текст в рамках утвержденного tone of voice и ограничений SMS.", owner: "София Воронцова", resource: "1 ч 20 мин", result: "Текст подготовлен", kpi: "1 версия", chain: ["Сотрудник", "Текст", "SMS", "Клиент"],
  },
  {
    id: "sms-editor", label: "Менеджер редакции", caption: "Проверка", kind: "task", status: "done", x: 255, y: 315,
    metric: "2 ч 10 мин", description: "Проверяет факты, формат и соответствие коммуникационному календарю.", owner: "Менеджер редакции", resource: "2 ч 10 мин", result: "Редакторская проверка", kpi: "SLA соблюден", chain: ["Редакция", "Проверка", "SMS", "Согласование"],
  },
  {
    id: "sms-head", label: "Руководитель контента", caption: "Согласование", kind: "task", status: "done", x: 430, y: 315,
    metric: "5 ч 40 мин", description: "Подтверждает соответствие контентной политике. После этого операционный риск уже закрыт.", owner: "Елена Маркова", resource: "5 ч 40 мин", result: "Контент согласован", kpi: "Риск закрыт", chain: ["Руководитель", "Контроль", "Решение", "Запуск"],
  },
  {
    id: "sms-ceo", label: "Генеральный директор", caption: "Неоправданное вовлечение", kind: "issue", status: "waiting", x: 620, y: 315,
    metric: "31 час ожидания", description: "Высшее руководство вовлечено в операционную задачу без отдельного финансового или репутационного риска.", owner: "Генеральный директор", resource: "6 подобных задач сейчас", result: "Запуск заблокирован", kpi: "620 часов / год потенциала", chain: ["Операционная задача", "CEO", "Ожидание", "Поздний запуск"],
  },
  {
    id: "sms-final", label: "Финальная редактура", caption: "Задача", kind: "task", status: "queued", x: 805, y: 315,
    metric: "В очереди", description: "Главный редактор вносит финальные изменения после решения и передает текст CRM-команде.", owner: "Главный редактор", resource: "30 минут по нормативу", result: "Готовый текст", kpi: "Не начато", chain: ["Редактура", "CRM", "Отправка", "Отклик"],
  },
  {
    id: "sms-result", label: "Запуск кампании", caption: "Бизнес-результат", kind: "result", status: "queued", x: 930, y: 315,
    metric: "+3,1% uplift", description: "Отправка сегменту private sale и измерение отклика, конверсии и инкрементальной выручки.", owner: "CRM lead", resource: "184 тыс. клиентов", result: "Инкрементальная выручка", kpi: "+3,1% CRM revenue", chain: ["SMS", "184 тыс. клиентов", "Конверсия", "Выручка"],
  },
  {
    id: "sms-signal", label: "Системный сигнал", caption: "Optimization opportunity", kind: "issue", status: "risk", x: 745, y: 92,
    metric: "46 задач / квартал", description: "Шесть повторяющихся типов задач проходят лишний уровень решения и создают одинаковое ожидание.", owner: "MOLECULE", resource: "46 наблюдений", result: "Выявлен повторяемый паттерн", kpi: "94% уверенность", chain: ["История задач", "Паттерн", "Гипотеза", "Решение"],
  },
  {
    id: "sms-alternative", label: "Директор по маркетингу", caption: "Рекомендуемый уровень", kind: "employee", status: "active", x: 620, y: 525,
    metric: "−31 час цикла", description: "Матрица полномочий может закрепить операционные коммуникации на уровне директора по маркетингу.", owner: "Виктория Соколова", resource: "В рамках текущей роли", result: "Решение без эскалации", kpi: "−620 часов / год", chain: ["Контент согласован", "Marketing director", "Отправка", "Результат"],
  },
];

const approvalEdges: ProcessMapEdge[] = [
  { from: "sms-process", to: "sms-copy", label: "задача", tone: "neutral", dashed: true },
  { from: "sms-copy", to: "sms-editor", tone: "primary" },
  { from: "sms-editor", to: "sms-head", tone: "primary" },
  { from: "sms-head", to: "sms-ceo", tone: "risk" },
  { from: "sms-ceo", to: "sms-final", label: "31 ч", tone: "risk" },
  { from: "sms-final", to: "sms-result", tone: "neutral" },
  { from: "sms-ceo", to: "sms-signal", label: "повторяется", tone: "risk", dashed: true },
  { from: "sms-head", to: "sms-alternative", label: "целевой маршрут", tone: "positive", dashed: true },
  { from: "sms-alternative", to: "sms-final", label: "без CEO", tone: "positive", dashed: true },
];

export const processMaps: Record<ProcessMapMode, ProcessMap> = {
  department: {
    title: "Департамент как система",
    subtitle: "12 команд вокруг общего результата. Нажмите на узел, чтобы увидеть владельца, ресурс и вклад.",
    rootLabel: "ЦУМ → Marketing → Team → Result",
    defaultSelectedId: "marketing-root",
    nodes: [departmentRoot, ...departmentNodes],
    edges: departmentEdges,
  },
  fashion: {
    title: "Fashion-контент: полный цикл",
    subtitle: "От задания до коммерческого KPI. Красный узел показывает влияние задержки на другие команды.",
    rootLabel: "Employee → Function → Process → Channels → KPI",
    defaultSelectedId: "fashion-process",
    nodes: fashionNodes,
    edges: fashionEdges,
  },
  approval: {
    title: "SMS: лишний уровень согласования",
    subtitle: "Фактический и рекомендуемый маршруты решения одной операционной задачи.",
    rootLabel: "Task → Approval → Delay → Optimization opportunity",
    defaultSelectedId: "sms-ceo",
    nodes: approvalNodes,
    edges: approvalEdges,
  },
};

export const mapKindLabels: Record<MapNodeKind, string> = {
  department: "Департамент",
  team: "Команда",
  employee: "Сотрудник",
  function: "Функция",
  process: "Процесс",
  task: "Задача",
  resource: "Ресурс",
  result: "Результат",
  kpi: "KPI",
  issue: "Сигнал",
};
