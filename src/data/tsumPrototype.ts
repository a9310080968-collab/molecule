export type Direction = "online" | "offline";

export type Team = {
  id: string;
  title: string;
  shortTitle: string;
  count: number;
  direction: Direction;
  lead: string;
  utilization: number;
  processes: number;
  tasks: number;
  budget: number;
  onTime: number;
  issues: number;
  impact: number;
  functions: string[];
};

export const teams: Team[] = [
  {
    id: "digital",
    title: "Цифровой маркетинг и продвижение",
    shortTitle: "Digital",
    count: 8,
    direction: "online",
    lead: "Анна Воронцова",
    utilization: 84,
    processes: 11,
    tasks: 74,
    budget: 8.4,
    onTime: 91,
    issues: 1,
    impact: 18,
    functions: ["performance-реклама", "ретаргетинг", "закупка трафика", "аналитика кампаний"],
  },
  {
    id: "ecom",
    title: "Маркетинг интернет-магазина",
    shortTitle: "E-commerce",
    count: 7,
    direction: "online",
    lead: "Михаил Беляев",
    utilization: 72,
    processes: 9,
    tasks: 58,
    budget: 2.7,
    onTime: 86,
    issues: 1,
    impact: 14,
    functions: ["главная страница", "посадочные страницы", "онлайн-мерчандайзинг", "CRO"],
  },
  {
    id: "social",
    title: "Социальные сети",
    shortTitle: "Social media",
    count: 8,
    direction: "online",
    lead: "София Крылова",
    utilization: 79,
    processes: 13,
    tasks: 96,
    budget: 1.9,
    onTime: 78,
    issues: 2,
    impact: 9,
    functions: ["контент-план", "публикации", "короткие видео", "community management"],
  },
  {
    id: "editorial",
    title: "Контент и редакция",
    shortTitle: "Редакция",
    count: 8,
    direction: "online",
    lead: "Елена Маркова",
    utilization: 56,
    processes: 15,
    tasks: 82,
    budget: 1.2,
    onTime: 64,
    issues: 4,
    impact: 8,
    functions: ["копирайтинг", "CRM-тексты", "редактура", "tone of voice"],
  },
  {
    id: "production",
    title: "Производство fashion-контента",
    shortTitle: "Fashion production",
    count: 12,
    direction: "online",
    lead: "Дарья Орлова",
    utilization: 88,
    processes: 16,
    tasks: 103,
    budget: 5.8,
    onTime: 73,
    issues: 3,
    impact: 13,
    functions: ["fashion-съемки", "продюсирование", "стилизация", "постпродакшн"],
  },
  {
    id: "crm",
    title: "CRM и клиентские коммуникации",
    shortTitle: "CRM",
    count: 6,
    direction: "online",
    lead: "Илья Петров",
    utilization: 67,
    processes: 10,
    tasks: 61,
    budget: 1.8,
    onTime: 88,
    issues: 1,
    impact: 11,
    functions: ["сегментация", "email", "SMS и push", "анализ отклика"],
  },
  {
    id: "events",
    title: "Мероприятия и fashion-шоу",
    shortTitle: "Events",
    count: 12,
    direction: "offline",
    lead: "Мария Лебедева",
    utilization: 63,
    processes: 12,
    tasks: 91,
    budget: 6.7,
    onTime: 69,
    issues: 3,
    impact: 10,
    functions: ["fashion-шоу", "VIP-мероприятия", "подрядчики", "бюджетирование"],
  },
  {
    id: "brands",
    title: "Маркетинг брендов и партнерские проекты",
    shortTitle: "Brand partnerships",
    count: 8,
    direction: "offline",
    lead: "Алексей Громов",
    utilization: 75,
    processes: 14,
    tasks: 79,
    budget: 3.6,
    onTime: 82,
    issues: 2,
    impact: 7,
    functions: ["ко-маркетинг", "запуски брендов", "обязательства", "совместное финансирование"],
  },
  {
    id: "instore",
    title: "Маркетинг внутри ЦУМа",
    shortTitle: "In-store",
    count: 6,
    direction: "offline",
    lead: "Ольга Жукова",
    utilization: 53,
    processes: 8,
    tasks: 47,
    budget: 2.4,
    onTime: 76,
    issues: 2,
    impact: 4,
    functions: ["экраны", "навигация", "инсталляции", "сезонное оформление"],
  },
  {
    id: "boutiques",
    title: "Маркетинг монобрендовых бутиков",
    shortTitle: "Monobrand",
    count: 5,
    direction: "offline",
    lead: "Роман Волков",
    utilization: 61,
    processes: 7,
    tasks: 39,
    budget: 1.6,
    onTime: 81,
    issues: 1,
    impact: 3,
    functions: ["локальные кампании", "бутиковые события", "brand compliance", "отчетность"],
  },
  {
    id: "pr",
    title: "PR, СМИ и инфлюенсеры",
    shortTitle: "PR & Influence",
    count: 6,
    direction: "offline",
    lead: "Ксения Романова",
    utilization: 77,
    processes: 11,
    tasks: 68,
    budget: 2.9,
    onTime: 87,
    issues: 1,
    impact: 5,
    functions: ["СМИ", "инфлюенсеры", "мониторинг", "информационная поддержка"],
  },
  {
    id: "management",
    title: "Управление и координация маркетинга",
    shortTitle: "Management",
    count: 2,
    direction: "offline",
    lead: "Виктория Соколова",
    utilization: 96,
    processes: 23,
    tasks: 42,
    budget: 0.4,
    onTime: 71,
    issues: 5,
    impact: 8,
    functions: ["координация", "маркетинговый план", "бюджет", "управленческая отчетность"],
  },
];

export type EmployeeStatus = "balanced" | "underloaded" | "overloaded";

export type Employee = {
  id: string;
  name: string;
  initials: string;
  role: string;
  teamId: string;
  cost: number;
  processes: number;
  tasks: number;
  utilization: number;
  onTime: number;
  uniqueFunctions: number;
  duplicateFunctions: number;
  dependencies: number;
  businessImpact: string;
  status: EmployeeStatus;
};

const firstNames = ["Анна", "Михаил", "София", "Илья", "Елена", "Алексей", "Дарья", "Роман", "Ольга", "Павел", "Ксения"];
const lastNames = ["Воронцова", "Беляев", "Крылова", "Петров", "Маркова", "Громов", "Орлова", "Волков", "Жукова"];
const lowLoadIndexes = new Set([2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82]);
const highLoadIndexes = new Set([4, 13, 21, 29, 38, 46, 55, 63, 71, 79, 87]);

const rolesByTeam: Record<string, string[]> = {
  digital: ["Performance lead", "Senior performance manager", "Paid social manager", "PPC manager", "Media buyer", "Web analyst"],
  ecom: ["E-commerce marketing lead", "Campaign manager", "CRO manager", "Online merchandiser", "Landing page manager"],
  social: ["Head of social", "Social media manager", "Community manager", "Short video producer", "Content coordinator"],
  editorial: ["Главный редактор", "Старший копирайтер", "Копирайтер", "CRM-редактор", "Корректор"],
  production: ["Executive producer", "Fashion producer", "Арт-директор", "Стилист", "Фотограф", "Ретушер", "Видеограф"],
  crm: ["CRM lead", "CRM campaign manager", "Специалист по сегментации", "Email-маркетолог", "CRM-аналитик"],
  events: ["Event director", "Senior event producer", "Event producer", "VIP relations manager", "Координатор подрядчиков"],
  brands: ["Brand partnerships lead", "Senior brand manager", "Brand manager", "Partnership manager", "Brand reporting manager"],
  instore: ["In-store marketing lead", "Visual campaign manager", "Digital screens manager", "Production coordinator"],
  boutiques: ["Monobrand marketing lead", "Boutique marketing manager", "Local activation manager", "Brand coordinator"],
  pr: ["PR director", "PR manager", "Media relations manager", "Influencer manager", "PR analyst"],
  management: ["Директор по маркетингу", "Руководитель операционного офиса"],
};

function employeeName(index: number) {
  return `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("");
}

export const employees: Employee[] = (() => {
  let index = 0;
  return teams.flatMap((team) => Array.from({ length: team.count }, (_, teamIndex) => {
    const globalIndex = index++;
    const isLow = lowLoadIndexes.has(globalIndex);
    const isHigh = highLoadIndexes.has(globalIndex);
    const utilization = isLow ? 38 + (globalIndex % 12) : isHigh ? 94 + (globalIndex % 10) : 58 + (globalIndex * 7) % 31;
    const roleOptions = rolesByTeam[team.id];
    const name = employeeName(globalIndex);
    return {
      id: `employee-${globalIndex + 1}`,
      name,
      initials: initials(name),
      role: roleOptions[teamIndex % roleOptions.length],
      teamId: team.id,
      cost: 220 + (globalIndex % 9) * 32 + (teamIndex === 0 ? 110 : 0),
      processes: 2 + (globalIndex * 3) % 9,
      tasks: 7 + (globalIndex * 5) % 19,
      utilization,
      onTime: 61 + (globalIndex * 7) % 38,
      uniqueFunctions: 1 + (globalIndex % 5),
      duplicateFunctions: globalIndex % 4 === 0 ? 2 : globalIndex % 3 === 0 ? 1 : 0,
      dependencies: 1 + (globalIndex * 2) % 11,
      businessImpact: globalIndex % 3 === 0 ? "Рост выручки" : globalIndex % 3 === 1 ? "Клиентский опыт" : "Скорость кампаний",
      status: isLow ? "underloaded" : isHigh ? "overloaded" : "balanced",
    } satisfies Employee;
  }));
})();

export type ProcessStepStatus = "done" | "active" | "waiting" | "queued";

export type ProcessStep = {
  title: string;
  owner: string;
  duration: string;
  status: ProcessStepStatus;
  note?: string;
};

export type Process = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  status: "risk" | "active";
  progress: number;
  budget: string;
  result: string;
  teamIds: string[];
  steps: ProcessStep[];
};

export const processes: Process[] = [
  {
    id: "sms-approval",
    title: "SMS клиентам: запуск private sale",
    kicker: "Критический маршрут согласования",
    summary: "Операционная задача прошла четыре уровня и 31 час ожидает решения генерального директора.",
    status: "risk",
    progress: 62,
    budget: "₽180 тыс.",
    result: "Ожидаемый uplift CRM-выручки +3,1%",
    teamIds: ["editorial", "crm", "management"],
    steps: [
      { title: "Текст подготовлен", owner: "Копирайтер", duration: "1 ч 20 мин", status: "done" },
      { title: "Редакторская проверка", owner: "Менеджер редакции", duration: "2 ч 10 мин", status: "done" },
      { title: "Согласование направления", owner: "Руководитель контента", duration: "5 ч 40 мин", status: "done" },
      { title: "Финальное решение", owner: "Генеральный директор", duration: "31 ч ожидания", status: "waiting", note: "Решение можно закрепить на уровне директора по маркетингу." },
      { title: "Финальная редактура", owner: "Главный редактор", duration: "—", status: "queued" },
    ],
  },
  {
    id: "fashion-shoot",
    title: "Fashion story: New season edit",
    kicker: "Сквозной производственный процесс",
    summary: "Один съемочный пакет питает семь каналов. Задержка ретуши влияет на digital, CRM, PR и экраны универмага.",
    status: "active",
    progress: 71,
    budget: "₽4,8 млн",
    result: "7 каналов · 46 единиц контента",
    teamIds: ["production", "social", "ecom", "digital", "crm", "instore", "pr"],
    steps: [
      { title: "Задание", owner: "Campaign manager", duration: "4 ч", status: "done" },
      { title: "Креативная концепция", owner: "Арт-директор", duration: "2 дн", status: "done" },
      { title: "Выбор товаров и брендов", owner: "Brand team", duration: "1,5 дн", status: "done" },
      { title: "Стилизация", owner: "Стилист", duration: "1 дн", status: "done" },
      { title: "Согласование", owner: "Fashion producer", duration: "6 ч", status: "done" },
      { title: "Организация съемки", owner: "Production team", duration: "3 дн", status: "done" },
      { title: "Съемка", owner: "Фото + video crew", duration: "1 дн", status: "done" },
      { title: "Ретушь / монтаж", owner: "Post-production", duration: "+2 дн к плану", status: "active", note: "Два специалиста одновременно работают над 29 срочными материалами." },
      { title: "Передача в каналы", owner: "Content operations", duration: "—", status: "queued" },
    ],
  },
];

export type Opportunity = {
  id: string;
  number: string;
  title: string;
  area: string;
  impact: string;
  confidence: number;
  effort: "Низкая" | "Средняя" | "Высокая";
  summary: string;
  evidence: string[];
  action: string;
};

export const opportunities: Opportunity[] = [
  {
    id: "approval",
    number: "01",
    title: "Перенести операционные согласования вниз",
    area: "Редакция · Управление",
    impact: "620 ч / год",
    confidence: 94,
    effort: "Низкая",
    summary: "Шесть повторяющихся типов задач доходят до высшего руководства без финансового или репутационного риска.",
    evidence: ["31 час среднего ожидания", "46 задач за квартал", "3 уровня повторной редактуры"],
    action: "Утвердить матрицу решений и закрепить SMS / push за директором по маркетингу.",
  },
  {
    id: "duplicates",
    number: "02",
    title: "Объединить дублирующиеся контент-функции",
    area: "Social · Редакция · CRM",
    impact: "₽9,2 млн / год",
    confidence: 88,
    effort: "Средняя",
    summary: "14 функций описаны одинаково минимум в двух командах: адаптация текстов, отчетность и календарное планирование.",
    evidence: ["14 дублей функций", "9 параллельных календарей", "22% повторных правок"],
    action: "Создать общий content operations desk и единый входящий бэклог.",
  },
  {
    id: "capacity",
    number: "03",
    title: "Перераспределить незадействованную емкость",
    area: "In-store · Events · E-commerce",
    impact: "3,6 FTE емкости",
    confidence: 91,
    effort: "Низкая",
    summary: "17 сотрудников загружены менее чем на 50%, пока 11 коллег работают выше устойчивого уровня.",
    evidence: ["17 сотрудников < 50%", "11 сотрудников > 90%", "187 часов внешнего продакшна"],
    action: "Собрать внутренний пул на кампании и протестировать перераспределение на четыре недели.",
  },
  {
    id: "agencies",
    number: "04",
    title: "Пересобрать контур агентств",
    area: "Digital · Production · PR",
    impact: "₽11,4 млн / год",
    confidence: 76,
    effort: "Средняя",
    summary: "Часть оплачиваемых агентствам работ совпадает с функциями штатных специалистов и не имеет отдельного KPI.",
    evidence: ["7 пересекающихся контрактов", "₽18,6 млн без unit KPI", "4 повторяющихся отчета"],
    action: "Развести стратегические и операционные услуги, привязать каждый контракт к измеримому результату.",
  },
  {
    id: "events-flow",
    number: "05",
    title: "Сократить маршрут подготовки мероприятий",
    area: "Events · Brands",
    impact: "−5 дней цикла",
    confidence: 83,
    effort: "Средняя",
    summary: "Подрядчики и бренд-команды получают похожие брифы в разных форматах, после чего данные сводятся вручную.",
    evidence: ["4 версии брифа", "6 ручных передач", "19% просроченных этапов"],
    action: "Ввести единый event brief и одного владельца маршрута от бюджета до post-report.",
  },
  {
    id: "reuse",
    number: "06",
    title: "Повысить повторное использование fashion-контента",
    area: "Production · Все каналы",
    impact: "₽6,2 млн / год",
    confidence: 86,
    effort: "Средняя",
    summary: "Материалы создаются под один канал, хотя исходники можно планировать пакетами сразу для семи потребителей.",
    evidence: ["24% asset reuse", "46 единиц в пилоте", "7 каналов-потребителей"],
    action: "Планировать channel matrix до съемки и назначить владельца библиотеки master-assets.",
  },
  {
    id: "calendar",
    number: "07",
    title: "Синхронизировать кампанийный календарь",
    area: "12 команд",
    impact: "−19 конфликтов / кв.",
    confidence: 92,
    effort: "Низкая",
    summary: "Команды видят общий план после фиксации собственных дедлайнов, из-за чего пики нагрузки совпадают.",
    evidence: ["19 конфликтов ресурсов", "9 локальных календарей", "11 срочных перебронировок"],
    action: "Собрать единый 12-недельный календарь с емкостью ключевых ролей.",
  },
  {
    id: "reporting",
    number: "08",
    title: "Автоматизировать управленческую отчетность",
    area: "Management · Аналитика",
    impact: "96 ч / месяц",
    confidence: 97,
    effort: "Низкая",
    summary: "Две управленческие роли еженедельно собирают статусы и бюджеты из 12 отдельных файлов.",
    evidence: ["12 источников", "96 часов в месяц", "18% расхождений версий"],
    action: "Сформировать единый живой срез из задач, процессов и бюджетных фактов.",
  },
];

export const financeCategories = [
  { label: "Digital acquisition", value: 96.8, share: 31, delta: 8, roi: "4,7×" },
  { label: "Мероприятия", value: 71.2, share: 23, delta: 14, roi: "1,8×" },
  { label: "Fashion production", value: 54.6, share: 17, delta: -3, roi: "3,1×" },
  { label: "Партнерства с брендами", value: 38.4, share: 12, delta: 2, roi: "2,6×" },
  { label: "CRM-коммуникации", value: 22.1, share: 7, delta: -6, roi: "8,9×" },
  { label: "In-store marketing", value: 18.7, share: 6, delta: 11, roi: "—" },
  { label: "Агентства и сервисы", value: 10.6, share: 4, delta: 17, roi: "—" },
];

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

export function teamById(id: string) {
  return teams.find((team) => team.id === id);
}
