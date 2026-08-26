/**
 * Tipo NOVO, exclusivo do painel — nao existe no bot (que nao tem sessao
 * de usuario). Formato compartilhado entre `server` (o que vai no JWT de
 * sessao e na resposta de `GET /api/auth/me`) e `client` (o que a UI
 * consome depois do login).
 */

export interface AuthSession {
  id: string;
  username: string;
  avatarUrl: string | null;
  isFounder: boolean;
  isAdmin: boolean;
}
