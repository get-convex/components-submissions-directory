import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ConnectUser = {
  email?: string;
  name?: string;
  pictureUrl?: string;
  sub?: string;
};

type ConnectAuthContextValue = {
  isLoading: boolean;
  user: ConnectUser | null;
  getAccessToken: () => Promise<string | null>;
  signIn: () => Promise<void>;
  signOut: () => void;
};

type StoredSession = {
  /** JWT for Convex (prefer id_token so `aud` matches auth.config). */
  token: string;
  /** OAuth access token; `sid` for WorkOS logout is here, not always on id_token. */
  accessToken?: string;
  expiresAtMs?: number;
  user: ConnectUser | null;
};

const SESSION_KEY = "connectAuthSession";
const PKCE_VERIFIER_KEY = "connectPkceVerifier";
const OAUTH_STATE_KEY = "connectOauthState";
const RETURN_PATH_KEY = "authReturnPath";

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

const ConnectAuthContext = createContext<ConnectAuthContextValue | null>(null);

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

/** `sid` from access token JWT; WorkOS may use `session_id` in some tokens. */
function sidFromJwt(jwt: string | undefined): string | undefined {
  if (!jwt) return undefined;
  const payload = parseJwtPayload(jwt);
  if (!payload) return undefined;
  const sid = payload.sid ?? payload.session_id;
  if (typeof sid === "string") return sid;
  if (typeof sid === "number") return String(sid);
  return undefined;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromToken(token: string): {
  user: ConnectUser | null;
  expiresAtMs?: number;
} {
  const payload = parseJwtPayload(token);
  if (!payload) return { user: null };

  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const expiresAtMs = exp ? exp * 1000 : undefined;

  return {
    user: {
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      pictureUrl:
        typeof payload.picture === "string" ? payload.picture : undefined,
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
    },
    expiresAtMs,
  };
}

function getRequiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getWorkosDomain(): string {
  const raw = getRequiredEnv(
    "VITE_WORKOS_AUTHKIT_DOMAIN",
    import.meta.env.VITE_WORKOS_AUTHKIT_DOMAIN as string | undefined
  ).trim();
  const withoutProtocol = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return withoutProtocol;
}

export function ConnectAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<StoredSession | null>(null);

  const persistSession = useCallback((next: StoredSession | null) => {
    setSession(next);
    if (!next) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }, []);

  const signOut = useCallback(() => {
    // Prefer localStorage so we still have JWTs if React state is stale (and merge with session).
    const effective = readStoredSession() ?? session;
    const sessionId =
      sidFromJwt(effective?.accessToken) ?? sidFromJwt(effective?.token);

    persistSession(null);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);

    const returnToRaw = import.meta.env.VITE_WORKOS_LOGOUT_RETURN_TO as
      | string
      | undefined;
    // Omit return_to to use the default from WorkOS Dashboard (helps if dynamic URL is not allowlisted).
    const returnTo =
      returnToRaw === "default"
        ? undefined
        : returnToRaw?.trim() || `${window.location.origin}/components`;

    if (sessionId) {
      const logoutUrl = new URL(
        "https://api.workos.com/user_management/sessions/logout"
      );
      logoutUrl.searchParams.set("session_id", sessionId);
      if (returnTo) {
        logoutUrl.searchParams.set("return_to", returnTo);
      }
      window.location.assign(logoutUrl.toString());
    } else {
      // No JWTs (e.g. storage was cleared): app session is gone but WorkOS SSO cookies may remain.
      // User must sign in again to get tokens, then sign out — or clear site cookies for WorkOS / AuthKit.
      window.location.assign(
        returnTo ?? `${window.location.origin}/components`
      );
    }
  }, [persistSession, session]);

  const signIn = useCallback(async () => {
    const clientId = getRequiredEnv(
      "VITE_WORKOS_CLIENT_ID",
      import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined
    );
    const redirectUri = getRequiredEnv(
      "VITE_WORKOS_REDIRECT_URI",
      import.meta.env.VITE_WORKOS_REDIRECT_URI as string | undefined
    );
    const domain = getWorkosDomain();

    const state = randomString(24);
    const verifier = randomString(48);
    const challenge = await sha256Base64Url(verifier);

    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

    const authUrl = new URL(`https://${domain}/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    window.location.assign(authUrl.toString());
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      const redirectUri = import.meta.env.VITE_WORKOS_REDIRECT_URI as
        | string
        | undefined;
      const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID as
        | string
        | undefined;

      if (!redirectUri || !clientId) {
        setIsLoading(false);
        return;
      }

      const current = new URL(window.location.href);
      const code = current.searchParams.get("code");
      const state = current.searchParams.get("state");
      const isCallbackRoute =
        current.pathname === new URL(redirectUri).pathname;

      // Handle callback exchange first
      if (isCallbackRoute && code) {
        try {
          const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
          const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
          if (
            !expectedState ||
            !verifier ||
            !state ||
            state !== expectedState
          ) {
            throw new Error("Invalid OAuth callback state");
          }

          const domain = getWorkosDomain();
          const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
          });

          const response = await fetch(`https://${domain}/oauth2/token`, {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          });
          if (!response.ok) {
            throw new Error(`Token exchange failed (${response.status})`);
          }

          const data = (await response.json()) as {
            access_token?: string;
            id_token?: string;
          };
          const accessToken = data.access_token;
          const idToken = data.id_token;
          // Convex expects the id_token JWT (aud matches client); access_token can differ.
          const token = idToken ?? accessToken;
          if (!token) {
            throw new Error("Token response missing JWT token");
          }

          const profile = userFromToken(idToken ?? accessToken ?? token);
          const expiry = userFromToken(token);
          persistSession({
            token,
            accessToken: data.access_token,
            expiresAtMs: expiry.expiresAtMs,
            user: profile.user,
          });
        } catch {
          persistSession(null);
        } finally {
          sessionStorage.removeItem(OAUTH_STATE_KEY);
          sessionStorage.removeItem(PKCE_VERIFIER_KEY);
          setIsLoading(false);

          const returnPath =
            localStorage.getItem(RETURN_PATH_KEY) || "/components/submit";
          localStorage.removeItem(RETURN_PATH_KEY);
          window.location.replace(returnPath);
        }
        return;
      }

      // Normal boot from local storage session
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setIsLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredSession;
        if (
          parsed.expiresAtMs &&
          Number.isFinite(parsed.expiresAtMs) &&
          parsed.expiresAtMs <= Date.now()
        ) {
          persistSession(null);
        } else {
          setSession(parsed);
        }
      } catch {
        persistSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    void hydrate();
  }, [persistSession]);

  const getAccessToken = useCallback(async () => {
    if (!session?.token) return null;
    if (session.expiresAtMs && session.expiresAtMs <= Date.now()) {
      persistSession(null);
      return null;
    }
    return session.token;
  }, [persistSession, session]);

  const value = useMemo<ConnectAuthContextValue>(
    () => ({
      isLoading,
      user: session?.user ?? null,
      getAccessToken,
      signIn,
      signOut,
    }),
    [getAccessToken, isLoading, session?.user, signIn, signOut]
  );

  return (
    <ConnectAuthContext.Provider value={value}>
      {children}
    </ConnectAuthContext.Provider>
  );
}

export function useConnectAuth() {
  const context = useContext(ConnectAuthContext);
  if (!context) {
    throw new Error("useConnectAuth must be used inside ConnectAuthProvider");
  }
  return context;
}
