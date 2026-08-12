import { employees, teamById, teams, type Employee, type Team } from "./tsumPrototype";

export type EmployeeWorkTaskStatus = "active" | "blocked" | "done" | "looped" | "overdue" | "not_started" | "in_progress" | "review" | "accepted" | "rejected";
export type WorkAlarmSeverity = "critical" | "warning" | "info";

export type EmployeeWorkTask = {
  id: string;
  title: string;
  assignedBy: string;
  assignedByRole: string;
  assignedByIsManager: boolean;
  deadline: string | null;
  status: EmployeeWorkTaskStatus;
  progress: number;
  teamIds: string[];
  workFunction: string;
  result: string;
  kpi: string;
  loopPath?: string;
};

export type EmployeeWorkAlarm = {
  id: string;
  type: "no_tasks" | "loop_no_deadline" | "no_deadline" | "wrong_assigner" | "overdue" | "blocked" | "overload" | "rejected";
  severity: WorkAlarmSeverity;
  title: string;
  description: string;
  taskId?: string;
};

export type EmployeeWorkProfile = {
  employee: Employee;
  team: Team;
  managerName: string;
  managerRole: string;
  functions: string[];
  tasks: EmployeeWorkTask[];
  alarms: EmployeeWorkAlarm[];
};

export type EmployeeMapNodeKind = "manager" | "employee" | "function" | "task" | "team" | "result" | "kpi" | "alarm";

export type EmployeeMapNode = {
  id: string;
  kind: EmployeeMapNodeKind;
  label: string;
  caption: string;
  metric: string;
  x: number;
  y: number;
  status: "normal" | "active" | "done" | "risk" | "queued";
  description: string;
};

export type EmployeeMapEdge = {
  from: string;
  to: string;
  label?: string;
  tone: "manager" | "work" | "interaction" | "result" | "risk";
  dashed?: boolean;
};

export type EmployeeWorkMap = {
  nodes: EmployeeMapNode[];
  edges: EmployeeMapEdge[];
};

const noTaskEmployeeIds = new Set(["employee-3", "employee-18", "employee-43", "employee-68"]);

const taskCatalog: Record<string, string[]> = {
  digital: ["Оптимизировать ретаргетинг private sale", "Собрать weekly ROAS отчет", "Обновить медиаплан новых брендов"],
  ecom: ["Обновить landing сезонной кампании", "Проверить конверсию главной страницы", "Собрать online merchandising план"],
  social: ["Подготовить social-календарь", "Запустить серию short video", "Согласовать публикации с брендами"],
  editorial: ["Подготовить SMS для private sale", "Обновить tone of voice guide", "Адаптировать fashion story для CRM"],
  production: ["Подготовить fashion-съемку", "Передать материалы в post-production", "Собрать channel matrix для кампании"],
  crm: ["Собрать сегмент private clients", "Запустить push-цепочку", "Проанализировать отклик CRM-кампании"],
  events: ["Подготовить brief клиентского события", "Согласовать подрядчиков fashion-show", "Закрыть post-report мероприятия"],
  brands: ["Согласовать календарь бренд-активаций", "Проверить co-funding кампании", "Подготовить отчет партнеру"],
  instore: ["Обновить контент цифровых экранов", "Подготовить сезонную инсталляцию", "Синхронизировать in-store кампанию"],
  boutiques: ["Запустить локальную кампанию бутика", "Согласовать требования бренда", "Подготовить отчет head office"],
  pr: ["Подготовить media plan", "Согласовать influencer seeding", "Собрать отчет по упоминаниям"],
  management: ["Собрать управленческий отчет", "Сверить маркетинговый бюджет", "Обновить 12-недельный план"],
};

const resultsByTeam: Record<string, [string, string]> = {
  digital: ["Кампания оптимизирована", "ROAS 4,7×"], ecom: ["Страница опубликована", "+0,6 п.п. конверсии"],
  social: ["Контент вышел в срок", "Охват 1,8 млн"], editorial: ["Материал передан в канал", "1 раунд правок"],
  production: ["Channel-ready пакет", "46 единиц контента"], crm: ["Коммуникация отправлена", "+3,1% CRM revenue"],
  events: ["Мероприятие проведено", "92% attendance"], brands: ["Обязательства выполнены", "100% brand compliance"],
  instore: ["Материалы размещены", "98% экранов вовремя"], boutiques: ["Локальный запуск выполнен", "5 бутиков в плане"],
  pr: ["Публикации размещены", "Share of voice +4 п.п."], management: ["Решение принято", "90% плана в срок"],
};

function makeBaseTasks(employee: Employee, team: Team, managerName: string): EmployeeWorkTask[] {
  if (noTaskEmployeeIds.has(employee.id)) return [];
  const numericId = Number(employee.id.replace("employee-", ""));
  const titles = taskCatalog[team.id];
  const nextTeam = teams[(teams.findIndex((item) => item.id === team.id) + 1) % teams.length];
  const result = resultsByTeam[team.id];
  const tasks: EmployeeWorkTask[] = titles.map((title, index) => ({
    id: `${employee.id}-task-${index + 1}`,
    title,
    assignedBy: managerName,
    assignedByRole: "Руководитель команды",
    assignedByIsManager: true,
    deadline: ["2026-08-18", "2026-08-21", "2026-08-25"][index],
    status: index === 1 ? "done" : "active",
    progress: [64, 100, 28][index],
    teamIds: index === 0 ? [team.id, nextTeam.id] : [team.id],
    workFunction: team.functions[index % team.functions.length],
    result: index === 1 ? result[0] : "Ожидается",
    kpi: index === 1 ? result[1] : "Будет измерен после завершения",
  }));

  if (numericId % 13 === 0) {
    tasks[0] = { ...tasks[0], status: "looped", deadline: null, progress: 47, loopPath: `${team.shortTitle} → ${nextTeam.shortTitle} → ${team.shortTitle}` };
  } else if (numericId % 11 === 0) {
    tasks[0] = { ...tasks[0], status: "overdue", deadline: "2026-08-08", progress: 76 };
  }
  if (numericId % 10 === 0) tasks[2] = { ...tasks[2], deadline: null };
  if (numericId % 17 === 0) {
    tasks[2] = { ...tasks[2], assignedBy: `Менеджер · ${nextTeam.shortTitle}`, assignedByRole: "Смежная команда", assignedByIsManager: false };
  }
  if (numericId % 9 === 0) tasks[2] = { ...tasks[2], status: "blocked", progress: 18 };
  return tasks;
}

function editorialLoopTasks(managerName: string): EmployeeWorkTask[] {
  return [
    {
      id: "employee-27-task-sms", title: "Подготовить SMS для private sale", assignedBy: managerName, assignedByRole: "Руководитель команды", assignedByIsManager: true,
      deadline: null, status: "looped", progress: 62, teamIds: ["editorial", "crm", "management"], workFunction: "CRM-тексты",
      result: "Текст не утвержден", kpi: "31 час ожидания", loopPath: "Редакция → CRM → Руководитель → Редакция",
    },
    {
      id: "employee-27-task-guide", title: "Обновить tone of voice guide", assignedBy: managerName, assignedByRole: "Руководитель команды", assignedByIsManager: true,
      deadline: "2026-08-16", status: "active", progress: 72, teamIds: ["editorial", "social", "crm"], workFunction: "Единый стиль коммуникации",
      result: "Черновик на согласовании", kpi: "Снижение повторных правок",
    },
    {
      id: "employee-27-task-fashion", title: "Адаптировать fashion story для CRM", assignedBy: "Менеджер CRM", assignedByRole: "Смежная команда", assignedByIsManager: false,
      deadline: null, status: "blocked", progress: 20, teamIds: ["editorial", "crm", "production"], workFunction: "CRM-редактура",
      result: "Нет подтвержденного brief", kpi: "Запуск CRM-кампании",
    },
  ];
}

export function diagnoseEmployeeTasks(employee: Employee, managerName: string, tasks: EmployeeWorkTask[]): EmployeeWorkAlarm[] {
  const alarms: EmployeeWorkAlarm[] = [];
  if (tasks.length === 0) {
    alarms.push({
      id: `${employee.id}-no-tasks`, type: "no_tasks", severity: "critical", title: "У сотрудника нет активных задач",
      description: `Рабочий план не сформирован. Ответственный руководитель — ${managerName}; загрузка и вклад сотрудника пока не подтверждены задачами.`,
    });
  }

  for (const task of tasks) {
    if (task.status === "looped" && !task.deadline) {
      alarms.push({
        id: `${task.id}-loop`, type: "loop_no_deadline", severity: "critical", taskId: task.id,
        title: "Задача зациклена и не имеет дедлайна", description: `${task.title}: ${task.loopPath ?? "маршрут повторяется"}. Нужен владелец решения и крайний срок.`,
      });
    } else if (!task.deadline && task.status !== "done" && task.status !== "accepted") {
      alarms.push({
        id: `${task.id}-deadline`, type: "no_deadline", severity: "warning", taskId: task.id,
        title: "У задачи нет дедлайна", description: `${task.title} нельзя проверить на своевременность и включить в прогноз загрузки.`,
      });
    }
    if (!task.assignedByIsManager) {
      alarms.push({
        id: `${task.id}-assigner`, type: "wrong_assigner", severity: "warning", taskId: task.id,
        title: "Задача поставлена не руководителем", description: `${task.assignedBy} поставил задачу напрямую. Руководитель сотрудника не подтвердил приоритет.`,
      });
    }
    if (task.status === "overdue") {
      alarms.push({
        id: `${task.id}-overdue`, type: "overdue", severity: "critical", taskId: task.id,
        title: "Просроченная задача", description: `${task.title} не завершена к ${formatTaskDate(task.deadline)}.`,
      });
    }
    if (task.status === "blocked") {
      alarms.push({
        id: `${task.id}-blocked`, type: "blocked", severity: "warning", taskId: task.id,
        title: "Задача заблокирована", description: `${task.title}: прогресс ${task.progress}%, требуется решение владельца процесса.`,
      });
    }
    if (task.status === "rejected") {
      alarms.push({
        id: `${task.id}-rejected`, type: "rejected", severity: "warning", taskId: task.id,
        title: "Результат задачи не принят", description: `${task.title}: руководитель вернул результат исполнителю на доработку.`,
      });
    }
  }
  if (employee.status === "overloaded") {
    alarms.push({
      id: `${employee.id}-overload`, type: "overload", severity: "warning", title: "Нагрузка выше устойчивого уровня",
      description: `${employee.utilization}% загрузки. Руководителю стоит пересмотреть приоритеты и объем параллельной работы.`,
    });
  }
  return alarms;
}

export const employeeWorkProfiles: EmployeeWorkProfile[] = employees.map((employee) => {
  const team = teamById(employee.teamId)!;
  const managerName = team.lead;
  const tasks = employee.id === "employee-27" ? editorialLoopTasks(managerName) : makeBaseTasks(employee, team, managerName);
  return {
    employee,
    team,
    managerName,
    managerRole: team.id === "management" ? "Директор по маркетингу" : `Руководитель · ${team.shortTitle}`,
    functions: team.functions.slice(0, 3),
    tasks,
    alarms: diagnoseEmployeeTasks(employee, managerName, tasks),
  };
});

export function formatTaskDate(value: string | null) {
  if (!value) return "Нет дедлайна";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export const employeeMapKindLabels: Record<EmployeeMapNodeKind, string> = {
  manager: "Руководитель", employee: "Сотрудник", function: "Функция", task: "Задача", team: "Взаимодействие", result: "Результат", kpi: "KPI", alarm: "Аларм",
};

export function buildEmployeeWorkMap(profile: EmployeeWorkProfile, tasks: EmployeeWorkTask[], alarms: EmployeeWorkAlarm[]): EmployeeWorkMap {
  const visibleTasks = tasks.slice(0, 3);
  const interactionIds = Array.from(new Set(tasks.flatMap((task) => task.teamIds).filter((id) => id !== profile.team.id))).slice(0, 3);
  const primaryResult = tasks.find((task) => task.status === "done" || task.status === "accepted") ?? tasks[0];
  const nodes: EmployeeMapNode[] = [
    {
      id: "manager", kind: "manager", label: profile.managerName, caption: profile.managerRole, metric: "Ставит и приоритизирует задачи", x: 500, y: 65, status: "active",
      description: "Руководитель отвечает за постановку, приоритет, дедлайн и разрешение конфликтов загрузки.",
    },
    {
      id: "employee", kind: "employee", label: profile.employee.name, caption: profile.employee.role, metric: `${profile.employee.utilization}% загрузки`, x: 500, y: 300,
      status: alarms.length ? "risk" : "active", description: `${profile.team.title}. ${tasks.length} активных и завершенных задач в текущем срезе.`,
    },
  ];

  profile.functions.forEach((workFunction, index) => nodes.push({
    id: `function-${index}`, kind: "function", label: workFunction, caption: "Что делает сотрудник", metric: `${profile.employee.uniqueFunctions} уник. функций`, x: 105, y: 145 + index * 155,
    status: "normal", description: `Функция закреплена за позицией ${profile.employee.role} и связана с задачами сотрудника.`,
  }));

  visibleTasks.forEach((task, index) => nodes.push({
    id: `task-${task.id}`, kind: "task", label: task.title, caption: `Поставил: ${task.assignedBy}`, metric: task.deadline ? `до ${formatTaskDate(task.deadline)}` : "нет дедлайна", x: 845, y: 145 + index * 155,
    status: task.status === "done" || task.status === "accepted" ? "done" : ["active", "not_started", "in_progress", "review"].includes(task.status) ? "active" : "risk", description: `${task.workFunction}. ${task.result}.`,
  }));

  interactionIds.forEach((teamId, index) => {
    const team = teamById(teamId)!;
    const positions = interactionIds.length === 1 ? [500] : interactionIds.length === 2 ? [390, 610] : [300, 500, 700];
    nodes.push({
      id: `team-${team.id}`, kind: "team", label: team.shortTitle, caption: "Смежная команда", metric: "совместная задача", x: positions[index], y: 550,
      status: "normal", description: `${profile.employee.name} взаимодействует с ${team.title} в рамках общих задач.`,
    });
  });

  if (tasks.length > 0) {
    nodes.push(
      { id: "result", kind: "result", label: primaryResult?.result ?? "Результат ожидается", caption: "Результат работы", metric: `${tasks.filter((task) => task.status === "done" || task.status === "accepted").length} завершено`, x: 850, y: 550, status: primaryResult?.status === "done" || primaryResult?.status === "accepted" ? "done" : "queued", description: primaryResult?.result ?? "Результат будет зафиксирован после выполнения задач." },
      { id: "kpi", kind: "kpi", label: primaryResult?.kpi ?? profile.employee.businessImpact, caption: "Влияние на бизнес", metric: profile.employee.businessImpact, x: 760, y: 65, status: "normal", description: `Работа сотрудника связана с результатом: ${profile.employee.businessImpact}.` },
    );
  }

  if (alarms.length > 0) {
    const critical = alarms.find((alarm) => alarm.severity === "critical") ?? alarms[0];
    nodes.push({
      id: "alarm", kind: "alarm", label: critical.title, caption: "Автодиагностика MOLECULE", metric: `${alarms.length} ${alarms.length === 1 ? "сигнал" : "сигнала"}`, x: 240, y: 65,
      status: "risk", description: critical.description,
    });
  }

  const edges: EmployeeMapEdge[] = [];
  profile.functions.forEach((_, index) => edges.push({ from: "employee", to: `function-${index}`, label: index === 0 ? "выполняет" : undefined, tone: "work" }));
  visibleTasks.forEach((task, index) => {
    edges.push({ from: "manager", to: `task-${task.id}`, label: index === 0 ? "поставил" : undefined, tone: task.assignedByIsManager ? "manager" : "risk", dashed: !task.assignedByIsManager });
    edges.push({ from: `task-${task.id}`, to: "employee", label: task.status === "looped" ? "цикл" : undefined, tone: ["looped", "overdue", "blocked", "rejected"].includes(task.status) ? "risk" : "work", dashed: task.status === "looped" });
    if (nodes.some((node) => node.id === "result")) edges.push({ from: `task-${task.id}`, to: "result", tone: task.status === "done" || task.status === "accepted" ? "result" : "work", dashed: task.status !== "done" && task.status !== "accepted" });
  });
  interactionIds.forEach((teamId, index) => edges.push({ from: "employee", to: `team-${teamId}`, label: index === 0 ? "взаимодействует" : undefined, tone: "interaction" }));
  if (nodes.some((node) => node.id === "result")) edges.push({ from: "result", to: "kpi", label: "влияет", tone: "result" });
  if (nodes.some((node) => node.id === "alarm")) {
    const alarmTask = alarms.find((alarm) => alarm.taskId && visibleTasks.some((task) => task.id === alarm.taskId));
    edges.push({ from: "alarm", to: alarmTask ? `task-${alarmTask.taskId}` : "employee", label: "аларм", tone: "risk", dashed: true });
  }
  if (tasks.length === 0) edges.push({ from: "manager", to: "employee", label: "нет задач", tone: "risk", dashed: true });
  return { nodes, edges };
}
