import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { DemoBanner } from "@/components/DemoBanner";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  LogOut,
  TrendingUp,
  Download,
  Brain,
  Beaker,
  Newspaper,
  BookOpen,
  ClipboardList,
  Menu,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Overview", shortLabel: "Home", icon: LayoutDashboard },
  { to: "/trade/new", label: "New trade", shortLabel: "New", icon: PlusCircle },
  { to: "/trades", label: "History", shortLabel: "Log", icon: History },
  { to: "/analytics", label: "Analytics", shortLabel: "Stats", icon: BarChart3 },
  { to: "/weekly-review", label: "Weekly Review", shortLabel: "Review", icon: ClipboardList },
  { to: "/market-intel", label: "Market Intel", shortLabel: "News", icon: Newspaper },
  { to: "/trading-lab", label: "Lab", shortLabel: "Lab", icon: Beaker },
  { to: "/rule-book", label: "Rule Book", shortLabel: "Rules", icon: BookOpen },
  { to: "/coach", label: "AI Coach", shortLabel: "Coach", icon: Brain },
  { to: "/import", label: "Import", shortLabel: "Import", icon: Download },
] as const;

// Mobile bottom bar — exactly 5 items.
const mobileBottom = [
  nav[0], // Home
  nav[1], // New
  nav[2], // Log
  nav[3], // Stats
  nav[8], // Coach
] as const;

// Remaining items live in the hamburger sheet.
const mobileMore = [
  nav[2], // History (duplicate of Log for clarity in menu)
  nav[3], // Analytics
  nav[4], // Weekly Review
  nav[5], // Market Intel
  nav[6], // Lab
  nav[7], // Rules
  nav[9], // Import
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to: string) =>
    loc.pathname === to || (to !== "/dashboard" && loc.pathname.startsWith(to));

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      {/* Sidebar — desktop (unchanged) */}
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
            const active = isActive(n.to);
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
        <div className="flex items-center justify-between px-4 h-14 gap-2">
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="size-7 shrink-0 rounded-md bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
              <TrendingUp className="size-3.5 text-champagne" />
            </div>
            <span className="text-sm font-semibold truncate">Vesper Journal</span>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Open menu"
                  className="text-soft h-9 w-9 p-0"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-2xl border-border bg-sidebar p-0 max-h-[80dvh]"
              >
                <SheetHeader className="px-5 pt-5 pb-3">
                  <SheetTitle className="text-left text-sm uppercase tracking-[0.18em] text-soft font-medium">
                    More
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 pb-6 grid grid-cols-1 gap-1 overflow-y-auto">
                  {mobileMore.map((n) => {
                    const active = isActive(n.to);
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        onClick={() => setMenuOpen(false)}
                        className={
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors " +
                          (active
                            ? "bg-accent text-foreground"
                            : "text-soft hover:text-foreground hover:bg-accent/40")
                        }
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-border px-1">
                    <div className="text-xs text-soft mb-2 truncate px-3">{user?.email}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-soft"
                      onClick={async () => {
                        setMenuOpen(false);
                        await signOut();
                        navigate({ to: "/login" });
                      }}
                    >
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <DemoBanner />
        {children}
      </main>

      {/* Mobile bottom nav — exactly 5 items */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 px-1">
          {mobileBottom.map((n) => {
            const active = isActive(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] leading-none min-w-0 " +
                  (active ? "text-champagne" : "text-soft")
                }
              >
                <Icon className="size-[20px]" />
                <span className="truncate max-w-full px-1">{n.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}