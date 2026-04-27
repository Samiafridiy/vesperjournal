import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, History, BarChart3, LogOut, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/trade/new", label: "New trade", icon: PlusCircle },
  { to: "/trades", label: "History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar p-5 sticky top-0 h-dvh">
        <Link to="/dashboard" className="flex items-center gap-2.5 mb-10 group">
          <div className="size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
            <TrendingUp className="size-4 text-champagne" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Vesper Journal</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-faint">Journal</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
                  (active
                    ? "bg-accent text-foreground"
                    : "text-soft hover:text-foreground hover:bg-accent/40")
                }
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="text-xs text-soft mb-2 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-soft"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
              <TrendingUp className="size-3.5 text-champagne" />
            </div>
            <span className="text-sm font-semibold">Vesper Journal</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-soft"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-4">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex flex-col items-center justify-center gap-1 py-3 text-[10px] " +
                  (active ? "text-champagne" : "text-soft")
                }
              >
                <Icon className="size-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}