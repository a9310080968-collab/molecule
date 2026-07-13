import type {
  BusinessProcess,
  ChatMessage,
  DemoProject,
  FileType,
  MapLevel,
  NodeChecklistItem,
  NodeStatus,
  ProcessDocument,
  ProcessStatus,
  ProjectNode,
  ProjectParticipant,
} from "../types";

const PROJECT_ID = "project-roga-kopyta";
const NOW = "сегодня, 15:10";

export function createRogaProject(): DemoProject {
  const root = "level-roga-root";
  const ird = "level-roga-ird";
  const gp = "level-roga-gp";
  const ar = "level-roga-ar";
  const kr = "level-roga-kr";
  const km = "level-roga-km";
  const ios = "level-roga-ios";
  const tx = "level-roga-tx";

  const levels: MapLevel[] = [
    level(root, "ЖК «Рога и копыта»", "РД: проектная молекула, ИРД, разделы, задания и согласования", "node-roga-root", [
      "node-roga-root",
      "node-roga-ird",
      "node-roga-gp",
      "node-roga-ar",
      "node-roga-kr",
      "node-roga-km",
      "node-roga-tx",
      "node-roga-ios",
      "node-roga-pb",
      "node-roga-keo",
      "node-roga-pos",
      "node-roga-oos",
      "node-roga-obe",
      "node-roga-odi",
      "node-roga-est",
      "node-roga-external",
      "node-roga-fabricators",
    ]),
    level(ird, "Исходные данные", "ГПЗУ, ЗнП, договор, ТЗ, ТУ, изыскания, согласования, разрешения", "node-roga-ird", [
      "node-roga-ird",
      "node-roga-ird-gpzu",
      "node-roga-ird-znp",
      "node-roga-ird-contract",
      "node-roga-ird-tz",
      "node-roga-ird-pzz",
      "node-roga-ird-tu",
      "node-roga-ird-atr",
      "node-roga-ird-survey",
      "node-roga-ird-authorities",
      "node-roga-ird-land",
      "node-roga-ird-permit",
      "node-roga-ird-expertise",
      "node-roga-ird-networks",
      "node-roga-ird-ago",
      "node-roga-ird-kgiop",
      "node-roga-ird-photo",
      "node-roga-ird-calendar",
      "node-roga-ird-ctu",
      "node-roga-ird-marketing",
      "node-doc-roga-gpzu",
      "node-doc-roga-znp",
      "node-doc-roga-tu",
    ], root, "node-roga-ird"),
    level(gp, "ГП / Генплан", "Генплан, ПЗУ, ППТ и передача планировочных ограничений в АР", "node-roga-gp", [
      "node-roga-gp",
      "node-roga-gp-pzu",
      "node-roga-gp-ppt",
      "node-roga-gp-layout",
      "node-roga-gp-improvement",
      "node-roga-gp-redlines",
    ], root, "node-roga-gp"),
    level(ar, "АР / Архитектурные решения", "АР0, АР1, АР2, фасады, входы, лифтовые шахты, ведомости и интерьеры", "node-roga-ar", [
      "node-roga-ar",
      "node-roga-ar0",
      "node-roga-ar1",
      "node-roga-ar2",
      "node-roga-ar31",
      "node-roga-ar32",
      "node-roga-ar4",
      "node-roga-ar5",
      "node-roga-ai1",
      "node-roga-ai2",
      "node-doc-roga-ar-facades",
      "node-doc-roga-ar-spec",
      "node-doc-roga-ar-plan",
    ], root, "node-roga-ar"),
    level(kr, "КЖ / Конструкции железобетонные", "Котлован, гидроизоляция, фундаменты, плиты, вертикальные конструкции и крыша", "node-roga-kr", [
      "node-roga-kr",
      "node-roga-kzh-010",
      "node-roga-kzh-011",
      "node-roga-kzh-012",
      "node-roga-kzh-02",
      "node-roga-kzh-03",
      "node-roga-kzh-11",
      "node-roga-kzh-12",
      "node-roga-kzh-21",
      "node-roga-kzh-22",
      "node-roga-kzh-3",
      "node-roga-kzh-4",
      "node-roga-kzh-41",
      "node-roga-kzh-gp",
      "node-doc-roga-kr-calc",
      "node-doc-roga-kr-slab",
    ], root, "node-roga-kr"),
    level(km, "КМ / Конструкции металлические", "КМ1, КМ2, фасадные подсистемы, корзины, лестницы, козырьки и нестандартные конструкции", "node-roga-km", [
      "node-roga-km",
      "node-roga-km1",
      "node-roga-km2",
      "node-roga-km-roof",
      "node-roga-km-facade",
      "node-doc-roga-km-spec",
    ], root, "node-roga-km"),
    level(ios, "ИОС / Инженерные сети", "ЭОМ, ОВ, ВК, НВК, СС, АПС, АУПТ, ИТП и насосная", "node-roga-ios", [
      "node-roga-ios",
      "node-roga-spis",
      "node-roga-itp",
      "node-roga-uute",
      "node-roga-tm",
      "node-roga-eom-itp",
      "node-roga-atm",
      "node-roga-ns",
      "node-roga-eom",
      "node-roga-no",
      "node-roga-ov",
      "node-roga-ov1",
      "node-roga-ov2",
      "node-roga-ov3",
      "node-roga-vk",
      "node-roga-nvk",
      "node-roga-ss",
      "node-roga-sb",
      "node-roga-pv",
      "node-roga-skpt",
      "node-roga-sks",
      "node-roga-aps",
      "node-roga-aupt",
      "node-roga-appz",
      "node-doc-roga-ios-matrix",
    ], root, "node-roga-ios"),
    level(tx, "ТХ / Технологические решения", "Технологические задания в АР, ГП, КР и ИОС", "node-roga-tx", [
      "node-roga-tx",
      "node-roga-tx-main",
      "node-roga-tx-equipment",
      "node-roga-tx-loads",
      "node-doc-roga-tx-task",
    ], root, "node-roga-tx"),
  ];

  const nodes: ProjectNode[] = [
    node(root, "node-roga-root", "central", "ЖК «Рога и копыта»", "63%", [
      "Имя проекта: ЖК «Рога и копыта»",
      "Заказчик: ООО «...»",
      "Генпроектировщик: ООО «...»",
      "ГИП: Иванов И.И.",
      "Стадия: РД",
      "Статус: Проектирование",
      "Срок: 01.01.2026 — 01.12.2026",
      "Экспертиза: не пройдена",
    ].join("\n"), "review", "Иванов И.И."),
    {
      ...node(root, "node-roga-ird", "ird", "Исходные данные", "ИРД", "Общий входной пакет для всех разделов: ГПЗУ, ЗнП, ТЗ, ТУ, договоры и согласования.", "approved", "Мария Соколова", ird, ["ИРД", "ТЗ", "ГПЗУ", "ЗнП", "ТУ"]),
      checklist: checklist("ird", [
        ["ГПЗУ / ППТ", true],
        ["Задание на проектирование", true],
        ["Договор от заказчика", true],
        ["Техническое задание", true],
        ["ТУ и условия подключения", true],
        ["Изыскания", false],
        ["Согласования с госорганами", false],
        ["Положительное заключение экспертизы", false],
      ]),
    },
    {
      ...node(root, "node-roga-gp", "section", "Генплан", "ГП", "Схема планировочной организации участка, красные линии, благоустройство и задания в АР.", "review", "Олег Фомин", gp, ["ГП", "ПЗУ", "ППТ"]),
      checklist: checklist("gp", [
        ["ПЗУ", true],
        ["ППТ", true],
        ["Разбивочный план", true],
        ["Благоустройство", false],
      ]),
    },
    {
      ...node(root, "node-roga-ar", "section", "Архитектурные решения", "АР", "АР0–АР5, фасады, планы, входы, лифтовые шахты, ведомости и интерьеры.", "review", "Анна Лебедева", ar, ["АР", "АР0", "АР1", "АР2", "АР3.1", "АР3.2", "АР4", "АР5", "АИ"]),
      checklist: checklist("ar", [
        ["АР0: корпуса ниже 0.000", true],
        ["АР1: корпуса выше 0.000", true],
        ["АР2: кровли, разрезы, узлы", true],
        ["АР3.1: фасады", false],
        ["АР3.2: входы и лестницы", true],
        ["АР5: ведомости и спецификации", true],
      ]),
    },
    {
      ...node(root, "node-roga-kr", "section", "Конструктивные решения / КЖ", "КЖ/КР", "Железобетон: котлован, гидроизоляция, фундаменты, плиты, вертикальные конструкции.", "comments", "Игорь Мельников", kr, ["КЖ", "КР", "КЖ0.1.0", "КЖ2.1", "КЖ2.2"]),
      checklist: checklist("kr", [
        ["КЖ0.1.0: котлован", true],
        ["КЖ0.1.1: гидроизоляция", false],
        ["КЖ0.1.2: фундаменты", true],
        ["КЖ2.1: плиты перекрытия", true],
        ["КЖ2.2: вертикальные конструкции", false],
      ]),
    },
    {
      ...node(root, "node-roga-km", "section", "Конструкции металлические", "КМ", "КМ1, КМ2, лестницы, корзины, фасадные крепления и нестандартные элементы.", "review", "Ксения Артамонова", km, ["КМ", "КМ1", "КМ2"]),
      checklist: checklist("km", [
        ["КМ1: металлические конструкции", true],
        ["КМ2: прочие металлические конструкции", false],
      ]),
    },
    {
      ...node(root, "node-roga-tx", "section", "Технологические решения", "ТХ", "Технологические задания для АР, ГП, КР и ИОС.", "review", "Сергей Титов", tx, ["ТХ"]),
      checklist: checklist("tx", [
        ["Технологическое задание в АР/ГП", true],
        ["Технологическое задание в КР", true],
        ["Технологическое задание в ИОС", false],
      ]),
    },
    {
      ...node(root, "node-roga-ios", "section", "Инженерные сети и системы", "ИОС", "ЭОМ, ВК, ОВ, СС, АПС, АУПТ, ИТП и смежные инженерные системы.", "review", "Павел Андреев", ios, ["ИОС", "ЭОМ", "ОВ", "ВК", "СС", "АПС", "АУПТ", "ИТП"]),
      checklist: checklist("ios", [
        ["ЭОМ", true],
        ["ОВ", true],
        ["ВК", true],
        ["СС", false],
        ["АПС", true],
        ["АУПТ", false],
      ]),
    },
    node(root, "node-roga-pb", "section", "Пожарная безопасность", "ПБ", "Мероприятия по обеспечению пожарной безопасности.", "approved", "Никита Беляев", undefined, ["ПБ"]),
    {
      ...node(root, "node-roga-keo", "section", "КЕО / естественное освещение", "КЕО", "Расчеты естественного освещения и инсоляции.", "comments", "Виктория Романова", undefined, ["КЕО"]),
      checklist: checklist("keo", [["Расчет КЕО", true], ["Инсоляционный расчет", false]]),
    },
    {
      ...node(root, "node-roga-pos", "section", "Проект организации строительства", "ПОС", "Организация строительства, календарные графики и стройгенплан.", "draft", "Сергей Наумов", undefined, ["ПОС"]),
      checklist: checklist("pos", [["Стройгенплан", true], ["Календарный план", true], ["Потребность в ресурсах", false], ["Логистика стройки", false]]),
    },
    {
      ...node(root, "node-roga-oos", "section", "Охрана окружающей среды", "ООС", "Мероприятия по охране окружающей среды.", "unchecked", "Елена Морозова", undefined, ["ООС"]),
      checklist: checklist("oos", [["Исходные данные ООС", true], ["Мероприятия ООС", false]]),
    },
    {
      ...node(root, "node-roga-obe", "section", "Безопасная эксплуатация", "ОБЭ", "Требования к безопасной эксплуатации объекта капитального строительства.", "unchecked", "Павел Андреев", undefined, ["ОБЭ"]),
      checklist: checklist("obe", [["Требования эксплуатации", true], ["Проверка ГИП", false]]),
    },
    {
      ...node(root, "node-roga-odi", "section", "Доступ инвалидов", "ОДИ", "Мероприятия по обеспечению доступа инвалидов к объекту.", "unchecked", "Елена Морозова", undefined, ["ОДИ"]),
      checklist: checklist("odi", [["Схема доступности", true], ["Замечания заказчика", false]]),
    },
    {
      ...node(root, "node-roga-est", "section", "Смета", "СМ", "Сметная документация на строительство, реконструкцию, капремонт или снос.", "draft", "Ольга Данилова", undefined, ["СМ", "Смета"]),
      checklist: checklist("est", [["Ведомости объемов", true], ["Локальные сметы", false]]),
    },
    {
      ...node(root, "node-roga-external", "section", "Сторонние разработчики", "EXT", "Внешние разработчики: интерьер, ландшафт и специальные разделы.", "draft", "Дмитрий Корнев", undefined, ["EXT", "сторонние"]),
      checklist: checklist("external", [["Интерьеры МОП", true], ["Ландшафт", false]]),
    },
    {
      ...node(root, "node-roga-fabricators", "section", "Фирмы-изготовители", "ЗАВ", "Передача заданий производителям КМД, кровли, подсветки и оборудования.", "review", "Виктория Романова", undefined, ["ЗАВ", "КМД"]),
      checklist: checklist("fabricators", [["КМД", true], ["Кровля", true], ["Фасадная подсистема", true]]),
    },

    node(ird, "node-roga-ird-gpzu", "subsection", "ГПЗУ / ППТ", "ГПЗУ", "Градостроительный план земельного участка или проект планировки территории.", "approved", "Мария Соколова", undefined, ["ГПЗУ", "ППТ"]),
    node(ird, "node-roga-ird-znp", "subsection", "Задание на проектирование", "ЗнП", "Задание на проектирование от заказчика.", "approved", "Заказчик", undefined, ["ЗнП"]),
    node(ird, "node-roga-ird-contract", "subsection", "Договор от заказчика", "Договор", "Договорная база проекта.", "approved", "Главный юрист", undefined, ["Договор"]),
    node(ird, "node-roga-ird-tz", "subsection", "Техническое задание", "ТЗ", "Техническое задание от заказчика.", "approved", "Заказчик", undefined, ["ТЗ"]),
    node(ird, "node-roga-ird-pzz", "subsection", "ПЗЗ", "ПЗЗ", "Правила землепользования и застройки.", "approved", "Главный юрист", undefined, ["ПЗЗ"]),
    node(ird, "node-roga-ird-tu", "subsection", "ТУ / условия подключения", "ТУ", "Технические условия и условия подключения.", "review", "Мария Соколова", undefined, ["ТУ", "УП"]),
    node(ird, "node-roga-ird-atr", "subsection", "Альбом технических решений", "АТР", "Альбом технических решений заказчика.", "review", "Заказчик", undefined, ["АТР"]),
    node(ird, "node-roga-ird-survey", "subsection", "Изыскания", "ИИ", "Инженерно-геологические изыскания.", "review", "Подрядчик ИИ", undefined, ["ИИ"]),
    node(ird, "node-roga-ird-authorities", "subsection", "Согласования с госорганами", "СОГЛ", "Согласования с госорганами и монополистами.", "comments", "Мария Соколова", undefined, ["СОГЛ"]),
    node(ird, "node-roga-ird-land", "subsection", "Документы на землю", "ЕГРН", "Правоустанавливающие документы на землю.", "approved", "Главный юрист", undefined, ["ЕГРН"]),
    node(ird, "node-roga-ird-permit", "subsection", "Разрешение на строительство", "РНС", "Разрешение на строительство.", "draft", "Заказчик", undefined, ["РНС"]),
    node(ird, "node-roga-ird-expertise", "subsection", "Положительное заключение экспертизы", "ЭКСП", "Заключение экспертизы: пока не получено.", "unchecked", "Иванов И.И.", undefined, ["ЭКСП"]),
    node(ird, "node-roga-ird-networks", "subsection", "Вынос сетей", "Сети", "Исходные данные по выносу сетей.", "review", "Павел Андреев", undefined, ["Сети"]),
    node(ird, "node-roga-ird-ago", "subsection", "Альбом АГО", "АГО", "Опционально, может разрабатываться внутри проекта.", "draft", "Анна Лебедева", undefined, ["АГО"]),
    node(ird, "node-roga-ird-kgiop", "subsection", "Альбом КГИОП", "КГИОП", "Опционально, может разрабатываться внутри проекта.", "draft", "Мария Соколова", undefined, ["КГИОП"]),
    node(ird, "node-roga-ird-photo", "subsection", "Фотофиксация участка", "Фото", "Фотоматериалы участка.", "approved", "Заказчик", undefined, ["Фото"]),
    node(ird, "node-roga-ird-calendar", "subsection", "Календарные графики выдачи разделов", "График", "Графики выдачи разделов.", "review", "Иванов И.И.", undefined, ["График"]),
    node(ird, "node-roga-ird-ctu", "subsection", "Частные технические условия", "ЧТУ", "Частные технические условия.", "unchecked", "Павел Андреев", undefined, ["ЧТУ"]),
    node(ird, "node-roga-ird-marketing", "subsection", "Маркетинговое задание", "МЗ", "Маркетинговое задание заказчика.", "draft", "Заказчик", undefined, ["МЗ"]),

    node(gp, "node-roga-gp-pzu", "subsection", "Схема ПЗУ", "ПЗУ", "Схема планировочной организации земельного участка.", "review", "Олег Фомин", undefined, ["ПЗУ"]),
    node(gp, "node-roga-gp-ppt", "subsection", "ППТ", "ППТ", "Проект планировки территории.", "approved", "Олег Фомин", undefined, ["ППТ"]),
    node(gp, "node-roga-gp-layout", "subsection", "Разбивочный план", "РП", "Разбивка и посадка корпусов.", "review", "Олег Фомин", undefined, ["РП"]),
    node(gp, "node-roga-gp-improvement", "subsection", "Благоустройство", "БЛГ", "Благоустройство территории.", "draft", "Олег Фомин", undefined, ["БЛГ"]),
    node(gp, "node-roga-gp-redlines", "subsection", "Красные линии", "КЛ", "Ограничения и красные линии.", "approved", "Олег Фомин", undefined, ["КЛ"]),

    node(ar, "node-roga-ar0", "subsection", "АР0: корпуса ниже 0.000", "АР0", "Кладочные и маркировочные планы ниже отметки 0.000.", "approved", "Анна Лебедева", undefined, ["АР0"]),
    node(ar, "node-roga-ar1", "subsection", "АР1: корпуса выше 0.000", "АР1", "Кладочные и маркировочные планы выше отметки 0.000.", "approved", "Анна Лебедева", undefined, ["АР1"]),
    node(ar, "node-roga-ar2", "subsection", "АР2: кровли, разрезы, узлы", "АР2", "Кровли корпусов, разрезы и узлы.", "review", "Ведущий архитектор", undefined, ["АР2"]),
    node(ar, "node-roga-ar31", "subsection", "АР3.1: фасады", "АР3.1", "Фасады, узлы, детали фасадов и сечения корпусов.", "comments", "Дмитрий Корнев", undefined, ["АР3.1", "Фасады"]),
    node(ar, "node-roga-ar32", "subsection", "АР3.2: входы и лестницы", "АР3.2", "Входы, внутренние лестницы, пандусы, козырьки, остекление и обшивка балконов.", "review", "Ведущий архитектор", undefined, ["АР3.2"]),
    node(ar, "node-roga-ar4", "subsection", "АР4: лифтовые шахты", "АР4", "Лифтовые шахты, разрезы и узлы.", "draft", "Ведущий архитектор", undefined, ["АР4"]),
    node(ar, "node-roga-ar5", "subsection", "АР5: ведомости и спецификации", "АР5", "Ведомости и спецификации.", "approved", "Виктория Романова", undefined, ["АР5"]),
    node(ar, "node-roga-ai1", "subsection", "АИ1: интерьеры МОП", "АИ1", "Архитектурные интерьеры, внутренняя отделка МОП.", "draft", "Сторонний разработчик", undefined, ["АИ1"]),
    node(ar, "node-roga-ai2", "subsection", "АИ2: интерьеры квартир", "АИ2", "Архитектурные интерьеры, внутренняя отделка квартир.", "draft", "Сторонний разработчик", undefined, ["АИ2"]),

    node(kr, "node-roga-kzh-010", "subsection", "КЖ0.1.0: котлован", "КЖ0.1.0", "Котлован.", "approved", "Игорь Мельников", undefined, ["КЖ0.1.0"]),
    node(kr, "node-roga-kzh-011", "subsection", "КЖ0.1.1: гидроизоляция", "КЖ0.1.1", "Гидроизоляция.", "review", "Игорь Мельников", undefined, ["КЖ0.1.1"]),
    node(kr, "node-roga-kzh-012", "subsection", "КЖ0.1.2: фундаменты", "КЖ0.1.2", "Фундаменты зданий и кранов.", "approved", "Игорь Мельников", undefined, ["КЖ0.1.2"]),
    node(kr, "node-roga-kzh-02", "subsection", "КЖ0.2: ниже 0.000", "КЖ0.2", "Конструкции железобетонные ниже отм. 0.000.", "review", "Ведущий конструктор", undefined, ["КЖ0.2"]),
    node(kr, "node-roga-kzh-03", "subsection", "КЖ0.3: лестницы подвала", "КЖ0.3", "Железобетонные лестницы подвала.", "unchecked", "Ведущий конструктор", undefined, ["КЖ0.3"]),
    node(kr, "node-roga-kzh-11", "subsection", "КЖ1.1: конструкции 1 этажа", "КЖ1.1", "Железобетонные конструкции 1 этажа.", "review", "Ведущий конструктор", undefined, ["КЖ1.1"]),
    node(kr, "node-roga-kzh-12", "subsection", "КЖ1.2: лестницы 1 этажа", "КЖ1.2", "Лестницы первого этажа.", "draft", "Ведущий конструктор", undefined, ["КЖ1.2"]),
    node(kr, "node-roga-kzh-21", "subsection", "КЖ2.1: плиты перекрытия", "КЖ2.1", "Плиты перекрытия типовых этажей.", "comments", "Ведущий конструктор", undefined, ["КЖ2.1"]),
    node(kr, "node-roga-kzh-22", "subsection", "КЖ2.2: вертикальные конструкции", "КЖ2.2", "Вертикальные конструкции типовых этажей.", "review", "Ведущий конструктор", undefined, ["КЖ2.2"]),
    node(kr, "node-roga-kzh-3", "subsection", "КЖ3: сборные ЖБК", "КЖ3", "Сборные железобетонные конструкции.", "draft", "Игорь Мельников", undefined, ["КЖ3"]),
    node(kr, "node-roga-kzh-4", "subsection", "КЖ4: монолит последнего этажа", "КЖ4", "Монолитные конструкции последнего этажа.", "draft", "Игорь Мельников", undefined, ["КЖ4"]),
    node(kr, "node-roga-kzh-41", "subsection", "КЖ4.1: фундаменты под оборудование", "КЖ4.1", "Фундаменты под оборудование на кровле.", "unchecked", "Игорь Мельников", undefined, ["КЖ4.1"]),
    node(kr, "node-roga-kzh-gp", "subsection", "КЖ.ГП: прочие монолитные ЖБК", "КЖ.ГП", "Подпорные стены, фундаменты под мачты освещения, наружные лестницы.", "review", "Игорь Мельников", undefined, ["КЖ.ГП"]),

    node(km, "node-roga-km1", "subsection", "КМ1: металлические конструкции", "КМ1", "Стремянки, лестницы, люки, ограждения, корзины для кондиционеров, фасадные крепления, кровельные ограждения и козырьки.", "review", "Ксения Артамонова", undefined, ["КМ1"]),
    node(km, "node-roga-km2", "subsection", "КМ2: прочие конструкции", "КМ2", "Нестандартные перемычки, фахверки, антресоли и монорельсы.", "draft", "Ксения Артамонова", undefined, ["КМ2"]),
    node(km, "node-roga-km-roof", "subsection", "Кровельные элементы", "Кровля", "Кровельные элементы и страховочные петли.", "draft", "Фирма-изготовитель", undefined, ["Кровля"]),
    node(km, "node-roga-km-facade", "subsection", "Фасадная подсистема", "Фасад", "Крепления фасадной подсистемы и элементов фасада.", "comments", "Фирма-изготовитель", undefined, ["Фасад"]),

    node(ios, "node-roga-spis", "subsection", "СПИС", "СПИС", "Сводный план инженерных сетей.", "review", "Павел Андреев", undefined, ["СПИС"]),
    node(ios, "node-roga-itp", "subsection", "ИТП", "ИТП", "Индивидуальный тепловой пункт.", "review", "Сергей Титов", undefined, ["ИТП"]),
    node(ios, "node-roga-uute", "subsection", "УУТЭ", "УУТЭ", "Узел учета тепловой энергии.", "draft", "Сергей Титов", undefined, ["УУТЭ"]),
    node(ios, "node-roga-tm", "subsection", "ТМ", "ТМ", "Тепломеханика ИТП.", "draft", "Сергей Титов", undefined, ["ТМ"]),
    node(ios, "node-roga-eom-itp", "subsection", "ЭОМ ИТП", "ЭОМ ИТП", "Электроснабжение ИТП.", "review", "Павел Андреев", undefined, ["ЭОМ ИТП"]),
    node(ios, "node-roga-atm", "subsection", "АТМ", "АТМ", "Автоматизация теплового пункта.", "unchecked", "Ведущий инженер АПТ", undefined, ["АТМ"]),
    node(ios, "node-roga-ns", "subsection", "Насосная станция", "НС", "Насосная станция хозяйственно-питьевого и противопожарного водоснабжения.", "review", "Елена Морозова", undefined, ["НС"]),
    node(ios, "node-roga-eom", "subsection", "ЭОМ", "ЭОМ", "Электроснабжение, электроосвещение, электрооборудование.", "approved", "Павел Андреев", undefined, ["ЭОМ"]),
    node(ios, "node-roga-no", "subsection", "НО", "НО", "Наружное освещение.", "review", "Павел Андреев", undefined, ["НО"]),
    node(ios, "node-roga-ov", "subsection", "ОВ", "ОВ", "Отопление, вентиляция, дымоудаление и кондиционирование.", "review", "Роман Фадеев", undefined, ["ОВ"]),
    node(ios, "node-roga-ov1", "subsection", "ОВ1", "ОВ1", "Отопление и теплоснабжение.", "approved", "Роман Фадеев", undefined, ["ОВ1"]),
    node(ios, "node-roga-ov2", "subsection", "ОВ2", "ОВ2", "Вентиляция и дымоудаление.", "review", "Роман Фадеев", undefined, ["ОВ2"]),
    node(ios, "node-roga-ov3", "subsection", "ОВ3", "ОВ3", "Кондиционирование.", "draft", "Роман Фадеев", undefined, ["ОВ3"]),
    node(ios, "node-roga-vk", "subsection", "ВК", "ВК", "Водоснабжение и канализация.", "comments", "Елена Морозова", undefined, ["ВК"]),
    node(ios, "node-roga-nvk", "subsection", "НВК", "НВК", "Наружное водоснабжение и канализация.", "review", "Елена Морозова", undefined, ["НВК"]),
    node(ios, "node-roga-ss", "subsection", "СС", "СС", "Системы связи и системы безопасности.", "review", "Ведущий инженер СС", undefined, ["СС"]),
    node(ios, "node-roga-sb", "subsection", "СБ", "СБ", "Системы безопасности.", "draft", "Ведущий инженер СС", undefined, ["СБ"]),
    node(ios, "node-roga-pv", "subsection", "ПВ", "ПВ", "Проводное телевидение.", "draft", "Ведущий инженер СС", undefined, ["ПВ"]),
    node(ios, "node-roga-skpt", "subsection", "СКПТ", "СКПТ", "Система коллективного приема телевидения.", "draft", "Ведущий инженер СС", undefined, ["СКПТ"]),
    node(ios, "node-roga-sks", "subsection", "СКС", "СКС", "Структурированная кабельная система.", "review", "Ведущий инженер СС", undefined, ["СКС"]),
    node(ios, "node-roga-aps", "subsection", "АПС", "АПС", "Автоматическая пожарная сигнализация и СОУЭ.", "approved", "Никита Беляев", undefined, ["АПС"]),
    node(ios, "node-roga-aupt", "subsection", "АУПТ", "АУПТ", "Автоматическая установка пожаротушения.", "review", "Никита Беляев", undefined, ["АУПТ"]),
    node(ios, "node-roga-appz", "subsection", "АППЗ", "АППЗ", "Автоматическая противопожарная защита.", "draft", "Никита Беляев", undefined, ["АППЗ"]),

    node(tx, "node-roga-tx-main", "subsection", "Технологическое задание", "ТХ-З", "Основные технологические требования.", "review", "Сергей Титов", undefined, ["ТХ"]),
    node(tx, "node-roga-tx-equipment", "subsection", "Оборудование", "ОБ", "Оборудование и нагрузки для смежников.", "draft", "Сергей Титов", undefined, ["ОБ"]),
    node(tx, "node-roga-tx-loads", "subsection", "Нагрузки и вводы", "Нагрузки", "Технологические нагрузки и вводы.", "comments", "Сергей Титов", undefined, ["Нагрузки"]),
  ];

  nodes.push(
    documentNode(ird, "node-doc-roga-gpzu", doc("doc-roga-gpzu", "ГПЗУ_Рога_и_копыта.pdf", "pdf", "v1", "approved", "Заказчик", "demo"), "node-roga-ird"),
    documentNode(ird, "node-doc-roga-znp", doc("doc-roga-znp", "ЗнП_РД_Рога_и_копыта.docx", "docx", "v2", "approved", "Заказчик", "demo"), "node-roga-ird"),
    documentNode(ird, "node-doc-roga-tu", doc("doc-roga-tu-vk", "ТУ_ВК_Рога_и_копыта.pdf", "pdf", "v1", "review", "Почта", "mail"), "node-roga-ird-tu"),
    documentNode(ar, "node-doc-roga-ar-facades", doc("doc-roga-ar-facades", "АР3.1_Фасады_замечания.pdf", "pdf", "v3", "comments", "АР", "demo"), "node-roga-ar31"),
    documentNode(ar, "node-doc-roga-ar-spec", doc("doc-roga-ar-spec", "АР5_Ведомость_элементов.xlsx", "xlsx", "v1", "approved", "АР", "demo"), "node-roga-ar5"),
    documentNode(ar, "node-doc-roga-ar-plan", doc("doc-roga-ar-plan", "АР1_План_типового_этажа.dwg", "dwg", "v4", "review", "АР", "demo"), "node-roga-ar1"),
    documentNode(kr, "node-doc-roga-kr-calc", doc("doc-roga-kr-calc", "КЖ2.1_Расчет_плит.pdf", "pdf", "v2", "comments", "КР", "demo"), "node-roga-kzh-21"),
    documentNode(kr, "node-doc-roga-kr-slab", doc("doc-roga-kr-slab", "КЖ2.1_Плиты_перекрытия.dwg", "dwg", "v1", "review", "КР", "demo"), "node-roga-kzh-21"),
    documentNode(km, "node-doc-roga-km-spec", doc("doc-roga-km-spec", "КМ1_Спецификация_металла.xlsx", "xlsx", "v1", "review", "КМ", "demo"), "node-roga-km1"),
    documentNode(ios, "node-doc-roga-ios-matrix", doc("doc-roga-ios-matrix", "ИОС_Матрица_заданий.xlsx", "xlsx", "v2", "review", "ИОС", "demo"), "node-roga-ios"),
    documentNode(tx, "node-doc-roga-tx-task", doc("doc-roga-tx-task", "ТХ_Задание_для_смежников.docx", "docx", "v1", "review", "ТХ", "demo"), "node-roga-tx-main"),
  );

  const processes: BusinessProcess[] = [
    bp(root, "bp-roga-gp-ar", "node-roga-gp", "node-roga-ar", "Задание ГП → АР", "Генплан передает архитектуре ПЗУ, посадку корпусов, красные линии и планировочные ограничения.", "sent", "forward", "Олег Фомин", "Анна Лебедева", "Иванов И.И.", "2026-07-14T18:00", [
      doc("bpdoc-roga-gp-ar-pzu", "ГП_ПЗУ_для_АР.pdf", "pdf", "v2", "review", "ГП"),
      doc("bpdoc-roga-gp-ar-redlines", "ГП_Красные_линии.dwg", "dwg", "v1", "review", "ГП"),
    ], 0, "ГП"),
    bp(root, "bp-roga-ar-gp", "node-roga-ar", "node-roga-gp", "Задание АР → ГП", "Архитектура передает габариты корпусов, входы, стилобат и требования к благоустройству.", "in_work", "forward", "Анна Лебедева", "Олег Фомин", "Иванов И.И.", "2026-07-20T18:00", [
      doc("bpdoc-roga-ar-gp", "АР_Габариты_корпусов_для_ГП.dwg", "dwg", "v3", "review", "АР"),
    ], 0, "АР"),
    bp(root, "bp-roga-ar-km", "node-roga-ar", "node-roga-km", "Задание АР → КМ", "АР передает фасадные крепления, козырьки, корзины кондиционеров и ограждения для КМ.", "sent", "forward", "Анна Лебедева", "Ксения Артамонова", "Иванов И.И.", "2026-07-16T18:00", [
      doc("bpdoc-roga-ar-km", "АР_КМ_козырьки_корзины.docx", "docx", "v1", "review", "АР"),
    ], 0, "КМ"),
    bp(root, "bp-roga-ar-ios", "node-roga-ar", "node-roga-ios", "Задание АР → ИОС", "АР передает планировки, шахты, помещения инженерии и отметки для инженерных систем.", "sent", "forward", "Анна Лебедева", "Павел Андреев", "Иванов И.И.", "2026-07-17T18:00", [
      doc("bpdoc-roga-ar-ios", "АР_Помещения_ИОС.dwg", "dwg", "v2", "review", "АР"),
    ], 0, "ИОС"),
    bp(root, "bp-roga-ar-ios-acoustic", "node-roga-ar", "node-roga-ios", "Параллельное задание АР → ИОС: акустика", "Отдельный контейнер по акустическому и инсоляционному расчету для инженерных смежников.", "draft", "forward", "Анна Лебедева", "Павел Андреев", "Иванов И.И.", "2026-07-22T12:00", [
      doc("bpdoc-roga-ar-ios-acoustic", "АР_Акустический_расчет.pdf", "pdf", "v0.8", "draft", "АР"),
    ], 1, "ИОС"),
    bp(root, "bp-roga-ar-tx", "node-roga-ar", "node-roga-tx", "Задание АР → ТХ", "АР передает планировки и помещения для технологических решений.", "in_work", "forward", "Анна Лебедева", "Сергей Титов", "Иванов И.И.", "2026-07-21T18:00", [
      doc("bpdoc-roga-ar-tx", "АР_Планировки_для_ТХ.dwg", "dwg", "v1", "review", "АР"),
    ], 0, "ТХ"),
    bp(root, "bp-roga-ar-pb", "node-roga-ar", "node-roga-pb", "Задание АР → ПБ", "Передача путей эвакуации, входов, лестниц и пожарных отсеков.", "accepted", "forward", "Анна Лебедева", "Никита Беляев", "Иванов И.И.", "2026-07-10T18:00", [
      doc("bpdoc-roga-ar-pb", "АР_ПБ_пути_эвакуации.pdf", "pdf", "v1", "approved", "АР"),
    ], 0, "ПБ", "12.07.2026"),
    bp(root, "bp-roga-ar-keo", "node-roga-ar", "node-roga-keo", "Задание АР → КЕО", "Расчет естественного освещения и инсоляции возвращен с замечаниями.", "rejected", "forward", "Анна Лебедева", "Виктория Романова", "Иванов И.И.", "2026-07-12T18:00", [
      doc("bpdoc-roga-ar-keo", "АР_КЕО_инсоляция.pdf", "pdf", "v1", "comments", "АР"),
    ], 0, "КЕО"),
    bp(root, "bp-roga-ar-external", "node-roga-ar", "node-roga-external", "Задание АР → сторонним разработчикам", "Внешним разработчикам передаются интерьеры МОП, квартиры и ландшафтные вводные.", "draft", "forward", "Анна Лебедева", "Дмитрий Корнев", "Иванов И.И.", "2026-07-25T18:00", [
      doc("bpdoc-roga-ar-external", "АР_АИ1_интерьеры_МОП.docx", "docx", "v0.3", "draft", "АР"),
    ], 0, "АИ1"),
    bp(root, "bp-roga-ar-fabricators", "node-roga-ar", "node-roga-fabricators", "Задание АР → фирмам-изготовителям", "Передача заданий на КМД, кровельные элементы, фасадную подсистему и подсветку.", "sent", "forward", "Анна Лебедева", "Виктория Романова", "Иванов И.И.", "2026-07-18T18:00", [
      doc("bpdoc-roga-ar-fabricators", "АР_Задание_КМД_фасад.docx", "docx", "v1", "review", "АР"),
    ], 0, "КМД"),
    bp(root, "bp-roga-kr-ar", "node-roga-kr", "node-roga-ar", "Задание КР → АР", "Конструкторы передают ограничения по несущим стенам, отверстиям и отметкам для корректировки АР.", "in_work", "forward", "Игорь Мельников", "Анна Лебедева", "Иванов И.И.", "2026-07-19T18:00", [
      doc("bpdoc-roga-kr-ar", "КЖ_Ограничения_для_АР.pdf", "pdf", "v2", "review", "КР"),
    ], 0, "КЖ"),
    bp(root, "bp-roga-kr-ios", "node-roga-kr", "node-roga-ios", "Задание КР → ИОС", "КР передает отверстия, шахты, закладные и ограничения по инженерным трассам.", "sent", "forward", "Игорь Мельников", "Павел Андреев", "Иванов И.И.", "2026-07-16T12:00", [
      doc("bpdoc-roga-kr-ios", "КЖ_Отверстия_и_закладные.xlsx", "xlsx", "v1", "review", "КР"),
    ], 0, "ИОС"),
    bp(root, "bp-roga-kr-tx", "node-roga-kr", "node-roga-tx", "Задание КР → ТХ", "Передача нагрузок и ограничений под технологическое оборудование.", "draft", "forward", "Игорь Мельников", "Сергей Титов", "Иванов И.И.", "2026-07-24T18:00", [
      doc("bpdoc-roga-kr-tx", "КЖ_Нагрузки_ТХ.xlsx", "xlsx", "v0.4", "draft", "КР"),
    ], 0, "ТХ"),
    bp(root, "bp-roga-tx-ar", "node-roga-tx", "node-roga-ar", "Задание ТХ → АР", "Технологи передают требования к помещениям, оборудованию и планировкам в АР.", "sent", "forward", "Сергей Титов", "Анна Лебедева", "Иванов И.И.", "2026-07-15T18:00", [
      doc("bpdoc-roga-tx-ar", "ТХ_Требования_к_помещениям.docx", "docx", "v1", "review", "ТХ"),
    ], 0, "ТХ"),
    bp(root, "bp-roga-tx-gp", "node-roga-tx", "node-roga-gp", "Задание ТХ → ГП", "Технологи передают требования к подъездам транспорта, площадкам и наружным зонам.", "draft", "forward", "Сергей Титов", "Олег Фомин", "Иванов И.И.", "2026-07-23T18:00", [
      doc("bpdoc-roga-tx-gp", "ТХ_Требования_к_ГП.docx", "docx", "v0.2", "draft", "ТХ"),
    ], 0, "ГП"),
    bp(root, "bp-roga-tx-kr", "node-roga-tx", "node-roga-kr", "Задание ТХ → КР", "ТХ передает нагрузки оборудования и требования к фундаментам.", "sent", "forward", "Сергей Титов", "Игорь Мельников", "Иванов И.И.", "2026-07-18T12:00", [
      doc("bpdoc-roga-tx-kr", "ТХ_Нагрузки_оборудования.xlsx", "xlsx", "v1", "review", "ТХ"),
    ], 0, "КР"),
    bp(root, "bp-roga-tx-ios", "node-roga-tx", "node-roga-ios", "Задание ТХ → ИОС", "Технологическое оборудование передает инженерные нагрузки и точки подключения.", "in_work", "forward", "Сергей Титов", "Павел Андреев", "Иванов И.И.", "2026-07-21T12:00", [
      doc("bpdoc-roga-tx-ios", "ТХ_Точки_подключения.xlsx", "xlsx", "v1", "review", "ТХ"),
    ], 0, "ИОС"),
    bp(root, "bp-roga-ios-ar", "node-roga-ios", "node-roga-ar", "Задание ИОС → АР", "Инженеры передают требования к шахтам, помещениям и люкам.", "sent", "forward", "Павел Андреев", "Анна Лебедева", "Иванов И.И.", "2026-07-17T12:00", [
      doc("bpdoc-roga-ios-ar", "ИОС_Шахты_и_помещения.dwg", "dwg", "v2", "review", "ИОС"),
    ], 0, "АР"),
    bp(root, "bp-roga-ios-kr", "node-roga-ios", "node-roga-kr", "Задание ИОС → КР", "Инженеры передают отверстия, закладные и нагрузки на конструкции.", "sent", "forward", "Павел Андреев", "Игорь Мельников", "Иванов И.И.", "2026-07-19T12:00", [
      doc("bpdoc-roga-ios-kr", "ИОС_Отверстия_для_КР.xlsx", "xlsx", "v1", "review", "ИОС"),
    ], 0, "КР"),
  ];

  const participants = createParticipants();
  const chatMessages: ChatMessage[] = [
    {
      id: "chat-roga-1",
      projectId: PROJECT_ID,
      author: "Иванов И.И.",
      role: "ГИП",
      text: "ГП → АР держим как активный дедлайн. После приема архитектурой проверяем, что ПЗУ и красные линии разошлись в АР0/АР1.",
      time: "сегодня, 15:01",
      processId: "bp-roga-gp-ar",
    },
    {
      id: "chat-roga-2",
      projectId: PROJECT_ID,
      author: "Анна Лебедева",
      role: "Главный архитектор проекта",
      text: "По КЕО получили замечания. Файл вынесен в процесс АР → КЕО, дорабатываем инсоляцию и вернем повторно.",
      time: "сегодня, 14:48",
      processId: "bp-roga-ar-keo",
    },
    {
      id: "chat-roga-3",
      projectId: PROJECT_ID,
      author: "Павел Андреев",
      role: "ГИП ИОС",
      text: "ИОС → КР отправлен отдельным контейнером по отверстиям. КР, подтвердите до 19 июля.",
      time: "сегодня, 14:35",
      processId: "bp-roga-ios-kr",
    },
  ];

  return {
    id: PROJECT_ID,
    title: "ЖК «Рога и копыта»",
    address: "Демо-объект: РД, комплексная проектная документация",
    updatedAt: NOW,
    storageUsedGb: 318,
    storageLimitGb: 750,
    levels,
    nodes,
    processes,
    participants,
    inboxDocuments: [
      { ...doc("inbox-roga-mail-ar", "АР_Фасады_замечания.pdf", "pdf", "v1", "draft", "Почта", "mail"), detectedTag: "АР", receivedByEmail: "a.lebedeva@alfaproject.ru", integrationProvider: "outlook", isNew: true },
      { ...doc("inbox-roga-mail-no-tag", "Письмо_от_заказчика_без_тега.docx", "docx", "v1", "draft", "Почта", "mail"), receivedByEmail: "ivanov.gip@alfaproject.ru", integrationProvider: "yandex", isNew: true },
      { ...doc("inbox-roga-telegram-km", "КМ1_эскиз_козырьков.dwg", "dwg", "v1", "draft", "Telegram Desktop", "telegram"), detectedTag: "КМ1", integrationProvider: "telegram", isNew: true },
    ],
    chatMessages,
  };
}

function level(
  id: string,
  title: string,
  subtitle: string,
  centralNodeId: string,
  nodeIds: string[],
  parentLevelId?: string,
  parentNodeId?: string,
): MapLevel {
  return { id, projectId: PROJECT_ID, title, subtitle, centralNodeId, nodeIds, parentLevelId, parentNodeId };
}

function node(
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
    projectId: PROJECT_ID,
    levelId,
    type,
    title,
    shortCode,
    description,
    status,
    responsible,
    childrenLevelId,
    tags,
    updatedAt: NOW,
  };
}

function documentNode(levelId: string, id: string, document: ProcessDocument, ownerNodeId: string): ProjectNode {
  return {
    id,
    projectId: PROJECT_ID,
    levelId,
    type: "document",
    title: document.title,
    shortCode: document.fileType.toUpperCase(),
    description: "Файл находится внутри ноды раздела.",
    status: document.status,
    responsible: document.from,
    updatedAt: document.updatedAt,
    documentOwnerNodeId: ownerNodeId,
    fileType: document.fileType,
    document,
  };
}

function bp(
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
  approver: string,
  dueAt: string,
  documents: ProcessDocument[],
  parallelIndex = 0,
  tag?: string,
  validationAt?: string,
): BusinessProcess {
  return {
    id,
    projectId: PROJECT_ID,
    levelId,
    from,
    to,
    title,
    description,
    status,
    direction,
    sender,
    receiver,
    approver,
    dueAt,
    participantNames: [sender, receiver, approver],
    createdAt: "сегодня",
    validationAt,
    parallelIndex,
    source: "demo",
    tag,
    documents,
    requiredFields: [
      { key: "documents", label: "Документы", required: true },
      { key: "sender", label: "Кто передает", required: true },
      { key: "approver", label: "Кто согласует", required: true },
      { key: "deadline", label: "Срок согласования", required: true },
      { key: "comment", label: "Комментарий", required: false },
      { key: "result", label: "Результат проверки", required: true },
    ],
    documentRequirements: documents.map((document, index) => ({ documentId: document.id, required: index === 0 })),
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
  const preview = buildPreview(title, fileType);
  return {
    id,
    title,
    fileType,
    version,
    status,
    from,
    source,
    updatedAt: NOW,
    size: fileType === "xlsx" ? "1.8 МБ" : fileType === "pdf" ? "4.6 МБ" : fileType === "dwg" ? "8.4 МБ" : "920 КБ",
    fileUrl: getDemoFileUrl(fileType),
    fileText: preview.text,
    previewRows: preview.rows,
  };
}

function checklist(prefix: string, items: Array<[string, boolean]>): NodeChecklistItem[] {
  return items.map(([title, done], index) => ({
    id: `${prefix}-check-${index + 1}`,
    title,
    done,
    required: true,
  }));
}

function createParticipants(): ProjectParticipant[] {
  return [
    participant("participant-roga-admin", "Иванов И.И.", "ГИП / администратор проекта", "admin", "ivanov.gip@alfaproject.ru", "+7 916 000-00-01", "@ivanov_gip", "Teams: ivanov.gip", [
      integration("outlook", "Outlook", "connected", "ivanov.gip@alfaproject.ru", undefined, NOW),
      integration("telegram", "Telegram Desktop", "needs_permission", undefined, "Telegram Desktop/tdata/Рабочие файлы"),
    ]),
    participant("participant-roga-customer", "Алексей Заказчиков", "Заказчик / проектирование", "observer", "customer@client.ru", "+7 916 000-00-02", "@client_owner"),
    participant("participant-roga-expert", "Наталья Экспертова", "Эксперт по разделу ПД", "observer", "expert@expertiza.ru", "+7 916 000-00-03"),
    participant("participant-roga-gendir", "Петр Генеральный", "Гендиректор генпроектировщика", "observer", "director@alfaproject.ru", "+7 916 000-00-04"),
    participant("participant-roga-ird", "Мария Соколова", "Координатор ИРД", "coordinator", "m.sokolova@alfaproject.ru", "+7 916 000-00-05", "@sokolova_ird", undefined, [
      integration("yandex", "Яндекс Почта", "connected", "m.sokolova@yandex.ru", undefined, NOW),
    ]),
    participant("participant-roga-gp", "Олег Фомин", "Ведущий специалист генплана", "engineer", "o.fomin@alfaproject.ru", "+7 916 000-00-06", "@fomin_gp"),
    participant("participant-roga-ar-chief", "Анна Лебедева", "Главный архитектор проекта", "architect", "a.lebedeva@alfaproject.ru", "+7 916 000-00-07", "@anna_ar"),
    participant("participant-roga-ar-lead", "Ведущий архитектор", "Архитектор 1 категории", "architect", "lead.arch@alfaproject.ru", "+7 916 000-00-08"),
    participant("participant-roga-kr", "Игорь Мельников", "Главный конструктор", "constructor", "i.melnikov@alfaproject.ru", "+7 916 000-00-09", "@melnikov_kr"),
    participant("participant-roga-kr-lead", "Ведущий конструктор", "Конструктор 1 категории", "constructor", "lead.kr@alfaproject.ru", "+7 916 000-00-10"),
    participant("participant-roga-km", "Ксения Артамонова", "Ведущий инженер КМ", "constructor", "k.artamonova@alfaproject.ru", "+7 916 000-00-11"),
    participant("participant-roga-tx", "Сергей Титов", "Ведущий инженер технолог", "engineer", "s.titov@alfaproject.ru", "+7 916 000-00-12", "@titov_tx"),
    participant("participant-roga-ov", "Роман Фадеев", "Ведущий инженер ОВ", "engineer", "r.fadeev@alfaproject.ru", "+7 916 000-00-13"),
    participant("participant-roga-vk", "Елена Морозова", "Ведущий инженер ВК", "engineer", "e.morozova@alfaproject.ru", "+7 916 000-00-14", "@morozova_vk"),
    participant("participant-roga-apt", "Артем Павлов", "Ведущий инженер АПТ", "engineer", "a.pavlov@alfaproject.ru", "+7 916 000-00-15"),
    participant("participant-roga-ss", "Ведущий инженер СС", "Системы связи и безопасности", "engineer", "ss@alfaproject.ru", "+7 916 000-00-16"),
    participant("participant-roga-eom", "Павел Андреев", "ГИП ИОС / ЭОМ", "gip", "p.andreev@alfaproject.ru", "+7 916 110-12-40", "@pavel_gip"),
    participant("participant-roga-an", "Инженер авторского надзора", "Ведущий инженер АН", "engineer", "an@alfaproject.ru", "+7 916 000-00-17"),
    participant("participant-roga-pb", "Никита Беляев", "Специалист по пожарной безопасности", "engineer", "n.belyaev@alfaproject.ru", "+7 916 000-00-18"),
    participant("participant-roga-keo", "Виктория Романова", "Специалист КЕО / материалы", "engineer", "v.romanova@alfaproject.ru", "+7 916 000-00-19"),
    participant("participant-roga-est", "Ольга Данилова", "Ведущий инженер-сметчик", "estimator", "o.danilova@alfaproject.ru", "+7 916 000-00-20"),
    participant("participant-roga-external", "Дмитрий Корнев", "Сторонний разработчик интерьеров", "contractor", "d.kornev@partner.ru", "+7 916 000-00-21", "@kornev_design"),
  ];
}

function participant(
  id: string,
  name: string,
  position: string,
  role: ProjectParticipant["role"],
  email: string,
  phone: string,
  messenger?: string,
  otherContacts?: string,
  integrations: ProjectParticipant["integrations"] = [],
): ProjectParticipant {
  return {
    id,
    projectId: PROJECT_ID,
    name,
    position,
    role,
    email,
    phone,
    messenger,
    otherContacts,
    status: "active",
    integrations,
  };
}

function integration(
  provider: NonNullable<ProjectParticipant["integrations"]>[number]["provider"],
  label: string,
  status: NonNullable<ProjectParticipant["integrations"]>[number]["status"],
  account?: string,
  folderPath?: string,
  lastSyncAt?: string,
): NonNullable<ProjectParticipant["integrations"]>[number] {
  return {
    id: `integration-roga-${provider}`,
    provider,
    label,
    status,
    account,
    folderPath,
    lastSyncAt,
  };
}

function getDemoFileUrl(fileType: FileType) {
  const files: Partial<Record<FileType, string>> = {
    pdf: "demo-plan.pdf",
    docx: "demo-task.docx",
    xlsx: "demo-register.xlsx",
    txt: "demo-note.txt",
  };
  const file = files[fileType];
  return file ? `${import.meta.env.BASE_URL}demo-files/${file}` : undefined;
}

function buildPreview(title: string, fileType: FileType): { text?: string; rows?: string[][] } {
  if (fileType === "xlsx") {
    return {
      rows: [
        ["Раздел", "Документ", "Версия", "Статус", "Ответственный"],
        ["АР", "Фасады / ведомости", "v3", "На проверке", "Анна Лебедева"],
        ["КЖ", "Плиты перекрытия", "v2", "Не принято", "Игорь Мельников"],
        ["ИОС", "Матрица заданий", "v2", "На проверке", "Павел Андреев"],
        ["ТХ", "Точки подключения", "v1", "В работе", "Сергей Титов"],
      ],
    };
  }

  if (fileType === "docx") {
    return {
      text: [
        title,
        "",
        "1. Назначение",
        "Документ является частью тестового проекта ЖК «Рога и копыта» и используется для демонстрации контейнера бизнес-процесса.",
        "",
        "2. Участники",
        "Постановщик задачи, ответственный за задачу, участники и проверяющий фиксируются в карточке процесса.",
        "",
        "3. Результат",
        "После проверки документ получает статус: на проверке, принято, не принято или черновик.",
      ].join("\n"),
    };
  }

  if (fileType === "pdf") {
    return {
      text: [
        title,
        "Демо-PDF для тестового проекта.",
        "В полноценной версии здесь отображается реальный лист, штамп, история версий и зона согласования.",
      ].join("\n"),
    };
  }

  if (fileType === "dwg") {
    return {
      text: [
        title,
        "DWG-превью в демо отображается как карточка чертежа.",
        "В промышленной версии здесь будет просмотрщик чертежей или интеграция с CAD/BIM-хранилищем.",
      ].join("\n"),
    };
  }

  return {};
}
