// Central definition of user roles. Because SQLite can't store a real enum,
// this file is our "source of truth" for valid roles, so we never sprinkle
// magic strings like "PRINCIPAL" around the codebase and risk typos.

// `as const` makes these exact string literals (not just `string`), which lets
// TypeScript narrow types precisely.
export const ROLES = {
  PRINCIPAL: "PRINCIPAL",
  PARENT: "PARENT",
} as const;

// A union type: Role is exactly "PRINCIPAL" | "PARENT".
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Each role's "home" dashboard. Used after login and by the middleware to send
// users to the right place.
export const ROLE_HOME: Record<Role, string> = {
  PRINCIPAL: "/dashboard/principal",
  PARENT: "/dashboard/parent",
};

// Runtime check + type guard: confirms a raw string is a valid role.
export function isRole(value: string): value is Role {
  return value === ROLES.PRINCIPAL || value === ROLES.PARENT;
}
