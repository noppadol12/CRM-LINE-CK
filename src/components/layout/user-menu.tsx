import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { UserMenuClient } from "./user-menu-client";

export async function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = await getCurrentUser();
  return <UserMenuClient name={user.name} email={user.email} role={ROLE_LABEL[user.role]} compact={compact} />;
}
