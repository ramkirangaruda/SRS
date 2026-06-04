// Central definition of user roles. Because SQLite can't store a real enum,
// this file is our "source of truth" for valid roles, so we never sprinkle
// magic strings like "PRINCIPAL" around the codebase and risk typos.

// `as const` makes these exact string literals (not just `string`), which lets
// TypeScript narrow types precisely.
export const ROLES = {
  PRINCIPAL: "PRINCIPAL",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
} as const;

// A union type: Role is exactly "PRINCIPAL" | "TEACHER" | "PARENT".
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Each role's "home" dashboard. Used after login and by the middleware to send
// users to the right place. (The teacher dashboard UI arrives in a later phase;
// the route is reserved here so teacher logins route consistently.)
export const ROLE_HOME: Record<Role, string> = {
  PRINCIPAL: "/dashboard/principal",
  TEACHER: "/dashboard/teacher",
  PARENT: "/dashboard/parent",
};

// Runtime check + type guard: confirms a raw string is a valid role. Comparing
// against the ROLES values keeps this in sync if we add more roles.
export function isRole(value: string): value is Role {
  return (Object.values(ROLES) as string[]).includes(value);
}
