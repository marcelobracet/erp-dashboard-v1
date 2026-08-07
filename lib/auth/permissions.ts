export type PermissionAction = "read" | "create" | "update" | "delete" | string;

export type Permission = {
  resource: string;
  actions: PermissionAction[];
};

export type RolePermissionsMap = Record<string, Permission[]>;

const CRUD: PermissionAction[] = ["read", "create", "update", "delete"];

const QUOTES_ADMIN_ACTIONS: PermissionAction[] = [...CRUD, "update_status"];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  admin: [
    { resource: "dashboard", actions: CRUD },
    { resource: "clients", actions: CRUD },
    { resource: "products", actions: [...CRUD, "export"] },
    { resource: "quotes", actions: QUOTES_ADMIN_ACTIONS },
    { resource: "users", actions: CRUD },
    { resource: "settings", actions: CRUD },
  ],
  // Alinhado a DefaultPermissions() da API (erp-api/internal/domain/auth).
  manager: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["read", "create", "update"] },
    { resource: "products", actions: ["read", "create", "update", "export"] },
    { resource: "quotes", actions: ["read", "create", "update", "update_status"] },
    { resource: "users", actions: ["read"] },
    { resource: "settings", actions: ["read"] },
  ],
  employee: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["read"] },
    { resource: "products", actions: ["read"] },
    { resource: "quotes", actions: ["read", "create", "update"] },
  ],
  // Alias legado (tokens antigos / NextAuth residue).
  user: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["read"] },
    { resource: "products", actions: ["read"] },
    { resource: "quotes", actions: ["read"] },
  ],
};

const SYSTEM_ROLE_PREFIXES = ["default-roles-"];
const SYSTEM_ROLES = new Set(["offline_access", "uma_authorization"]);

const ROLE_ALIASES: Record<string, string> = {
  administrator: "admin",
  realm_admin: "admin",
  "realm-admin": "admin",
  "erp-admin": "admin",
  admin: "admin",

  "erp-user": "user",
  usuario: "user",
  user: "user",

  manager: "manager",
  gerente: "manager",
  "erp-manager": "manager",

  employee: "employee",
  funcionario: "employee",
  "erp-employee": "employee",
};

function normalizeRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}

function isSystemRole(normalized: string): boolean {
  if (SYSTEM_ROLES.has(normalized)) return true;
  return SYSTEM_ROLE_PREFIXES.some((p) => normalized.startsWith(p));
}

/**
 * Recebe roles vindas do token (JWT) e:
 * - remove roles de sistema (offline_access, default-roles-*, etc.)
 * - normaliza nomes e aplica aliases (ex: administrator -> admin)
 * - remove duplicados
 */
export function resolveAppRoles(rawRoles: string[]): string[] {
  const resolved = rawRoles
    .filter(Boolean)
    .map((r) => normalizeRole(String(r)))
    .filter((r) => !isSystemRole(r))
    .map((r) => ROLE_ALIASES[r] ?? r)
    .filter(Boolean);

  return Array.from(new Set(resolved));
}

/**
 * Permissões por role — o backend valida via JWT (`resource:action`).
 * Não há endpoint HTTP separado; evita chamadas inválidas a `/permissions`.
 */
export async function fetchPermissionsFromApi(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- mantido para compatibilidade de assinatura com o call site
  _accessToken: string,
): Promise<RolePermissionsMap | null> {
  return null;
}
