export interface BackendEndpoints {
  httpUrl: string;
  wsUrl: string;
}

function hasProtocol(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^wss?:\/\//i.test(value);
}

export function getBackendEndpoints(
  rawValue?: string,
  defaultPort = 5000,
): BackendEndpoints | null {
  const value = rawValue?.trim();
  if (!value) return null;

  try {
    if (/^wss?:\/\//i.test(value)) {
      const ws = new URL(value);
      if (!ws.port) ws.port = String(defaultPort);

      const http = new URL(ws.toString());
      http.protocol = ws.protocol === "wss:" ? "https:" : "http:";

      return {
        wsUrl: ws.toString().replace(/\/$/, ""),
        httpUrl: http.toString().replace(/\/$/, ""),
      };
    }

    if (/^https?:\/\//i.test(value)) {
      const http = new URL(value);
      if (!http.port) http.port = String(defaultPort);

      const ws = new URL(http.toString());
      ws.protocol = http.protocol === "https:" ? "wss:" : "ws:";

      return {
        wsUrl: ws.toString().replace(/\/$/, ""),
        httpUrl: http.toString().replace(/\/$/, ""),
      };
    }

    const normalizedHost = hasProtocol(value) ? value : `http://${value}`;
    const http = new URL(normalizedHost);
    if (!http.port) http.port = String(defaultPort);

    const ws = new URL(http.toString());
    ws.protocol = http.protocol === "https:" ? "wss:" : "ws:";

    return {
      wsUrl: ws.toString().replace(/\/$/, ""),
      httpUrl: http.toString().replace(/\/$/, ""),
    };
  } catch {
    return null;
  }
}
