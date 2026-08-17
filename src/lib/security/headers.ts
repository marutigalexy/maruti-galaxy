export type SecurityHeaderContext = {
  production: boolean;
  supabaseUrl?: string;
};

export type NextHeader = {
  key: string;
  value: string;
};

function supabaseConnectSources(supabaseUrl?: string): string[] {
  if (!supabaseUrl) {
    return [];
  }
  try {
    const parsed = new URL(supabaseUrl);
    const websocket =
      parsed.protocol === "https:" ? `wss://${parsed.host}` : `ws://${parsed.host}`;
    return [parsed.origin, websocket];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy(supabaseUrl?: string): string {
  const connect = ["'self'", ...supabaseConnectSources(supabaseUrl)].join(" ");
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function cspHeaderName(production: boolean): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return production ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

export function buildSecurityHeaderMap(context: SecurityHeaderContext): Record<string, string> {
  const headers: Record<string, string> = {
    [cspHeaderName(context.production)]: buildContentSecurityPolicy(context.supabaseUrl),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  };
  if (context.production) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains";
  }
  return headers;
}

export function nextSecurityHeaders(context: SecurityHeaderContext): NextHeader[] {
  return Object.entries(buildSecurityHeaderMap(context)).map(([key, value]) => ({ key, value }));
}

export function applySecurityHeaders(headers: Headers, context: SecurityHeaderContext): void {
  for (const [key, value] of Object.entries(buildSecurityHeaderMap(context))) {
    headers.set(key, value);
  }
}
