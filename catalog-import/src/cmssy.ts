export interface CmssyConfig {
  apiUrl: string;
  token: string;
  workspaceId: string;
}

export interface CallStats {
  calls: number;
  throttled: number;
  waitedMs: number;
}

interface GraphQLAnswer<T> {
  data?: T | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

const MAX_ATTEMPTS = 5;

export function createClient(
  config: CmssyConfig,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  send: typeof fetch = fetch,
) {
  const stats: CallStats = { calls: 0, throttled: 0, waitedMs: 0 };

  async function request<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      stats.calls += 1;
      const response = await send(config.apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.token}`,
          "x-workspace-id": config.workspaceId,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (response.status === 429 && attempt < MAX_ATTEMPTS) {
        const seconds = retryAfterSeconds(response.headers.get("retry-after"));
        stats.throttled += 1;
        stats.waitedMs += seconds * 1000;
        await sleep(seconds * 1000);
        continue;
      }

      const answer = (await response.json()) as GraphQLAnswer<T>;
      if (answer.errors?.length) {
        throw new Error(answer.errors.map((e) => e.message).join("; "));
      }
      if (!answer.data) {
        throw new Error(`Empty answer (HTTP ${response.status})`);
      }
      return answer.data;
    }
  }

  return { request, stats };
}

export type CmssyClient = ReturnType<typeof createClient>;

export function retryAfterSeconds(header: string | null): number {
  const seconds = header === null || header.trim() === "" ? Number.NaN : Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 1;
}
