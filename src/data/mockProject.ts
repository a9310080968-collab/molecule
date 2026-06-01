import type { NodeStatus, ProjectNode } from "../types";

export const project = {
  id: "project-sirius",
  title: "ЖК Сириус",
  address: "Объект на ул. Космическая, 12",
  updatedAt: "сегодня, 14:30",
};

export const statusLabels: Record<NodeStatus, string> = {
  approved: "Утверждено ГИП",
  review: "На проверке ГИП",
  comments: "Есть замечания",
  unchecked: "Не проверено",
  draft: "Черновик",
};

export const statusColors: Record<NodeStatus, string> = {
  approved: "#10d99a",
  review: "#ffd12f",
  comments: "#b45cff",
  unchecked: "#9aa5bd",
  draft: "#3aa8ff",
};

export const sections: ProjectNode[] = [
  {
    id: "sec-ar",
    type: "section",
    shortCode: "АР",
    title: "Архитектурные решения",
    progress: 78,
    status: "review",
    version: "v2.1",
    responsible: "Анна Лебедева",
    updatedAt: "сегодня, 13:10",
    tags: ["АР", "ARCH", "ФАСАД", "ПЛАН", "ОБМЕР"],
  },
  {
    id: "sec-kr",
    type: "section",
    shortCode: "КР",
    title: "Конструктивные решения",
    progress: 65,
    status: "unchecked",
    version: "v1.8",
    responsible: "Игорь Мельников",
    updatedAt: "вчера, 18:20",
    tags: ["КР", "КЖ", "КМ", "КОНСТРУКТИВ"],
  },
  {
    id: "sec-pz",
    type: "section",
    shortCode: "ПЗ",
    title: "Пояснительная записка",
    progress: 50,
    status: "comments",
    version: "v2.0",
    responsible: "Мария Соколова",
    updatedAt: "сегодня, 11:45",
    tags: ["ПЗ", "ОБЩИЕ", "ТЭП", "ЭКСПЕРТИЗА"],
  },
  {
    id: "sec-ov",
    type: "section",
    shortCode: "ОВ",
    title: "Отопление и вентиляция",
    progress: 68,
    status: "approved",
    version: "v1.6",
    responsible: "Роман Фадеев",
    updatedAt: "15.05.2026",
    tags: ["ОВ", "ВЕНТ", "ОТОПЛЕНИЕ", "ВОЗДУХ"],
  },
  {
    id: "sec-vk",
    type: "section",
    shortCode: "ВК",
    title: "Водоснабжение и канализация",
    progress: 71,
    status: "review",
    version: "v1.5",
    responsible: "Елена Морозова",
    updatedAt: "сегодня, 10:15",
    tags: ["ВК", "ВОДА", "КАНАЛИЗАЦИЯ", "Т3"],
  },
  {
    id: "sec-eom",
    type: "section",
    shortCode: "ЭОМ",
    title: "Электрооборудование и освещение",
    progress: 78,
    status: "approved",
    version: "v1.9",
    responsible: "Павел Андреев",
    updatedAt: "21.05.2026",
    tags: ["ЭОМ", "ЭЛЕКТРИКА", "ЩИТ", "СВЕТ"],
  },
  {
    id: "sec-pos",
    type: "section",
    shortCode: "ПОС",
    title: "Проект организации строительства",
    progress: 30,
    status: "draft",
    version: "v0.7",
    responsible: "Сергей Наумов",
    updatedAt: "вчера, 16:40",
    tags: ["ПОС", "СТРОЙКА", "ЛОГИСТИКА", "ГРАФИК"],
  },
  {
    id: "sec-est",
    type: "section",
    shortCode: "СМ",
    title: "Сметная документация",
    progress: 40,
    status: "unchecked",
    version: "v0.9",
    responsible: "Ольга Данилова",
    updatedAt: "20.05.2026",
    tags: ["СМ", "СМЕТА", "КП", "БЮДЖЕТ"],
  },
];

export const documents: ProjectNode[] = [
  doc("doc-ar-1", "План 1 этажа v3", "sec-ar", "review", "v3", "pdf", "Анна Лебедева", "сегодня, 12:40"),
  doc("doc-ar-2", "Фасады v2.0", "sec-ar", "approved", "v2.0", "dwg", "Дмитрий Корнев", "22.05.2026"),
  doc("doc-ar-3", "Разрез 1-1 v1.3", "sec-ar", "comments", "v1.3", "dwg", "Анна Лебедева", "21.05.2026"),
  doc("doc-ar-4", "План кровли v1.4", "sec-ar", "draft", "v1.4", "pdf", "Анна Лебедева", "сегодня, 09:20"),
  doc("doc-ar-5", "Ведомость элементов v1.1", "sec-ar", "unchecked", "v1.1", "xlsx", "Виктория Романова", "19.05.2026"),
  doc("doc-ar-6", "Колористика фасадов v0.7", "doc-ar-2", "draft", "v0.7", "pptx", "Дмитрий Корнев", "сегодня, 15:05"),
  doc("doc-ar-7", "Комментарий к планировкам", "doc-ar-1", "comments", "v1", "txt", "Анна Лебедева", "сегодня, 15:24"),
  doc("doc-ar-8", "Экспликация помещений v2", "sec-ar", "review", "v2", "xlsx", "Виктория Романова", "сегодня, 13:52"),

  doc("doc-kr-1", "Схема КЖ v1.2", "sec-kr", "unchecked", "v1.2", "dwg", "Игорь Мельников", "18.05.2026"),
  doc("doc-kr-2", "Узел КМ v1.1", "sec-kr", "review", "v1.1", "pdf", "Игорь Мельников", "сегодня, 10:50"),
  doc("doc-kr-3", "Спецификация металла v2.0", "sec-kr", "unchecked", "v2.0", "xlsx", "Ксения Артамонова", "17.05.2026"),
  doc("doc-kr-4", "Расчеты нагрузок v1", "sec-kr", "comments", "v1", "docx", "Игорь Мельников", "16.05.2026"),
  doc("doc-kr-5", "Замечания по узлам КМ", "doc-kr-2", "comments", "v1", "txt", "Ксения Артамонова", "сегодня, 12:11"),
  doc("doc-kr-6", "Проверочный расчет плиты v0.9", "doc-kr-4", "draft", "v0.9", "xlsx", "Игорь Мельников", "сегодня, 09:45"),
  doc("doc-kr-7", "Сводка коллизий КР", "sec-kr", "review", "v1", "pdf", "Игорь Мельников", "вчера, 20:15"),

  doc("doc-pz-1", "Общие данные v1.0", "sec-pz", "approved", "v1.0", "docx", "Мария Соколова", "12.05.2026"),
  doc("doc-pz-2", "Пояснительная записка v2.0", "sec-pz", "comments", "v2.0", "docx", "Мария Соколова", "сегодня, 11:45"),
  doc("doc-pz-3", "Технико-экономические показатели v1.0", "sec-pz", "approved", "v1.0", "xlsx", "Ирина Демидова", "10.05.2026"),
  doc("doc-pz-4", "Исходные данные v1.2", "sec-pz", "comments", "v1.2", "pdf", "Мария Соколова", "17.05.2026"),
  doc("doc-pz-5", "Опросный лист оборудования v1.0", "sec-pz", "draft", "v1.0", "xlsx", "Павел Андреев", "16.05.2026"),
  doc("doc-pz-6", "Матрица замечаний экспертизы", "doc-pz-2", "comments", "v1", "xlsx", "Мария Соколова", "сегодня, 14:05"),
  doc("doc-pz-7", "Презентация для статуса v0.3", "sec-pz", "draft", "v0.3", "pptx", "Павел Андреев", "сегодня, 16:05"),
  doc("doc-pz-8", "Список открытых вопросов", "doc-pz-4", "draft", "v1", "txt", "Ирина Демидова", "сегодня, 15:41"),

  doc("doc-ov-1", "Схема систем ОВ v1.2", "sec-ov", "approved", "v1.2", "dwg", "Роман Фадеев", "15.05.2026"),
  doc("doc-ov-2", "План ОВ 1 эт. v1.3", "sec-ov", "approved", "v1.3", "pdf", "Роман Фадеев", "15.05.2026"),
  doc("doc-ov-3", "План ОВ 2 эт. v1.1", "sec-ov", "review", "v1.1", "pdf", "Роман Фадеев", "18.05.2026"),
  doc("doc-ov-4", "Расчеты воздухообмена v1", "sec-ov", "approved", "v1", "xlsx", "Алексей Захаров", "14.05.2026"),
  doc("doc-ov-5", "Подбор оборудования ОВ v0.8", "doc-ov-4", "draft", "v0.8", "xlsx", "Алексей Захаров", "сегодня, 11:10"),
  doc("doc-ov-6", "Сравнение вентустановок", "sec-ov", "review", "v1", "pptx", "Роман Фадеев", "вчера, 19:22"),

  doc("doc-vk-1", "План ВК 1 эт. v1.2", "sec-vk", "review", "v1.2", "pdf", "Елена Морозова", "сегодня, 10:15"),
  doc("doc-vk-2", "Схема В1, Т3 v1.1", "sec-vk", "approved", "v1.1", "dwg", "Елена Морозова", "13.05.2026"),
  doc("doc-vk-3", "Спецификация оборудования v1.3", "sec-vk", "comments", "v1.3", "xlsx", "Елена Морозова", "19.05.2026"),
  doc("doc-vk-4", "Ситуационный план v1", "sec-vk", "review", "v1", "pdf", "Владимир Титов", "сегодня, 08:30"),
  doc("doc-vk-5", "Акт исходных данных ВК", "doc-vk-4", "unchecked", "v1", "docx", "Владимир Титов", "сегодня, 12:32"),
  doc("doc-vk-6", "Примечания по Т3", "doc-vk-2", "draft", "v1", "txt", "Елена Морозова", "сегодня, 14:44"),

  doc("doc-eom-1", "План ЭОМ 1 эт. v1.3", "sec-eom", "approved", "v1.3", "dwg", "Павел Андреев", "21.05.2026"),
  doc("doc-eom-2", "Однолинейная схема v1.2", "sec-eom", "approved", "v1.2", "pdf", "Павел Андреев", "21.05.2026"),
  doc("doc-eom-3", "Щиты и шлейфы v1.1", "sec-eom", "review", "v1.1", "xlsx", "Павел Андреев", "20.05.2026"),
  doc("doc-eom-4", "Спецификация светильников v1.4", "sec-eom", "approved", "v1.4", "xlsx", "Наталья Берг", "19.05.2026"),
  doc("doc-eom-5", "Кабельный журнал v0.6", "doc-eom-3", "draft", "v0.6", "xlsx", "Павел Андреев", "сегодня, 13:20"),
  doc("doc-eom-6", "Фото щитовой для сверки", "sec-eom", "unchecked", "v1", "pdf", "Наталья Берг", "сегодня, 10:02"),
  doc("doc-eom-7", "Список вопросов подрядчику", "doc-eom-2", "draft", "v1", "txt", "Павел Андреев", "сегодня, 15:18"),

  doc("doc-pos-1", "Календарный план v1", "sec-pos", "draft", "v1", "pdf", "Сергей Наумов", "вчера, 16:40"),
  doc("doc-pos-2", "Стройгенплан v0.8", "sec-pos", "draft", "v0.8", "dwg", "Сергей Наумов", "19.05.2026"),
  doc("doc-pos-3", "Пояснения по логистике v0.5", "sec-pos", "draft", "v0.5", "docx", "Сергей Наумов", "17.05.2026"),
  doc("doc-pos-4", "График поставок v0.4", "sec-pos", "unchecked", "v0.4", "xlsx", "Лилия Громова", "15.05.2026"),
  doc("doc-pos-5", "Схема временных дорог", "doc-pos-2", "draft", "v0.2", "pdf", "Сергей Наумов", "сегодня, 09:05"),
  doc("doc-pos-6", "План совещания стройки", "sec-pos", "draft", "v1", "txt", "Лилия Громова", "сегодня, 16:12"),
  doc("doc-pos-7", "Риски поставок v0.2", "doc-pos-4", "comments", "v0.2", "pptx", "Лилия Громова", "сегодня, 15:36"),

  doc("doc-est-1", "Локальная смета v0.9", "sec-est", "unchecked", "v0.9", "xlsx", "Ольга Данилова", "20.05.2026"),
  doc("doc-est-2", "Ведомость объемов v1.0", "sec-est", "review", "v1.0", "xlsx", "Ольга Данилова", "20.05.2026"),
  doc("doc-est-3", "Коммерческие предложения v0.6", "sec-est", "unchecked", "v0.6", "pdf", "Ольга Данилова", "18.05.2026"),
  doc("doc-est-4", "Сводный расчет v0.8", "sec-est", "comments", "v0.8", "xlsx", "Ольга Данилова", "18.05.2026"),
  doc("doc-est-5", "Письмо поставщика лифтов", "doc-est-3", "review", "v1", "docx", "Ольга Данилова", "сегодня, 12:05"),
  doc("doc-est-6", "Сравнение КП v0.4", "doc-est-3", "draft", "v0.4", "xlsx", "Ольга Данилова", "сегодня, 13:55"),
  doc("doc-est-7", "Презентация бюджета", "sec-est", "draft", "v0.2", "pptx", "Павел Андреев", "сегодня, 16:20"),
];

export const projectNodes: ProjectNode[] = [
  {
    id: project.id,
    type: "central",
    title: project.title,
    description: "Готовность документации",
    updatedAt: project.updatedAt,
    children: sections.map((section) => section.id),
  },
  ...sections.map((section) => ({
    ...section,
    children: documents
      .filter((document) => document.parentId === section.id)
      .map((document) => document.id),
  })),
  ...documents,
];

export const plannedFeatures = [
  "Шаблоны документов",
  "Взаимосвязи документов",
  "Помощь ИИ",
];

function doc(
  id: string,
  title: string,
  parentId: string,
  status: NodeStatus,
  version: string,
  fileType: ProjectNode["fileType"],
  responsible: string,
  updatedAt: string,
): ProjectNode {
  return {
    id,
    type: "document",
    title,
    parentId,
    status,
    version,
    fileType,
    responsible,
    updatedAt,
    source: "project",
  };
}
