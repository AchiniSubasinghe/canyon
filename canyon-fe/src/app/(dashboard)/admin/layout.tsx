import { RequireAuth } from "@/components/auth/require-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth roles={["administrator"]}>{children}</RequireAuth>;
}