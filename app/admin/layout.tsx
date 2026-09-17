import { WorkspaceShell } from "@/components/admin/workspace-shell";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
