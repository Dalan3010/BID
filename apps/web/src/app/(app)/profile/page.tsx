import type { Metadata } from "next";

import { AccountView } from "@/components/profile/account-view";

export const metadata: Metadata = { title: "Cuenta" };

/** `/profile` — account data, export, demo reset and account deletion. */
export default function ProfilePage() {
  return <AccountView />;
}
