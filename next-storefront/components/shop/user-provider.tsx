"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  registerAction,
  signInAction,
  signOutAction,
} from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/cmssy/session";

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
          const result = await signInAction(identity, password);
          if (result.ok && result.user) setUser(result.user);
          return { ok: result.ok, message: result.message };
        } finally {
          setLoading(false);
        }
      },
      register: async (identity, password, fields = {}) => {
        setLoading(true);
        try {
          const result = await registerAction(identity, password, fields);
          return { ok: result.ok, message: result.message };
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {

        setUser(null);
        await signOutAction();
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
