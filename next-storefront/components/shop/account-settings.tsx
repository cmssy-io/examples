"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { MemberProfile } from "@/graphql/types";
import {
  changePasswordAction,
  deleteAccountAction,
  requestLoginChangeAction,
  updateProfileAction,
  type AccountActionResult,
} from "@/lib/actions/account";
import { looksLikeEmail, planAccountFields } from "@/lib/account-fields";
import { actionErrorMessage } from "@/lib/action-errors";
import { fill, type ShopCopy } from "@/lib/shop-copy";
import { useCart } from "./cart-provider";
import { useShopCopy } from "./locale-ui";
import { useCmssyUser } from "./user-provider";
import styles from "./account-settings.module.css";

type Submit = (
  form: FormData,
) => Promise<AccountActionResult & { done?: string }>;

function fieldLabel(key: string, copy: ShopCopy): string {
  return key in copy ? copy[key as keyof ShopCopy] : key;
}

function profileValue(previous: unknown, raw: string): unknown {
  if (typeof previous === "number") {
    return raw === "" ? null : Number(raw);
  }
  return raw;
}

function SettingsForm({
  title,
  submitLabel,
  submit,
  danger,
  children,
}: {
  title: string;
  submitLabel: string;
  submit: Submit;
  danger?: boolean;
  children: ReactNode;
}) {
  const copy = useShopCopy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await submit(new FormData(form));
      if (!result.ok) throw new Error(result.message);
      if (result.done) setNotice(result.done);
      form.reset();
    } catch (cause) {
      setError(actionErrorMessage(cause, copy.accountActionFailed));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={danger ? `${styles.section} ${styles.danger}` : styles.section}
      onSubmit={onSubmit}
    >
      <h2 className={styles.title}>{title}</h2>
      {children}
      {error ? <p className="shop-error">{error}</p> : null}
      {notice ? <p className="shop-muted">{notice}</p> : null}
      <div className={styles.actions}>
        <button
          type="submit"
          className={danger ? "shop-btn" : "shop-btn shop-btn-primary"}
          disabled={pending}
        >
          {pending ? copy.accountSaving : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Input({
  id,
  label,
  type = "text",
  defaultValue,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <>
      <label className="shop-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="shop-input"
        defaultValue={defaultValue}
        autoComplete={type === "password" ? "off" : undefined}
        required={required || type === "password" || type === "email"}
      />
    </>
  );
}

export function AccountSettings({ profile }: { profile: MemberProfile }) {
  const copy = useShopCopy();
  const router = useRouter();
  const { forget } = useCmssyUser();
  const { refresh } = useCart();
  const data = (profile.data ?? {}) as Record<string, unknown>;
  const { profileKeys, loginKey, passwordKey } = planAccountFields(profile);

  return (
    <div className={styles.settings}>
      {profileKeys.length > 0 ? (
        <SettingsForm
          title={copy.profileDetails}
          submitLabel={copy.saveProfile}
          submit={async (form) => {
            const fields = Object.fromEntries(
              profileKeys.map((key) => [
                key,
                profileValue(
                  data[key],
                  String(form.get(`profile-${key}`) ?? "").trim(),
                ),
              ]),
            );
            const result = await updateProfileAction(fields);
            router.refresh();
            return { ...result, done: copy.profileSaved };
          }}
        >
          {profileKeys.map((key) => (
            <Input
              key={key}
              id={`profile-${key}`}
              label={fieldLabel(key, copy)}
              type={typeof data[key] === "number" ? "number" : "text"}
              defaultValue={data[key] == null ? "" : String(data[key])}
            />
          ))}
        </SettingsForm>
      ) : null}

      {loginKey ? (
        <SettingsForm
          title={copy.changeLogin}
          submitLabel={copy.sendConfirmation}
          submit={async (form) => {
            const newLogin = String(form.get("new-login") ?? "").trim();
            const result = await requestLoginChangeAction(
              newLogin,
              String(form.get("login-password") ?? ""),
            );
            router.refresh();
            return {
              ...result,
              done: fill(copy.loginChangeSent, { login: newLogin }),
            };
          }}
        >
          <p className="shop-muted">
            {copy.currentLogin}: {profile.login}
            {profile.pendingLogin ? (
              <>
                <br />
                {fill(copy.loginPending, { login: profile.pendingLogin })}
              </>
            ) : null}
          </p>
          <Input
            id="new-login"
            label={copy.newLogin}
            type={looksLikeEmail(profile.login) ? "email" : "text"}
            required
          />
          <Input
            id="login-password"
            label={copy.currentPassword}
            type="password"
          />
        </SettingsForm>
      ) : null}

      {passwordKey ? (
        <SettingsForm
          title={copy.changePassword}
          submitLabel={copy.changePassword}
          submit={async (form) => {
            const result = await changePasswordAction(
              String(form.get("current-password") ?? ""),
              String(form.get("new-password") ?? ""),
            );
            return { ...result, done: copy.passwordChanged };
          }}
        >
          <Input
            id="current-password"
            label={copy.currentPassword}
            type="password"
          />
          <Input id="new-password" label={copy.newPassword} type="password" />
        </SettingsForm>
      ) : null}

      <SettingsForm
        title={copy.deleteAccount}
        submitLabel={copy.deleteAccount}
        danger
        submit={async (form) => {
          const result = await deleteAccountAction(
            String(form.get("delete-password") ?? ""),
          );
          if (result.ok) {
            forget();
            await refresh();
            router.refresh();
          }
          return result;
        }}
      >
        <p className="shop-muted">{copy.deleteAccountWarning}</p>
        <Input
          id="delete-password"
          label={copy.currentPassword}
          type="password"
        />
        <label className={styles.check}>
          <input type="checkbox" name="delete-confirm" required />
          {copy.deleteAccountConfirm}
        </label>
      </SettingsForm>
    </div>
  );
}
