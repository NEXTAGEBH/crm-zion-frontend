import { Sidebar } from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PermissionGuard>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />

          <main className="flex-1 ml-64 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
}