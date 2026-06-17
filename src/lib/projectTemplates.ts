import type { BusinessProcess, DemoProject, MapLevel, ProjectNode, ProjectParticipant, ProjectTemplate } from "../types";

const NOW = "только что";

export function createDefaultProjectTemplate(): ProjectTemplate {
  const projectId = "template-base";
  const rootLevelId = "level-template-base-root";
  const arLevelId = "level-template-base-ar";
  const krLevelId = "level-template-base-kr";
  const irdLevelId = "level-template-base-ird";

  const levels: MapLevel[] = [
    {
      id: rootLevelId,
      projectId,
      title: "Базовая структура проекта",
      subtitle: "Разделы проектной документации и исходные данные",
      centralNodeId: "node-template-root",
      nodeIds: [
        "node-template-root",
        "node-template-ird",
        "node-template-ar",
        "node-template-kr",
        "node-template-pz",
        "node-template-ov",
        "node-template-vk",
        "node-template-eom",
        "node-template-pos",
        "node-template-est",
      ],
    },
    {
      id: irdLevelId,
      projectId,
      title: "ИРД / Общие данные",
      subtitle: "ТЗ, задания, исходно-разрешительная документация",
      centralNodeId: "node-template-ird",
      parentLevelId: rootLevelId,
      parentNodeId: "node-template-ird",
      nodeIds: ["node-template-ird", "node-template-tz", "node-template-gpzu", "node-template-tu"],
    },
    {
      id: arLevelId,
      projectId,
      title: "АР / Архитектурные решения",
      subtitle: "Планы, фасады, спецификации и пакет ГИП",
      centralNodeId: "node-template-ar",
      parentLevelId: rootLevelId,
      parentNodeId: "node-template-ar",
      nodeIds: ["node-template-ar", "node-template-ar-plans", "node-template-ar-facades", "node-template-ar-specs", "node-template-ar-gip"],
    },
    {
      id: krLevelId,
      projectId,
      title: "КР / Конструктивные решения",
      subtitle: "ЖБ, КМ, расчеты нагрузок и узлы",
      centralNodeId: "node-template-kr",
      parentLevelId: rootLevelId,
      parentNodeId: "node-template-kr",
      nodeIds: ["node-template-kr", "node-template-kr-kzh", "node-template-kr-km", "node-template-kr-loads", "node-template-kr-gip"],
    },
  ];

  const nodes: ProjectNode[] = [
    templateNode(projectId, rootLevelId, "node-template-root", "central", "Новый проект", "0%", "Центральная нода проекта.", "review"),
    templateNode(projectId, rootLevelId, "node-template-ird", "ird", "Исходно-разрешительная документация", "ИРД", "Общие данные для всех разделов.", "unchecked", irdLevelId, ["ИРД", "ТЗ"]),
    templateNode(projectId, rootLevelId, "node-template-ar", "section", "Архитектурные решения", "АР", "Архитектурный раздел.", "unchecked", arLevelId, ["АР"]),
    templateNode(projectId, rootLevelId, "node-template-kr", "section", "Конструктивные решения", "КР", "Конструктивный раздел.", "unchecked", krLevelId, ["КР"]),
    templateNode(projectId, rootLevelId, "node-template-pz", "section", "Пояснительная записка", "ПЗ", "Сводный текстовый раздел проекта.", "unchecked", undefined, ["ПЗ"]),
    templateNode(projectId, rootLevelId, "node-template-ov", "section", "Отопление и вентиляция", "ОВ", "Инженерный раздел ОВ.", "unchecked", undefined, ["ОВ"]),
    templateNode(projectId, rootLevelId, "node-template-vk", "section", "Водоснабжение и канализация", "ВК", "Инженерный раздел ВК.", "unchecked", undefined, ["ВК"]),
    templateNode(projectId, rootLevelId, "node-template-eom", "section", "Электрооборудование и освещение", "ЭОМ", "Электрика и освещение.", "unchecked", undefined, ["ЭОМ"]),
    templateNode(projectId, rootLevelId, "node-template-pos", "section", "Проект организации строительства", "ПОС", "Организация строительства.", "unchecked", undefined, ["ПОС"]),
    templateNode(projectId, rootLevelId, "node-template-est", "section", "Сметная документация", "СМ", "Сметы и объемы.", "unchecked", undefined, ["СМ"]),
    templateNode(projectId, irdLevelId, "node-template-tz", "subsection", "Техническое задание", "ТЗ", "Требования заказчика.", "unchecked"),
    templateNode(projectId, irdLevelId, "node-template-gpzu", "subsection", "ГПЗУ", "ГПЗУ", "Градостроительный план участка.", "unchecked"),
    templateNode(projectId, irdLevelId, "node-template-tu", "subsection", "Технические условия", "ТУ", "ТУ ресурсоснабжающих организаций.", "unchecked"),
    templateNode(projectId, arLevelId, "node-template-ar-plans", "subsection", "Планировочные решения", "Планы", "Планы этажей и экспликации.", "unchecked"),
    templateNode(projectId, arLevelId, "node-template-ar-facades", "subsection", "Фасады", "Фасады", "Фасадные решения.", "unchecked"),
    templateNode(projectId, arLevelId, "node-template-ar-specs", "subsection", "Спецификации", "СП", "Ведомости и спецификации.", "unchecked"),
    templateNode(projectId, arLevelId, "node-template-ar-gip", "package", "Пакет ГИП", "ГИП", "Контейнер передачи на согласование.", "unchecked"),
    templateNode(projectId, krLevelId, "node-template-kr-kzh", "subsection", "Железобетон", "КЖ", "ЖБ конструкции.", "unchecked"),
    templateNode(projectId, krLevelId, "node-template-kr-km", "subsection", "Металлоконструкции", "КМ", "Металлоконструкции.", "unchecked"),
    templateNode(projectId, krLevelId, "node-template-kr-loads", "subsection", "Расчеты нагрузок", "РН", "Нагрузки и расчетные схемы.", "unchecked"),
    templateNode(projectId, krLevelId, "node-template-kr-gip", "package", "Пакет ГИП", "ГИП", "Передача КР на проверку.", "unchecked"),
  ];

  return {
    id: "template-base-project",
    title: "Базовый проект документации",
    description: "Стартовый шаблон с ИРД, основными разделами и несколькими внутренними уровнями.",
    createdAt: "демо",
    sourceProjectTitle: "Системный шаблон",
    levels,
    nodes,
    processes: [],
  };
}

export function createTemplateFromProject(project: DemoProject, title: string, description: string): ProjectTemplate {
  const nonDocumentNodeIds = new Set(project.nodes.filter((node) => node.type !== "document").map((node) => node.id));
  const levels: MapLevel[] = project.levels.map((level) => ({
    ...level,
    nodeIds: level.nodeIds.filter((nodeId) => nonDocumentNodeIds.has(nodeId)),
  }));
  const nodes: ProjectNode[] = project.nodes
    .filter((node) => node.type !== "document")
    .map((node) => ({
      ...node,
      status: node.type === "central" ? ("review" as const) : ("unchecked" as const),
      updatedAt: NOW,
      deadlineAt: undefined,
      document: undefined,
      documentOwnerNodeId: undefined,
      fileType: undefined,
    }));
  const processes = project.processes.map((process) => ({
    ...process,
    status: "draft" as const,
    validationAt: undefined,
    documents: [],
    source: "manual" as const,
  }));

  return {
    id: `template-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    title: title.trim() || `${project.title}: шаблон`,
    description: description.trim() || "Структура проекта без рабочих документов.",
    createdAt: NOW,
    sourceProjectTitle: project.title,
    levels,
    nodes,
    processes,
  };
}

export function createProjectFromTemplate(template: ProjectTemplate, title: string, address: string): DemoProject {
  const projectId = `project-${slugify(title || "new")}-${Date.now()}`;
  const levelIdMap = new Map(template.levels.map((level, index) => [level.id, `level-${projectId}-${index}`]));
  const nodeIdMap = new Map(template.nodes.map((node, index) => [node.id, `node-${projectId}-${index}`]));
  const processIdMap = new Map(template.processes.map((process, index) => [process.id, `bp-${projectId}-${index}`]));

  const levels: MapLevel[] = template.levels.map((level, index) => ({
    ...level,
    id: levelIdMap.get(level.id) ?? `level-${projectId}-${index}`,
    projectId,
    title: index === 0 ? title : level.title,
    subtitle: index === 0 ? `Проект создан из шаблона «${template.title}»` : level.subtitle,
    centralNodeId: nodeIdMap.get(level.centralNodeId) ?? level.centralNodeId,
    nodeIds: level.nodeIds.map((nodeId) => nodeIdMap.get(nodeId)).filter(Boolean) as string[],
    parentLevelId: level.parentLevelId ? levelIdMap.get(level.parentLevelId) : undefined,
    parentNodeId: level.parentNodeId ? nodeIdMap.get(level.parentNodeId) : undefined,
  }));

  const rootLevelId = levels[0]?.id ?? `level-${projectId}-0`;
  const rootCentralId = levels[0]?.centralNodeId;
  const nodes: ProjectNode[] = template.nodes.map((node, index) => {
    const id = nodeIdMap.get(node.id) ?? `node-${projectId}-${index}`;
    const isRootCentral = id === rootCentralId;
    return {
      ...node,
      id,
      projectId,
      levelId: levelIdMap.get(node.levelId) ?? rootLevelId,
      title: isRootCentral ? title : node.title,
      shortCode: isRootCentral ? "0%" : node.shortCode,
      description: isRootCentral ? `Проект создан из шаблона «${template.title}».` : node.description,
      status: node.type === "central" ? ("review" as const) : ("unchecked" as const),
      updatedAt: NOW,
      childrenLevelId: node.childrenLevelId ? levelIdMap.get(node.childrenLevelId) : undefined,
      documentOwnerNodeId: undefined,
      document: undefined,
      fileType: undefined,
    };
  });

  const processes: BusinessProcess[] = template.processes.map((process, index) => ({
    ...process,
    id: processIdMap.get(process.id) ?? `bp-${projectId}-${index}`,
    projectId,
    levelId: levelIdMap.get(process.levelId) ?? rootLevelId,
    from: nodeIdMap.get(process.from) ?? process.from,
    to: nodeIdMap.get(process.to) ?? process.to,
    status: "draft",
    createdAt: NOW,
    validationAt: undefined,
    source: "manual",
    documents: [],
  }));

  return {
    id: projectId,
    title: title.trim() || "Новый проект",
    address: address.trim() || "Адрес не указан",
    updatedAt: NOW,
    storageUsedGb: 0,
    storageLimitGb: 500,
    levels,
    nodes,
    processes,
    inboxDocuments: [],
    participants: createDefaultParticipants(projectId),
    chatMessages: [
      {
        id: `chat-${projectId}-created`,
        projectId,
        author: "Система",
        role: "Шаблон",
        text: `Проект создан из шаблона «${template.title}».`,
        time: NOW,
      },
    ],
  };
}

function createDefaultParticipants(projectId: string): ProjectParticipant[] {
  return [
    {
      id: `participant-${projectId}-admin`,
      projectId,
      name: "Павел Андреев",
      position: "ГИП / администратор проекта",
      role: "admin",
      email: "p.andreev@alfaproject.ru",
      phone: "+7 916 110-12-40",
      messenger: "@pavel_gip",
      status: "active",
    },
  ];
}

function templateNode(
  projectId: string,
  levelId: string,
  id: string,
  type: ProjectNode["type"],
  title: string,
  shortCode: string,
  description: string,
  status: ProjectNode["status"],
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
    responsible: "Не назначен",
    updatedAt: NOW,
    childrenLevelId,
    tags,
  };
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "new";
}
