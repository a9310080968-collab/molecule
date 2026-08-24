import { englishContent } from "../data/englishContent.generated";
import type { DemoProject, ProjectParticipant, ProjectTemplate } from "../types";

const personTranslations = [
  ["Иванов И.И.", "John Smith"],
  ["Анна Лебедева", "Alice Bishop"],
  ["Петр Генеральный", "Matthew Brown"],
  ["Павел Андреев", "Paul Anderson"],
  ["Алексей Заказчиков", "Alex Carter"],
  ["Артем Павлов", "Arthur Powell"],
  ["Виктория Романова", "Victoria Rhodes"],
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
  ["Lead ICT Engineer", "Andrew Scott"],
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
  ["AP0", "AR0"],
  ["AP1", "AR1"],
  ["AP2", "AR2"],
  ["AP4", "AR4"],
  ["AP5", "AR5"],
  ["Third Party Interior Developer", "External Interior Design Consultant"],
  ["ZAV", "MFR"],
  ["1st category constructor", "Structural Engineer, Category I"],
]);

const westernExactCorrections = new Map([
  ["ABOUT", "EQUIP"],
  ["AI", "SURVEY"],
  ["AI1", "INT-COMMON"],
  ["AI2", "INT-UNIT"],
  ["AGO", "DESIGN"],
  ["APPP", "FIRE-AUTO"],
  ["Asia-Pacific", "TDP"],
  ["ATM", "BMS"],
  ["BLG", "LANDSCAPE"],
  ["BP", "PERMIT"],
  ["BUT", "SITE-LTG"],
  ["CHCC", "HERITAGE"],
  ["EGRN", "LAND"],
  ["KL", "BOUND"],
  ["KM1", "STL1"],
  ["KM2", "STL2"],
  ["LDR", "ZONING"],
  ["LUDP", "PLANNING"],
  ["MOH", "MKT"],
  ["NS", "PUMP"],
  ["Networks", "UTIL-R"],
  ["OB1", "HVAC-HTG"],
  ["OB2", "HVAC-VENT"],
  ["OB3", "HVAC-COOL"],
  ["PV", "IPTV"],
  ["RP", "LAYOUT"],
  ["SB", "SEC"],
  ["SKPT", "TV-DIST"],
  ["SKS", "DATA"],
  ["SOGL", "AUTH"],
  ["SPIS", "UTIL-PLAN"],
  ["SPP", "PLAN"],
  ["SPS", "SITE"],
  ["TC", "UTIL"],
  ["TM", "HEAT-MECH"],
  ["UUTE", "HEAT-METER"],
  ["AGO: Album AGO", "DESIGN: Architectural design submission"],
  ["Asia-Pacific: Album of technical solutions", "TECH: Technical design package"],
  ["BP: Construction permit", "PERMIT: Construction permit"],
  ["CHCC: Album CHCC", "HERITAGE: Heritage authority submission"],
  ["EGRN: Land documents", "LAND: Land title documents"],
  ["HS: HS", "ETS: Energy transfer station"],
  ["KL: Red lines", "BOUND: Site boundaries"],
  ["MOH: Marketing assignment", "MKT: Marketing brief"],
  ["ABOUT: Equipment", "EQUIP: Equipment"],
  ["RP: Layout plan", "LAYOUT: Setting-out plan"],
  ["SOGL: Approvals with government agencies", "AUTH: Authority approvals"],
  ["SPS: SPS scheme", "SITE: Site planning scheme"],
  ["SPP: SPP", "PLAN: Statutory planning package"],
  ["TM: TM", "MECH: Mechanical systems"],
  ["UUTE: UUTE", "METER: Heat metering"],
  ["ATM: ATM", "BMS: Building management system"],
  ["Demonstratsionnyy PDF-list s ramkoy, shtampom i zonoy soglasovaniya.", "Demo drawing sheet with a title block and review area."],
  ["General plan", "Site planning"],
  ["Initial data", "Pre-design information"],
  ["Initial permitting documentation", "Pre-design information"],
  ["MOP interiors", "Common-area interiors"],
  ["Nodes", "Details"],
  ["Safe Operation", "Operational safety"],
  ["Estimate", "Cost plan"],
  ["Album AGO", "Architectural design submission"],
  ["Album CHCC", "Heritage authority submission"],
  ["Album of technical solutions", "Technical design package"],
  ["Calendar schedules for issuing sections", "Design deliverable schedule"],
  ["Constructive", "Structural design"],
  ["Contract from the customer", "Client contract"],
  ["Electrics", "Electrical design"],
  ["Estimator", "Cost Engineer"],
  ["Constructor", "Structural Engineer"],
  ["LUDP / SPP", "Planning and zoning package"],
  ["Marketing assignment", "Marketing brief"],
  ["Private technical conditions", "Project-specific technical criteria"],
  ["Research", "Site surveys"],
  ["SPS scheme", "Site planning scheme"],
  ["TC / connection conditions", "Utility connection requirements"],
  ["Communication and security systems", "Lead ICT & Security Systems Engineer"],
  ["Cost estimator", "Cost Engineer"],
  ["Demo project: detailed design and complete project documentation", "Flagship residential development · Construction document coordination"],
  ["CD: design molecule, PDI, sections, tasks and approvals", "Construction documents, discipline packages, tasks, and approvals"],
  ["Coloristics", "Color and material strategy"],
  ["Examiner's comments", "Review comments"],
  ["Improvement", "Landscape design"],
  ["Red lines", "Site boundaries"],
  ["Eastern façade", "East facade"],
  ["Western façade", "West facade"],
  ["Customer", "Client"],
  ["Customer comments", "Client comments"],
  ["UTIL and connection conditions", "Utility connection requirements"],
]);

const westernContentFragments = [
  ["Horns and Hooves Residential Complex", "Northbridge Residential Development"],
  ["Horns and Hooves", "Northbridge"],
  ["Horns_and_hooves", "Northbridge"],
  ["Roga i Kopyta", "Northbridge"],
  ["Sirius Residential Complex", "Harbor Point Residences"],
  ["Harbor Point Residential Complex", "Harbor Point Residences"],
  ["Vega Business Center", "Westgate Business Center"],
  ["Sirius", "Harbor Point"],
  ["Vega", "Westgate"],
  ["business center Vega", "Westgate Business Center"],
  ["12 Kosmicheskaya Street", "12 Meridian Street"],
  ["7 Nauchny Avenue", "7 Innovation Avenue"],
  ["Third Party Interior Developer", "External Interior Design Consultant"],
  ["Third Party Developers", "External Design Partners"],
  ["third party developers", "external design partners"],
  ["Manufacturing companies", "Vendors and Fabricators"],
  ["Manufacturers", "Vendors and Fabricators"],
  ["manufacturing companies", "vendors and fabricators"],
  ["Construction organization project", "Construction planning"],
  ["Engineering networks and systems", "Building services"],
  ["Engineering networks", "Building services"],
  ["Technological solutions", "Process design"],
  ["Design solutions / RC", "Structural design"],
  ["Design solutions", "Structural design"],
  ["Estimate documentation", "Cost plan"],
  ["Disabled access", "Accessibility"],
  ["DL / natural light", "Daylight analysis"],
  ["Statements and specifications", "Schedules and specifications"],
  ["Composition of the transmission", "Transfer contents"],
  ["LPE Specifications", "Specifications for project lead review"],
  ["Facades on LPE", "Facades for project lead review"],
  ["IPD Coordinator", "Pre-design Information Coordinator"],
  ["Lead WSS Engineer", "Lead Plumbing Engineer"],
  ["WSS Engineer", "Plumbing Engineer"],
  ["CMP Engineer", "Construction Planning Engineer"],
  ["LPE ENG / ELEC", "Lead MEP Engineer / Electrical"],
  ["Stroygenplan", "Construction_logistics_plan"],
  ["TEP_AR_update", "ARCH_Area_schedule_update"],
  ["Demonstratsionnyy PDF-list s ramkoy, shtampom i zonoy soglasovaniya.", "Demo drawing sheet with a title block and review area."],
  ["MOP interiors", "common-area interiors"],
  ["interiors MOP", "common-area interiors"],
  ["Dimensions_of_cases", "Building_dimensions"],
  ["Eastern facade", "East facade"],
  ["Eastern façade", "East facade"],
  ["LPE/Project Administrator", "Project Lead / Project Administrator"],
  ["LPE package", "Project lead review package"],
  ["Project name: Residential complex “Northbridge”", "Project: Northbridge Residential Development"],
  ["Customer: LLC \"...\"", "Client: Meridian Developments"],
  ["General designer: LLC \"...\"", "Lead design consultant: Northbridge Design"],
  ["Duration: 01.01.2026 – 01.12.2026", "Schedule: Jan 1, 2026 – Dec 1, 2026"],
  ["LEAD:", "Project Lead:"],
  ["Alisa Bishop", "Alice Bishop"],
  ["Victoria Roman", "Victoria Rhodes"],
  ["Yandex Mail", "Google Workspace Mail"],
  ["Yandex work email", "Google Workspace email"],
  ["Outlook, Yandex, and Gmail", "Microsoft 365 and Google Workspace"],
  ["Kontur.Diadok", "Procore"],
  ["p.andreev", "paul.anderson"],
  ["a.lebedeva", "alice.bishop"],
  ["i.melnikov", "ian.miller"],
  ["m.sokolova", "maria.stone"],
  ["o.danilova", "olivia.daniels"],
  ["ivanov.gip", "john.smith"],
  ["o.fomin", "oliver.foster"],
  ["k.artamonova", "olivia.adams"],
  ["s.titov", "steven.taylor"],
  ["r.fadeev", "ryan.fields"],
  ["e.morozova", "elena.morrison"],
  ["a.pavlov", "arthur.powell"],
  ["n.belyaev", "nicholas.bell"],
  ["v.romanova", "victoria.rhodes"],
  ["d.kornev", "daniel.crawford"],
  ["s.naumov", "samuel.nelson"],
  ["lead.arch", "emily.clark"],
  ["lead.kr", "michael.reed"],
  ["ss@", "andrew.scott@"],
  ["an@", "david.brooks@"],
  ["customer@", "alex.carter@"],
  ["expert@", "natalie.evans@"],
  ["director@", "matthew.brown@"],
  ["alfaproject.ru", "northbridge-design.com"],
  ["client.ru", "meridian-developments.com"],
  ["expertiza.ru", "civic-review.com"],
  ["partner.ru", "design-partners.com"],
  ["yandex.ru", "northbridge-design.com"],
  ["@ivanov_gip", "@john_smith"],
  ["@client_owner", "@alex_carter"],
  ["@sokolova_ird", "@maria_stone"],
  ["@fomin_gp", "@oliver_foster"],
  ["@anna_ar", "@alice_bishop"],
  ["@melnikov_kr", "@ian_miller"],
  ["@igor_kr", "@ian_miller"],
  ["@titov_tx", "@steven_taylor"],
  ["@morozova_vk", "@elena_morrison"],
  ["@pavel_gip", "@paul_anderson"],
  ["@kornev_design", "@daniel_crawford"],
  ["@naumov_pos", "@samuel_nelson"],
  ["@maria_docs", "@maria_stone"],
  ["@olga_est", "@olivia_daniels"],
] as const;

const westernCodeReplacements = [
  ["RC.MP", "RC.MISC"], ["ELEC HS", "ELEC ETS"], ["HVAC/WSS", "HVAC/PLBG"],
  ["RC/STR", "STR"], ["AR-F", "ARCH-F"], ["TECH-Z", "PROC-SPEC"],
  ["AI1", "INT-COMMON"], ["AI2", "INT-UNIT"],
  ["LUDP", "PLANNING"], ["Agreement", "CONTRACT"], ["KM1", "STL1"], ["KM2", "STL2"],
  ["SPIS", "UTIL-PLAN"], ["UUTE", "HEAT-METER"], ["TM", "HEAT-MECH"],
  ["PZ", "NAR"], ["JV", "SCHED"], ["VF", "EAST"], ["ZF", "WEST"],
  ["KMT", "CLIENT-CMT"], ["RN", "LOADS"], ["TC", "UTIL"], ["DB", "D-BRIEF"],
  ["EOM", "ELEC"], ["KR", "STR"], ["GP", "SITE"], ["EN", "NAR"], ["WS", "PLBG"],
  ["IPD", "PDI"], ["ZAV", "VEND"], ["COMMS", "ICT"], ["TECH", "PROC"], ["LPE", "LEAD"],
  ["WSS", "PLBG"], ["EWS", "UTIL"], ["CMP", "CP"], ["OPS", "SAFE"],
  ["ACC", "ADA"], ["ENG", "MEP"], ["AFS", "SPR"], ["EXP", "REVIEW"],
  ["EST", "COST"], ["MP", "SITE"], ["AR", "ARCH"], ["SS", "STL"],
  ["FS", "FIRE"], ["DL", "DAY"], ["HS", "ETS"], ["DD", "CD"],
] as const;

export function westernizeEnglishContent(value: string) {
  let normalized = westernExactCorrections.get(value) ?? value;

  westernContentFragments.forEach(([source, target]) => {
    normalized = normalized.split(source).join(target);
  });

  normalized = normalized.replace(
    /\+7\s+\d{3}\s+\d{3}-\d{2}-(\d{2})/g,
    (_match, lastDigits: string) => `+1 415 555-01${lastDigits}`,
  );

  westernCodeReplacements.forEach(([source, target]) => {
    const pattern = new RegExp(`(?<![A-Za-z0-9])${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "g");
    normalized = normalized.replace(pattern, target);
  });

  westernContentFragments.forEach(([source, target]) => {
    normalized = normalized.split(source).join(target);
  });

  return westernExactCorrections.get(normalized) ?? normalized;
}

export function getEnglishContentTranslation(value: string) {
  return Object.prototype.hasOwnProperty.call(englishContent, value)
    ? englishContent[value]
    : undefined;
}

export function toEnglishContent(value: string, upgradeLegacyTransliteration = false) {
  const corrected = legacyEnglishCorrections.get(value);
  if (corrected) {
    return westernizeEnglishContent(corrected);
  }

  const exact = getEnglishContentTranslation(value);
  if (exact) {
    return westernizeEnglishContent(exact);
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
    .replace(/\bAP([0-5](?:\.\d+)?)\b/g, "AR$1")
    .replace(/\bZAV\b/g, "MFR");

  const legacyAcceptedContainer = normalized.match(/^Prinyal konteyner «(.*?)» v rabotu, zhdu finalnyy komplekt\.$/);
  if (legacyAcceptedContainer) {
    return westernizeEnglishContent(`Accepted container "${legacyAcceptedContainer[1]}" for work; waiting for the final package.`);
  }

  normalized = normalized
    .replace(/\b(?:KZh|KJ|QOL)(?=\d)/g, "RC")
    .replace(/^сегодня(?=\b|,)/i, "today")
    .replace(/^завтра(?=\b|,)/i, "tomorrow")
    .replace(/^вчера(?=\b|,)/i, "yesterday")
    .replace(/^только что$/i, "just now");

  return westernizeEnglishContent(transliterateCyrillic(normalized));
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
