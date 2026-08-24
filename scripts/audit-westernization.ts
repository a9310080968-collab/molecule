import { demoProjects, initialNotifications } from "../src/data/mockProject";
import { teamDirectory } from "../src/components/ProjectManagerModal";
import { readFileSync } from "node:fs";
import { westernizeEnglishContent } from "../src/lib/englishContent";
import { createBlankProjectTemplate, createDefaultProjectTemplate } from "../src/lib/projectTemplates";

type StringEntry = { path: string; value: string };

const forbiddenPatterns = [
  { label: "Cyrillic", pattern: /[А-Яа-яЁё]/ },
  { label: "Russian domain", pattern: /(?:\.ru\b|@[^\s]+\.ru\b)/i },
  { label: "Russian phone", pattern: /\+7\s/ },
  {
    label: "Russian transliteration",
    pattern: /\b(?:prinyal|konteyner|rabotu|zhdu|finalnyy|proekt|dokument|zadach|soglas|razrab|vedomost|pismo|pochta|fasad|pomeshch|raschet|zamech|uchastok|korpus|inzhener|genplan|smetchik|demonstratsionnyy|stroygenplan|kosmicheskaya|nauchny|roga|kopyta)\w*/i,
  },
  { label: "Legacy Russian AEC code", pattern: /\b(?:GIP|ZAV|IPD|MP|AR|ENG|TECH|FS|DL|CMP|OPS|ACC|WSS|EWS|COMMS|AFS|HS|EXP|EST|DD|KR|GP|EOM)\b/ },
  { label: "Legacy market-facing name", pattern: /Horns and Hooves|Sirius Residential|Vega Business|Yandex|Kontur\.Diadok|Alisa Bishop/ },
];

const entries: StringEntry[] = [];
const technicalKeys = new Set([
  "id", "projectId", "levelId", "centralNodeId", "parentLevelId", "parentNodeId", "childrenLevelId",
  "nodeIds", "from", "to", "documentOwnerNodeId", "processId", "targetProcessId", "targetNodeId", "documentId",
]);

function collectStrings(value: unknown, path: string) {
  if (typeof value === "string") {
    entries.push({ path, value });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (!technicalKeys.has(key)) {
        collectStrings(item, `${path}.${key}`);
      }
    });
  }
}

collectStrings(demoProjects, "demoProjects");
collectStrings(initialNotifications, "initialNotifications");
collectStrings(teamDirectory, "teamDirectory");
collectStrings(createBlankProjectTemplate(), "projectTemplates.blank");
collectStrings(createDefaultProjectTemplate(), "projectTemplates.default");
const i18nSource = readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");
const interfaceTranslations = [...i18nSource.matchAll(/^\s*"(?:[^"\\]|\\.)*":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)]
  .map((match) => westernizeEnglishContent(JSON.parse(`"${match[1]}"`) as string));
collectStrings(interfaceTranslations, "interfaceTranslations");

const issues = entries.flatMap((entry) => forbiddenPatterns
  .filter(({ pattern }) => pattern.test(entry.value))
  .map(({ label }) => ({ ...entry, label })));

if (process.argv.includes("--report")) {
  const report = demoProjects.map((project) => ({
    project: project.title,
    address: project.address,
    nodes: project.nodes.map((node) => `${node.shortCode ?? "-"}: ${node.title}`),
    people: project.participants.map((participant) => `${participant.name} — ${participant.position} — ${participant.email}`),
    processes: project.processes.map((process) => process.title),
    files: [
      ...project.nodes.flatMap((node) => node.documents ?? []),
      ...project.processes.flatMap((process) => process.documents ?? []),
      ...project.inboxDocuments,
    ].map((document) => document.title),
  }));

  console.log(JSON.stringify(report, null, 2));
}

if (issues.length > 0) {
  console.error("Westernization audit failed:");
  issues.forEach((issue) => console.error(`- [${issue.label}] ${issue.path}: ${issue.value}`));
  process.exitCode = 1;
} else {
  console.log(`Westernization audit passed for ${entries.length} strings.`);
}
