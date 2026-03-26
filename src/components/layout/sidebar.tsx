import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Package,
  FolderPlus,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const navItems = [
    { path: "/", label: t.sidebar.dashboard, icon: LayoutDashboard },
    { path: "/doctor", label: t.sidebar.doctor, icon: Stethoscope },
    { path: "/tools", label: t.sidebar.tools, icon: Package },
    { path: "/init", label: t.sidebar.init, icon: FolderPlus },
    { path: "/settings", label: t.sidebar.settings, icon: Settings },
  ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-primary-foreground">E</span>
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">
          Envra
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded-full bg-muted" />
          <span className="text-xs text-sidebar-foreground/60">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}
