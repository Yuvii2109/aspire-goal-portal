import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  type Goal,
  useApprovedGoalsQuery,
  useCreateCheckInMutation,
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useDraftGoalsQuery,
  useSubmitDraftGoalsMutation,
} from "@/lib/supabase";

export const Route = createFileRoute("/my-goals")({
  component: MyGoals,
});

const thrustAreas = ["Customer", "Financial", "Operational Excellence", "People", "Innovation"];
const uomTypes = [
  { value: "min", label: "Min (Numeric / %)" },
  { value: "max", label: "Max (Numeric / %)" },
  { value: "timeline", label: "Timeline" },
  { value: "zero", label: "Zero" },
];
const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
const checkInStatuses = ["Not Started", "On Track", "Completed"] as const;

const getUomLabel = (value: string) => uomTypes.find((u) => u.value === value)?.label ?? value;

function MyGoals() {
  const { user, loading } = useAuth();
  const { data: draftGoals = [], isLoading: goalsLoading } = useDraftGoalsQuery(user?.id);
  const { data: approvedGoals = [], isLoading: approvedLoading } = useApprovedGoalsQuery(user?.id);
  const createGoalMutation = useCreateGoalMutation(user?.id);
  const deleteGoalMutation = useDeleteGoalMutation();
  const submitDraftGoalsMutation = useSubmitDraftGoalsMutation(user?.id);
  const createCheckInMutation = useCreateCheckInMutation();
  const [form, setForm] = useState({
    thrust: "",
    title: "",
    description: "",
    uom: "",
    target: "",
    weightage: "",
  });
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [lastCheckInGoalId, setLastCheckInGoalId] = useState<string | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    quarter: "",
    status: "",
    actualAchievement: "",
  });

  const totalWeightage = useMemo(
    () => draftGoals.reduce((s, g) => s + g.weightage, 0),
    [draftGoals],
  );
  const pct = Math.min(totalWeightage, 100);
  const complete = totalWeightage === 100;

  const canAdd =
    form.thrust &&
    form.title &&
    form.uom &&
    form.target &&
    form.weightage &&
    draftGoals.length < 8 &&
    !!user?.id;

  const addGoal = () => {
    if (!canAdd) return;
    createGoalMutation.mutate(
      {
        thrust_area: form.thrust,
        title: form.title,
        description: form.description.trim() ? form.description : null,
        uom_type: form.uom as Goal["uom_type"],
        target_value: Number(form.target),
        weightage: Number(form.weightage),
      },
      {
        onSuccess: () => {
          setForm({
            thrust: "",
            title: "",
            description: "",
            uom: "",
            target: "",
            weightage: "",
          });
        },
      },
    );
  };

  const remove = (id: string) => deleteGoalMutation.mutate(id);
  const submitDrafts = () => {
    submitDraftGoalsMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Goals submitted for approval.");
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Unable to submit goals.";
        toast.error(message);
      },
    });
  };

  const selectedGoal = approvedGoals.find((goal) => goal.id === selectedGoalId) ?? null;
  const canSubmitCheckIn =
    !!selectedGoalId && checkInForm.quarter !== "" && checkInForm.status !== "";

  const resetCheckIn = () => {
    setCheckInForm({ quarter: "", status: "", actualAchievement: "" });
    setSelectedGoalId(null);
  };

  const onCheckInOpenChange = (open: boolean) => {
    setCheckInOpen(open);
    if (!open) {
      resetCheckIn();
    }
  };

  const openCheckIn = (goalId: string) => {
    setSelectedGoalId(goalId);
    setCheckInOpen(true);
  };

  const submitCheckIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGoalId) return;

    const rawAchievement = checkInForm.actualAchievement.trim();
    const parsedAchievement = rawAchievement ? Number(rawAchievement) : null;
    const actualAchievement =
      parsedAchievement != null && Number.isNaN(parsedAchievement) ? null : parsedAchievement;

    createCheckInMutation.mutate(
      {
        goal_id: selectedGoalId,
        quarter: checkInForm.quarter as "Q1" | "Q2" | "Q3" | "Q4",
        status: checkInForm.status as "Not Started" | "On Track" | "Completed",
        actual_achievement: actualAchievement,
      },
      {
        onSuccess: () => {
          toast.success("Check-in logged.");
          setLastCheckInGoalId(selectedGoalId);
          onCheckInOpenChange(false);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Unable to log check-in.";
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
      <div className="px-5 py-6 pb-48 sm:px-8 sm:py-8 sm:pb-44 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">My Goals</span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Plan your quarter</h1>
            <p className="text-sm text-muted-foreground">Draft goals, then submit them for manager approval.</p>
          </div>

          <Tabs defaultValue="planning" className="mt-6">
            <TabsList className="w-full justify-start gap-2 rounded-2xl bg-card p-2 shadow-soft sm:w-auto">
              <TabsTrigger value="planning" className="rounded-xl px-4 py-2">
                Planning (Drafts)
              </TabsTrigger>
              <TabsTrigger value="execution" className="rounded-xl px-4 py-2">
                Execution (Active)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planning">
              {/* Form Card */}
              <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Plus className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-semibold sm:text-lg">Add a new goal</h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Thrust Area</Label>
                    <Select value={form.thrust} onValueChange={(v) => setForm({ ...form, thrust: v })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select area" /></SelectTrigger>
                      <SelectContent>
                        {thrustAreas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Goal Title</Label>
                    <Input
                      className="h-11"
                      placeholder="e.g. Launch self-serve onboarding"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      placeholder="What's the outcome and how will it be measured?"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UoM Type</Label>
                    <Select value={form.uom} onValueChange={(v) => setForm({ ...form, uom: v })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Unit of measure" /></SelectTrigger>
                      <SelectContent>
                        {uomTypes.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target</Label>
                      <Input
                        className="h-11"
                        type="number"
                        placeholder="100"
                        value={form.target}
                        onChange={(e) => setForm({ ...form, target: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weightage (%)</Label>
                      <Input
                        className="h-11"
                        type="number"
                        placeholder="20"
                        value={form.weightage}
                        onChange={(e) => setForm({ ...form, weightage: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={addGoal} disabled={!canAdd} className="h-11 rounded-xl px-5">
                    <Plus className="mr-1.5 h-4 w-4" /> Add to Drafts
                  </Button>
                </div>
              </section>

              {/* Draft list */}
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold sm:text-lg">Draft goals</h2>
                  <span className="text-xs text-muted-foreground">
                    {goalsLoading ? "Loading..." : `${draftGoals.length} drafted`}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {draftGoals.map((g) => (
                    <article
                      key={g.id}
                      className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
                          <Target className="h-3 w-3" /> {g.thrust_area}
                        </span>
                        <button
                          onClick={() => remove(g.id)}
                          className="opacity-0 transition group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-danger"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold leading-snug">{g.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Target</div>
                          <div className="font-semibold">
                            {g.target_value}{" "}
                            <span className="font-normal text-muted-foreground">
                              {getUomLabel(g.uom_type)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">Weight</div>
                          <div className="font-semibold text-primary">{g.weightage}%</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* Sticky footer */}
              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 backdrop-blur lg:pl-64">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:px-8 sm:py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium">Total Weightage</span>
                      <span className={cn("tabular-nums font-semibold", complete ? "text-success" : "text-foreground")}>
                        {totalWeightage}/100%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 ease-out",
                          complete ? "bg-success" : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={submitDrafts}
                    disabled={totalWeightage !== 100 || submitDraftGoalsMutation.isPending}
                    className="h-11 rounded-xl px-6 md:ml-6"
                  >
                    {submitDraftGoalsMutation.isPending ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="execution">
              <section className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold sm:text-lg">Active goals</h2>
                  <span className="text-xs text-muted-foreground">
                    {approvedLoading ? "Loading..." : `${approvedGoals.length} active`}
                  </span>
                </div>
                {approvedLoading ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
                    Loading active goals...
                  </div>
                ) : approvedGoals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Target className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">No active goals yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Once your manager approves a goal, it will appear here for tracking.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {approvedGoals.map((g) => (
                      <article
                        key={g.id}
                        className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                            <Target className="h-3 w-3" /> {g.thrust_area}
                          </span>
                          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                            Active
                          </span>
                        </div>
                        {lastCheckInGoalId === g.id && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-[11px] font-medium text-success">
                            Check-in logged
                          </div>
                        )}
                        <h3 className="mt-3 text-[15px] font-semibold leading-snug">{g.title}</h3>
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Target</div>
                            <div className="font-semibold">
                              {g.target_value}{" "}
                              <span className="font-normal text-muted-foreground">
                                {getUomLabel(g.uom_type)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground">Weight</div>
                            <div className="font-semibold text-primary">{g.weightage}%</div>
                          </div>
                        </div>
                        <Button
                          className="mt-4 h-9 w-full rounded-xl"
                          variant="outline"
                          onClick={() => openCheckIn(g.id)}
                        >
                          Log Check-In
                        </Button>
                        <div className="mt-4 space-y-3">
                          {(g.check_ins ?? []).length === 0 ? (
                            <div className="text-xs text-muted-foreground">No check-ins logged yet.</div>
                          ) : (
                            (g.check_ins ?? []).map((checkIn) => (
                              <div key={checkIn.id} className="rounded-xl border border-border bg-background/50 p-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                                    {checkIn.quarter}
                                  </span>
                                  <span>{checkIn.status}</span>
                                  <span>
                                    Actual: {checkIn.actual_achievement ?? "-"}
                                  </span>
                                </div>
                                {checkIn.manager_comment && (
                                  <div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
                                    <span className="text-muted-foreground">Manager:</span> {checkIn.manager_comment}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={checkInOpen} onOpenChange={onCheckInOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log check-in</DialogTitle>
            <DialogDescription>
              {selectedGoal ? `Update progress for ${selectedGoal.title}.` : "Record progress for this goal."}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitCheckIn}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quarter</Label>
                <Select
                  value={checkInForm.quarter}
                  onValueChange={(value) => setCheckInForm({ ...checkInForm, quarter: value })}
                >
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select quarter" /></SelectTrigger>
                  <SelectContent>
                    {quarters.map((quarter) => (
                      <SelectItem key={quarter} value={quarter}>
                        {quarter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={checkInForm.status}
                  onValueChange={(value) => setCheckInForm({ ...checkInForm, status: value })}
                >
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {checkInStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Actual Achievement</Label>
              <Input
                className="h-11"
                type="number"
                placeholder="Enter actual achievement"
                value={checkInForm.actualAchievement}
                onChange={(event) =>
                  setCheckInForm({ ...checkInForm, actualAchievement: event.target.value })
                }
              />
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="ghost" onClick={() => onCheckInOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmitCheckIn || createCheckInMutation.isPending}>
                {createCheckInMutation.isPending ? "Saving..." : "Save Check-In"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
