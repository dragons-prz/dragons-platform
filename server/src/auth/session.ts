import type { AuthSession } from "@dragons/shared";
import { jwtVerify, SignJWT } from "jose";

import type { AppEnv } from "../config/env.js";

export const SESSION_COOKIE_NAME = "dragons_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 horas

function secretKey(env: AppEnv): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret);
}

/** Assina um JWT de sessao contendo os dados minimos exibidos na UI. */
export async function signSessionToken(env: AppEnv, session: AuthSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey(env));
}

/** Valida e decodifica o JWT de sessao. Retorna `null` se invalido/expirado. */
export async function verifySessionToken(env: AppEnv, token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env));
    return {
      id: String(payload.id),
      username: String(payload.username),
      avatarUrl: payload.avatarUrl === null ? null : String(payload.avatarUrl),
      isFounder: Boolean(payload.isFounder),
      isAdmin: Boolean(payload.isAdmin)
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;
