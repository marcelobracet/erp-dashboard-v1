/**
 * SSO via Keycloak foi removido. Autenticação agora é via JWT (email + senha).
 * Mantemos o export para compatibilidade com imports existentes.
 */
export function isSsoEnabled(): boolean {
  return false;
}
