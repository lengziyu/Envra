import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="app-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
