// Drop-in replacement for @supabase/supabase-js client.
// Mirrors the subset of the API the app actually uses:
//   - supabase.auth.getSession / onAuthStateChange / signUp / signInWithPassword / signOut
//   - supabase.from(table).select().eq().order().gte().limit().maybeSingle()
//   - supabase.from(table).insert(...)
//   - supabase.from(table).update(...).eq(...)
//   - supabase.from(table).delete().eq(...)
//   - supabase.rpc(name, args)

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000';

const ACCESS_KEY = 'hm_access_token';
const REFRESH_KEY = 'hm_refresh_token';
const USER_KEY = 'hm_user';

interface User { id: string; email: string }
interface Session { user: User; access_token: string; refresh_token: string }
interface AuthResponse { data: { user: User | null; session: Session | null }; error: { message: string } | null }

function getAccess(): string | null { return localStorage.getItem(ACCESS_KEY); }
function getRefresh(): string | null { return localStorage.getItem(REFRESH_KEY); }
function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}
function setSession(access: string, refresh: string, user: User): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

type Listener = (event: string, session: Session | null) => void;
const listeners: Listener[] = [];

function notify(event: string, session: Session | null): void {
  for (const l of listeners) l(event, session);
}

async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const access = getAccess();
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && getRefresh()) {
    const r = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: getRefresh() }),
    });
    if (r.ok) {
      const data = await r.json() as { session: Session };
      setSession(data.session.access_token, data.session.refresh_token, data.session.user);
      headers.set('Authorization', `Bearer ${data.session.access_token}`);
      const retry = await fetch(`${API_URL}${path}`, { ...init, headers });
      if (!retry.ok) throw await toError(retry);
      return retry.json() as Promise<T>;
    } else {
      clearSession();
      notify('SIGNED_OUT', null);
    }
  }
  if (!res.ok) throw await toError(res);
  return res.json() as Promise<T>;
}

async function toError(res: Response): Promise<Error> {
  let body: { error?: string } = {};
  try { body = (await res.json()) as { error?: string }; } catch { /* response had no JSON body */ }
  const err = new Error(body.error || res.statusText) as Error & { status?: number };
  err.status = res.status;
  return err;
}

export const auth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
    const user = getUser();
    if (!user || !getAccess()) return { data: { session: null }, error: null };
    return { data: { session: { user, access_token: getAccess() as string, refresh_token: (getRefresh() as string) || '' } }, error: null };
  },

  onAuthStateChange(cb: Listener): { data: { subscription: { unsubscribe: () => void } } } {
    listeners.push(cb);
    setTimeout(() => {
      const u = getUser();
      cb(getUser() ? 'INITIAL_SESSION' : 'SIGNED_OUT', u ? { user: u, access_token: getAccess() || '', refresh_token: getRefresh() || '' } : null);
    }, 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const i = listeners.indexOf(cb);
            if (i >= 0) listeners.splice(i, 1);
          },
        },
      },
    };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }): Promise<AuthResponse> {
    try {
      const data = await api<{ user: User; session: Session }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: options?.data?.full_name }),
      });
      setSession(data.session.access_token, data.session.refresh_token, data.user);
      notify('SIGNED_IN', { user: data.user, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      return { data: { user: data.user, session: data.session }, error: null };
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: (e as Error).message } };
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const data = await api<{ user: User; session: Session }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.session.access_token, data.session.refresh_token, data.user);
      notify('SIGNED_IN', { user: data.user, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      return { data: { user: data.user, session: data.session }, error: null };
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: (e as Error).message } };
    }
  },

  async signOut(): Promise<void> {
    try { await api('/auth/signout', { method: 'POST' }); } catch { /* best-effort */ }
    clearSession();
    notify('SIGNED_OUT', null);
  },
};

export interface QueryResult<T> { data: T; error: { message: string } | null }

class QueryBuilder<T = any> implements PromiseLike<QueryResult<T | T[] | null>> {
  private filters: Record<string, string> = {};
  private orderCol?: string;
  private ascending = true;
  private limitN?: number;
  private selectCols = '*';
  private singleResult = false;
  private maybe = false;

  constructor(private readonly table: string, private readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE', private readonly body?: T) {}

  select(cols = '*'): this { this.selectCols = cols; return this; }
  eq(col: string, val: unknown): this { this.filters[col] = `eq:${val as string}`; return this; }
  gte(col: string, val: unknown): this { this.filters[`${col}_gte`] = String(val); return this; }
  lte(col: string, val: unknown): this { this.filters[`${col}_lte`] = String(val); return this; }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col; this.ascending = opts?.ascending !== false; return this;
  }
  limit(n: number): this { this.limitN = n; return this; }
  single(): this { this.singleResult = true; return this; }
  maybeSingle(): this { this.maybe = true; return this; }

  private buildUrl(): string {
    const params = new URLSearchParams();
    if (this.method === 'GET') {
      if (this.selectCols !== '*') params.set('select', this.selectCols);
      if (this.orderCol) { params.set('order', this.orderCol); params.set('ascending', String(this.ascending)); }
      if (this.limitN !== undefined) params.set('limit', String(this.limitN));
    }
    // PATCH and DELETE must preserve their .eq() constraints too; otherwise a
    // single-record action could affect every record owned by the user.
    for (const [k, v] of Object.entries(this.filters)) params.set(k, v);
    const q = params.toString();
    return `/rest/v1/${this.table}${q ? '?' + q : ''}`;
  }

  then<R1 = QueryResult<T | T[] | null>, R2 = never>(
    onFulfilled?: ((value: QueryResult<T | T[] | null>) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.exec().then(onFulfilled ?? undefined, onRejected ?? undefined);
  }

  private async exec(): Promise<QueryResult<T | T[] | null>> {
    try {
      if (this.method === 'POST') {
        const data = await api<unknown>(`/rest/v1/${this.table}`, { method: 'POST', body: JSON.stringify(this.body) });
        if (data == null) {
          if (this.singleResult || this.maybe) return { data: null, error: null };
          return { data: [], error: null };
        }
        const arr = Array.isArray(data) ? (data as T[]) : [data as T];
        if (this.singleResult || this.maybe) return { data: arr[0] ?? null, error: null };
        return { data: arr, error: null };
      }
      if (this.method === 'PATCH') {
        const data = await api<{ data: T[] }>(this.buildUrl(), { method: 'PATCH', body: JSON.stringify(this.body) });
        return { data: (data.data ?? []) as unknown as T[], error: null };
      }
      if (this.method === 'DELETE') {
        await api(this.buildUrl(), { method: 'DELETE' });
        return { data: [], error: null };
      }
      const data = await api<{ data: T[] }>(this.buildUrl());
      if (this.singleResult || this.maybe) return { data: data.data?.[0] ?? null, error: null };
      return { data: data.data ?? [], error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
}

export const supabase = {
  auth,
  from<T = any>(table: string) {
    return {
      select: (cols = '*') => new QueryBuilder<T>(table, 'GET').select(cols),
      insert: (body: T) => new QueryBuilder<T>(table, 'POST', body),
      upsert: (body: T) => new QueryBuilder<T>(table, 'POST', body),
      update: (body: Partial<T>) => new QueryBuilder<T>(table, 'PATCH', body as T),
      delete: () => new QueryBuilder<T>(table, 'DELETE'),
    };
  },
  async rpc(name: string, args: Record<string, unknown> = {}): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      const data = await api(`/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });
      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  },
};

if (!import.meta.env.VITE_API_URL) {
  console.info('[supabase-compat] Using default API at', API_URL);
}
