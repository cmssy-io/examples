import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { actionErrorMessage } from "../../lib/action-errors";
import {
  registerAction,
  signInAction,
  signOutAction,
} from "../../lib/actions/auth";
import type { SessionUser } from "../../lib/cmssy/session-crypto";

export interface AuthResult {
  ok: boolean;
  message?: string;
}

export interface UserContextValue {
  user: SessionUser | null;
  loading: boolean;
  signIn(identity: string, password: string): Promise<AuthResult>;
  register(
    identity: string,
    password: string,
    fields?: Record<string, unknown>,
  ): Promise<AuthResult>;
  signOut(): Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

async function attempt(
  work: () => Promise<unknown>,
  fallback: string,
): Promise<AuthResult> {
  try {
    await work();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: actionErrorMessage(err, fallback) };
  }
}

export function UserProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: SessionUser | null;
}) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      signIn: async (identity, password) => {
        setLoading(true);
        try {
          return await attempt(
            () => signInAction(identity, password).then(setUser),
            "Sign in failed.",
          );
        } finally {
          setLoading(false);
        }
      },
      register: async (identity, password, fields = {}) => {
        setLoading(true);
        try {
          return await attempt(
            () => registerAction(identity, password, fields),
            "Registration failed.",
          );
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        setUser(null);
        try {
          await signOutAction();
        } catch {
          setUser(user);
        }
      },
    }),
    [user, loading],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCmssyUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useCmssyUser must be used within a UserProvider");
  }
  return context;
}
