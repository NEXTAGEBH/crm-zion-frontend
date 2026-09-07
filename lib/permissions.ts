export type UserRole =
  | "zion_admin"
  | "admin"
  | "atendente";

export type Permission =
  | "dashboard"
  | "whatsapp"
  | "contacts"
  | "funnel"
  | "followups"
  | "automations"
  | "quick_messages"
  | "campaigns"
  | "reports"
  | "settings";

export const rolePermissions: Record<
  UserRole,
  Permission[]
> = {
  zion_admin: [
    "dashboard",
    "whatsapp",
    "contacts",
    "funnel",
    "followups",
    "automations",
    "quick_messages",
    "campaigns",
    "reports",
    "settings",
  ],

  admin: [
    "dashboard",
    "whatsapp",
    "contacts",
    "funnel",
    "followups",
    "automations",
    "quick_messages",
    "campaigns",
    "reports",
    "settings",
  ],

  atendente: [
    "dashboard",
    "whatsapp",
    "contacts",
    "funnel",
    "followups",
  ],
};

export function hasPermission(
  role: string,
  permission: Permission
) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  if (
    normalizedRole !== "zion_admin" &&
    normalizedRole !== "admin" &&
    normalizedRole !== "atendente"
  ) {
    return false;
  }

  return rolePermissions[
    normalizedRole as UserRole
  ].includes(permission);
}

export function permissionForPath(
  pathname: string
): Permission | null {
  if (pathname === "/") {
    return "dashboard";
  }

  if (pathname.startsWith("/whatsapp")) {
    return "whatsapp";
  }

  if (pathname.startsWith("/contatos")) {
    return "contacts";
  }

  if (pathname.startsWith("/funil")) {
    return "funnel";
  }

  if (pathname.startsWith("/followups")) {
    return "followups";
  }

  if (pathname.startsWith("/automacoes")) {
    return "automations";
  }

  if (
    pathname.startsWith(
      "/mensagens-rapidas"
    )
  ) {
    return "quick_messages";
  }

  if (pathname.startsWith("/campanhas")) {
    return "campaigns";
  }

  if (pathname.startsWith("/relatorios")) {
    return "reports";
  }

  if (
    pathname.startsWith(
      "/configuracoes"
    )
  ) {
    return "settings";
  }

  return null;
}