import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="ml-56 flex-1 min-w-0">{children}</main>
    </div>
  );
}
