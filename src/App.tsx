import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Atom,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Focus,
  GitBranch,
  ListTodo,
  Maximize2,
  Minus,
  Network,
  Plus,
  Search,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  buildEmployeeWorkMap,
  diagnoseEmployeeTasks,
  employeeMapKindLabels,
  employeeWorkProfiles,
  formatTaskDate,
  type EmployeeMapNode,
  type EmployeeWorkAlarm,
  type EmployeeWorkProfile,
  type EmployeeWorkTask,
} from "./data/employeeWorkMap";
import { teamById, teams, type Team } from "./data/tsumPrototype";

type WorkspaceWindow = "employees" | "analytics" | "optimization" | "tasks" | "cost" | "process" | "node" | "create-task" | null;

type OpportunityCard = {
  id: string;
  title: string;
  evidence: string;
  effect: string;
  action: string;
  tone: "critical" | "warning" | "positive";
};

const surfaceWidth = 1160;
const surfaceHeight = 640;

function App() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("employee-27");
  const [taskOverrides, setTaskOverrides] = useState<Record<string, EmployeeWorkTask[]>>({});
  const [activeWindow, setActiveWindow] = useState<WorkspaceWindow>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState("employee");
  const [zoom, setZoom] = useState(1);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("2026-08-19");
  const [collaborationTeamId, setCollaborationTeamId] = useState("editorial");
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const profile = employeeWorkProfiles.find((item) => item.employee.id === selectedEmployeeId) ?? employeeWorkProfiles[0];
  const tasks = taskOverrides[profile.employee.id] ?? profile.tasks;
  const alarms = useMemo(() => diagnoseEmployeeTasks(profile.employee, profile.managerName, tasks), [profile, tasks]);
  const map = useMemo(() => buildEmployeeWorkMap(profile, tasks, alarms), [profile, tasks, alarms]);
  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : undefined;
  const activeNode = map.nodes.find((node) => node.id === activeNodeId) ?? map.nodes[0];
  const opportunities = useMemo(() => buildOpportunities(profile, tasks, alarms), [profile, tasks, alarms]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = window.requestAnimationFrame(() => {
      canvas.scrollLeft = Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2);
      canvas.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedEmployeeId, zoom]);

  function selectEmployee(employeeId: string) {
    const nextProfile = employeeWorkProfiles.find((item) => item.employee.id === employeeId);
    if (!nextProfile) return;
    setSelectedEmployeeId(employeeId);
    setCollaborationTeamId(nextProfile.team.id);
    setActiveWindow(null);
    setActiveNodeId("employee");
    setActiveTaskId(null);
    setZoom(1);
  }

  function openProcess(taskId: string) {
    setActiveTaskId(taskId);
    setActiveWindow("process");
  }

  function openNode(node: EmployeeMapNode) {
    if (node.kind === "task") {
      openProcess(node.id.replace("task-", ""));
      return;
    }
    if (node.kind === "alarm") {
      setActiveWindow("analytics");
      return;
    }
    setActiveNodeId(node.id);
    setActiveWindow("node");
  }

  function openCreateTask() {
    setTaskTitle("");
    setTaskDeadline("2026-08-19");
    setCollaborationTeamId(profile.team.id);
    setActiveWindow("create-task");
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
    setActiveTaskId(task.id);
    setActiveWindow("process");
  }

  function focusCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollTo({ left: Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2), top: 0, behavior: "smooth" });
  }

  return (
    <div className="molecule-app">
      <header className="workspace-topbar">
        <div className="workspace-brand"><strong>ЦУМ</strong><i /><span>MOLECULE</span></div>
        <button className="employee-switch-button" onClick={() => setActiveWindow("employees")} aria-label="Выбрать сотрудника">
          <span className="employee-switch-avatar">{profile.employee.initials}</span>
          <span><small>Рабочая карта сотрудника</small><strong>{profile.employee.name}</strong><em>{profile.team.shortTitle} · {profile.employee.role}</em></span>
          <ChevronRight size={18} />
        </button>
        <div className="workspace-top-actions">
          <span className={`workspace-health ${alarms.length ? "has-alarm" : "is-clear"}`}><i />{alarms.length ? countLabel(alarms.length, "сигнал", "сигнала", "сигналов") : "Отклонений нет"}</span>
          <button onClick={openCreateTask}><Plus size={17} /><span>Задача</span></button>
          <span className="workspace-user">ВС</span>
        </div>
      </header>

      <nav className="workspace-dock" aria-label="Инструменты MOLECULE">
        <button className={!activeWindow || activeWindow === "node" || activeWindow === "process" || activeWindow === "employees" ? "active" : ""} onClick={() => setActiveWindow(null)}><Atom size={20} /><span>Карта</span></button>
        <button className={activeWindow === "tasks" || activeWindow === "create-task" ? "active" : ""} onClick={() => setActiveWindow("tasks")}><ListTodo size={20} /><span>Задачи</span><em>{tasks.length}</em></button>
        <button className={activeWindow === "analytics" ? "active" : ""} onClick={() => setActiveWindow("analytics")}><BarChart3 size={20} /><span>Аналитика</span></button>
        <button className={activeWindow === "optimization" ? "active" : ""} onClick={() => setActiveWindow("optimization")}><Sparkles size={20} /><span>Оптимизация</span><em className="orange">{opportunities.length}</em></button>
        <button className={activeWindow === "cost" ? "active" : ""} onClick={() => setActiveWindow("cost")}><WalletCards size={20} /><span>Расходы</span></button>
      </nav>

      <main className="visual-workspace">
        <div className="workspace-context">
          <span>Marketing / {profile.team.shortTitle}</span>
          <strong>{countLabel(tasks.length, "бизнес-процесс", "бизнес-процесса", "бизнес-процессов")}</strong>
          <em>Нажмите на объект, чтобы открыть детали</em>
        </div>

        <div className="visual-canvas" ref={canvasRef}>
          <div className="visual-surface" style={{ width: `${surfaceWidth * zoom}px`, height: `${surfaceHeight * zoom}px` }}>
            <div className="visual-aura visual-aura--one" /><div className="visual-aura visual-aura--two" />
            <svg className="visual-edges" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="edgeGlow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {map.edges.map((edge) => {
                const from = map.nodes.find((node) => node.id === edge.from);
                const to = map.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const middle = (from.x + to.x) / 2;
                return (
                  <g key={`${edge.from}-${edge.to}-${edge.label ?? "edge"}`} className={`visual-edge visual-edge--${edge.tone} ${edge.dashed ? "is-dashed" : ""}`}>
                    <path d={`M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`} />
                    <circle cx={to.x} cy={to.y} r="4" />
                    {edge.label && <text x={middle} y={(from.y + to.y) / 2 - 8} textAnchor="middle">{edge.label}</text>}
                  </g>
                );
              })}
            </svg>

            {map.nodes.map((node) => (
              <WorkspaceNode key={node.id} node={node} profile={profile} onClick={() => openNode(node)} />
            ))}
          </div>
        </div>

        <div className="workspace-controls">
          <button aria-label="Уменьшить" onClick={() => setZoom((current) => Math.max(0.78, Number((current - 0.1).toFixed(2))))} disabled={zoom <= 0.78}><Minus size={18} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button aria-label="Увеличить" onClick={() => setZoom((current) => Math.min(1.32, Number((current + 0.1).toFixed(2))))} disabled={zoom >= 1.32}><Plus size={18} /></button>
          <button aria-label="Центрировать карту" onClick={focusCanvas}><Focus size={18} /></button>
          <button aria-label="Сбросить масштаб" onClick={() => { setZoom(1); window.setTimeout(focusCanvas, 20); }}><Maximize2 size={17} /></button>
        </div>
      </main>

      {activeWindow === "employees" && <EmployeePicker profile={profile} taskOverrides={taskOverrides} onSelect={selectEmployee} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "analytics" && <AnalyticsWindow profile={profile} tasks={tasks} alarms={alarms} onOpenProcess={openProcess} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "optimization" && <OptimizationWindow profile={profile} opportunities={opportunities} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "tasks" && <TasksWindow profile={profile} tasks={tasks} alarms={alarms} onCreate={openCreateTask} onOpenProcess={openProcess} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "cost" && <CostWindow profile={profile} tasks={tasks} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "process" && activeTask && <ProcessWindow profile={profile} task={activeTask} alarms={alarms.filter((alarm) => alarm.taskId === activeTask.id)} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "node" && activeNode && <NodeWindow profile={profile} node={activeNode} tasks={tasks} onClose={() => setActiveWindow(null)} />}
      {activeWindow === "create-task" && (
        <WorkspaceModal eyebrow="Постановка руководителя" title="Новая задача" icon={<Plus size={20} />} onClose={() => setActiveWindow(null)} size="compact">
          <form className="create-task-form" onSubmit={(event) => { event.preventDefault(); assignTask(); }}>
            <div className="create-task-person"><span>{profile.employee.initials}</span><div><strong>{profile.employee.name}</strong><small>{profile.employee.role}</small></div></div>
            <div className="manager-confirm"><Check size={17} /><p><span>Постановщик</span><strong>{profile.managerName} · {profile.managerRole}</strong></p></div>
            <label><span>Что нужно сделать</span><input autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Например, подготовить отчет кампании" /></label>
            <div className="form-columns"><label><span>Дедлайн</span><input type="date" min="2026-08-12" value={taskDeadline} onChange={(event) => setTaskDeadline(event.target.value)} /></label><label><span>Смежная команда</span><select value={collaborationTeamId} onChange={(event) => setCollaborationTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}</select></label></div>
            <div className="modal-form-actions"><button type="button" onClick={() => setActiveWindow(null)}>Отмена</button><button type="submit" disabled={!taskTitle.trim() || !taskDeadline}><Plus size={16} />Поставить задачу</button></div>
          </form>
        </WorkspaceModal>
      )}
    </div>
  );
}

function WorkspaceNode({ node, profile, onClick }: { node: EmployeeMapNode; profile: EmployeeWorkProfile; onClick: () => void }) {
  const isProcess = node.kind === "task";
  const icon = nodeIcon(node, profile);
  return (
    <button
      className={`workspace-node workspace-node--${node.kind} status-${node.status} ${isProcess ? "is-process" : "is-orb"}`}
      style={{ left: `${node.x / 10}%`, top: `${node.y / 6.2}%` }}
      onClick={onClick}
      aria-label={`${node.kind === "task" ? "Бизнес-процесс" : employeeMapKindLabels[node.kind]}: ${node.label}`}
    >
      {isProcess ? (
        <><span className="process-node-status"><i />{node.status === "risk" ? "Требует внимания" : node.status === "done" ? "Завершен" : "В работе"}</span><strong>{node.label}</strong><small>{node.metric}</small><ChevronRight size={15} /></>
      ) : (
        <><span className="workspace-orb">{icon}</span><span className="workspace-node-copy"><em>{employeeMapKindLabels[node.kind]}</em><strong>{node.label}</strong><small>{node.metric}</small></span>{node.status === "risk" && <i className="node-alert"><CircleAlert size={12} /></i>}</>
      )}
    </button>
  );
}

function nodeIcon(node: EmployeeMapNode, profile: EmployeeWorkProfile) {
  if (node.kind === "employee") return <b>{profile.employee.initials}</b>;
  if (node.kind === "manager") return <UserRound size={23} />;
  if (node.kind === "function") return <BriefcaseBusiness size={21} />;
  if (node.kind === "team") return <UsersRound size={22} />;
  if (node.kind === "result") return <Target size={22} />;
  if (node.kind === "kpi") return <Activity size={22} />;
  return <CircleAlert size={22} />;
}

function WorkspaceModal({ eyebrow, title, icon, onClose, size = "wide", children }: { eyebrow: string; title: string; icon: ReactNode; onClose: () => void; size?: "wide" | "compact"; children: ReactNode }) {
  return (
    <div className="workspace-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`workspace-modal workspace-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title">
        <header><div className="modal-title-icon">{icon}</div><div><span>{eyebrow}</span><h2 id="workspace-modal-title">{title}</h2></div><button aria-label="Закрыть" onClick={onClose}><X size={20} /></button></header>
        <div className="workspace-modal-content">{children}</div>
      </section>
    </div>
  );
}

function EmployeePicker({ profile, taskOverrides, onSelect, onClose }: { profile: EmployeeWorkProfile; taskOverrides: Record<string, EmployeeWorkTask[]>; onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  const visible = employeeWorkProfiles.filter((item) => (teamFilter === "all" || item.team.id === teamFilter) && (!normalized || `${item.employee.name} ${item.employee.role} ${item.team.shortTitle}`.toLocaleLowerCase("ru-RU").includes(normalized)));
  return (
    <WorkspaceModal eyebrow="88 сотрудников" title="Выберите рабочую карту" icon={<Search size={20} />} onClose={onClose}>
      <div className="employee-picker-toolbar"><label><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или должность" /></label><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="all">Все отделы</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.shortTitle}</option>)}</select></div>
      <div className="workspace-employee-list">
        {visible.map((item) => {
          const itemTasks = taskOverrides[item.employee.id] ?? item.tasks;
          const itemAlarms = diagnoseEmployeeTasks(item.employee, item.managerName, itemTasks);
          return <button key={item.employee.id} data-employee-id={item.employee.id} className={item.employee.id === profile.employee.id ? "selected" : ""} onClick={() => onSelect(item.employee.id)}><span>{item.employee.initials}</span><div><strong>{item.employee.name}</strong><small>{item.employee.role}</small><em>{item.team.shortTitle} · загрузка {item.employee.utilization}%</em></div><i className={itemAlarms.length ? "has-alarm" : "is-clear"}>{itemAlarms.length || <Check size={13} />}</i></button>;
        })}
      </div>
    </WorkspaceModal>
  );
}

function AnalyticsWindow({ profile, tasks, alarms, onOpenProcess, onClose }: { profile: EmployeeWorkProfile; tasks: EmployeeWorkTask[]; alarms: EmployeeWorkAlarm[]; onOpenProcess: (id: string) => void; onClose: () => void }) {
  const completed = tasks.filter((task) => task.status === "done").length;
  const teamsCount = new Set(tasks.flatMap((task) => task.teamIds)).size;
  const averageProgress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  return (
    <WorkspaceModal eyebrow="Запрос MOLECULE" title={`Аналитика · ${profile.employee.name}`} icon={<BarChart3 size={20} />} onClose={onClose}>
      <div className="analysis-summary"><div className={alarms.length ? "has-alarm" : "is-clear"}><span>{alarms.length ? "Нужна проверка руководителя" : "Работа организована устойчиво"}</span><strong>{alarms.length ? countLabel(alarms.length, "отклонение", "отклонения", "отклонений") : "Отклонений нет"}</strong><p>Анализ построен по задачам, срокам, постановщикам и межкомандным связям сотрудника.</p></div><button><Sparkles size={17} />Пересчитать анализ</button></div>
      <div className="analysis-metrics"><MetricCard label="Загрузка" value={`${profile.employee.utilization}%`} note={profile.employee.status === "overloaded" ? "Выше устойчивого уровня" : "Текущий рабочий срез"} /><MetricCard label="Средний прогресс" value={`${averageProgress}%`} note={`${completed} завершено`} /><MetricCard label="Процессы" value={String(tasks.length)} note={`${teamsCount} команд вовлечено`} /><MetricCard label="В срок" value={`${profile.employee.onTime}%`} note="По истории выполнения" /></div>
      <div className="analysis-columns"><section><header><span>Диагностика</span><h3>Что требует внимания</h3></header>{alarms.length ? <div className="analysis-alarm-list">{alarms.map((alarm) => <button key={alarm.id} onClick={() => alarm.taskId && onOpenProcess(alarm.taskId)}><CircleAlert size={17} /><span><strong>{alarm.title}</strong><small>{alarm.description}</small></span><ChevronRight size={16} /></button>)}</div> : <div className="analysis-clear"><Check size={20} /><span><strong>Критичных сигналов нет</strong><small>Все процессы имеют владельца и срок.</small></span></div>}</section><section><header><span>Бизнес-процессы</span><h3>Текущая работа</h3></header><div className="analysis-process-list">{tasks.map((task) => <button key={task.id} onClick={() => onOpenProcess(task.id)}><span className={`task-dot status-${task.status}`} /><div><strong>{task.title}</strong><small>{task.deadline ? `до ${formatTaskDate(task.deadline)}` : "без дедлайна"}</small></div><em>{task.progress}%</em></button>)}</div></section></div>
    </WorkspaceModal>
  );
}

function OptimizationWindow({ profile, opportunities, onClose }: { profile: EmployeeWorkProfile; opportunities: OpportunityCard[]; onClose: () => void }) {
  return (
    <WorkspaceModal eyebrow="Optimization opportunities" title={`Потенциал · ${profile.employee.name}`} icon={<Sparkles size={20} />} onClose={onClose}>
      <div className="optimization-intro"><div><span>Найдено</span><strong>{countLabel(opportunities.length, "возможность", "возможности", "возможностей")}</strong><p>Это гипотезы для проверки с руководителем, а не готовое кадровое решение.</p></div><button><Sparkles size={17} />Обновить рекомендации</button></div>
      <div className="opportunity-window-list">{opportunities.map((item, index) => <article key={item.id} className={`tone-${item.tone}`}><header><span>{String(index + 1).padStart(2, "0")}</span><em>{item.tone === "critical" ? "Высокий приоритет" : item.tone === "warning" ? "Проверить" : "Возможность"}</em></header><h3>{item.title}</h3><dl><div><dt>Наблюдение</dt><dd>{item.evidence}</dd></div><div><dt>Ожидаемый эффект</dt><dd>{item.effect}</dd></div><div><dt>Следующий шаг</dt><dd>{item.action}</dd></div></dl><button>Добавить в план <ChevronRight size={15} /></button></article>)}</div>
    </WorkspaceModal>
  );
}

function TasksWindow({ profile, tasks, alarms, onCreate, onOpenProcess, onClose }: { profile: EmployeeWorkProfile; tasks: EmployeeWorkTask[]; alarms: EmployeeWorkAlarm[]; onCreate: () => void; onOpenProcess: (id: string) => void; onClose: () => void }) {
  return (
    <WorkspaceModal eyebrow="Рабочий контур" title={`Задачи · ${profile.employee.name}`} icon={<ListTodo size={20} />} onClose={onClose}>
      <div className="tasks-window-header"><div><strong>{countLabel(tasks.length, "процесс", "процесса", "процессов")}</strong><span>{alarms.length ? `${countLabel(alarms.length, "сигнал", "сигнала", "сигналов")} требуют внимания` : "отклонений не найдено"}</span></div><button onClick={onCreate}><Plus size={17} />Поставить задачу</button></div>
      {tasks.length ? <div className="tasks-window-list">{tasks.map((task) => { const taskAlarms = alarms.filter((alarm) => alarm.taskId === task.id); return <button key={task.id} onClick={() => onOpenProcess(task.id)}><span className={`task-window-state status-${task.status}`}><i />{taskStatusLabel(task.status)}</span><div><strong>{task.title}</strong><small>Поставил: {task.assignedBy}{task.assignedByIsManager ? " · руководитель" : " · не подтверждено"}</small><em>{task.teamIds.map((id) => teamById(id)?.shortTitle).filter(Boolean).join(" → ")}</em></div><span className="task-window-progress"><b>{task.progress}%</b><i><em style={{ width: `${task.progress}%` }} /></i></span><span className={task.deadline ? "task-window-deadline" : "task-window-deadline missing"}><Clock3 size={14} />{formatTaskDate(task.deadline)}</span>{taskAlarms.length > 0 && <span className="task-window-alarm"><CircleAlert size={13} />{taskAlarms.length}</span>}<ChevronRight size={18} /></button>; })}</div> : <div className="empty-work-plan"><CircleAlert size={23} /><h3>У сотрудника нет задач</h3><p>Руководителю необходимо сформировать рабочий план.</p><button onClick={onCreate}><Plus size={16} />Поставить первую задачу</button></div>}
    </WorkspaceModal>
  );
}

function CostWindow({ profile, tasks, onClose }: { profile: EmployeeWorkProfile; tasks: EmployeeWorkTask[]; onClose: () => void }) {
  const monthly = profile.employee.cost;
  const annual = monthly * 12;
  const perProcess = tasks.length ? Math.round(monthly / tasks.length) : monthly;
  return (
    <WorkspaceModal eyebrow="Ресурсная модель" title={`Расходы · ${profile.employee.name}`} icon={<WalletCards size={20} />} onClose={onClose}>
      <div className="cost-hero"><div><span>Стоимость позиции / месяц</span><strong>₽{monthly} тыс.</strong><small>Демонстрационная оценка полной стоимости позиции</small></div><div><span>Годовая стоимость</span><strong>₽{(annual / 1000).toFixed(2)} млн</strong><small>Без учета агентств и production-бюджетов</small></div></div>
      <div className="cost-grid"><MetricCard label="На один процесс" value={`₽${perProcess} тыс.`} note="Условное распределение" /><MetricCard label="Бюджет команды" value={`₽${profile.team.budget} млн`} note="В месяц" /><MetricCard label="Загрузка" value={`${profile.employee.utilization}%`} note="Фактический срез" /></div>
      <section className="resource-allocation"><header><span>Распределение ресурса</span><h3>На что уходит рабочее время</h3></header>{tasks.length ? tasks.map((task) => <div key={task.id}><span><strong>{task.title}</strong><small>{task.workFunction}</small></span><i><b style={{ width: `${Math.max(12, Math.round(100 / tasks.length))}%` }} /></i><em>≈ ₽{perProcess} тыс.</em></div>) : <p>Невозможно распределить стоимость: рабочий план не сформирован.</p>}</section>
    </WorkspaceModal>
  );
}

function ProcessWindow({ profile, task, alarms, onClose }: { profile: EmployeeWorkProfile; task: EmployeeWorkTask; alarms: EmployeeWorkAlarm[]; onClose: () => void }) {
  return (
    <WorkspaceModal eyebrow="Бизнес-процесс" title={task.title} icon={<GitBranch size={20} />} onClose={onClose}>
      <div className={`process-window-hero status-${task.status}`}><div><span>{taskStatusLabel(task.status)}</span><strong>{task.progress}%</strong><small>готовность процесса</small></div><i><b style={{ width: `${task.progress}%` }} /></i><dl><div><dt>Постановщик</dt><dd>{task.assignedBy}<small>{task.assignedByIsManager ? "Приоритет подтвержден руководителем" : "Нет подтверждения руководителя"}</small></dd></div><div><dt>Дедлайн</dt><dd>{formatTaskDate(task.deadline)}</dd></div></dl></div>
      <section className="process-chain-section"><header><span>Маршрут процесса</span><h3>От задачи до бизнес-результата</h3></header><div className="process-chain"><span><i><UserRound size={18} /></i><em>Сотрудник</em><strong>{profile.employee.name}</strong></span><ChevronRight size={18} /><span><i><BriefcaseBusiness size={18} /></i><em>Функция</em><strong>{task.workFunction}</strong></span><ChevronRight size={18} /><span><i><Network size={18} /></i><em>Команды</em><strong>{task.teamIds.map((id) => teamById(id)?.shortTitle).filter(Boolean).join(" · ")}</strong></span><ChevronRight size={18} /><span><i><Target size={18} /></i><em>Результат</em><strong>{task.result}</strong></span><ChevronRight size={18} /><span><i><Activity size={18} /></i><em>KPI</em><strong>{task.kpi}</strong></span></div></section>
      {task.loopPath && <div className="process-loop"><CircleAlert size={19} /><div><span>Обнаружен повторяющийся маршрут</span><strong>{task.loopPath}</strong><p>Процесс возвращается на предыдущий уровень без зафиксированного решения.</p></div></div>}
      {alarms.length > 0 && <section className="process-alarm-section"><header><span>Диагностика MOLECULE</span><h3>Отклонения процесса</h3></header>{alarms.map((alarm) => <article key={alarm.id}><CircleAlert size={17} /><div><strong>{alarm.title}</strong><p>{alarm.description}</p></div><em>{alarmSeverityLabel(alarm.severity)}</em></article>)}</section>}
    </WorkspaceModal>
  );
}

function NodeWindow({ profile, node, tasks, onClose }: { profile: EmployeeWorkProfile; node: EmployeeMapNode; tasks: EmployeeWorkTask[]; onClose: () => void }) {
  const relatedTasks = node.kind === "team" ? tasks.filter((task) => task.teamIds.includes(node.id.replace("team-", ""))) : tasks;
  return (
    <WorkspaceModal eyebrow={employeeMapKindLabels[node.kind]} title={node.label} icon={nodeIcon(node, profile)} onClose={onClose} size="compact">
      <div className={`node-window-summary status-${node.status}`}><span>{node.metric}</span><p>{node.description}</p></div>
      <dl className="node-window-facts"><div><dt>Сотрудник</dt><dd>{profile.employee.name}</dd></div><div><dt>Команда</dt><dd>{profile.team.shortTitle}</dd></div><div><dt>Руководитель</dt><dd>{profile.managerName}</dd></div><div><dt>Связанные процессы</dt><dd>{relatedTasks.length}</dd></div></dl>
    </WorkspaceModal>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function buildOpportunities(profile: EmployeeWorkProfile, tasks: EmployeeWorkTask[], alarms: EmployeeWorkAlarm[]): OpportunityCard[] {
  const items: OpportunityCard[] = alarms.map((alarm) => {
    const task = tasks.find((item) => item.id === alarm.taskId);
    if (alarm.type === "no_tasks") return { id: alarm.id, title: "Сформировать измеримый рабочий план", evidence: "У сотрудника нет активных задач и подтвержденного вклада в текущий план.", effect: "Появится понятная загрузка и ответственность за результат.", action: `Руководитель ${profile.managerName} ставит первую задачу с дедлайном.`, tone: "critical" };
    if (alarm.type === "loop_no_deadline") return { id: alarm.id, title: "Разорвать цикл согласований", evidence: task?.loopPath ?? alarm.description, effect: "Сократить ожидание и убрать повторные возвраты.", action: "Назначить уровень финального решения и зафиксировать дедлайн.", tone: "critical" };
    if (alarm.type === "wrong_assigner") return { id: alarm.id, title: "Вернуть приоритизацию руководителю", evidence: alarm.description, effect: "Убрать конфликт приоритетов между смежными командами.", action: "Подтвердить или снять задачу на уровне непосредственного руководителя.", tone: "warning" };
    if (alarm.type === "overdue") return { id: alarm.id, title: "Пересобрать просроченный процесс", evidence: alarm.description, effect: "Вернуть управляемый срок и прогноз результата.", action: "Проверить блокер, владельца решения и новый срок.", tone: "critical" };
    if (alarm.type === "blocked") return { id: alarm.id, title: "Снять межкомандную блокировку", evidence: alarm.description, effect: "Возобновить движение процесса без эскалации наверх.", action: "Назначить владельца блокера из смежной команды.", tone: "warning" };
    if (alarm.type === "overload") return { id: alarm.id, title: "Перераспределить параллельную работу", evidence: alarm.description, effect: "Снизить риск задержек и выгорания.", action: "Снять низкоприоритетный процесс или передать часть работы.", tone: "warning" };
    return { id: alarm.id, title: "Зафиксировать срок процесса", evidence: alarm.description, effect: "Сделать загрузку и своевременность измеримыми.", action: "Назначить дедлайн и контрольную точку.", tone: "warning" };
  });
  if (items.length === 0) items.push({ id: "healthy-capacity", title: "Масштабировать устойчивую практику", evidence: "Все процессы имеют постановщика, срок и измеримый результат.", effect: "Использовать рабочую схему как эталон для команды.", action: "Сравнить маршрут с похожими ролями и зафиксировать шаблон.", tone: "positive" });
  return items.slice(0, 5);
}

function taskStatusLabel(status: EmployeeWorkTask["status"]) {
  return { active: "В работе", blocked: "Заблокирован", done: "Завершен", looped: "Зациклен", overdue: "Просрочен" }[status];
}

function alarmSeverityLabel(severity: EmployeeWorkAlarm["severity"]) {
  return { critical: "Критично", warning: "Внимание", info: "Информация" }[severity];
}

function countLabel(value: number, one: string, few: string, many: string) {
  const lastTwo = value % 100;
  const last = value % 10;
  const word = lastTwo >= 11 && lastTwo <= 19 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
  return `${value} ${word}`;
}

export default App;
