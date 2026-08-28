const SESSION_COOKIE = "softly_session";

export function getSessionId(cookieHeader?: string): string | undefined {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  return cookie?.slice(`${SESSION_COOKIE}=`.length);
}