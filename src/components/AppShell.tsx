import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X, Target, CheckSquare, Sparkles, Bell, LogOut, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase, useNotificationsQuery } from "@/lib/supabase";

const nav = [
  { to: "/my-goals", label: "My Goals", icon: Target },
  { to: "/team-approvals", label: "Team Approvals", icon: CheckSquare },
];

const formatNotificationTime = (timestamp: string) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

function NavItems({
  onNavigate,
  showTeamApprovals,
}: {
  onNavigate?: () => void;
  showTeamApprovals: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 px-3">
      {nav
        .filter((n) => (n.to === "/team-approvals" ? showTeamApprovals : true))
        .map((n) => {
        const active = path === n.to || (path === "/" && n.to === "/my-goals");
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
              active
                ? "bg-primary-soft text-primary shadow-soft"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-6">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 shadow-elegant">
        <img
          src="/Aspire%20Logo.png"
          alt="Aspire"
          className="h-8 w-8 rounded-xl object-cover"
        />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight">Aspire</div>
        <div className="text-xs text-muted-foreground">Goal Portal</div>
      </div>
    </div>
  );
}

function NotificationsMenu({
  children,
  align = "end",
  items,
  isLoading,
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
  items: { id: string; title: string; detail: string; timestamp: string }[];
  isLoading: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-80 p-2">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-1">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No new notifications yet.
            </div>
          ) : (
            items.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 rounded-lg p-3"
              >
                <div className="text-sm font-medium text-foreground">{notification.title}</div>
                <div className="text-xs text-muted-foreground">{notification.detail}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatNotificationTime(notification.timestamp)}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { session, profile, loading } = useAuth();
  const canSeeTeamApprovals = profile?.role === "Manager" || profile?.role === "Admin";
  const userInitials = (profile?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("") || "--";
  const { data: notificationItems = [], isLoading: notificationsLoading } = useNotificationsQuery(
    session?.user?.id,
    profile?.role,
    5,
  );

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/login" });
    }
  }, [loading, navigate, session]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  };

  const onSearch = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    toast("Global search will be enabled in v2.0");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:flex lg:flex-col">
        <Brand />
        <NavItems showTeamApprovals={canSeeTeamApprovals} />
        <div className="mt-auto p-4 pb-24">
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <div className="text-xs font-medium">Q3 Cycle</div>
            <div className="mt-1 text-xs text-muted-foreground">Submissions close Sep 30</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-secondary"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
            <img
              src="/Aspire%20Logo.png"
              alt="Aspire"
              className="h-6 w-6 rounded-lg object-cover"
            />
          </div>
          <span className="text-sm font-semibold">Aspire</span>
        </div>
        <NotificationsMenu
          align="end"
          items={notificationItems}
          isLoading={notificationsLoading}
        >
          <button
            className="relative grid h-10 w-10 place-items-center rounded-xl hover:bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationItems.length > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-soft" />
            ) : null}
          </button>
        </NotificationsMenu>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-card shadow-elegant transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between pr-3">
            <Brand />
            <button
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl hover:bg-secondary"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 pb-3">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {userInitials}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{profile?.full_name ?? "Profile"}</div>
                <div className="text-xs text-muted-foreground">{profile?.role ?? ""}</div>
              </div>
            </div>
          </div>
          <NavItems onNavigate={() => setOpen(false)} showTeamApprovals={canSeeTeamApprovals} />
          <div className="mt-auto px-6 pb-6">
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={onSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </Button>
          </div>
        </aside>
      </div>

      {/* Main */}
      <main className="lg:pl-64">
        {/* Desktop top bar */}
        <div className="hidden h-16 items-center justify-between border-b border-border bg-card/60 px-8 backdrop-blur lg:flex">
          <form
            onSubmit={onSearch}
            className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-1.5 shadow-soft"
          >
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search goals, employees..."
              className="h-7 w-64 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <NotificationsMenu
              align="end"
              items={notificationItems}
              isLoading={notificationsLoading}
            >
              <Button variant="ghost" size="icon" className="relative rounded-xl">
                <Bell className="h-4 w-4" />
                {notificationItems.length > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-soft" />
                ) : null}
              </Button>
            </NotificationsMenu>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {(profile?.full_name ?? "").split(" ").map((part) => part[0]).slice(0, 2).join("") || "--"}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium">{profile?.full_name ?? "Profile"}</div>
                <div className="text-xs text-muted-foreground">{profile?.role ?? ""}</div>
              </div>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
