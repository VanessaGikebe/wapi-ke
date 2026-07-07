/**
 * Thin fetch wrapper for the backend API.
 *
 * - Always sends `credentials: "include"` so the httpOnly refresh cookie rides
 *   along automatically (set/cleared by the browser).
 * - Attaches the access token (held in memory only — never localStorage) as a
 *   Bearer header. The auth store calls {@link setAccessToken} on login/refresh.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

let accessToken: string | null = null;

/** Update the in-memory access token used for the Authorization header. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Pre-encoded query string (without the leading "?"). */
  query?: string;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, headers = {} } = options;
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        // FastAPI/Pydantic validation errors arrive as [{loc, msg, type}, …].
        // Surface a readable "field: reason" list instead of the opaque
        // "Unprocessable Content" status text.
        message = data.detail
          .map((err: { loc?: unknown[]; msg?: string }) => {
            const field = Array.isArray(err.loc)
              ? err.loc[err.loc.length - 1]
              : undefined;
            const reason = err.msg ?? "Invalid value";
            return field && field !== "body" ? `${field}: ${reason}` : reason;
          })
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? ((await response.json()) as T)
    : (undefined as T);
}
