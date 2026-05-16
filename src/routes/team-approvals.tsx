import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, ChevronDown, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  supabase,
  useManagerCheckInsQuery,
  useUpdateCheckInCommentMutation,
  type ManagerCheckIn,
} from "@/lib/supabase";

export const Route = createFileRoute("/team-approvals")({
  component: TeamApprovals,
});

type Pending = {
  id: string;
  thrust_area: string;
  title: string;
  uom_type: string;
  target_value: number;
  weightage: number;
  status: "Draft" | "Pending Approval" | "Approved/Locked";
  profiles: {
    full_name: string;
    email: string;
    manager_id: string | null;
  };
};

function StatusPill({ status }: { status: Pending["status"] }) {
  const map = {
    Draft: "bg-[color:oklch(0.96_0.05_25)] text-danger",
    "Pending Approval": "bg-secondary text-muted-foreground",
    "Approved/Locked": "bg-[color:oklch(0.95_0.05_152)] text-success",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", map[status])}>
      {status}
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
      {initials}
    </div>
  );
}

function TeamApprovals() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
    useEffect(() => {
      if (!loading && profile?.role === "Employee") {
        void navigate({ to: "/my-goals" });
      }
    }, [loading, navigate, profile?.role]);

  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["goals", "pending-approvals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*, profiles!inner(full_name, email, manager_id)")
        .eq("status", "Pending Approval")
        .eq("profiles.manager_id", user!.id);

      if (error) throw error;
      return data as Pending[];
    },
  });

  const {
    data: checkIns = [],
    isLoading: checkInsLoading,
  } = useManagerCheckInsQuery(user?.id);

  const updateCheckInCommentMutation = useUpdateCheckInCommentMutation();

  const approveMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("goals")
        .update({ status: "Approved/Locked" })
        .eq("id", goalId);

      if (error) throw error;
      return goalId;
    },
    onMutate: (goalId) => {
      setApprovingId(goalId);
    },
    onSuccess: () => {
      toast.success("Goal approved.");
      void queryClient.invalidateQueries({ queryKey: ["goals", "pending-approvals", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to approve goal.";
      toast.error(message);
    },
    onSettled: () => {
      setApprovingId(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("goals")
        .update({ status: "Draft" })
        .eq("id", goalId);

      if (error) throw error;
      return goalId;
    },
    onMutate: (goalId) => {
      setReturningId(goalId);
    },
    onSuccess: () => {
      toast.success("Goal returned to draft.");
      void queryClient.invalidateQueries({ queryKey: ["goals", "pending-approvals", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to return goal.";
      toast.error(message);
    },
    onSettled: () => {
      setReturningId(null);
    },
  });

  const pendingCount = rows.length;
  const isEmpty = !isLoading && rows.length === 0;
  const checkInEmpty = !checkInsLoading && checkIns.length === 0;

  const initialsMap = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      const name = row.profiles?.full_name ?? "";
      const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
      map.set(row.id, initials || "--");
    });
    return map;
  }, [rows]);

  const selectedCheckIn =
    checkIns.find((checkIn) => checkIn.id === selectedCheckInId) ?? null;

  const openCommentDialog = (checkIn: ManagerCheckIn) => {
    setSelectedCheckInId(checkIn.id);
    setCommentText(checkIn.manager_comment ?? "");
    setCommentOpen(true);
  };

  const onCommentOpenChange = (open: boolean) => {
    setCommentOpen(open);
    if (!open) {
      setSelectedCheckInId(null);
      setCommentText("");
    }
  };

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCheckInId) return;

    const trimmed = commentText.trim();
    updateCheckInCommentMutation.mutate(
      {
        checkInId: selectedCheckInId,
        manager_comment: trimmed.length ? trimmed : null,
      },
      {
        onSuccess: () => {
          toast.success("Comment saved.");
          onCommentOpenChange(false);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Unable to save comment.";
          toast.error(message);
        },
      },
    );
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-primary">Manager</span>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Team Approvals</h1>
              <p className="text-sm text-muted-foreground">Review and act on goals submitted by your team.</p>
            </div>
            <span className="hidden rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex">
              {isLoading ? "Loading..." : `${pendingCount} pending`}
            </span>
          </div>

          <Tabs defaultValue="approvals" className="mt-6">
            <TabsList className="w-full justify-start gap-2 rounded-2xl bg-card p-2 shadow-soft sm:w-auto">
              <TabsTrigger value="approvals" className="rounded-xl px-4 py-2">
                Goal Approvals
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-xl px-4 py-2">
                Check-In Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approvals">
              {isEmpty ? (
                <Card className="mt-6 border-border bg-card shadow-soft">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-xl font-semibold">You are all caught up!</CardTitle>
                    <p className="text-sm text-muted-foreground">No pending goals are waiting for your review.</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>Check back later or encourage your team to submit their goals.</span>
                      <Button
                        onClick={() => toast.success("Reminder sent to team members!")}
                        className="h-10 rounded-xl px-4"
                      >
                        Notify Team
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                          <TableHead className="py-4 pl-6">Employee</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead className="w-[140px]">Target</TableHead>
                          <TableHead className="w-[130px]">Weight (%)</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                          <TableHead className="w-[180px] pr-6 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => {
                          const isApproving = approvingId === r.id && approveMutation.isPending;
                          const isReturning = returningId === r.id && returnMutation.isPending;
                          return (
                            <TableRow key={r.id} className="border-border">
                              <TableCell className="py-5 pl-6">
                                <div className="flex items-center gap-3">
                                  <Avatar initials={initialsMap.get(r.id) ?? "--"} />
                                  <div>
                                    <div className="text-sm font-medium">{r.profiles?.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">{r.title}</div>
                                <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Target className="h-3 w-3" /> {r.thrust_area}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    value={r.target_value}
                                    readOnly
                                    className="h-9 w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">{r.uom_type}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={r.weightage}
                                  readOnly
                                  className="h-9 w-20"
                                />
                              </TableCell>
                              <TableCell><StatusPill status={r.status} /></TableCell>
                              <TableCell className="pr-6">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => approveMutation.mutate(r.id)}
                                    disabled={isApproving}
                                    className="h-9 border-success/40 text-success hover:bg-success/10 hover:text-success"
                                  >
                                    {isApproving ? (
                                      <span className="flex items-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-success/40 border-t-success" />
                                        Approving
                                      </span>
                                    ) : (
                                      <>
                                        <Check className="mr-1 h-4 w-4" /> Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => returnMutation.mutate(r.id)}
                                    disabled={isReturning}
                                    className="h-9 border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                                  >
                                    {isReturning ? (
                                      <span className="flex items-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-danger/40 border-t-danger" />
                                        Returning
                                      </span>
                                    ) : (
                                      <>
                                        <X className="mr-1 h-4 w-4" /> Return
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile cards */}
                  <div className="mt-6 grid gap-3 md:hidden">
                    {rows.map((r) => {
                      const isOpen = expanded === r.id;
                      const isApproving = approvingId === r.id && approveMutation.isPending;
                      const isReturning = returningId === r.id && returnMutation.isPending;
                      return (
                        <article key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                          <button
                            onClick={() => setExpanded(isOpen ? null : r.id)}
                            className="flex w-full items-center gap-3 p-4 text-left"
                          >
                            <Avatar initials={initialsMap.get(r.id) ?? "--"} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-sm font-semibold">{r.profiles?.full_name}</div>
                                <StatusPill status={r.status} />
                              </div>
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">{r.title}</div>
                              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span>Target <span className="font-semibold text-foreground">{r.target_value}</span></span>
                                <span>Weight <span className="font-semibold text-primary">{r.weightage}%</span></span>
                              </div>
                            </div>
                            <ChevronDown
                              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")}
                            />
                          </button>
                          <div
                            className={cn(
                              "grid transition-all duration-300 ease-out",
                              isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="space-y-4 border-t border-border p-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Target</label>
                                    <Input
                                      type="number"
                                      value={r.target_value}
                                      readOnly
                                      className="mt-1 h-11"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Weight (%)</label>
                                    <Input
                                      type="number"
                                      value={r.weightage}
                                      readOnly
                                      className="mt-1 h-11"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => approveMutation.mutate(r.id)}
                                    disabled={isApproving}
                                    variant="outline"
                                    className="h-11 flex-1 border-success/40 text-success hover:bg-success/10 hover:text-success"
                                  >
                                    {isApproving ? (
                                      <span className="flex items-center justify-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-success/40 border-t-success" />
                                        Approving
                                      </span>
                                    ) : (
                                      <>
                                        <Check className="mr-1.5 h-4 w-4" /> Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => returnMutation.mutate(r.id)}
                                    disabled={isReturning}
                                    variant="outline"
                                    className="h-11 flex-1 border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                                  >
                                    {isReturning ? (
                                      <span className="flex items-center justify-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-danger/40 border-t-danger" />
                                        Returning
                                      </span>
                                    ) : (
                                      <>
                                        <X className="mr-1.5 h-4 w-4" /> Return
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              {isMobile ? (
                <div className="mt-6 grid gap-3">
                  {checkIns.map((checkIn) => (
                    <article key={checkIn.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {checkIn.goals?.profiles?.full_name ?? "--"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {checkIn.goals?.title ?? ""}
                          </div>
                        </div>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                          {checkIn.quarter}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <div className="font-semibold text-foreground">{checkIn.status}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Actual</div>
                          <div className="font-semibold text-foreground">
                            {checkIn.actual_achievement ?? "-"}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 h-9 w-full rounded-xl"
                        onClick={() => openCommentDialog(checkIn)}
                      >
                        Add Comment
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                        <TableHead className="py-4 pl-6">Employee</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="w-[110px]">Quarter</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[160px]">Actual</TableHead>
                        <TableHead className="w-[160px] pr-6 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkIns.map((checkIn) => (
                        <TableRow key={checkIn.id} className="border-border">
                          <TableCell className="py-5 pl-6">
                            <div className="text-sm font-medium">
                              {checkIn.goals?.profiles?.full_name ?? "--"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{checkIn.goals?.title ?? ""}</div>
                          </TableCell>
                          <TableCell>{checkIn.quarter}</TableCell>
                          <TableCell>{checkIn.status}</TableCell>
                          <TableCell>{checkIn.actual_achievement ?? "-"}</TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl"
                              onClick={() => openCommentDialog(checkIn)}
                            >
                              Add Comment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {checkInsLoading ? (
                <div className="mt-4 text-sm text-muted-foreground">Loading check-ins...</div>
              ) : checkInEmpty ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
                  No team check-ins to review yet.
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={commentOpen} onOpenChange={onCommentOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add manager comment</DialogTitle>
            <DialogDescription>
              {selectedCheckIn
                ? `Leave feedback on ${selectedCheckIn.goals?.profiles?.full_name ?? ""}'s check-in.`
                : "Leave feedback for this check-in."}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitComment}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment</label>
              <Textarea
                rows={4}
                placeholder="Share guidance or next steps"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onCommentOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCheckInCommentMutation.isPending}>
                {updateCheckInCommentMutation.isPending ? "Saving..." : "Save Comment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
