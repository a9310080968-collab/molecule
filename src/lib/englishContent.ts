import { englishContent } from "../data/englishContent.generated";
import type { DemoProject, ProjectParticipant, ProjectTemplate } from "../types";

const personTranslations = [
  ["Иванов И.И.", "John Smith"],
  ["Анна Лебедева", "Alisa Bishop"],
  ["Петр Генеральный", "Matthew Brown"],
  ["Павел Андреев", "Paul Anderson"],
  ["Алексей Заказчиков", "Alex Carter"],
  ["Артем Павлов", "Arthur Powell"],
  ["Виктория Романова", "Victoria Roman"],
  ["Дмитрий Корнев", "Daniel Crawford"],
  ["Елена Морозова", "Elena Morrison"],
  ["Игорь Мельников", "Ian Miller"],
  ["Ксения Артамонова", "Olivia Adams"],
  ["Мария Соколова", "Maria Stone"],
  ["Наталья Экспертова", "Natalie Evans"],
  ["Никита Беляев", "Nicholas Bell"],
  ["Олег Фомин", "Oliver Foster"],
  ["Ольга Данилова", "Olivia Daniels"],
  ["Роман Фадеев", "Ryan Fields"],
  ["Сергей Наумов", "Samuel Nelson"],
  ["Сергей Титов", "Steven Taylor"],
] as const;

const transliteration: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "E", Ж: "Zh", З: "Z", И: "I", Й: "Y",
  К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F",
  Х: "Kh", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Shch", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const cyrillicPattern = /[А-Яа-яЁё]/;
const contentFragments = Object.entries(englishContent)
  .filter(([source]) => cyrillicPattern.test(source))
  .sort(([left], [right]) => right.length - left.length);
const legacyTransliteratedFragments = contentFragments
  .map(([source, target]) => [transliterateCyrillic(source), target] as const)
  .filter(([source, target]) => source.length >= 5 && source !== target)
  .sort(([left], [right]) => right.length - left.length);

const roleLikePersonNames = new Map([
  ["Lead Architect", "Emily Clark"],
  ["Lead designer", "Michael Reed"],
  ["Lead COMMS Engineer", "Andrew Scott"],
  ["Supervision engineer", "David Brooks"],
]);

const legacyEnglishCorrections = new Map([
  ["Agreed", "Approved"],
  ["Any comments?", "Changes requested"],
  ["Architect 1st category", "Architect, Category I"],
  ["Chief designer", "Chief Structural Engineer"],
  ["Customer / design", "Client Representative / Design"],
  ["DL Specialist/Materials", "Daylight and Materials Specialist"],
  ["Draft process", "Process draft"],
  ["Expert in the PD section", "Project Documentation Reviewer"],
  ["General Director of General Designer", "Managing Director, General Design Contractor"],
  ["Hired", "Accepted for work"],
  ["Lead Engineer SS", "Lead Steel Structures Engineer"],
  ["Leading engineer of APT", "Lead Fire Suppression Engineer"],
  ["Leading engineer of the Academy of Sciences", "Lead Construction Supervision Engineer"],
  ["Leading engineer technologist", "Lead Process Engineer"],
  ["Leading estimate engineer", "Lead Cost Engineer"],
  ["Leading general plan specialist", "Lead Master Planning Engineer"],
  ["Not accepted", "Rejected"],
  ["Not verified", "Not reviewed"],
  ["Third Party Interior Developer", "External Interior Design Consultant"],
  ["1st category constructor", "Structural Engineer, Category I"],
]);

export function getEnglishContentTranslation(value: string) {
  return Object.prototype.hasOwnProperty.call(englishContent, value)
    ? englishContent[value]
    : undefined;
}

export function toEnglishContent(value: string, upgradeLegacyTransliteration = false) {
  const corrected = legacyEnglishCorrections.get(value);
  if (corrected) {
    return corrected;
  }

  const exact = getEnglishContentTranslation(value);
  if (exact) {
    return exact;
  }

  let normalized = value;
  personTranslations.forEach(([source, target]) => {
    normalized = normalized.split(source).join(target);
  });

  if (cyrillicPattern.test(normalized)) {
    contentFragments.forEach(([source, target]) => {
      normalized = normalized.split(source).join(target);
    });
  } else if (upgradeLegacyTransliteration) {
    legacyTransliteratedFragments.forEach(([source, target]) => {
      normalized = normalized.split(source).join(target);
    });
    normalized = normalized.replace(/\bGIP\b/g, "LPE");
  }

  normalized = normalized
    .replace(/\b(?:KZh|KJ|QOL)(?=\d)/g, "RC")
    .replace(/^сегодня(?=\b|,)/i, "today")
    .replace(/^завтра(?=\b|,)/i, "tomorrow")
    .replace(/^вчера(?=\b|,)/i, "yesterday")
    .replace(/^только что$/i, "just now");

  return transliterateCyrillic(normalized);
}

export function toEnglishData<T>(value: T): T {
  if (typeof value === "string") {
    return toEnglishContent(value, true) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toEnglishData(item)) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toEnglishData(item)]),
  ) as T;
}

function transliterateCyrillic(value: string) {
  return value.replace(/[А-Яа-яЁё]/g, (letter) => transliteration[letter] ?? "");
}

export function normalizeProjectPeople(project: DemoProject): DemoProject {
  return {
    ...project,
    participants: project.participants.map((participant) => ({
      ...participant,
      name: normalizePersonName(participant.name),
      role: participant.role ?? inferParticipantRole(participant),
      status: participant.status ?? "active",
    })),
    nodes: project.nodes.map((node) => ({
      ...node,
      responsible: normalizeOptionalPersonName(node.responsible),
      updatedBy: normalizeOptionalPersonName(node.updatedBy),
    })),
    processes: project.processes.map(normalizeProcessPeople),
    chatMessages: project.chatMessages.map((message) => ({
      ...message,
      author: normalizePersonName(message.author),
    })),
  };
}

export function normalizeTemplatePeople(template: ProjectTemplate): ProjectTemplate {
  return {
    ...template,
    nodes: template.nodes.map((node) => ({
      ...node,
      responsible: normalizeOptionalPersonName(node.responsible),
      updatedBy: normalizeOptionalPersonName(node.updatedBy),
    })),
    processes: template.processes.map(normalizeProcessPeople),
  };
}

function normalizeProcessPeople(process: DemoProject["processes"][number]) {
  return {
    ...process,
    sender: normalizePersonName(process.sender),
    receiver: normalizePersonName(process.receiver),
    approver: normalizeOptionalPersonName(process.approver),
    participantNames: process.participantNames?.map(normalizePersonName),
    delegatedTo: process.delegatedTo?.map(normalizePersonName),
    discussion: process.discussion?.map((entry) => ({
      ...entry,
      author: normalizePersonName(entry.author),
    })),
  };
}

function normalizePersonName(value: string) {
  return roleLikePersonNames.get(value) ?? value;
}

function normalizeOptionalPersonName(value: string | undefined) {
  return value ? normalizePersonName(value) : value;
}

function inferParticipantRole(participant: ProjectParticipant) {
  const marker = `${participant.id} ${participant.position}`.toLocaleLowerCase("en-US");
  if (marker.includes("admin")) return "admin";
  if (marker.includes("gip") || marker.includes("lpe")) return "gip";
  if (marker.includes("customer") || marker.includes("expert") || marker.includes("director")) return "observer";
  if (marker.includes("coordinator") || marker.includes("-ird")) return "coordinator";
  if (marker.includes("architect") || marker.includes("-ar")) return "architect";
  if (marker.includes("constructor") || marker.includes("designer") || marker.includes("-kr") || marker.includes("-km")) return "constructor";
  if (marker.includes("estimate") || marker.includes("estimator") || marker.includes("-est")) return "estimator";
  if (marker.includes("contractor") || marker.includes("partner") || marker.includes("external")) return "contractor";
  return "engineer";
}
