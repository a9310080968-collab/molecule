import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SidebarMenuId } from "./Sidebar";

type WorkspacePanelProps = {
  activeMenu: SidebarMenuId;
  onClose: () => void;
};

const menuMeta = {
  documents: {
    icon: FileStack,
    title: "Документы",
    subtitle: "Демо-реестр файлов проекта с быстрым переходом к нодам 2D-карты.",
    badge: "Демо-режим",
    note: "В полной версии здесь будут загрузка файлов, папки, массовые действия, фильтры по разделам и синхронизация с 2D-графом.",
  },
  tasks: {
    icon: ClipboardCheck,
    title: "Задачи",
    subtitle: "Очередь работ по документации и замечаниям проектной команды.",
    badge: "В разработке",
    note: "Раздел будет содержать постановку задач, сроки, ответственных, приоритеты и связь задачи с конкретной нодой документа.",
  },
  checks: {
    icon: CheckCircle2,
    title: "Проверки ГИП",
    subtitle: "Контур согласования разделов и документов главным инженером проекта.",
    badge: "Демо-режим",
    note: "В полной версии появятся маршруты согласования, протоколы замечаний, электронные подписи и история решений ГИП.",
  },
  versions: {
    icon: Archive,
    title: "Версии",
    subtitle: "История изменений документации и контроль актуальности выдачи.",
    badge: "В разработке",
    note: "Раздел будет показывать ветки версий, сравнение редакций, откаты и связь версии с задачами, замечаниями и проверками.",
  },
  participants: {
    icon: Users,
    title: "Участники",
    subtitle: "Команда проекта, роли и зоны ответственности по разделам.",
    badge: "Демо-режим",
    note: "Позже здесь будут права доступа, команды подрядчиков, уведомления и матрица ответственности по нодам.",
  },
  settings: {
    icon: Settings,
    title: "Настройки",
    subtitle: "Параметры проекта, визуализации и правил документационного трека.",
    badge: "В разработке",
    note: "Здесь будут шаблоны статусов, правила проверки, настройки хранения, уведомления и брендирование интерфейса. Цвет документов фиксирован по типу файла.",
  },
} satisfies Record<
  Exclude<SidebarMenuId, "map">,
  {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    badge: string;
    note: string;
  }
>;

const panelContent = {
  documents: [
    ["АР", "План 1 этажа v3.pdf", "На проверке", "Анна Лебедева"],
    ["ПЗ", "Пояснительная записка v2.0.docx", "Есть замечания", "Мария Соколова"],
    ["ОВ", "Схема систем ОВ v1.2.dwg", "Утверждено", "Роман Фадеев"],
    ["ЭОМ", "Однолинейная схема v1.2.pdf", "Утверждено", "Павел Андреев"],
  ],
  tasks: [
    ["Сегодня", "Закрыть замечания по ПЗ", "Мария Соколова"],
    ["Завтра", "Обновить спецификацию оборудования ВК", "Елена Морозова"],
    ["28 мая", "Подготовить ведомость объемов для сметы", "Ольга Данилова"],
  ],
  checks: [
    ["14", "На проверке ГИП", "ожидают решения"],
    ["8", "С замечаниями", "нужны исправления"],
    ["128", "Утверждено", "готово к выдаче"],
  ],
  versions: [
    ["v2.1", "АР обновлен после замечаний", "сегодня, 13:10"],
    ["v2.0", "ПЗ отправлена на повторную проверку", "сегодня, 11:45"],
    ["v1.9", "ЭОМ утвержден ГИП", "21.05.2026"],
  ],
  participants: [
    ["Павел Андреев", "ГИП", "утверждение и контроль"],
    ["Анна Лебедева", "Архитектор", "раздел АР"],
    ["Елена Морозова", "Инженер ВК", "водоснабжение и канализация"],
    ["Ольга Данилова", "Сметчик", "сметная документация"],
  ],
  settings: [
    ["Типы файлов", "Цвета фиксированы: TXT, DOC/DOCX, XLS/XLSX, PDF", "активно"],
    ["2D-граф", "Диапазон zoom, подписи и движение нод", "демо"],
    ["Хранилище", "Лимиты, версии и архивация", "скоро"],
  ],
} satisfies Record<Exclude<SidebarMenuId, "map">, string[][]>;

export function WorkspacePanel({ activeMenu, onClose }: WorkspacePanelProps) {
  if (activeMenu === "map") {
    return null;
  }

  const meta = menuMeta[activeMenu];
  const Icon = meta.icon;

  return (
    <section className="workspace-panel glass-panel" aria-label={meta.title}>
      <header className="workspace-header">
        <div>
          <span>
            <Icon size={18} />
            {meta.badge}
          </span>
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Закрыть раздел">
          <X size={20} />
        </button>
      </header>

      <div className="workspace-grid">
        {panelContent[activeMenu].map((row) => (
          <article key={row.join("-")} className="workspace-row">
            <b>{row[0]}</b>
            <div>
              <strong>{row[1]}</strong>
              <span>{row[2]}</span>
            </div>
            <em>{row[3]}</em>
          </article>
        ))}
      </div>

      <div className="workspace-note">
        <strong>Что будет в разделе</strong>
        <p>{meta.note}</p>
      </div>
    </section>
  );
}
