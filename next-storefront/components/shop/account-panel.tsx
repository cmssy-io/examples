"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/cart-provider";
import { useCmssyUser } from "@/components/shop/user-provider";
import { Button } from "./ui/button";
import { useShopCopy } from "./locale-ui";
import styles from "./order.module.css";
import auth from "./auth.module.css";

export function AccountPanel() {
  const copy = useShopCopy();
  const router = useRouter();
  const { user, signIn, register, signOut, loading } = useCmssyUser();
  const { merge } = useCart();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: "signin" | "signup") {

    setError(null);
    setMode(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await register(email, password, {
            company: String(form.get("company") ?? "").trim(),
            contactName: String(form.get("contactName") ?? "").trim(),
            vatId: String(form.get("vatId") ?? "").trim(),
          });

    if (!result.ok) {
      setError(result.message ?? copy.couldNotSignIn);
      return;
    }

    if (mode === "signup") {
      const signedIn = await signIn(email, password);
      if (!signedIn.ok) {
        setError(signedIn.message ?? copy.couldNotSignIn);
        return;
      }
    }

    await merge();

    router.refresh();
  }

  if (user) {
    return (
      <div className={styles.accountBar}>
        <div>
          <div className={styles.accountLabel}>{copy.account}</div>
          <div className={styles.accountEmail}>{user.email}</div>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
        >
          {copy.signOut}
        </Button>
      </div>
    );
  }

  const signIn_ = mode === "signin";

  return (
    <div className={auth.auth}>
      <div className={auth.brandPane}>
        <div className={auth.brandRow}>
          <span className={auth.brandMark} aria-hidden>
            M
          </span>
          <span className={auth.brandName}>MACHTEC</span>
        </div>
        <div>
          <h2 className={auth.pitchTitle}>{copy.authPitchTitle}</h2>
          <p className={auth.pitchText}>{copy.authPitchText}</p>
          <div className={auth.stats}>
            <div>
              <div className={auth.statValue}>24h</div>
              <div className={auth.statLabel}>{copy.statDispatch}</div>
            </div>
            <div>
              <div className={auth.statValue}>Net 30</div>
              <div className={auth.statLabel}>{copy.statCreditTerms}</div>
            </div>
            <div>
              <div className={auth.statValue}>1,800+</div>
              <div className={auth.statLabel}>{copy.statTradeAccounts}</div>
            </div>
          </div>
        </div>
        <div className={auth.legal}>© 2026 MACHTEC Industrial Parts</div>
      </div>

      <div className={auth.formPane}>
        <div className={auth.formInner}>
          <div className={auth.tabs}>
            <button
              type="button"
              className={`${auth.tab} ${signIn_ ? auth.tabActive : ""}`}
              onClick={() => switchMode("signin")}
            >
              {copy.signInTab}
            </button>
            <button
              type="button"
              className={`${auth.tab} ${!signIn_ ? auth.tabActive : ""}`}
              onClick={() => switchMode("signup")}
            >
              {copy.requestTab}
            </button>
          </div>

          <h2 className={auth.formTitle}>
            {signIn_ ? copy.signInTitle : copy.requestAccountTitle}
          </h2>
          <p className={auth.formLead}>
            {signIn_ ? copy.signInLead : copy.requestAccountLead}
          </p>

          {error ? (
            <div className={auth.errorBox}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <div>{error}</div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className={signIn_ ? auth.grid : auth.gridTwo}>
              <div className={auth.full}>
                <label className="shop-label" htmlFor="email">
                  {copy.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="shop-input"
                />
              </div>
              <div className={auth.full}>
                <label className="shop-label" htmlFor="password">
                  {copy.password}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="shop-input"
                />
              </div>

              {!signIn_ ? (
                <>
                  <div className={auth.full}>
                    <label className="shop-label" htmlFor="company">
                      {copy.company}
                    </label>
                    <input id="company" name="company" className="shop-input" />
                  </div>
                  <div>
                    <label className="shop-label" htmlFor="contactName">
                      {copy.contactName}
                    </label>
                    <input
                      id="contactName"
                      name="contactName"
                      className="shop-input"
                    />
                  </div>
                  <div>
                    <label className="shop-label" htmlFor="vatId">
                      {copy.vatId}
                    </label>
                    <input id="vatId" name="vatId" className="shop-input" />
                  </div>
                </>
              ) : null}

              <div className={auth.full}>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  style={{ width: "100%" }}
                >
                  {signIn_ ? copy.signIn : copy.createAccount}
                </Button>
              </div>
            </div>
          </form>

          <div className={auth.switch}>
            {signIn_ ? copy.needAnAccount : copy.haveAnAccount}{" "}
            <button
              type="button"
              className={auth.switchLink}
              onClick={() => switchMode(signIn_ ? "signup" : "signin")}
            >
              {signIn_ ? copy.requestTab : copy.signInTab} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
