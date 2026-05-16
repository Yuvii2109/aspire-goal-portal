import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Target, CheckSquare, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { profile } = useAuth();
  const canSeeTeamApprovals = profile?.role === "Manager" || profile?.role === "Admin";

  return (
    <AppShell>
      <div className="px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Q3 2026 Goal Cycle
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Set ambitious goals.<br className="hidden sm:block" /> Track meaningful progress.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            A focused workspace for individuals and managers to align on what matters this quarter.
          </p>

          <div
            className={cn(
              "mt-8 grid gap-4",
              canSeeTeamApprovals ? "sm:grid-cols-2" : "sm:grid-cols-1 sm:justify-items-center",
            )}
          >
            <Link
              to="/my-goals"
              className={cn(
                "group flex items-center justify-between rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant",
                !canSeeTeamApprovals && "sm:w-full sm:max-w-md",
              )}
            >
              <div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Target className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-semibold">My Goals</div>
                <div className="mt-1 text-sm text-muted-foreground">Draft and submit for approval</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
            {canSeeTeamApprovals ? (
              <Link
                to="/team-approvals"
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-base font-semibold">Team Approvals</div>
                  <div className="mt-1 text-sm text-muted-foreground">Review pending team goals</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
