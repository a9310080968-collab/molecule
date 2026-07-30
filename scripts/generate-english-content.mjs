import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const sourceFiles = [
  "src/App.tsx",
  "src/data/mockProject.ts",
  "src/data/rogaProject.ts",
  "src/lib/demoAccess.ts",
  "src/lib/projectTemplates.ts",
];

const outputFile = "src/data/englishContent.generated.ts";
const cyrillicPattern = /[А-Яа-яЁё]/;

const people = new Map([
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
]);

const exact = new Map([
  ...people,
  ["ЖК «Рога и копыта»", "Horns and Hooves Residential Complex"],
  ["ЖК Рога и копыта / ТЗ с готовыми БП", "Horns and Hooves Residential Complex / brief with prepared workflows"],
  ["ЖК Сириус", "Sirius Residential Complex"],
  ["БЦ Вега", "Vega Business Center"],
  ["Демо-объект: РД, комплексная проектная документация", "Demo project: detailed design and complete project documentation"],
  ["Объект на пр. Научный, 7", "7 Nauchny Avenue"],
  ["Объект на ул. Космическая, 12", "12 Kosmicheskaya Street"],
  ["Адрес не указан", "Address not specified"],
  ["Уточнение_ХЗ.xlsx", "Clarification_request.xlsx"],
  ["Согласовано", "Approved"],
  ["Экспертиза: не пройдена", "Expert review: not completed"],
  ["На проверке", "Under review"],
  ["Есть замечания", "Changes requested"],
  ["Не проверено", "Not reviewed"],
  ["Черновик", "Draft"],
  ["Черновик процесса", "Process draft"],
  ["Отправлено на проверку", "Sent for review"],
  ["Принято в работу", "Accepted for work"],
  ["Не принято", "Rejected"],
  ["Принято", "Accepted"],
  ["Гендиректор генпроектировщика", "Managing Director, General Design Contractor"],
  ["Ведущий инженер АН", "Lead Construction Supervision Engineer"],
  ["Ведущий инженер КМ", "Lead Steel Structures Engineer"],
  ["Ведущий инженер-сметчик", "Lead Cost Engineer"],
  ["Ведущий специалист генплана", "Lead Master Planning Engineer"],
  ["Главный конструктор", "Chief Structural Engineer"],
  ["Конструктор 1 категории", "Structural Engineer, Category I"],
  ["Архитектор 1 категории", "Architect, Category I"],
  ["Эксперт по разделу ПД", "Project Documentation Reviewer"],
  ["Заказчик / проектирование", "Client Representative / Design"],
  ["Ведущий инженер технолог", "Lead Process Engineer"],
  ["Ведущий инженер АПТ", "Lead Fire Suppression Engineer"],
  ["Специалист КЕО / материалы", "Daylight and Materials Specialist"],
  ["Сторонний разработчик интерьеров", "External Interior Design Consultant"],
  ["сегодня", "today"],
  ["только что", "just now"],
  ["вчера, 17:40", "yesterday, 17:40"],
]);

const codes = new Map([
  ["ИРД", "IPD"],
  ["ГПЗУ", "LUDP"],
  ["ППТ", "SPP"],
  ["ПЗЗ", "LDR"],
  ["РНС", "BP"],
  ["ЧТУ", "STC"],
  ["АГО", "AGO"],
  ["КГИОП", "CHCC"],
  ["ЗнП", "DB"],
  ["ЗП", "DB"],
  ["ТЗ", "BRIEF"],
  ["ТУ", "TC"],
  ["ГП", "MP"],
  ["ПЗУ", "SPS"],
  ["АР", "AR"],
  ["КР", "STR"],
  ["КЖ", "RC"],
  ["КМД", "SD"],
  ["КМ", "SS"],
  ["ИОС", "ENG"],
  ["ТХ", "TECH"],
  ["ПБ", "FS"],
  ["КЕО", "DL"],
  ["ПОС", "CMP"],
  ["ООС", "ENV"],
  ["ОБЭ", "OPS"],
  ["ОДИ", "ACC"],
  ["ОВ", "HVAC"],
  ["ВК", "WSS"],
  ["НВК", "EWS"],
  ["ЭОМ", "ELEC"],
  ["СС", "COMMS"],
  ["АПС", "FAS"],
  ["АУПТ", "AFS"],
  ["ИТП", "HS"],
  ["ЭКСП", "EXP"],
  ["СМ", "EST"],
  ["РД", "DD"],
  ["ГИП", "LPE"],
]);

function collectStrings(fileName, sourceText) {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const values = [];

  function visit(node) {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && cyrillicPattern.test(node.text)) {
      values.push(node.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return values;
}

function protectKnownValues(source) {
  let prepared = source;
  const restores = [];

  for (const [name, translated] of people) {
    if (!prepared.includes(name)) continue;
    const token = `PERSONTOKEN${restores.length}`;
    prepared = prepared.split(name).join(token);
    restores.push([token, translated]);
  }

  for (const [code, translated] of [...codes].sort((a, b) => b[0].length - a[0].length)) {
    const boundary = new RegExp(`(?<![A-Za-zА-Яа-яЁё0-9])${escapeRegExp(code)}(?![A-Za-zА-Яа-яЁё0-9])`, "g");
    prepared = prepared.replace(boundary, translated);
  }

  const placeholders = [...prepared.matchAll(/\{[^{}]+\}/g)].map((match) => match[0]);
  placeholders.forEach((placeholder) => {
    const token = `PARAMTOKEN${restores.length}`;
    prepared = prepared.split(placeholder).join(token);
    restores.push([token, placeholder]);
  });

  return { prepared, restores };
}

async function translateText(source) {
  if (exact.has(source)) {
    return normalizeEngineeringCodes(exact.get(source));
  }

  const { prepared, restores } = protectKnownValues(source);
  if (!cyrillicPattern.test(prepared)) {
    return normalizeEngineeringCodes(restoreValues(prepared, restores));
  }

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ru");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", prepared);

  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) {
        throw new Error(`Translation request failed with ${response.status}`);
      }
      const payload = await response.json();
      const translated = payload[0].map((part) => part[0]).join("");
      return normalizeEngineeringCodes(restoreValues(translated, restores));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError;
}

function restoreValues(source, restores) {
  return restores.reduce((result, [token, value]) => result.split(token).join(value), source);
}

function normalizeEngineeringCodes(value) {
  return value.replace(/\b(?:KZh|KJ|QOL)(?=\d)/g, "RC");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const sourceEntries = await Promise.all(
    sourceFiles.map(async (fileName) => [fileName, await readFile(fileName, "utf8")]),
  );
  const strings = [...new Set(sourceEntries.flatMap(([fileName, source]) => collectStrings(fileName, source)))].sort();
  const translations = new Map();
  let cursor = 0;

  async function worker() {
    while (cursor < strings.length) {
      const index = cursor;
      cursor += 1;
      const source = strings[index];
      const translated = await translateText(source);
      translations.set(source, translated);
      if ((index + 1) % 50 === 0 || index + 1 === strings.length) {
        console.log(`Translated ${index + 1}/${strings.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));

  const lines = [...translations]
    .sort(([a], [b]) => a.localeCompare(b, "ru"))
    .map(([source, translated]) => `  ${JSON.stringify(source)}: ${JSON.stringify(translated)},`);
  const output = [
    "// Generated by scripts/generate-english-content.mjs.",
    "// Keep manual person and discipline mappings in that generator.",
    "export const englishContent: Record<string, string> = {",
    ...lines,
    "};",
    "",
  ].join("\n");

  await writeFile(outputFile, output, "utf8");
  console.log(`Wrote ${translations.size} translations to ${outputFile}`);
}

await main();
