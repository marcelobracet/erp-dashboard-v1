/* eslint-disable @typescript-eslint/no-explicit-any */
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
    { resource: "products", actions: CRUD },
    { resource: "quotes", actions: QUOTES_ADMIN_ACTIONS },
    { resource: "users", actions: CRUD },
    { resource: "settings", actions: CRUD },
  ],
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

function isRolePermissionsMap(input: unknown): input is RolePermissionsMap {
  if (!input || typeof input !== "object") return false;
  for (const [role, perms] of Object.entries(
    input as Record<string, unknown>,
  )) {
    if (typeof role !== "string") return false;
    if (!Array.isArray(perms)) return false;
    for (const p of perms) {
      if (!p || typeof p !== "object") return false;
      const resource = (p as { resource?: unknown }).resource;
      const actions = (p as { actions?: unknown }).actions;
      if (typeof resource !== "string") return false;
      if (!Array.isArray(actions)) return false;
    }
  }
  return true;
}

/**
 * Permissões por role — o backend valida via JWT (`resource:action`).
 * Não há endpoint HTTP separado; evita chamadas inválidas a `/permissions`.
 */
export async function fetchPermissionsFromApi(
  _accessToken: string,
): Promise<RolePermissionsMap | null> {
  return null;
}
