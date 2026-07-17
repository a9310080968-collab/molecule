import { Camera, FolderOpen, Mail, MessageCircle, RefreshCw, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoProject, IntegrationProvider, UserIntegration, ProjectParticipant } from "../types";

type PersonalIntegrationsModalProps = {
  project: DemoProject;
  user: ProjectParticipant;
  onClose: () => void;
  onSaveProfile: (participantId: string, name: string, avatarUrl?: string) => void;
  onSaveIntegrations: (participantId: string, integrations: UserIntegration[]) => void;
  onImportDemo: (provider: IntegrationProvider, participantId: string) => void;
  onImportTestFile: (provider: IntegrationProvider, participantId: string, mode: "tagged" | "untagged", tag?: string) => void;
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
  onSaveProfile,
  onSaveIntegrations,
  onImportDemo,
  onImportTestFile,
  onImportFiles,
}: PersonalIntegrationsModalProps) {
  const telegramInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [profileName, setProfileName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [integrations, setIntegrations] = useState<UserIntegration[]>(() => normalizeIntegrations(user.integrations));
  const [accounts, setAccounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(normalizeIntegrations(user.integrations).map((integration) => [integration.provider, integration.account ?? user.email])),
  );
  const [testTags, setTestTags] = useState<Record<string, string>>({});
  const isPrivileged = user.role === "admin" || user.role === "gip";

  const connectedCount = useMemo(() => integrations.filter((integration) => integration.status === "connected").length, [integrations]);

  useEffect(() => {
    setProfileName(user.name);
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user.id, user.name, user.avatarUrl]);

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

  function handleAvatarSelect(file: File | undefined) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  return (
    <div className="modal-backdrop personal-settings-backdrop" role="dialog" aria-modal="true">
      <article className="personal-settings-modal glass-panel">
        <header className="personal-settings-header">
          <div>
            <span>
              <ShieldCheck size={18} />
              Личный кабинет
            </span>
            <h2>{user.name}</h2>
            <p>
              Профиль пользователя, рабочая почта и подключенные папки проекта.
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
          <section className="personal-profile-settings">
            <div className="personal-profile-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="Аватар пользователя" /> : <span>{getInitials(profileName)}</span>}
              <button onClick={() => avatarInputRef.current?.click()}>
                <Camera size={16} />
                Выбрать фото
              </button>
              {avatarUrl ? (
                <button className="danger" onClick={() => setAvatarUrl("")} aria-label="Удалить аватар">
                  <Trash2 size={15} />
                </button>
              ) : null}
              <input
                ref={avatarInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*"
                onChange={(event) => handleAvatarSelect(event.currentTarget.files?.[0])}
              />
            </div>
            <label>
              <span>Имя пользователя</span>
              <input value={profileName} onChange={(event) => setProfileName(event.currentTarget.value)} />
            </label>
            <button
              className="personal-profile-save"
              onClick={() => onSaveProfile(user.id, profileName, avatarUrl || undefined)}
              disabled={!profileName.trim()}
            >
              <Save size={16} />
              Сохранить профиль
            </button>
          </section>

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
                    <IntegrationTestActions
                      provider={provider}
                      tag={testTags[provider] ?? ""}
                      onTagChange={(value) => setTestTags((current) => ({ ...current, [provider]: value }))}
                      onImportTestFile={(mode) => onImportTestFile(provider, user.id, mode, testTags[provider])}
                    />
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
                <p>Выберите папку Telegram Desktop или рабочую папку. Файлы читаются с датой изменения и в реестре выводятся от новых к старым.</p>
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
                    <IntegrationTestActions
                      provider={provider}
                      tag={testTags[provider] ?? ""}
                      onTagChange={(value) => setTestTags((current) => ({ ...current, [provider]: value }))}
                      onImportTestFile={(mode) => onImportTestFile(provider, user.id, mode, testTags[provider])}
                    />
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

function IntegrationTestActions({
  provider,
  tag,
  onTagChange,
  onImportTestFile,
}: {
  provider: IntegrationProvider;
  tag: string;
  onTagChange: (value: string) => void;
  onImportTestFile: (mode: "tagged" | "untagged") => void;
}) {
  return (
    <div className="integration-demo-actions">
      <label className="integration-tag-control">
        <span>Тег в имени файла</span>
        <input
          value={tag}
          onChange={(event) => onTagChange(event.currentTarget.value)}
          placeholder="АР / КР / ПЗ"
          aria-label={`Тег тестового файла ${providerLabels[provider]}`}
        />
      </label>
      <button onClick={() => onImportTestFile("tagged")}>Прислать с тегом</button>
      <button className="ghost-action" onClick={() => onImportTestFile("untagged")}>Прислать без тега</button>
    </div>
  );
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
