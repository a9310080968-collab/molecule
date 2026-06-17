import type {
  BusinessProcess,
  ChatMessage,
  DemoNotification,
  DemoProject,
  FileType,
  MapLevel,
  NodeStatus,
  ProcessDocument,
  ProcessStatus,
  ProjectNode,
} from "../types";

export const nodeStatusLabels: Record<NodeStatus, string> = {
  approved: "Согласовано",
  review: "На проверке",
  comments: "Есть замечания",
  unchecked: "Не проверено",
  draft: "Черновик",
};

export const processStatusLabels: Record<ProcessStatus, string> = {
  draft: "Черновик процесса",
  sent: "Отправлено на проверку",
  in_work: "Принято в работу",
  rejected: "Не принято",
  accepted: "Принято",
};

export const processStatusColors: Record<ProcessStatus, string> = {
  draft: "#8b93a6",
  sent: "#35d9ff",
  in_work: "#8fa0be",
  rejected: "#ff657a",
  accepted: "#2ed8a3",
};

export const plannedFeatures = [
  "Шаблоны документов",
  "Автоправила маршрутизации",
  "ИИ-разбор вложений",
];

export const demoProjects: DemoProject[] = [
  createSiriusProject(),
  createVegaProject(),
];

export const initialNotifications: DemoNotification[] = [
  {
    id: "notif-sirius-mail-ar",
    projectId: "project-sirius",
    title: "Письмо привязано к процессу АР -> ПЗ",
    description: "Вложение с тегом АР автоматически добавлено в контейнер передачи пояснительной записки.",
    time: "сегодня, 14:36",
    targetProcessId: "bp-sirius-ar-pz-1",
    unread: true,
  },
  {
    id: "notif-sirius-reject-eom",
    projectId: "project-sirius",
    title: "ЭОМ не принято",
    description: "ГИП вернул контейнер проверки щитов и освещения с замечаниями.",
    time: "сегодня, 13:20",
    targetProcessId: "bp-sirius-eom-pz",
    unread: true,
  },
  {
    id: "notif-vega-review",
    projectId: "project-vega",
    title: "Вега: ИРД принято в работу",
    description: "Задание на проектирование принято координатором проекта.",
    time: "вчера, 17:40",
    unread: false,
  },
];

function createSiriusProject(): DemoProject {
  const projectId = "project-sirius";
  const top = "level-sirius-root";
  const ar = "level-sirius-ar";
  const kr = "level-sirius-kr";
  const ird = "level-sirius-ird";
  const arFacade = "level-sirius-ar-facade";

  const levels: MapLevel[] = [
    level(projectId, top, "ЖК Сириус", "Главная молекула разделов и общих исходных данных", "node-sirius-root", [
      "node-sirius-root",
      "node-sirius-ird",
      "node-sirius-ar",
      "node-sirius-kr",
      "node-sirius-pz",
      "node-sirius-ov",
      "node-sirius-vk",
      "node-sirius-eom",
      "node-sirius-pos",
      "node-sirius-est",
      "node-doc-sirius-inbox-tu-vk",
      "node-doc-sirius-inbox-client-task",
    ]),
    level(projectId, ird, "ИРД / Общие данные", "ТЗ, задания, исходные разрешительные документы", "node-sirius-ird", [
      "node-sirius-ird",
      "node-sirius-tz",
      "node-sirius-gpzu",
      "node-sirius-survey",
      "node-sirius-design-task",
      "node-sirius-tech-conditions",
    ], top, "node-sirius-ird"),
    level(projectId, ar, "АР / Архитектурные решения", "Внутренняя инфраструктура раздела АР", "node-sirius-ar", [
      "node-sirius-ar",
      "node-sirius-ar-plans",
      "node-sirius-ar-facades",
      "node-sirius-ar-specs",
      "node-sirius-ar-color",
      "node-sirius-ar-gip",
      "node-sirius-ar-issues",
      "node-doc-sirius-ar-plan-1",
      "node-doc-sirius-ar-spec",
    ], top, "node-sirius-ar"),
    level(projectId, kr, "КР / Конструктивные решения", "Подразделы конструктива и расчетов", "node-sirius-kr", [
      "node-sirius-kr",
      "node-sirius-kr-kzh",
      "node-sirius-kr-km",
      "node-sirius-kr-loads",
      "node-sirius-kr-units",
      "node-sirius-kr-gip",
    ], top, "node-sirius-kr"),
    level(projectId, arFacade, "АР / Фасады", "Детализация фасадной ветки", "node-sirius-ar-facades", [
      "node-sirius-ar-facades",
      "node-sirius-facade-east",
      "node-sirius-facade-west",
      "node-sirius-facade-materials",
      "node-sirius-facade-comments",
      "node-doc-sirius-facade-east",
    ], ar, "node-sirius-ar-facades"),
  ];

  const nodes: ProjectNode[] = [
    node(projectId, top, "node-sirius-root", "central", "ЖК Сириус", "68%", "Готовность центральной ноды считается по согласованным разделам и ИРД.", "review", "Павел Андреев"),
    node(projectId, top, "node-sirius-ird", "ird", "Исходно-разрешительная документация", "ИРД", "Общие данные для всех разделов: ТЗ, ГПЗУ, задания, ТУ.", "approved", "Мария Соколова", ird, ["ИРД", "ТЗ", "ГПЗУ"]),
    node(projectId, top, "node-sirius-ar", "section", "Архитектурные решения", "АР", "Раздел архитектуры и планировочных решений.", "review", "Анна Лебедева", ar, ["АР", "планы", "фасад"]),
    node(projectId, top, "node-sirius-kr", "section", "Конструктивные решения", "КР", "Конструктив, расчеты нагрузок, узлы.", "unchecked", "Игорь Мельников", kr, ["КР", "КЖ", "КМ"]),
    node(projectId, top, "node-sirius-pz", "section", "Пояснительная записка", "ПЗ", "Собирает входящие данные от разделов.", "comments", "Мария Соколова", undefined, ["ПЗ", "ТЭП", "общие данные"]),
    node(projectId, top, "node-sirius-ov", "section", "Отопление и вентиляция", "ОВ", "Системы отопления, вентиляции и дымоудаления.", "approved", "Роман Фадеев"),
    node(projectId, top, "node-sirius-vk", "section", "Водоснабжение и канализация", "ВК", "Внутренние и наружные сети ВК.", "review", "Елена Морозова"),
    node(projectId, top, "node-sirius-eom", "section", "Электрооборудование и освещение", "ЭОМ", "Электрика, освещение, щиты и кабельные журналы.", "review", "Павел Андреев"),
    node(projectId, top, "node-sirius-pos", "section", "Проект организации строительства", "ПОС", "Календарный план, стройгенплан, логистика.", "draft", "Сергей Наумов"),
    node(projectId, top, "node-sirius-est", "section", "Сметная документация", "СМ", "Объемы, локальные сметы, коммерческие предложения.", "unchecked", "Ольга Данилова"),

    node(projectId, ird, "node-sirius-ird-root", "central", "ИРД", "100%", "Пакет исходных данных для всех разделов.", "approved", "Мария Соколова"),
    node(projectId, ird, "node-sirius-tz", "subsection", "Техническое задание", "ТЗ", "Базовые требования заказчика.", "approved", "Заказчик"),
    node(projectId, ird, "node-sirius-gpzu", "subsection", "ГПЗУ", "ГПЗУ", "Градостроительный план земельного участка.", "approved", "Юрист проекта"),
    node(projectId, ird, "node-sirius-survey", "subsection", "Изыскания", "ИИ", "Геология, геодезия, топография.", "review", "Координатор ИРД"),
    node(projectId, ird, "node-sirius-design-task", "subsection", "Задание на проектирование", "ЗП", "Формализованное задание для проектировщиков.", "approved", "Павел Андреев"),
    node(projectId, ird, "node-sirius-tech-conditions", "subsection", "Технические условия", "ТУ", "ТУ от ресурсоснабжающих организаций.", "comments", "Елена Морозова"),

    node(projectId, ar, "node-sirius-ar-root", "central", "АР", "42%", "Внутренний контур архитектурного раздела.", "review", "Анна Лебедева"),
    node(projectId, ar, "node-sirius-ar-plans", "subsection", "Планировочные решения", "Планы", "Планы этажей и экспликации.", "review", "Анна Лебедева"),
    node(projectId, ar, "node-sirius-ar-facades", "subsection", "Фасады", "Фасады", "Фасадные решения и материалы.", "comments", "Дмитрий Корнев", arFacade, ["фасад", "АР-Ф"]),
    node(projectId, ar, "node-sirius-ar-specs", "subsection", "Спецификации", "СП", "Ведомости элементов и помещений.", "draft", "Виктория Романова"),
    node(projectId, ar, "node-sirius-ar-color", "subsection", "Колористика", "Цвет", "Колористический паспорт.", "unchecked", "Дмитрий Корнев"),
    node(projectId, ar, "node-sirius-ar-gip", "package", "Пакет ГИП", "ГИП", "Контейнер передачи на согласование.", "review", "Павел Андреев"),
    node(projectId, ar, "node-sirius-ar-issues", "package", "Замечания экспертизы", "Зам", "Замечания и ответы по архитектуре.", "comments", "Мария Соколова"),

    node(projectId, kr, "node-sirius-kr-root", "central", "КР", "20%", "Внутренний контур конструктивного раздела.", "unchecked", "Игорь Мельников"),
    node(projectId, kr, "node-sirius-kr-kzh", "subsection", "Железобетон", "КЖ", "КЖ, плиты, монолит.", "review", "Игорь Мельников"),
    node(projectId, kr, "node-sirius-kr-km", "subsection", "Металлоконструкции", "КМ", "Узлы и спецификации металла.", "unchecked", "Ксения Артамонова"),
    node(projectId, kr, "node-sirius-kr-loads", "subsection", "Расчеты нагрузок", "РН", "Нагрузки и расчетные схемы.", "comments", "Игорь Мельников"),
    node(projectId, kr, "node-sirius-kr-units", "subsection", "Узлы", "Узлы", "Рабочие узлы и деталировка.", "draft", "Ксения Артамонова"),
    node(projectId, kr, "node-sirius-kr-gip", "package", "Пакет ГИП", "ГИП", "Передача КР на проверку.", "draft", "Павел Андреев"),

    node(projectId, arFacade, "node-sirius-facade-root", "central", "Фасады", "31%", "Детализация фасадов АР.", "comments", "Дмитрий Корнев"),
    node(projectId, arFacade, "node-sirius-facade-east", "subsection", "Восточный фасад", "ВФ", "Развертки и материалы восточного фасада.", "review", "Дмитрий Корнев"),
    node(projectId, arFacade, "node-sirius-facade-west", "subsection", "Западный фасад", "ЗФ", "Развертки и материалы западного фасада.", "draft", "Дмитрий Корнев"),
    node(projectId, arFacade, "node-sirius-facade-materials", "subsection", "Материалы", "МАТ", "Паспорта материалов и оттенки.", "comments", "Виктория Романова"),
    node(projectId, arFacade, "node-sirius-facade-comments", "package", "Комментарии заказчика", "КМТ", "Пакет замечаний по фасадам.", "comments", "Павел Андреев"),
  ];

  nodes.push(
    documentNode(projectId, top, "node-doc-sirius-inbox-tu-vk", doc("inbox-sirius-1", "ТУ_ВК_без_тега.pdf", "pdf", "v1", "draft", "Почта", "mail")),
    documentNode(projectId, top, "node-doc-sirius-inbox-client-task", doc("inbox-sirius-2", "Задание от заказчика.docx", "docx", "v1", "draft", "Чат", "chat")),
    documentNode(projectId, ar, "node-doc-sirius-ar-plan-1", doc("visual-sirius-plan-1", "План 1 этажа v4.pdf", "pdf", "v4", "review", "АР"), "node-sirius-ar"),
    documentNode(projectId, ar, "node-doc-sirius-ar-spec", doc("visual-sirius-spec-ar", "Ведомость элементов.xlsx", "xlsx", "v1", "review", "АР"), "node-sirius-ar"),
    documentNode(projectId, arFacade, "node-doc-sirius-facade-east", doc("visual-sirius-east-facade", "Восточный фасад_материалы.pptx", "pptx", "v1", "comments", "АР"), "node-sirius-ar-facades"),
  );

  const processes: BusinessProcess[] = [
    process(projectId, top, "bp-sirius-ird-ar", "node-sirius-ird", "node-sirius-ar", "Передача ИРД в АР", "ТЗ, ГПЗУ и задание на проектирование переданы архитектуре как базовые исходные данные.", "accepted", "both", "Мария Соколова", "Анна Лебедева", 0, [
      doc("doc-sirius-tz", "ТЗ на проектирование v3.docx", "docx", "v3", "approved", "ИРД"),
      doc("doc-sirius-gpzu", "ГПЗУ 77-04-2026.pdf", "pdf", "v1", "approved", "ИРД"),
    ], "18.05.2026"),
    process(projectId, top, "bp-sirius-ird-kr", "node-sirius-ird", "node-sirius-kr", "Исходные данные для КР", "Геология и задание на проектирование приняты конструктором в работу.", "in_work", "forward", "Мария Соколова", "Игорь Мельников", 0, [
      doc("doc-sirius-survey", "Геология площадки v2.pdf", "pdf", "v2", "review", "ИРД"),
    ], "сегодня, 12:00"),
    process(projectId, top, "bp-sirius-ar-kr", "node-sirius-ar", "node-sirius-kr", "Координация осей и планов", "АР передает КР актуальные планы, оси и отметки для проверки конструктивной схемы.", "sent", "forward", "Анна Лебедева", "Игорь Мельников", 0, [
      doc("doc-sirius-ar-axis", "АР_оси_и_планы_v4.pdf", "pdf", "v4", "review", "АР"),
      doc("doc-sirius-ar-grid", "Координационная сетка.xlsx", "xlsx", "v2", "review", "АР"),
    ]),
    process(projectId, top, "bp-sirius-ar-pz-1", "node-sirius-ar", "node-sirius-pz", "Пакет АР для ПЗ", "Архитектурные показатели и экспликации передаются в пояснительную записку.", "sent", "forward", "Анна Лебедева", "Мария Соколова", -1, [
      doc("doc-sirius-tep-ar", "ТЭП_АР_обновление.xlsx", "xlsx", "v2", "review", "АР", "mail"),
    ]),
    process(projectId, top, "bp-sirius-ar-pz-2", "node-sirius-ar", "node-sirius-pz", "Параллельный контейнер замечаний", "Отдельная ветка для замечаний экспертизы, чтобы не блокировать основной пакет.", "rejected", "both", "Мария Соколова", "Анна Лебедева", 1, [
      doc("doc-sirius-comments-pz", "Матрица замечаний ПЗ.xlsx", "xlsx", "v1", "comments", "ПЗ"),
    ]),
    process(projectId, top, "bp-sirius-eom-pz", "node-sirius-eom", "node-sirius-pz", "ЭОМ в пояснительную записку", "Пакет по щитам и освещению не принят: не хватает расчетов нагрузок.", "rejected", "forward", "Павел Андреев", "Мария Соколова", 0, [
      doc("doc-sirius-eom-loads", "Расчет нагрузок ЭОМ.pdf", "pdf", "v1", "comments", "ЭОМ"),
    ]),
    process(projectId, top, "bp-sirius-ov-vk", "node-sirius-ov", "node-sirius-vk", "Согласование стояков", "ОВ и ВК сверили зоны проходов инженерных стояков.", "accepted", "both", "Роман Фадеев", "Елена Морозова", 0, [
      doc("doc-sirius-risers", "Сводка стояков ОВ-ВК.xlsx", "xlsx", "v1", "approved", "ОВ/ВК"),
    ], "21.05.2026"),
    process(projectId, top, "bp-sirius-pos-est", "node-sirius-pos", "node-sirius-est", "ПОС для сметы", "Календарный план и стройгенплан передаются сметчикам для расчета временных работ.", "sent", "forward", "Сергей Наумов", "Ольга Данилова", 0, [
      doc("doc-sirius-pos-smeta", "Стройгенплан_для_сметы.pdf", "pdf", "v1", "review", "ПОС"),
    ]),
    process(projectId, top, "bp-sirius-kr-pz-draft", "node-sirius-kr", "node-sirius-pz", "Черновик согласования КР", "Нужно собрать контейнер передачи расчетных схем и спецификаций КР в пояснительную записку.", "draft", "forward", "Игорь Мельников", "Мария Соколова", 0, []),

    process(projectId, ar, "bp-sirius-ar-plans-facades", "node-sirius-ar-plans", "node-sirius-ar-facades", "Планы для фасадов", "Фасадная команда получает актуальные планировочные решения и отметки.", "sent", "forward", "Анна Лебедева", "Дмитрий Корнев", 0, [
      doc("doc-sirius-plan-1", "План 1 этажа v4.pdf", "pdf", "v4", "review", "АР"),
    ]),
    process(projectId, ar, "bp-sirius-ar-facades-gip", "node-sirius-ar-facades", "node-sirius-ar-gip", "Фасады на ГИП", "Фасадный пакет отправлен на предварительную проверку.", "sent", "forward", "Дмитрий Корнев", "Павел Андреев", 0, [
      doc("doc-sirius-facade-v2", "Фасады v2.dwg", "dwg", "v2", "review", "АР"),
    ]),
    process(projectId, ar, "bp-sirius-ar-specs-gip", "node-sirius-ar-specs", "node-sirius-ar-gip", "Спецификации на ГИП", "Ведомости элементов приняты в работу у ГИП.", "in_work", "forward", "Виктория Романова", "Павел Андреев", 0, [
      doc("doc-sirius-spec-ar", "Ведомость элементов.xlsx", "xlsx", "v1", "review", "АР"),
    ]),
    process(projectId, arFacade, "bp-sirius-facade-east-materials", "node-sirius-facade-east", "node-sirius-facade-materials", "Материалы восточного фасада", "Материалы проверяются по замечаниям заказчика.", "rejected", "forward", "Дмитрий Корнев", "Виктория Романова", 0, [
      doc("doc-sirius-east-facade", "Восточный фасад_материалы.pptx", "pptx", "v1", "comments", "АР"),
    ]),
  ];

  const chatMessages: ChatMessage[] = [
    {
      id: "chat-sirius-1",
      projectId,
      author: "Мария Соколова",
      role: "ПЗ",
      text: "АР, пришлите ТЭП отдельным контейнером, основной пакет не хочу блокировать.",
      time: "сегодня, 14:22",
      processId: "bp-sirius-ar-pz-1",
    },
    {
      id: "chat-sirius-2",
      projectId,
      author: "Павел Андреев",
      role: "ГИП",
      text: "ЭОМ: расчет нагрузок вернул, связь подсвечена как не принята. Добавьте расчет и отправьте повторно.",
      time: "сегодня, 13:20",
      processId: "bp-sirius-eom-pz",
    },
  ];

  return {
    id: projectId,
    title: "ЖК Сириус",
    address: "Объект на ул. Космическая, 12",
    updatedAt: "сегодня, 14:40",
    storageUsedGb: 247,
    storageLimitGb: 500,
    levels,
    nodes,
    processes,
    inboxDocuments: [
      doc("inbox-sirius-1", "ТУ_ВК_без_тега.pdf", "pdf", "v1", "draft", "Почта", "mail"),
      doc("inbox-sirius-2", "Задание от заказчика.docx", "docx", "v1", "draft", "Чат", "chat"),
    ],
    chatMessages,
  };
}

function createVegaProject(): DemoProject {
  const projectId = "project-vega";
  const top = "level-vega-root";
  const levels = [
    level(projectId, top, "БЦ Вега", "Компактная демо-молекула второго проекта", "node-vega-root", [
      "node-vega-root",
      "node-vega-ird",
      "node-vega-ar",
      "node-vega-kr",
      "node-vega-eom",
      "node-vega-est",
    ]),
  ];

  const nodes: ProjectNode[] = [
    node(projectId, top, "node-vega-root", "central", "БЦ Вега", "52%", "Второй проект для демонстрации переключения вкладок.", "review", "Павел Андреев"),
    node(projectId, top, "node-vega-ird", "ird", "ИРД и ТЗ", "ИРД", "Задание и исходные данные.", "approved", "Мария Соколова"),
    node(projectId, top, "node-vega-ar", "section", "Архитектура", "АР", "Архитектурный раздел.", "review", "Анна Лебедева"),
    node(projectId, top, "node-vega-kr", "section", "Конструктив", "КР", "КР и расчеты.", "draft", "Игорь Мельников"),
    node(projectId, top, "node-vega-eom", "section", "Электрика", "ЭОМ", "Электрика и освещение.", "unchecked", "Павел Андреев"),
    node(projectId, top, "node-vega-est", "section", "Смета", "СМ", "Сметная документация.", "unchecked", "Ольга Данилова"),
  ];

  const processes: BusinessProcess[] = [
    process(projectId, top, "bp-vega-ird-ar", "node-vega-ird", "node-vega-ar", "ИРД в архитектуру", "Задание принято архитектурной группой.", "in_work", "forward", "Мария Соколова", "Анна Лебедева", 0, [
      doc("doc-vega-task", "Задание на проектирование БЦ Вега.docx", "docx", "v1", "review", "ИРД"),
    ], "вчера, 17:40"),
    process(projectId, top, "bp-vega-ar-est", "node-vega-ar", "node-vega-est", "Предварительные площади", "АР отправляет площади для ранней сметы.", "sent", "forward", "Анна Лебедева", "Ольга Данилова", 0, [
      doc("doc-vega-areas", "Предварительные площади.xlsx", "xlsx", "v0.2", "review", "АР"),
    ]),
  ];

  return {
    id: projectId,
    title: "БЦ Вега",
    address: "Объект на пр. Научный, 7",
    updatedAt: "сегодня, 09:15",
    storageUsedGb: 84,
    storageLimitGb: 300,
    levels,
    nodes,
    processes,
    inboxDocuments: [],
    chatMessages: [
      {
        id: "chat-vega-1",
        projectId,
        author: "Анна Лебедева",
        role: "АР",
        text: "Отправила предварительные площади в смету отдельной веткой.",
        time: "сегодня, 09:12",
        processId: "bp-vega-ar-est",
      },
    ],
  };
}

function level(
  projectId: string,
  id: string,
  title: string,
  subtitle: string,
  centralNodeId: string,
  nodeIds: string[],
  parentLevelId?: string,
  parentNodeId?: string,
): MapLevel {
  return { id, projectId, title, subtitle, centralNodeId, nodeIds, parentLevelId, parentNodeId };
}

function node(
  projectId: string,
  levelId: string,
  id: string,
  type: ProjectNode["type"],
  title: string,
  shortCode: string,
  description: string,
  status: NodeStatus,
  responsible: string,
  childrenLevelId?: string,
  tags: string[] = [],
): ProjectNode {
  return {
    id,
    projectId,
    levelId,
    type,
    title,
    shortCode,
    description,
    status,
    responsible,
    updatedAt: "сегодня",
    childrenLevelId,
    tags,
  };
}

function documentNode(
  projectId: string,
  levelId: string,
  id: string,
  document: ProcessDocument,
  ownerNodeId?: string,
): ProjectNode {
  return {
    id,
    projectId,
    levelId,
    type: "document",
    title: document.title,
    shortCode: document.fileType.toUpperCase(),
    description: ownerNodeId ? "Файл находится внутри ноды раздела." : "Бесхозный файл. Перетащите его в раздел, чтобы разобрать.",
    status: document.status,
    responsible: document.from,
    updatedAt: document.updatedAt,
    documentOwnerNodeId: ownerNodeId,
    fileType: document.fileType,
    document,
  };
}

function process(
  projectId: string,
  levelId: string,
  id: string,
  from: string,
  to: string,
  title: string,
  description: string,
  status: ProcessStatus,
  direction: BusinessProcess["direction"],
  sender: string,
  receiver: string,
  parallelIndex: number,
  documents: ProcessDocument[],
  validationAt?: string,
): BusinessProcess {
  return {
    id,
    projectId,
    levelId,
    from,
    to,
    title,
    description,
    status,
    direction,
    sender,
    receiver,
    createdAt: "сегодня",
    validationAt,
    parallelIndex,
    source: "demo",
    documents,
  };
}

function doc(
  id: string,
  title: string,
  fileType: FileType,
  version: string,
  status: NodeStatus,
  from: string,
  source: ProcessDocument["source"] = "demo",
): ProcessDocument {
  return {
    id,
    title,
    fileType,
    version,
    status,
    from,
    source,
    updatedAt: "сегодня",
    size: fileType === "xlsx" ? "1.6 МБ" : fileType === "pdf" ? "4.2 МБ" : "820 КБ",
  };
}
