import type { AuthSession } from "@dragons/shared";
import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";

import type { AppEnv } from "../config/env.js";
import { exchangeCodeForToken, getOAuthUser } from "../discord/discord-client.js";
import { logger } from "../utils/logger.js";
import { authorizeUser, type AuthorizationDeniedReason } from "./authorize.js";
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  signSessionToken
} from "./session.js";

const OAUTH_STATE_COOKIE_NAME = "dragons_oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 5 * 60; // 5 minutos
const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";

function cdnAvatarUrl(userId: string, avatar: string | null): string | null {
  if (!avatar) return null;
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}`;
}

function buildAccessDeniedRedirect(clientOrigin: string, reason: string): string {
  return `${clientOrigin}/acesso-negado?motivo=${encodeURIComponent(reason)}`;
}

export function registerAuthRoutes(app: FastifyInstance, env: AppEnv): void {
  const secureCookies = env.nodeEnv === "production";

  app.get("/api/auth/discord", async (request, reply) => {
    const state = randomBytes(16).toString("hex");

    reply.setCookie(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      signed: true,
      path: "/api/auth",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS
    });

    logger.info("auth.login_started", { ip: request.ip });

    const authorizeUrl = new URL(DISCORD_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", env.discordClientId);
    authorizeUrl.searchParams.set("redirect_uri", env.discordRedirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "identify");
    authorizeUrl.searchParams.set("state", state);

    return reply.redirect(authorizeUrl.toString());
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/api/auth/discord/callback",
    async (request, reply) => {
      const { code, state, error } = request.query;

      const denyLogin = (reason: AuthorizationDeniedReason | "oauth_error" | "state_mismatch") => {
        logger.warn("auth.login_denied", { reason });
        reply.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: "/api/auth" });
        return reply.redirect(buildAccessDeniedRedirect(env.clientOrigin, reason));
      };

      if (error) {
        return denyLogin("oauth_error");
      }

      const signedState = request.cookies[OAUTH_STATE_COOKIE_NAME];
      const unsigned = signedState ? reply.unsignCookie(signedState) : null;
      const validState = unsigned?.valid ? unsigned.value : null;

      if (!code || !state || !validState || validState !== state) {
        return denyLogin("state_mismatch");
      }

      reply.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: "/api/auth" });

      try {
        const { accessToken } = await exchangeCodeForToken(env, code);
        const discordUser = await getOAuthUser(accessToken);

        const authorization = await authorizeUser(env, discordUser.id);
        if (!authorization.authorized) {
          logger.warn("auth.login_denied", {
            userId: discordUser.id,
            reason: authorization.reason
          });
          return reply.redirect(buildAccessDeniedRedirect(env.clientOrigin, authorization.reason));
        }

        const session: AuthSession = {
          id: discordUser.id,
          username: discordUser.username,
          avatarUrl: cdnAvatarUrl(discordUser.id, discordUser.avatar),
          isFounder: authorization.isFounder,
          isAdmin: authorization.isAdmin
        };

        const token = await signSessionToken(env, session);
        reply.setCookie(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: secureCookies,
          path: "/",
          maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
        });

        logger.info("auth.login_completed", {
          userId: session.id,
          username: session.username,
          isFounder: session.isFounder,
          isAdmin: session.isAdmin
        });

        return reply.redirect(env.clientOrigin);
      } catch (caught) {
        logger.error("auth.login_failed", caught);
        return denyLogin("oauth_error");
      }
    }
  );

  app.post("/api/auth/logout", async (request, reply) => {
    logger.info("auth.logout", { userId: request.authSession?.id ?? null });
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/api/auth/me", async (request, reply) => {
    if (!request.authSession) {
      return reply.code(401).send({ error: "unauthenticated" });
    }

    return reply.send(request.authSession);
  });
}
