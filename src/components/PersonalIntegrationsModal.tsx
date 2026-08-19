import { Camera, FolderOpen, KeyRound, LogOut, Mail, MessageCircle, RefreshCw, Save, ShieldCheck, Trash2, UserRoundCog, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoAccess } from "../lib/demoAccess";
import type { DemoProject, DemoUserRole, IntegrationProvider, UserIntegration, ProjectParticipant } from "../types";
import { useI18n } from "../lib/i18n";

type PersonalIntegrationsModalProps = {
  project: DemoProject;
  user: ProjectParticipant;
  role: DemoUserRole;
  access: DemoAccess;
  allowRoleChange?: boolean;
  pilotSession?: boolean;
  integrationsEnabled?: boolean;
  onClose: () => void;
  onRoleChange?: (role: DemoUserRole) => void;
  onLogout: () => void;
  onSaveProfile: (participantId: string, name: string, avatarUrl: string | undefined, email: string, phone: string) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void> | void;
  onSaveIntegrations: (participantId: string, integrations: UserIntegration[]) => void;
  onImportDemo: (provider: IntegrationProvider, participantId: string) => void;
  onImportTestFile: (provider: IntegrationProvider, participantId: string, mode: "tagged" | "untagged", tag?: string) => void;
  onImportFiles: (provider: IntegrationProvider, participantId: string, files: File[]) => void;
};

const mailProviders: IntegrationProvider[] = ["outlook", "yandex", "gmail"];
const folderProviders: IntegrationProvider[] = ["telegram", "folder"];
const demoRoles: DemoUserRole[] = ["employee", "gip", "director"];

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
  role,
  access,
  allowRoleChange = true,
  pilotSession = false,
  integrationsEnabled = true,
  onClose,
  onRoleChange,
  onLogout,
  onSaveProfile,
  onChangePassword,
  onSaveIntegrations,
  onImportDemo,
  onImportTestFile,
  onImportFiles,
}: PersonalIntegrationsModalProps) {
  const { t, system } = useI18n();
  const telegramInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [profileName, setProfileName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profilePhone, setProfilePhone] = useState(user.phone);
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [integrations, setIntegrations] = useState<UserIntegration[]>(() => normalizeIntegrations(user.integrations));
  const [accounts, setAccounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(normalizeIntegrations(user.integrations).map((integration) => [integration.provider, integration.account ?? user.email])),
  );
  const [testTags, setTestTags] = useState<Record<string, string>>({});
  const isPrivileged = access.canViewAll;

  const connectedCount = useMemo(() => integrations.filter((integration) => integration.status === "connected").length, [integrations]);

  useEffect(() => {
    setProfileName(user.name);
    setAvatarUrl(user.avatarUrl ?? "");
    setProfileEmail(user.email);
    setProfilePhone(user.phone);
    setProfileError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSecurityError("");
  }, [user.avatarUrl, user.email, user.id, user.name, user.phone]);

  async function handlePasswordChange() {
    const minimumLength = pilotSession ? 12 : 4;
    if (!currentPassword || newPassword.length < minimumLength) {
      setSecurityError(pilotSession ? "Use at least 12 characters for the new password." : "Укажите текущий и новый пароль от 4 символов.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Новые пароли не совпадают.");
      return;
    }
    try {
      await onChangePassword(currentPassword, newPassword);
      setSecurityError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "Could not update the password.");
    }
  }

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
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setProfileError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 512 * 1024) {
      setProfileError("The avatar must be smaller than 512 KB.");
      return;
    }
    setProfileError("");
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
              {t("Личный кабинет")}
            </span>
            <h2>{user.name}</h2>
            <p>
              {t(access.label)} · {t(access.scopeLabel)}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Закрыть настройки")}>
            <X size={20} />
          </button>
        </header>

        <section className="integration-summary">
          <article>
            <strong>{connectedCount}</strong>
            <span>{t("подключено")}</span>
          </article>
          <article>
            <strong>{project.inboxDocuments.length}</strong>
            <span>{t("во входящих")}</span>
          </article>
          <article>
            <strong>{isPrivileged ? t("Все") : t("Свои")}</strong>
            <span>{isPrivileged ? t("файлы видны админу/ГИП") : t("видимость по владельцу")}</span>
          </article>
        </section>

        <div className="integration-modal-body">
          <section className="demo-session-settings">
            <div className="section-title">
              <UserRoundCog size={18} />
              <div>
                <h3>{pilotSession ? "Account role" : t("Демо-роль")}</h3>
                <p>{user.position} · {user.email}</p>
              </div>
            </div>
            {allowRoleChange ? (
              <div className="personal-role-switch" role="group" aria-label={t("Демо-роль пользователя")}>
                {demoRoles.map((item) => (
                  <button
                    key={item}
                    className={item === role ? "active" : ""}
                    onClick={() => onRoleChange?.(item)}
                  >
                    {t(getDemoRoleLabel(item))}
                  </button>
                ))}
              </div>
            ) : <div className="personal-role-switch"><button className="active" disabled>{t(getDemoRoleLabel(role))}</button></div>}
            <button className="personal-logout" onClick={onLogout}>
              <LogOut size={16} />
              {t("Выйти")}
            </button>
          </section>

          <section className="personal-profile-settings">
            <div className="personal-profile-avatar">
              {avatarUrl ? <img src={avatarUrl} alt={t("Аватар пользователя")} /> : <span>{getInitials(profileName)}</span>}
              <button onClick={() => avatarInputRef.current?.click()}>
                <Camera size={16} />
                {t("Выбрать фото")}
              </button>
              {avatarUrl ? (
                <button className="danger" onClick={() => setAvatarUrl("")} aria-label={t("Удалить аватар")}>
                  <Trash2 size={15} />
                </button>
              ) : null}
              <input
                ref={avatarInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => handleAvatarSelect(event.currentTarget.files?.[0])}
              />
            </div>
            <div className="personal-profile-fields">
              <label>
                <span>{t("Имя пользователя")}</span>
                <input value={profileName} onChange={(event) => setProfileName(event.currentTarget.value)} />
              </label>
              <label>
                <span>{t("Логин / рабочая почта")}</span>
                <input type="email" value={profileEmail} disabled={pilotSession} onChange={(event) => setProfileEmail(event.currentTarget.value)} />
              </label>
              <label>
                <span>{t("Телефон")}</span>
                <input value={profilePhone} onChange={(event) => setProfilePhone(event.currentTarget.value)} />
              </label>
            </div>
            {profileError ? <small className="personal-profile-error" role="alert">{profileError}</small> : null}
            <button
              className="personal-profile-save"
              onClick={() => onSaveProfile(user.id, profileName, avatarUrl || undefined, profileEmail, profilePhone)}
              disabled={!profileName.trim() || !profileEmail.trim()}
            >
              <Save size={16} />
              {t("Сохранить профиль")}
            </button>
          </section>

          <section className="personal-security-settings">
            <div className="section-title">
              <KeyRound size={18} />
              <div>
                <h3>{t("Безопасность")}</h3>
                <p>{pilotSession ? "Server account password" : t("Пароль демо-аккаунта")}</p>
              </div>
            </div>
            <div className="personal-password-fields">
              <label>
                <span>{t("Текущий пароль")}</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.currentTarget.value)} />
              </label>
              <label>
                <span>{t("Новый пароль")}</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.currentTarget.value)} />
              </label>
              <label>
                <span>{t("Повторите пароль")}</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.currentTarget.value)} />
              </label>
            </div>
            <div className="personal-security-actions">
              {securityError ? <span>{t(securityError)}</span> : <span>{pilotSession ? "At least 12 characters with a letter and a number." : t("Демо: пароль не отправляется на сервер.")}</span>}
              <button onClick={handlePasswordChange}>
                <Save size={16} />
                {t("Обновить пароль")}
              </button>
            </div>
          </section>

          {integrationsEnabled ? <><section className="integration-section">
            <div className="section-title">
              <Mail size={18} />
              <div>
                <h3>{t("Почтовые сервисы")}</h3>
                <p>{t("Outlook, Яндекс и Gmail подключаются каждым пользователем в личных настройках.")}</p>
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
                        {t(providerLabels[provider])}
                      </span>
                      <em className={integration.status}>{t(getStatusLabel(integration.status))}</em>
                    </header>
                    <p>{t(providerDescriptions[provider])}</p>
                    <label>
                      <span>{t("Рабочий аккаунт")}</span>
                      <input
                        value={accounts[provider] ?? ""}
                        onChange={(event) => setAccounts((current) => ({ ...current, [provider]: event.currentTarget.value }))}
                        placeholder={user.email}
                      />
                    </label>
                    <footer>
                      {integration.status === "connected" ? (
                        <button onClick={() => handleDisconnect(provider)}>{t("Отключить")}</button>
                      ) : (
                        <button onClick={() => handleConnect(provider)}>{t("Подключить демо")}</button>
                      )}
                      {access.canUploadFiles ? (
                        <button className="ghost-action" onClick={() => onImportDemo(provider, user.id)}>
                          <RefreshCw size={15} />
                          {t("Сканировать демо")}
                        </button>
                      ) : null}
                    </footer>
                    {access.canUploadFiles ? (
                      <IntegrationTestActions
                        provider={provider}
                        tag={testTags[provider] ?? ""}
                        onTagChange={(value) => setTestTags((current) => ({ ...current, [provider]: value }))}
                        onImportTestFile={(mode) => onImportTestFile(provider, user.id, mode, testTags[provider])}
                      />
                    ) : null}
                    {integration.lastSyncAt ? <small>{t("Последняя проверка: {time}", { time: system(integration.lastSyncAt) })}</small> : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="integration-section">
            <div className="section-title">
              <FolderOpen size={18} />
              <div>
                <h3>{t("Папки мессенджеров и файлов")}</h3>
                <p>{t("Выберите папку Telegram Desktop или рабочую папку. Файлы читаются с датой изменения и в реестре выводятся от новых к старым.")}</p>
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
                        {t(providerLabels[provider])}
                      </span>
                      <em className={integration.status}>{t(getStatusLabel(integration.status))}</em>
                    </header>
                    <p>{t(providerDescriptions[provider])}</p>
                    <div className="folder-path-preview">{integration.folderPath ?? t("Папка не выбрана")}</div>
                    <footer>
                      {access.canUploadFiles ? <button onClick={() => inputRef.current?.click()}>{t("Выбрать папку")}</button> : null}
                      {access.canUploadFiles ? (
                        <button className="ghost-action" onClick={() => onImportDemo(provider, user.id)}>
                          <RefreshCw size={15} />
                          {t("Сканировать демо")}
                        </button>
                      ) : null}
                    </footer>
                    {access.canUploadFiles ? (
                      <IntegrationTestActions
                        provider={provider}
                        tag={testTags[provider] ?? ""}
                        onTagChange={(value) => setTestTags((current) => ({ ...current, [provider]: value }))}
                        onImportTestFile={(mode) => onImportTestFile(provider, user.id, mode, testTags[provider])}
                      />
                    ) : null}
                    <input
                      ref={inputRef}
                      className="hidden-file-input"
                      type="file"
                      multiple
                      onChange={(event) => handleFolderSelect(provider, event.currentTarget.files)}
                      {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                    />
                    {integration.lastSyncAt ? <small>{t("Последняя проверка: {time}", { time: system(integration.lastSyncAt) })}</small> : null}
                  </article>
                );
              })}
            </div>
          </section></> : (
            <section className="integration-section">
              <div className="section-title">
                <ShieldCheck size={18} />
                <div>
                  <h3>External integrations</h3>
                  <p>Connectors remain disabled until server-side OAuth and credential storage are configured.</p>
                </div>
              </div>
            </section>
          )}
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
  const { t } = useI18n();
  return (
    <div className="integration-demo-actions">
      <label className="integration-tag-control">
        <span>{t("Тег в имени файла")}</span>
        <input
          value={tag}
          onChange={(event) => onTagChange(event.currentTarget.value)}
          placeholder={t("АР / КР / ПЗ")}
          aria-label={t("Тег тестового файла {provider}", { provider: t(providerLabels[provider]) })}
        />
      </label>
      <button onClick={() => onImportTestFile("tagged")}>{t("Прислать с тегом")}</button>
      <button className="ghost-action" onClick={() => onImportTestFile("untagged")}>{t("Прислать без тега")}</button>
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

function getDemoRoleLabel(role: DemoUserRole) {
  if (role === "employee") {
    return "Сотрудник";
  }
  if (role === "gip") {
    return "ГИП";
  }
  return "Директор";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
