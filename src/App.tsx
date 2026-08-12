import { useEffect, useMemo, useRef, useState } from "react";
import {
  Atom,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  GitBranch,
  LayoutDashboard,
  Maximize2,
  Menu,
  Minus,
  Network,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  buildEmployeeWorkMap,
  diagnoseEmployeeTasks,
  employeeMapKindLabels,
  employeeWorkProfiles,
  formatTaskDate,
  type EmployeeMapNode,
  type EmployeeWorkAlarm,
  type EmployeeWorkTask,
} from "./data/employeeWorkMap";
import {
  employees,
  financeCategories,
  formatMoney,
  opportunities,
  processes,
  teamById,
  teams,
  type Direction,
  type Employee,
  type EmployeeStatus,
  type Opportunity,
  type Process,
  type Team,
} from "./data/tsumPrototype";

type ViewId = "overview" | "teams" | "people" | "processes" | "molecule" | "finance" | "opportunities";
type PeopleFilter = "all" | EmployeeStatus | "critical";

const navItems: Array<{ id: ViewId; label: string; mobileLabel: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Обзор", mobileLabel: "Обзор", icon: LayoutDashboard },
  { id: "teams", label: "Команды", mobileLabel: "Команды", icon: Network },
  { id: "people", label: "88 сотрудников", mobileLabel: "Люди", icon: Users },
  { id: "processes", label: "Процессы", mobileLabel: "Процессы", icon: GitBranch },
  { id: "molecule", label: "Молекула процессов", mobileLabel: "Карта", icon: Atom },
  { id: "finance", label: "Расходы", mobileLabel: "Расходы", icon: WalletCards },
  { id: "opportunities", label: "Оптимизация", mobileLabel: "Шансы", icon: Sparkles },
];

const pageMeta: Record<ViewId, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Marketing department",
    title: "Что сейчас происходит внутри маркетинга?",
    description: "Живая управленческая карта людей, функций, процессов, расходов и результата.",
  },
  teams: {
    eyebrow: "12 команд",
    title: "Структура и эффективность отделов",
    description: "Сравните загрузку, скорость, бюджет и вклад каждой команды.",
  },
  people: {
    eyebrow: "88 сотрудников",
    title: "Кто чем занят и где теряется емкость",
    description: "Фактическая загрузка, функции, зависимости и связь с бизнес-результатом.",
  },
  processes: {
    eyebrow: "Сквозные процессы",
    title: "Как работа движется между командами",
    description: "Маршруты, владельцы, ожидание и последствия для других каналов.",
  },
  molecule: {
    eyebrow: "Employee work map",
    title: "Карта работы конкретного сотрудника",
    description: "Выберите человека, чтобы увидеть его задачи, постановщика, функции, взаимодействия и управленческие алармы.",
  },
  finance: {
    eyebrow: "Маркетинговые расходы",
    title: "Сколько, на что и с каким результатом",
    description: "Бюджет, прогноз, отдача и затраты, которые требуют управленческого внимания.",
  },
  opportunities: {
    eyebrow: "8 возможностей",
    title: "Где система видит потенциал оптимизации",
    description: "Не готовое кадровое решение, а проверяемые гипотезы с фактами и ожидаемым эффектом.",
  },
};

const kpis = [
  { value: "88", label: "сотрудников", note: "в 12 командах", tone: "ink", action: "people" as const },
  { value: "68%", label: "средняя загрузка", note: "−4 п.п. к плану", tone: "neutral", action: "people" as const },
  { value: "17", label: "загружены < 50%", note: "3,6 FTE емкости", tone: "warning", action: "underloaded" as const },
  { value: "11", label: "перегружены", note: "риск выгорания", tone: "danger", action: "overloaded" as const },
  { value: "14", label: "дублей функций", note: "между 7 командами", tone: "warning", action: "duplicates" as const },
  { value: "9", label: "узких мест", note: "в активных процессах", tone: "danger", action: "processes" as const },
  { value: "23", label: "ждут согласования", note: "в среднем 19 часов", tone: "neutral", action: "processes" as const },
  { value: "6", label: "задач у топ-менеджмента", note: "операционный уровень", tone: "danger", action: "sms" as const },
  { value: "8", label: "зон оптимизации", note: "₽26,8 млн потенциала", tone: "accent", action: "opportunities" as const },
];

function App() {
  const [view, setView] = useState<ViewId>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

  const selectedTeam = selectedTeamId ? teamById(selectedTeamId) ?? null : null;
  const selectedEmployee = selectedEmployeeId ? employees.find((employee) => employee.id === selectedEmployeeId) ?? null : null;
  const selectedOpportunity = selectedOpportunityId ? opportunities.find((item) => item.id === selectedOpportunityId) ?? null : null;

  function navigate(next: ViewId) {
    setView(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTeam(id: string) {
    setSelectedEmployeeId(null);
    setSelectedOpportunityId(null);
    setSelectedTeamId(id);
  }

  function openEmployee(id: string) {
    setSelectedTeamId(null);
    setSelectedOpportunityId(null);
    setSelectedEmployeeId(id);
  }

  function openOpportunity(id: string) {
    setSelectedTeamId(null);
    setSelectedEmployeeId(null);
    setSelectedOpportunityId(id);
  }

  function closeDetail() {
    setSelectedTeamId(null);
    setSelectedEmployeeId(null);
    setSelectedOpportunityId(null);
  }

  function handleKpiAction(action: (typeof kpis)[number]["action"]) {
    if (action === "underloaded" || action === "overloaded") {
      setPeopleFilter(action);
      navigate("people");
      return;
    }
    if (action === "duplicates") {
      navigate("opportunities");
      openOpportunity("duplicates");
      return;
    }
    if (action === "sms") {
      navigate("processes");
      return;
    }
    navigate(action);
  }

  return (
    <div className="app-shell">
      <DesktopSidebar view={view} onNavigate={navigate} />

      {mobileMenuOpen && (
        <button className="mobile-scrim" aria-label="Закрыть меню" onClick={() => setMobileMenuOpen(false)} />
      )}

      <main className="main-shell">
        <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />

        <div className="page-wrap">
          <PageHeader view={view} />

          {view === "overview" && (
            <OverviewScreen
              onKpiAction={handleKpiAction}
              onNavigate={navigate}
              onOpenTeam={openTeam}
              onOpenOpportunity={openOpportunity}
            />
          )}
          {view === "teams" && <TeamsScreen onOpenTeam={openTeam} />}
          {view === "people" && (
            <PeopleScreen filter={peopleFilter} onFilter={setPeopleFilter} onOpenEmployee={openEmployee} />
          )}
          {view === "processes" && <ProcessesScreen />}
          {view === "molecule" && <MoleculeScreen />}
          {view === "finance" && <FinanceScreen onOpenTeam={openTeam} onOpenOpportunity={openOpportunity} />}
          {view === "opportunities" && <OpportunitiesScreen onOpenOpportunity={openOpportunity} />}

          <footer className="prototype-footer">
            <span>MOLECULE × TSUM MARKETING</span>
            <p>Все данные и оргструктура демонстрационные. Система показывает факты и возможности, решение принимает руководитель.</p>
          </footer>
        </div>
      </main>

      <MobileNavigation view={view} onNavigate={navigate} />

      {mobileMenuOpen && (
        <div className="mobile-menu-sheet">
          <div className="brand-lockup brand-lockup--mobile">
            <strong>ЦУМ</strong><i /> <span>MOLECULE</span>
          </div>
          <button className="icon-button" aria-label="Закрыть меню" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
          <nav>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
                  <Icon size={19} /><span>{item.label}</span><ChevronRight size={17} />
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {(selectedTeam || selectedEmployee || selectedOpportunity) && (
        <>
          <button className="detail-scrim" aria-label="Закрыть детали" onClick={closeDetail} />
          <aside className="detail-drawer">
            <button className="drawer-close" aria-label="Закрыть" onClick={closeDetail}><X size={20} /></button>
            {selectedTeam && <TeamDetail team={selectedTeam} onOpenEmployee={openEmployee} />}
            {selectedEmployee && <EmployeeDetail employee={selectedEmployee} onOpenTeam={openTeam} />}
            {selectedOpportunity && <OpportunityDetail opportunity={selectedOpportunity} />}
          </aside>
        </>
      )}
    </div>
  );
}

function DesktopSidebar({ view, onNavigate }: { view: ViewId; onNavigate: (view: ViewId) => void }) {
  return (
    <aside className="desktop-sidebar">
      <div className="brand-lockup">
        <strong>ЦУМ</strong><i /><span>MOLECULE</span>
      </div>
      <div className="sidebar-context">
        <span>Рабочее пространство</span>
        <strong>Marketing</strong>
        <small>Демо-прототип · август 2026</small>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
              <Icon size={18} /><span>{item.label}</span>
              {item.id === "opportunities" && <em>8</em>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-signal">
        <span className="signal-dot" />
        <div><strong>Данные обновлены</strong><small>сегодня в 09:42</small></div>
      </div>
      <div className="sidebar-profile">
        <span>ВС</span>
        <div><strong>Виктория Соколова</strong><small>Директор по маркетингу</small></div>
      </div>
    </aside>
  );
}

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-button" aria-label="Открыть меню" onClick={onOpenMenu}><Menu size={20} /></button>
      <div className="topbar-search"><Search size={17} /><span>Найти сотрудника, функцию или процесс</span><kbd>⌘ K</kbd></div>
      <div className="topbar-actions">
        <span className="demo-badge">DEMO</span>
        <button className="period-button">Август 2026 <ChevronRight size={15} /></button>
      </div>
    </header>
  );
}

function PageHeader({ view }: { view: ViewId }) {
  const meta = pageMeta[view];
  return (
    <header className="page-header">
      <span>{meta.eyebrow}</span>
      <h1>{meta.title}</h1>
      <p>{meta.description}</p>
    </header>
  );
}

type KpiAction = (typeof kpis)[number]["action"];

function OverviewScreen({
  onKpiAction,
  onNavigate,
  onOpenTeam,
  onOpenOpportunity,
}: {
  onKpiAction: (action: KpiAction) => void;
  onNavigate: (view: ViewId) => void;
  onOpenTeam: (id: string) => void;
  onOpenOpportunity: (id: string) => void;
}) {
  return (
    <div className="screen-stack">
      <section className="executive-hero">
        <div className="executive-copy">
          <span className="hero-kicker"><Sparkles size={14} /> Executive pulse</span>
          <h2>Емкость есть, но она распределена не там, где возникает нагрузка.</h2>
          <p>Редакция и in-store недозагружены, production и управление работают выше устойчивого уровня. Основной резерв — не сокращение, а перераспределение функций и более короткие маршруты решений.</p>
          <button onClick={() => { onNavigate("opportunities"); onOpenOpportunity("capacity"); }}>
            Посмотреть объяснение <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-score">
          <span>Индекс операционной эффективности</span>
          <strong>72</strong>
          <div><i style={{ width: "72%" }} /></div>
          <small><ArrowUpRight size={14} /> +3 пункта к июлю</small>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Ключевые показатели">
        {kpis.map((kpi) => (
          <button key={kpi.label} className={`kpi-card kpi-card--${kpi.tone}`} onClick={() => onKpiAction(kpi.action)}>
            <strong>{kpi.value}</strong>
            <span>{kpi.label}</span>
            <small>{kpi.note}</small>
            <ArrowUpRight className="kpi-arrow" size={16} />
          </button>
        ))}
      </section>

      <section className="overview-columns">
        <div className="section-card attention-card">
          <SectionHeading eyebrow="Требует решения" title="Три сигнала с наибольшим влиянием" action="Все процессы" onAction={() => onNavigate("processes")} />
          <div className="attention-list">
            <button onClick={() => onNavigate("processes")}>
              <span className="attention-index">01</span>
              <div><strong>31 час задача ждет решения генерального директора</strong><small>SMS private sale · можно решить на уровне маркетинга</small></div>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => { onNavigate("opportunities"); onOpenOpportunity("capacity"); }}>
              <span className="attention-index">02</span>
              <div><strong>Перекос загрузки эквивалентен 3,6 полной позиции</strong><small>17 сотрудников &lt; 50% · 11 сотрудников &gt; 90%</small></div>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => { onNavigate("opportunities"); onOpenOpportunity("agencies"); }}>
              <span className="attention-index">03</span>
              <div><strong>7 контрактов пересекаются со штатными функциями</strong><small>Потенциал уточнения расходов · ₽11,4 млн в год</small></div>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="section-card opportunity-preview">
          <SectionHeading eyebrow="Optimization opportunity" title="Ближайший быстрый эффект" />
          <button className="opportunity-feature" onClick={() => onOpenOpportunity("approval")}>
            <span>01</span>
            <h3>Матрица решений для операционных коммуникаций</h3>
            <p>Освободить до 620 часов руководителей в год без изменения численности.</p>
            <div><strong>94%</strong><small>уверенность модели</small><ArrowRight size={18} /></div>
          </button>
        </div>
      </section>

      <section className="org-section">
        <SectionHeading eyebrow="Живая карта департамента" title="12 команд · 88 сотрудников" action="Сравнить команды" onAction={() => onNavigate("teams")} />
        <div className="direction-grid">
          <DirectionColumn direction="online" onOpenTeam={onOpenTeam} />
          <DirectionColumn direction="offline" onOpenTeam={onOpenTeam} />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <header className="section-heading">
      <div><span>{eyebrow}</span><h2>{title}</h2></div>
      {action && onAction && <button onClick={onAction}>{action}<ArrowRight size={16} /></button>}
    </header>
  );
}

function DirectionColumn({ direction, onOpenTeam }: { direction: Direction; onOpenTeam: (id: string) => void }) {
  const directionTeams = teams.filter((team) => team.direction === direction);
  const count = directionTeams.reduce((sum, team) => sum + team.count, 0);
  const avgLoad = Math.round(directionTeams.reduce((sum, team) => sum + team.utilization * team.count, 0) / count);
  return (
    <div className="direction-column">
      <header>
        <div><span>{direction === "online" ? "01" : "02"}</span><strong>{direction === "online" ? "Онлайн-маркетинг" : "Офлайн, бренды и события"}</strong></div>
        <small>{count} сотрудников · {avgLoad}% загрузка</small>
      </header>
      <div className="team-mini-grid">
        {directionTeams.map((team) => (
          <button key={team.id} className={team.utilization > 85 || team.utilization < 58 ? "has-signal" : ""} onClick={() => onOpenTeam(team.id)}>
            <span className="team-mini-number">{String(teams.indexOf(team) + 1).padStart(2, "0")}</span>
            <div><strong>{team.shortTitle}</strong><small>{team.count} чел. · {team.processes} процессов</small></div>
            <div className="team-mini-load"><span>{team.utilization}%</span><i><b style={{ width: `${Math.min(team.utilization, 100)}%` }} /></i></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamsScreen({ onOpenTeam }: { onOpenTeam: (id: string) => void }) {
  const [direction, setDirection] = useState<"all" | Direction>("all");
  const visibleTeams = direction === "all" ? teams : teams.filter((team) => team.direction === direction);
  return (
    <div className="screen-stack">
      <section className="summary-strip">
        <SummaryMetric label="Общий бюджет" value="₽39,4 млн / мес." note="+6% к плану" />
        <SummaryMetric label="Активные процессы" value="149" note="23 ожидают решения" />
        <SummaryMetric label="Выполнение в срок" value="79%" note="цель 90%" />
        <SummaryMetric label="Вклад с понятным KPI" value="74%" note="+8 п.п. за квартал" />
      </section>
      <section className="section-card teams-board">
        <div className="board-toolbar">
          <div className="segmented-control">
            <button className={direction === "all" ? "active" : ""} onClick={() => setDirection("all")}>Все</button>
            <button className={direction === "online" ? "active" : ""} onClick={() => setDirection("online")}>Онлайн</button>
            <button className={direction === "offline" ? "active" : ""} onClick={() => setDirection("offline")}>Офлайн</button>
          </div>
          <span>{visibleTeams.length} команд</span>
        </div>
        <div className="team-card-grid">
          {visibleTeams.map((team, index) => <TeamCard key={team.id} team={team} number={teams.indexOf(team) + 1 || index + 1} onOpen={() => onOpenTeam(team.id)} />)}
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function TeamCard({ team, number, onOpen }: { team: Team; number: number; onOpen: () => void }) {
  const loadTone = team.utilization > 85 ? "high" : team.utilization < 58 ? "low" : "normal";
  return (
    <button className="team-card" onClick={onOpen}>
      <header><span>{String(number).padStart(2, "0")}</span><em>{team.direction === "online" ? "Online" : "Offline"}</em></header>
      <h3>{team.title}</h3>
      <p>{team.functions.slice(0, 3).join(" · ")}</p>
      <div className="team-card-primary">
        <div><strong>{team.count}</strong><span>сотрудников</span></div>
        <div><strong className={`load-${loadTone}`}>{team.utilization}%</strong><span>загрузка</span></div>
      </div>
      <div className="team-progress"><i><b style={{ width: `${Math.min(team.utilization, 100)}%` }} /></i><span>{team.onTime}% в срок</span></div>
      <dl>
        <div><dt>Процессы</dt><dd>{team.processes}</dd></div>
        <div><dt>Задачи</dt><dd>{team.tasks}</dd></div>
        <div><dt>Бюджет</dt><dd>₽{formatMoney(team.budget)} млн</dd></div>
        <div><dt>Проблемы</dt><dd className={team.issues > 2 ? "metric-alert" : ""}>{team.issues}</dd></div>
      </dl>
      <footer><span>Вклад в результат</span><strong>{team.impact}%</strong><ArrowUpRight size={17} /></footer>
    </button>
  );
}

function PeopleScreen({ filter, onFilter, onOpenEmployee }: { filter: PeopleFilter; onFilter: (filter: PeopleFilter) => void; onOpenEmployee: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const visibleEmployees = useMemo(() => employees.filter((employee) => {
    const matchesFilter = filter === "all" || (filter === "critical" ? employee.dependencies >= 8 : employee.status === filter);
    const matchesTeam = teamFilter === "all" || employee.teamId === teamFilter;
    const haystack = `${employee.name} ${employee.role} ${teamById(employee.teamId)?.title}`.toLowerCase();
    return matchesFilter && matchesTeam && haystack.includes(query.toLowerCase());
  }), [filter, query, teamFilter]);

  return (
    <div className="screen-stack">
      <section className="people-pulse">
        <div><span>Устойчивая загрузка</span><strong>60 сотрудников</strong><small>68% департамента</small></div>
        <div className="pulse-visual" aria-label="Распределение загрузки">
          <span className="pulse-low" style={{ width: "19%" }}>17</span>
          <span className="pulse-normal" style={{ width: "68%" }}>60</span>
          <span className="pulse-high" style={{ width: "13%" }}>11</span>
        </div>
        <div className="pulse-legend"><span><i className="low" />Ниже 50%</span><span><i className="normal" />50–90%</span><span><i className="high" />Выше 90%</span></div>
      </section>

      <section className="section-card people-board">
        <div className="people-toolbar">
          <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, роль или команда" /></label>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="Фильтр по команде">
            <option value="all">Все команды</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}
          </select>
        </div>
        <div className="people-filters">
          <FilterButton active={filter === "all"} onClick={() => onFilter("all")} label="Все" count={88} />
          <FilterButton active={filter === "underloaded"} onClick={() => onFilter("underloaded")} label="Недозагружены" count={17} />
          <FilterButton active={filter === "overloaded"} onClick={() => onFilter("overloaded")} label="Перегружены" count={11} />
          <FilterButton active={filter === "critical"} onClick={() => onFilter("critical")} label="Критические зависимости" count={employees.filter((employee) => employee.dependencies >= 8).length} />
        </div>
        <div className="people-result-count">Показано {visibleEmployees.length} из 88</div>
        <div className="employee-table">
          <div className="employee-table-head"><span>Сотрудник</span><span>Команда</span><span>Стоимость / мес.</span><span>Работа</span><span>Загрузка</span><span>В срок</span><span>Зависимости</span></div>
          {visibleEmployees.map((employee) => <EmployeeRow key={employee.id} employee={employee} onOpen={() => onOpenEmployee(employee.id)} />)}
        </div>
        {visibleEmployees.length === 0 && <div className="empty-result"><Search size={22} /><strong>Ничего не найдено</strong><span>Измените запрос или фильтр.</span></div>}
      </section>
    </div>
  );
}

function FilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return <button className={active ? "active" : ""} onClick={onClick}><span>{label}</span><em>{count}</em></button>;
}

function EmployeeRow({ employee, onOpen }: { employee: Employee; onOpen: () => void }) {
  const team = teamById(employee.teamId);
  return (
    <button className="employee-row" onClick={onOpen}>
      <span className="employee-identity"><i>{employee.initials}</i><span><strong>{employee.name}</strong><small>{employee.role}</small></span></span>
      <span className="employee-team"><strong>{team?.shortTitle}</strong><small>{employee.businessImpact}</small></span>
      <span className="employee-cost">₽{employee.cost} тыс.</span>
      <span className="employee-work"><strong>{employee.processes}</strong><small>процессов · {employee.tasks} задач</small></span>
      <span className={`employee-load status-${employee.status}`}><strong>{employee.utilization}%</strong><i><b style={{ width: `${Math.min(employee.utilization, 100)}%` }} /></i></span>
      <span className="employee-ontime">{employee.onTime}%</span>
      <span className="employee-dependencies"><strong>{employee.dependencies}</strong><ChevronRight size={16} /></span>
    </button>
  );
}

function ProcessesScreen() {
  const [selectedId, setSelectedId] = useState(processes[0].id);
  const [selectedStep, setSelectedStep] = useState(3);
  const selected = processes.find((process) => process.id === selectedId) ?? processes[0];
  const activeStep = selected.steps[selectedStep] ?? selected.steps[0];

  function selectProcess(id: string) {
    setSelectedId(id);
    setSelectedStep(id === "sms-approval" ? 3 : 7);
  }

  return (
    <div className="screen-stack">
      <section className="process-summary-grid">
        <SummaryMetric label="Активные процессы" value="149" note="по 12 командам" />
        <SummaryMetric label="Ожидают решения" value="23" note="19 часов в среднем" />
        <SummaryMetric label="Узкие места" value="9" note="4 повторяются ежемесячно" />
        <SummaryMetric label="Потери времени" value="1 340 ч" note="оценка за квартал" />
      </section>

      <section className="process-picker">
        {processes.map((process) => (
          <button key={process.id} className={selected.id === process.id ? "active" : ""} onClick={() => selectProcess(process.id)}>
            <span className={`process-state process-state--${process.status}`}>{process.status === "risk" ? "Требует решения" : "В работе"}</span>
            <h3>{process.title}</h3><p>{process.summary}</p>
            <footer><span>{process.progress}% завершено</span><ArrowRight size={17} /></footer>
          </button>
        ))}
      </section>

      <section className="section-card process-detail-board">
        <header className="process-board-header">
          <div><span>{selected.kicker}</span><h2>{selected.title}</h2><p>{selected.summary}</p></div>
          <div className="process-result"><span>Результат</span><strong>{selected.result}</strong><small>Бюджет {selected.budget}</small></div>
        </header>

        <div className="process-route">
          {selected.steps.map((step, index) => (
            <button key={`${selected.id}-${step.title}`} className={`${step.status} ${selectedStep === index ? "selected" : ""}`} onClick={() => setSelectedStep(index)}>
              <span>{step.status === "done" ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong><small>{step.owner}</small>
            </button>
          ))}
        </div>

        <div className="step-inspector">
          <div className="step-owner"><span>Выбранный этап</span><h3>{activeStep.title}</h3><p>{activeStep.owner}</p></div>
          <div><span>Время на этапе</span><strong>{activeStep.duration}</strong></div>
          <div><span>Статус</span><strong className={`step-status step-status--${activeStep.status}`}>{stepStatusLabel(activeStep.status)}</strong></div>
          <div className="step-note"><span>Сигнал MOLECULE</span><strong>{activeStep.note ?? "Отклонений от целевого маршрута не обнаружено."}</strong></div>
        </div>

        <div className="process-consumers">
          <span>{selected.id === "fashion-shoot" ? "Куда расходится результат" : "Кого затрагивает ожидание"}</span>
          <div>
            {selected.teamIds.map((teamId) => <em key={teamId}>{teamById(teamId)?.shortTitle}</em>)}
          </div>
        </div>
      </section>
    </div>
  );
}

function MoleculeScreen() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("employee-27");
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [listFilter, setListFilter] = useState<"all" | "alarms" | "no_tasks" | "loop">("all");
  const [taskOverrides, setTaskOverrides] = useState<Record<string, EmployeeWorkTask[]>>({});
  const [selectedNodeId, setSelectedNodeId] = useState("employee");
  const [zoom, setZoom] = useState(1);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("2026-08-19");
  const [collaborationTeamId, setCollaborationTeamId] = useState("editorial");
  const mapScrollRef = useRef<HTMLDivElement | null>(null);

  const profile = employeeWorkProfiles.find((item) => item.employee.id === selectedEmployeeId) ?? employeeWorkProfiles[0];
  const tasks = taskOverrides[profile.employee.id] ?? profile.tasks;
  const alarms = diagnoseEmployeeTasks(profile.employee, profile.managerName, tasks);
  const map = useMemo(() => buildEmployeeWorkMap(profile, tasks, alarms), [profile, tasks, alarms]);
  const selectedNode = map.nodes.find((node) => node.id === selectedNodeId) ?? map.nodes.find((node) => node.id === "employee") ?? map.nodes[0];
  const selectedTask = selectedNode.kind === "task" ? tasks.find((task) => `task-${task.id}` === selectedNode.id) : undefined;

  function tasksForProfile(item: (typeof employeeWorkProfiles)[number]) {
    return taskOverrides[item.employee.id] ?? item.tasks;
  }

  function alarmsForProfile(item: (typeof employeeWorkProfiles)[number]) {
    return diagnoseEmployeeTasks(item.employee, item.managerName, tasksForProfile(item));
  }

  const profileStats = useMemo(() => employeeWorkProfiles.map((item) => ({
    profile: item,
    tasks: taskOverrides[item.employee.id] ?? item.tasks,
    alarms: diagnoseEmployeeTasks(item.employee, item.managerName, taskOverrides[item.employee.id] ?? item.tasks),
  })), [taskOverrides]);

  const visibleProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return profileStats.filter(({ profile: item, alarms: itemAlarms }) => {
      const matchesSearch = !normalizedQuery || `${item.employee.name} ${item.employee.role} ${item.team.shortTitle}`.toLocaleLowerCase("ru-RU").includes(normalizedQuery);
      const matchesTeam = teamFilter === "all" || item.team.id === teamFilter;
      const matchesList = listFilter === "all"
        || (listFilter === "alarms" && itemAlarms.length > 0)
        || (listFilter === "no_tasks" && itemAlarms.some((alarm) => alarm.type === "no_tasks"))
        || (listFilter === "loop" && itemAlarms.some((alarm) => alarm.type === "loop_no_deadline"));
      return matchesSearch && matchesTeam && matchesList;
    });
  }, [listFilter, profileStats, query, teamFilter]);

  const noTaskCount = profileStats.filter(({ alarms: itemAlarms }) => itemAlarms.some((alarm) => alarm.type === "no_tasks")).length;
  const loopCount = profileStats.filter(({ alarms: itemAlarms }) => itemAlarms.some((alarm) => alarm.type === "loop_no_deadline")).length;
  const alarmCount = profileStats.filter(({ alarms: itemAlarms }) => itemAlarms.length > 0).length;

  useEffect(() => {
    const element = mapScrollRef.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => {
      element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
      element.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedEmployeeId, zoom]);

  function selectEmployee(employeeId: string) {
    const nextProfile = employeeWorkProfiles.find((item) => item.employee.id === employeeId);
    if (!nextProfile) return;
    setSelectedEmployeeId(employeeId);
    setSelectedNodeId("employee");
    setCollaborationTeamId(nextProfile.team.id);
    setZoom(1);
  }

  function openTaskModal() {
    setTaskTitle("");
    setTaskDeadline("2026-08-19");
    setCollaborationTeamId(profile.team.id);
    setTaskModalOpen(true);
  }

  function assignTask() {
    if (!taskTitle.trim() || !taskDeadline) return;
    const task: EmployeeWorkTask = {
      id: `${profile.employee.id}-manual-${Date.now()}`,
      title: taskTitle.trim(),
      assignedBy: profile.managerName,
      assignedByRole: profile.managerRole,
      assignedByIsManager: true,
      deadline: taskDeadline,
      status: "active",
      progress: 0,
      teamIds: collaborationTeamId === profile.team.id ? [profile.team.id] : [profile.team.id, collaborationTeamId],
      workFunction: profile.functions[0],
      result: "Ожидается",
      kpi: "Будет определен после завершения",
    };
    setTaskOverrides((current) => ({ ...current, [profile.employee.id]: [task, ...tasks] }));
    setSelectedNodeId(`task-${task.id}`);
    setTaskModalOpen(false);
  }

  return (
    <div className="screen-stack employee-molecule-screen">
      <section className="employee-map-principle">
        <div className="employee-map-principle-copy">
          <span><Atom size={20} />Персональная молекула работы</span>
          <h2>Сначала человек — затем его реальная работа</h2>
          <p>Карта не показывает абстрактный процесс. Она собирается вокруг выбранного сотрудника: кто поставил задачи, что он делает, с кем взаимодействует и где руководителю нужно вмешаться.</p>
        </div>
        <div className="employee-map-health">
          <div><strong>{noTaskCount}</strong><span>без задач</span></div>
          <div><strong>{loopCount}</strong><span>зациклено без срока</span></div>
          <div><strong>{alarmCount}</strong><span>сотрудников с алармами</span></div>
        </div>
      </section>

      <div className="employee-map-layout">
        <aside className="employee-picker" aria-label="Выбор сотрудника">
          <header><span>Сотрудники</span><strong>{visibleProfiles.length} из {employeeWorkProfiles.length}</strong></header>
          <label className="employee-picker-search">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или должность" />
          </label>
          <select className="employee-picker-team" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="Фильтр по отделу">
            <option value="all">Все отделы</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}
          </select>
          <div className="employee-picker-filters" aria-label="Фильтр по сигналам">
            <button className={listFilter === "all" ? "active" : ""} onClick={() => setListFilter("all")}>Все</button>
            <button className={listFilter === "alarms" ? "active" : ""} onClick={() => setListFilter("alarms")}>Алармы</button>
            <button className={listFilter === "no_tasks" ? "active" : ""} onClick={() => setListFilter("no_tasks")}>Без задач</button>
            <button className={listFilter === "loop" ? "active" : ""} onClick={() => setListFilter("loop")}>Цикл</button>
          </div>
          <div className="employee-picker-list">
            {visibleProfiles.map(({ profile: item, tasks: itemTasks, alarms: itemAlarms }) => {
              const firstAlarm = itemAlarms[0];
              return (
                <button
                  key={item.employee.id}
                  data-employee-id={item.employee.id}
                  className={`employee-picker-row ${item.employee.id === selectedEmployeeId ? "selected" : ""}`}
                  onClick={() => selectEmployee(item.employee.id)}
                >
                  <span className="employee-picker-avatar">{item.employee.initials}</span>
                  <span className="employee-picker-copy">
                    <strong>{item.employee.name}</strong>
                    <small>{item.employee.role}</small>
                    <em>{item.team.shortTitle} · {item.employee.utilization}%</em>
                  </span>
                  <span className={`employee-picker-signal ${firstAlarm ? `severity-${firstAlarm.severity}` : "is-clear"}`}>
                    {firstAlarm?.type === "no_tasks" ? "Нет задач" : firstAlarm?.type === "loop_no_deadline" ? "Цикл" : itemAlarms.length ? `${itemAlarms.length}` : `${itemTasks.length}`}
                  </span>
                </button>
              );
            })}
            {visibleProfiles.length === 0 && <div className="employee-picker-empty">Сотрудники по фильтру не найдены.</div>}
          </div>
        </aside>

        <main className="employee-workspace">
          <header className="employee-workspace-header">
            <div className="employee-workspace-person">
              <span className="employee-workspace-avatar">{profile.employee.initials}</span>
              <div><span>{profile.team.shortTitle}</span><h2>{profile.employee.name}</h2><p>{profile.employee.role} · руководитель: {profile.managerName}</p></div>
            </div>
            <div className="employee-workspace-actions">
              <div className={`employee-workspace-alarm ${alarms.length ? "has-alarm" : "is-clear"}`}><CircleAlert size={16} /><span>{alarms.length ? `${alarms.length} аларма` : "Нет алармов"}</span></div>
              <button className="assign-task-button" onClick={openTaskModal}><Plus size={16} />Поставить задачу</button>
            </div>
          </header>

          <div className="employee-map-toolbar">
            <div><span><i className="legend-manager" />Постановка</span><span><i className="legend-work" />Работа</span><span><i className="legend-interaction" />Взаимодействие</span><span><i className="legend-risk" />Аларм</span></div>
            <div className="employee-map-zoom" aria-label="Масштаб карты">
              <button aria-label="Уменьшить" disabled={zoom <= 0.85} onClick={() => setZoom((current) => Math.max(0.85, Number((current - 0.15).toFixed(2))))}><Minus size={15} /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button aria-label="Увеличить" disabled={zoom >= 1.3} onClick={() => setZoom((current) => Math.min(1.3, Number((current + 0.15).toFixed(2))))}><Plus size={15} /></button>
              <button aria-label="По размеру" onClick={() => setZoom(1)}><Maximize2 size={14} /></button>
            </div>
          </div>

          <div className="employee-map-scroll" ref={mapScrollRef}>
            <div className="employee-map-surface" style={{ width: `${zoom * 100}%`, minWidth: `${900 * zoom}px`, height: `${620 * zoom}px` }}>
              <svg className="employee-map-edges" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
                {map.edges.map((edge) => {
                  const from = map.nodes.find((node) => node.id === edge.from);
                  const to = map.nodes.find((node) => node.id === edge.to);
                  if (!from || !to) return null;
                  return (
                    <g key={`${edge.from}-${edge.to}-${edge.label ?? "edge"}`} className={`employee-map-edge employee-map-edge--${edge.tone} ${edge.dashed ? "is-dashed" : ""}`}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                      <circle cx={to.x} cy={to.y} r="4" />
                      {edge.label && <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle">{edge.label}</text>}
                    </g>
                  );
                })}
              </svg>
              {map.nodes.map((node) => (
                <button
                  key={node.id}
                  className={`employee-map-node employee-map-node--${node.kind} status-${node.status} ${selectedNode.id === node.id ? "selected" : ""}`}
                  style={{ left: `${node.x / 10}%`, top: `${node.y / 6.2}%` }}
                  onClick={() => setSelectedNodeId(node.id)}
                  aria-label={`${employeeMapKindLabels[node.kind]}: ${node.label}`}
                >
                  <span>{employeeMapKindLabels[node.kind]}</span>
                  <strong>{node.label}</strong>
                  <small>{node.metric}</small>
                  {node.status === "risk" && <i><CircleAlert size={12} /></i>}
                </button>
              ))}
            </div>
          </div>

          <EmployeeNodeInspector node={selectedNode} task={selectedTask} profile={profile} alarms={alarms} taskCount={tasks.length} />

          <div className="employee-work-lower">
            <section className="work-alarm-panel">
              <header><div><span>Автодиагностика</span><h3>Алармы руководителю</h3></div><em className={alarms.length ? "has-alarm" : "is-clear"}>{alarms.length || "OK"}</em></header>
              {alarms.length === 0 ? (
                <div className="work-alarm-clear"><Check size={18} /><div><strong>Критичных отклонений нет</strong><p>Есть задачи, постановщик и дедлайны определены.</p></div></div>
              ) : (
                <div className="work-alarm-list">
                  {alarms.map((alarm) => (
                    <button key={alarm.id} className={`work-alarm-row severity-${alarm.severity}`} onClick={() => setSelectedNodeId(alarm.taskId ? `task-${alarm.taskId}` : "alarm")}>
                      <CircleAlert size={17} /><span><strong>{alarm.title}</strong><small>{alarm.description}</small></span><em>{alarmSeverityLabel(alarm.severity)}</em>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="employee-task-register">
              <header><div><span>Рабочий план</span><h3>Задачи сотрудника</h3></div><strong>{tasks.length}</strong></header>
              {tasks.length === 0 ? (
                <div className="employee-task-empty"><CircleAlert size={18} /><p>Задач нет. Руководителю нужно сформировать рабочий план.</p><button onClick={openTaskModal}><Plus size={14} />Поставить первую задачу</button></div>
              ) : (
                <div className="employee-task-list">
                  {tasks.map((task) => (
                    <button key={task.id} className={`employee-task-row status-${task.status}`} onClick={() => setSelectedNodeId(`task-${task.id}`)}>
                      <span className="employee-task-status"><i />{taskStatusLabel(task.status)}</span>
                      <strong>{task.title}</strong>
                      <small>Поставил: {task.assignedBy}{task.assignedByIsManager ? " · руководитель" : " · не подтверждено руководителем"}</small>
                      <div><em>{task.deadline ? `до ${formatTaskDate(task.deadline)}` : "Нет дедлайна"}</em><span>{task.progress}%</span></div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {taskModalOpen && (
        <div className="task-assignment-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTaskModalOpen(false)}>
          <form className="task-assignment-modal" onSubmit={(event) => { event.preventDefault(); assignTask(); }} aria-modal="true" role="dialog" aria-labelledby="task-modal-title">
            <header><div><span>Новая задача</span><h2 id="task-modal-title">Поставить задачу сотруднику</h2></div><button type="button" aria-label="Закрыть" onClick={() => setTaskModalOpen(false)}><X size={18} /></button></header>
            <div className="task-assignment-person"><span>{profile.employee.initials}</span><div><strong>{profile.employee.name}</strong><small>{profile.employee.role}</small></div></div>
            <div className="task-assignment-manager"><Check size={16} /><p><span>Постановщик</span><strong>{profile.managerName} · {profile.managerRole}</strong></p></div>
            <label><span>Что нужно сделать</span><input autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Например, подготовить отчет кампании" /></label>
            <div className="task-assignment-fields">
              <label><span>Дедлайн</span><input type="date" min="2026-08-12" value={taskDeadline} onChange={(event) => setTaskDeadline(event.target.value)} /></label>
              <label><span>Взаимодействие</span><select value={collaborationTeamId} onChange={(event) => setCollaborationTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}</select></label>
            </div>
            <p className="task-assignment-rule"><CircleAlert size={15} />MOLECULE требует постановщика-руководителя и дедлайн. Иначе задача попадет в управленческие алармы.</p>
            <footer><button type="button" onClick={() => setTaskModalOpen(false)}>Отмена</button><button type="submit" disabled={!taskTitle.trim() || !taskDeadline}><Plus size={15} />Поставить задачу</button></footer>
          </form>
        </div>
      )}
    </div>
  );
}

function EmployeeNodeInspector({ node, task, profile, alarms, taskCount }: { node: EmployeeMapNode; task?: EmployeeWorkTask; profile: (typeof employeeWorkProfiles)[number]; alarms: EmployeeWorkAlarm[]; taskCount: number }) {
  return (
    <aside className={`employee-node-inspector status-${node.status}`}>
      <div><span>{employeeMapKindLabels[node.kind]}</span><em>{employeeNodeStatusLabel(node.status)}</em></div>
      <h3>{node.label}</h3>
      <p>{node.description}</p>
      {task ? (
        <dl>
          <div><dt>Поставил</dt><dd>{task.assignedBy}<small>{task.assignedByIsManager ? "Руководитель подтвердил приоритет" : "Нет подтверждения руководителя"}</small></dd></div>
          <div><dt>Дедлайн</dt><dd>{formatTaskDate(task.deadline)}<small>{task.status === "looped" ? task.loopPath : `${task.progress}% выполнено`}</small></dd></div>
          <div><dt>Взаимодействует</dt><dd>{task.teamIds.map((id) => teamById(id)?.shortTitle).filter(Boolean).join(" · ")}</dd></div>
          <div><dt>Результат / KPI</dt><dd>{task.result}<small>{task.kpi}</small></dd></div>
        </dl>
      ) : (
        <dl>
          <div><dt>Руководитель</dt><dd>{profile.managerName}<small>{profile.managerRole}</small></dd></div>
          <div><dt>Рабочий срез</dt><dd>{taskCount} задач в плане<small>{alarms.length ? `${alarms.length} отклонения требуют внимания` : "Отклонений не найдено"}</small></dd></div>
        </dl>
      )}
    </aside>
  );
}

function employeeNodeStatusLabel(status: EmployeeMapNode["status"]) {
  return { normal: "Связь", active: "В работе", done: "Завершено", queued: "Ожидается", risk: "Аларм" }[status];
}

function taskStatusLabel(status: EmployeeWorkTask["status"]) {
  return { active: "В работе", blocked: "Блок", done: "Готово", looped: "Цикл", overdue: "Просрочено" }[status];
}

function alarmSeverityLabel(severity: EmployeeWorkAlarm["severity"]) {
  return { critical: "Критично", warning: "Внимание", info: "Инфо" }[severity];
}

function stepStatusLabel(status: Process["steps"][number]["status"]) {
  return { done: "Завершен", active: "В работе", waiting: "Ожидает", queued: "В очереди" }[status];
}

function FinanceScreen({ onOpenTeam, onOpenOpportunity }: { onOpenTeam: (id: string) => void; onOpenOpportunity: (id: string) => void }) {
  return (
    <div className="screen-stack">
      <section className="finance-hero">
        <div><span>Годовой маркетинговый бюджет</span><strong>₽312,4 млн</strong><small>утвержденный план 2026</small></div>
        <div className="finance-plan">
          <div><span>Факт YTD</span><strong>₽204,6 млн</strong><small>65% плана</small></div>
          <div><span>Прогноз</span><strong>₽326,8 млн</strong><small className="metric-alert">+4,6% к плану</small></div>
          <div><span>Потенциал</span><strong>₽26,8 млн</strong><small>без прямых сокращений</small></div>
        </div>
      </section>

      <section className="finance-columns">
        <div className="section-card spend-card">
          <SectionHeading eyebrow="Структура бюджета" title="На что тратит маркетинг" />
          <div className="spend-list">
            {financeCategories.map((category) => (
              <div key={category.label} className="spend-row">
                <div><strong>{category.label}</strong><small>{category.share}% бюджета · ROI {category.roi}</small></div>
                <div className="spend-bar"><i style={{ width: `${category.share * 2.75}%` }} /></div>
                <strong>₽{formatMoney(category.value)} млн</strong>
                <span className={category.delta > 7 ? "over" : category.delta < 0 ? "under" : ""}>{category.delta > 0 ? "+" : ""}{category.delta}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card finance-signals">
          <SectionHeading eyebrow="Расходы под наблюдением" title="Что проверить первым" />
          <button onClick={() => onOpenOpportunity("agencies")}><CircleAlert size={19} /><div><strong>Агентства и сервисы</strong><span>7 контрактов пересекаются со штатными функциями</span><small>Потенциал ₽11,4 млн / год</small></div><ChevronRight size={18} /></button>
          <button onClick={() => onOpenOpportunity("events-flow")}><TrendingUp size={19} /><div><strong>Мероприятия</strong><span>Прогноз превышения плана на 14%</span><small>4 версии брифа увеличивают цикл</small></div><ChevronRight size={18} /></button>
          <button onClick={() => onOpenOpportunity("reuse")}><Zap size={19} /><div><strong>Fashion production</strong><span>Только 24% материалов используются повторно</span><small>Потенциал ₽6,2 млн / год</small></div><ChevronRight size={18} /></button>
        </div>
      </section>

      <section className="section-card team-budget-table">
        <SectionHeading eyebrow="Владельцы расходов" title="Бюджет по командам · в месяц" />
        <div className="budget-table-head"><span>Команда</span><span>Бюджет</span><span>Задачи в срок</span><span>Вклад</span><span>Сигнал</span></div>
        {[...teams].sort((a, b) => b.budget - a.budget).map((team) => (
          <button key={team.id} onClick={() => onOpenTeam(team.id)}>
            <span><strong>{team.shortTitle}</strong><small>{team.count} сотрудников</small></span>
            <strong>₽{formatMoney(team.budget)} млн</strong>
            <span>{team.onTime}%</span>
            <span>{team.impact}%</span>
            <span className={team.issues > 2 ? "signal-risk" : "signal-ok"}>{team.issues > 2 ? `${team.issues} проблемы` : "В норме"}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function OpportunitiesScreen({ onOpenOpportunity }: { onOpenOpportunity: (id: string) => void }) {
  return (
    <div className="screen-stack">
      <section className="opportunities-intro">
        <div><Sparkles size={20} /><span>Optimization map</span><strong>₽26,8 млн</strong><small>оценочный годовой потенциал уже измеримых инициатив</small></div>
        <p>MOLECULE не предлагает «кого уволить». Она показывает, где работа дублируется, зависает, стоит дороже результата или может быть перераспределена — с доказательствами для управленческого решения.</p>
      </section>
      <section className="opportunity-grid">
        {opportunities.map((opportunity) => (
          <button key={opportunity.id} className="opportunity-card" onClick={() => onOpenOpportunity(opportunity.id)}>
            <header><span>{opportunity.number}</span><em>{opportunity.area}</em></header>
            <h3>{opportunity.title}</h3><p>{opportunity.summary}</p>
            <dl>
              <div><dt>Эффект</dt><dd>{opportunity.impact}</dd></div>
              <div><dt>Уверенность</dt><dd>{opportunity.confidence}%</dd></div>
              <div><dt>Сложность</dt><dd>{opportunity.effort}</dd></div>
            </dl>
            <footer><span>Открыть доказательства</span><ArrowUpRight size={17} /></footer>
          </button>
        ))}
      </section>
    </div>
  );
}

function TeamDetail({ team, onOpenEmployee }: { team: Team; onOpenEmployee: (id: string) => void }) {
  const teamEmployees = employees.filter((employee) => employee.teamId === team.id);
  return (
    <div className="drawer-content">
      <span className="drawer-eyebrow">Команда · {team.direction === "online" ? "Online" : "Offline"}</span>
      <h2>{team.title}</h2><p className="drawer-lead">Руководитель: {team.lead}</p>
      <div className="drawer-hero-metric"><div><strong>{team.utilization}%</strong><span>загрузка команды</span></div><i><b style={{ width: `${Math.min(team.utilization, 100)}%` }} /></i></div>
      <div className="drawer-metrics">
        <div><strong>{team.count}</strong><span>сотрудников</span></div><div><strong>{team.processes}</strong><span>процессов</span></div><div><strong>{team.tasks}</strong><span>задач</span></div><div><strong>{team.onTime}%</strong><span>в срок</span></div>
      </div>
      <DrawerSection title="Основные функции"><div className="tag-list">{team.functions.map((item) => <span key={item}>{item}</span>)}</div></DrawerSection>
      <DrawerSection title="Экономика и результат">
        <div className="drawer-result-grid"><div><span>Бюджет / месяц</span><strong>₽{formatMoney(team.budget)} млн</strong></div><div><span>Вклад в маркетинг</span><strong>{team.impact}%</strong></div><div><span>Проблемные процессы</span><strong>{team.issues}</strong></div></div>
      </DrawerSection>
      <DrawerSection title={`Сотрудники · ${teamEmployees.length}`}>
        <div className="drawer-people-list">{teamEmployees.slice(0, 6).map((employee) => <button key={employee.id} onClick={() => onOpenEmployee(employee.id)}><i>{employee.initials}</i><span><strong>{employee.name}</strong><small>{employee.role}</small></span><em className={`status-${employee.status}`}>{employee.utilization}%</em><ChevronRight size={16} /></button>)}</div>
      </DrawerSection>
    </div>
  );
}

function EmployeeDetail({ employee, onOpenTeam }: { employee: Employee; onOpenTeam: (id: string) => void }) {
  const team = teamById(employee.teamId)!;
  return (
    <div className="drawer-content">
      <div className="drawer-person-head"><i>{employee.initials}</i><div><span className="drawer-eyebrow">Сотрудник</span><h2>{employee.name}</h2><p>{employee.role}</p></div></div>
      <button className="drawer-team-link" onClick={() => onOpenTeam(team.id)}><span>{team.title}</span><ChevronRight size={17} /></button>
      <div className={`employee-load-card status-${employee.status}`}><div><span>Фактическая загрузка</span><strong>{employee.utilization}%</strong><small>{statusLabel(employee.status)}</small></div><i><b style={{ width: `${Math.min(employee.utilization, 100)}%` }} /></i></div>
      <div className="drawer-metrics">
        <div><strong>₽{employee.cost} тыс.</strong><span>стоимость / мес.</span></div><div><strong>{employee.processes}</strong><span>процессов</span></div><div><strong>{employee.tasks}</strong><span>задач / мес.</span></div><div><strong>{employee.onTime}%</strong><span>в срок</span></div>
      </div>
      <DrawerSection title="Функциональный профиль">
        <div className="function-profile"><div><span>Уникальные функции</span><strong>{employee.uniqueFunctions}</strong></div><div><span>Дублируются другими</span><strong className={employee.duplicateFunctions > 0 ? "metric-alert" : ""}>{employee.duplicateFunctions}</strong></div><div><span>Зависимых процессов</span><strong>{employee.dependencies}</strong></div></div>
      </DrawerSection>
      <DrawerSection title="Связь с бизнес-результатом">
        <div className="impact-chain"><span>{employee.name.split(" ")[0]}</span><ArrowRight size={15} /><span>{employee.role}</span><ArrowRight size={15} /><span>{team.shortTitle}</span><ArrowRight size={15} /><strong>{employee.businessImpact}</strong></div>
      </DrawerSection>
      <div className="drawer-note"><CircleAlert size={17} /><p>Показатели описывают работу позиции, а не оценивают личность сотрудника. Для решения нужна проверка с руководителем команды.</p></div>
    </div>
  );
}

function statusLabel(status: EmployeeStatus) {
  if (status === "underloaded") return "Есть свободная емкость";
  if (status === "overloaded") return "Выше устойчивого уровня";
  return "В устойчивом диапазоне";
}

function OpportunityDetail({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="drawer-content opportunity-detail">
      <span className="drawer-eyebrow">Optimization opportunity · {opportunity.number}</span>
      <h2>{opportunity.title}</h2><p className="drawer-lead">{opportunity.area}</p>
      <div className="opportunity-impact"><span>Ожидаемый эффект</span><strong>{opportunity.impact}</strong><small>{opportunity.confidence}% уверенность · сложность: {opportunity.effort.toLowerCase()}</small></div>
      <p className="opportunity-summary">{opportunity.summary}</p>
      <DrawerSection title="На чем основан сигнал"><div className="evidence-list">{opportunity.evidence.map((evidence, index) => <div key={evidence}><span>{String(index + 1).padStart(2, "0")}</span><strong>{evidence}</strong></div>)}</div></DrawerSection>
      <DrawerSection title="Следующий управленческий шаг"><div className="action-callout"><Target size={18} /><p>{opportunity.action}</p></div></DrawerSection>
      <div className="drawer-note drawer-note--positive"><Check size={17} /><p>Гипотеза готова к валидации. После подтверждения эффект можно закрепить как инициативу и отслеживать в MOLECULE.</p></div>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="drawer-section"><h3>{title}</h3>{children}</section>;
}

function MobileNavigation({ view, onNavigate }: { view: ViewId; onNavigate: (view: ViewId) => void }) {
  const visible = navItems.filter((item) => item.id !== "teams");
  return (
    <nav className="mobile-navigation">
      {visible.map((item) => {
        const Icon = item.icon;
        return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}><Icon size={19} /><span>{item.mobileLabel}</span></button>;
      })}
    </nav>
  );
}

export default App;
