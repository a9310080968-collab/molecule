import { FolderOpen, Mail, MessageCircle, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { DemoProject, IntegrationProvider, UserIntegration, ProjectParticipant } from "../types";

type PersonalIntegrationsModalProps = {
  project: DemoProject;
  user: ProjectParticipant;
  onClose: () => void;
  onSaveIntegrations: (participantId: string, integrations: UserIntegration[]) => void;
  onImportDemo: (provider: IntegrationProvider, participantId: string) => void;
  onImportFiles: (provider: IntegrationProvider, participantId: string, files: File[]) => void;
};

const mailProviders: IntegrationProvider[] = ["outlook", "yandex", "gmail"];
const folderProviders: IntegrationProvider[] = ["telegram", "folder"];

const providerLabels: Record<IntegrationProvider, string> = {
  outlook: "Outlook",
  yandex: "Яндекс Почта",
  gmail: "Gmail",
  telegram: "Telegram Desktop",
  folder: "Рабочая папка",
};

const providerDescriptions: Record<IntegrationProvider, string> = {
  outlook: "Рабочая почта Microsoft. В демо подключение имитирует OAuth и импорт вложений.",
  yandex: "Рабочая Яндекс Почта. Файлы из писем попадают в пул проекта по тегам.",
  gmail: "Рабочая Gmail. Для продакшена нужен безопасный OAuth через backend.",
  telegram: "Папка Telegram Desktop или выгрузок из переписок. Доступ даётся выбором папки.",
  folder: "Любая рабочая папка: мессенджер, сетевой диск, локальная директория проекта.",
};

const providerIcons: Record<IntegrationProvider, typeof Mail> = {
  outlook: Mail,
  yandex: Mail,
  gmail: Mail,
  telegram: MessageCircle,
  folder: FolderOpen,
};

export function PersonalIntegrationsModal({
  project,
  user,
  onClose,
  onSaveIntegrations,
  onImportDemo,
  onImportFiles,
}: PersonalIntegrationsModalProps) {
  const telegramInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [integrations, setIntegrations] = useState<UserIntegration[]>(() => normalizeIntegrations(user.integrations));
  const [accounts, setAccounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(normalizeIntegrations(user.integrations).map((integration) => [integration.provider, integration.account ?? user.email])),
  );
  const isPrivileged = user.role === "admin" || user.role === "gip";

  const connectedCount = useMemo(() => integrations.filter((integration) => integration.status === "connected").length, [integrations]);

  function save(next: UserIntegration[]) {
    setIntegrations(next);
    onSaveIntegrations(user.id, next);
  }

  function upsert(provider: IntegrationProvider, patch: Partial<UserIntegration>) {
    const next = integrations.map((integration) =>
      integration.provider === provider
        ? {
            ...integration,
            ...patch,
          }
        : integration,
    );
    save(next);
  }

  function handleConnect(provider: IntegrationProvider) {
    const account = accounts[provider]?.trim() || user.email;
    upsert(provider, {
      account,
      status: "connected",
      lastSyncAt: "только что",
    });
  }

  function handleDisconnect(provider: IntegrationProvider) {
    upsert(provider, {
      status: "not_connected",
      lastSyncAt: undefined,
    });
  }

  function handleFolderSelect(provider: IntegrationProvider, files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    const firstFile = selectedFiles[0] as File & { webkitRelativePath?: string };
    const folderPath = firstFile.webkitRelativePath?.split("/")[0] || "Выбранная папка";
    upsert(provider, {
      folderPath,
      status: "connected",
      lastSyncAt: "только что",
    });
    onImportFiles(provider, user.id, selectedFiles);
  }

  return (
    <div className="modal-backdrop personal-settings-backdrop" role="dialog" aria-modal="true">
      <article className="personal-settings-modal glass-panel">
        <header className="personal-settings-header">
          <div>
            <span>
              <ShieldCheck size={18} />
              Личные настройки
            </span>
            <h2>Интеграции {user.name}</h2>
            <p>
              Каждый участник подключает свою рабочую почту и папки. Файлы с именем формата <b>File_Tag</b> автоматически
              попадают в проект: по известному тегу в раздел, по неизвестному тегу во входящие.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть настройки">
            <X size={20} />
          </button>
        </header>

        <section className="integration-summary">
          <article>
            <strong>{connectedCount}</strong>
            <span>подключено</span>
          </article>
          <article>
            <strong>{project.inboxDocuments.length}</strong>
            <span>во входящих</span>
          </article>
          <article>
            <strong>{isPrivileged ? "Все" : "Свои"}</strong>
            <span>{isPrivileged ? "файлы видны админу/ГИП" : "видимость по владельцу"}</span>
          </article>
        </section>

        <div className="integration-modal-body">
          <section className="integration-section">
            <div className="section-title">
              <Mail size={18} />
              <div>
                <h3>Почтовые сервисы</h3>
                <p>Outlook, Яндекс и Gmail подключаются каждым пользователем в личных настройках.</p>
              </div>
            </div>
            <div className="integration-cards">
              {mailProviders.map((provider) => {
                const integration = integrations.find((item) => item.provider === provider) ?? createDefaultIntegration(provider);
                const Icon = providerIcons[provider];
                return (
                  <article key={provider} className="integration-card">
                    <header>
                      <span>
                        <Icon size={17} />
                        {providerLabels[provider]}
                      </span>
                      <em className={integration.status}>{getStatusLabel(integration.status)}</em>
                    </header>
                    <p>{providerDescriptions[provider]}</p>
                    <label>
                      <span>Рабочий аккаунт</span>
                      <input
                        value={accounts[provider] ?? ""}
                        onChange={(event) => setAccounts((current) => ({ ...current, [provider]: event.currentTarget.value }))}
                        placeholder={user.email}
                      />
                    </label>
                    <footer>
                      {integration.status === "connected" ? (
                        <button onClick={() => handleDisconnect(provider)}>Отключить</button>
                      ) : (
                        <button onClick={() => handleConnect(provider)}>Подключить демо</button>
                      )}
                      <button className="ghost-action" onClick={() => onImportDemo(provider, user.id)}>
                        <RefreshCw size={15} />
                        Сканировать демо
                      </button>
                    </footer>
                    {integration.lastSyncAt ? <small>Последняя проверка: {integration.lastSyncAt}</small> : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="integration-section">
            <div className="section-title">
              <FolderOpen size={18} />
              <div>
                <h3>Папки мессенджеров и файлов</h3>
                <p>Выберите папку Telegram Desktop или любую рабочую папку. Браузер запросит разрешение на чтение файлов.</p>
              </div>
            </div>
            <div className="integration-cards folder-integration-cards">
              {folderProviders.map((provider) => {
                const integration = integrations.find((item) => item.provider === provider) ?? createDefaultIntegration(provider);
                const Icon = providerIcons[provider];
                const inputRef = provider === "telegram" ? telegramInputRef : folderInputRef;
                return (
                  <article key={provider} className="integration-card">
                    <header>
                      <span>
                        <Icon size={17} />
                        {providerLabels[provider]}
                      </span>
                      <em className={integration.status}>{getStatusLabel(integration.status)}</em>
                    </header>
                    <p>{providerDescriptions[provider]}</p>
                    <div className="folder-path-preview">{integration.folderPath ?? "Папка не выбрана"}</div>
                    <footer>
                      <button onClick={() => inputRef.current?.click()}>Выбрать папку</button>
                      <button className="ghost-action" onClick={() => onImportDemo(provider, user.id)}>
                        <RefreshCw size={15} />
                        Сканировать демо
                      </button>
                    </footer>
                    <input
                      ref={inputRef}
                      className="hidden-file-input"
                      type="file"
                      multiple
                      onChange={(event) => handleFolderSelect(provider, event.currentTarget.files)}
                      {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                    />
                    {integration.lastSyncAt ? <small>Последняя проверка: {integration.lastSyncAt}</small> : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

function normalizeIntegrations(integrations: UserIntegration[] = []) {
  const byProvider = new Map(integrations.map((integration) => [integration.provider, integration]));
  return [...mailProviders, ...folderProviders].map((provider) => byProvider.get(provider) ?? createDefaultIntegration(provider));
}

function createDefaultIntegration(provider: IntegrationProvider): UserIntegration {
  return {
    id: `integration-${provider}`,
    provider,
    label: providerLabels[provider],
    status: provider === "telegram" || provider === "folder" ? "needs_permission" : "not_connected",
  };
}

function getStatusLabel(status: UserIntegration["status"]) {
  if (status === "connected") {
    return "Подключено";
  }
  if (status === "needs_permission") {
    return "Нужно разрешение";
  }
  return "Не подключено";
}
