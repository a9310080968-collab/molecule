import { Building2, HardHat, LockKeyhole, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { demoAccessByRole } from "../lib/demoAccess";
import { useI18n } from "../lib/i18n";
import type { DemoUserRole, ProjectParticipant } from "../types";

type DemoLoginProps = {
  accounts: Record<DemoUserRole, ProjectParticipant | undefined>;
  initialRole: DemoUserRole;
  onLogin: (role: DemoUserRole) => void;
};

const roles: DemoUserRole[] = ["employee", "gip", "director"];
const roleIcons = {
  employee: HardHat,
  gip: ShieldCheck,
  director: Building2,
};

export function DemoLogin({ accounts, initialRole, onLogin }: DemoLoginProps) {
  const { language, t } = useI18n();
  const [role, setRole] = useState<DemoUserRole>(initialRole);
  const [email, setEmail] = useState(accounts[initialRole]?.email ?? "");
  const [password, setPassword] = useState("demo");
  const account = accounts[role];

  useEffect(() => {
    setEmail(accounts[role]?.email ?? "");
  }, [accounts, role]);

  return (
    <div className="demo-login-shell">
      <div className="cosmos-backdrop" />
      <main className="demo-login-panel glass-panel">
        <header>
          <div className="demo-login-brand">
            <span><UserRound size={18} /></span>
            <div>
              <b>{t("Молекула")}</b>
              <small>{t("Демо-доступ")}</small>
            </div>
          </div>
          <h1>{t("Вход в систему")}</h1>
        </header>

        <div className="demo-role-selector" role="tablist" aria-label={t("Роль пользователя")}>
          {roles.map((item) => {
            const Icon = roleIcons[item];
            const profile = accounts[item];
            return (
              <button
                key={item}
                type="button"
                className={role === item ? "active" : ""}
                onClick={() => setRole(item)}
                role="tab"
                aria-selected={role === item}
              >
                <Icon size={18} />
                <span>{t(demoAccessByRole[item].label)}</span>
                <small>{profile?.name ?? t("Профиль недоступен")}</small>
              </button>
            );
          })}
        </div>

        <form
          className="demo-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (account && email.trim() && password) {
              onLogin(role);
            }
          }}
        >
          <div className="demo-login-account">
            <span>{account?.avatarUrl ? <img src={account.avatarUrl} alt="" /> : getInitials(account?.name ?? "")}</span>
            <div>
              <strong>{account?.name ?? t("Нет пользователя")}</strong>
              <small>{account?.position ?? t(demoAccessByRole[role].scopeLabel)}</small>
            </div>
          </div>
          <label>
            <span>{t("Логин")}</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} autoComplete="username" />
          </label>
          <label>
            <span>{t("Пароль")}</span>
            <div className="demo-password-field">
              <LockKeyhole size={16} />
              <input type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} autoComplete="current-password" />
            </div>
          </label>
          <button className="demo-login-submit" type="submit" disabled={!account || !email.trim() || !password}>
            <LogIn size={17} />
            {t("Войти как {role}", { role: t(demoAccessByRole[role].label).toLocaleLowerCase(language === "en" ? "en-US" : "ru-RU") })}
          </button>
        </form>
      </main>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
