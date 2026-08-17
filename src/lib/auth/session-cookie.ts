export function sessionCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: nodeEnv === "production",
  };
}
