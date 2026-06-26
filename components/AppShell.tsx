import { Sidebar } from "./Sidebar";
import { OriginNotice } from "./OriginNotice";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <OriginNotice />
        {children}
      </main>
    </div>
  );
}
