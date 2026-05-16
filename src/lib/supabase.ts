import { createClient } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: "Employee" | "Manager" | "Admin";
  manager_id: string | null;
};

export type Goal = {
  id: string;
  employee_id: string;
  thrust_area: string;
  title: string;
  description: string | null;
  uom_type: "min" | "max" | "timeline" | "zero";
  target_value: number;
  weightage: number;
  status: "Draft" | "Pending Approval" | "Approved/Locked";
  created_at: string;
  check_ins?: CheckIn[];
};

export type CheckIn = {
  id: string;
  goal_id: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  status: "Not Started" | "On Track" | "Completed";
  actual_achievement: number | null;
  manager_comment: string | null;
  updated_at: string;
};

export type CreateGoalInput = {
  thrust_area: string;
  title: string;
  description: string | null;
  uom_type: "min" | "max" | "timeline" | "zero";
  target_value: number;
  weightage: number;
};

export type CreateCheckInInput = {
  goal_id: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  status: "Not Started" | "On Track" | "Completed";
  actual_achievement: number | null;
};

export type ManagerCheckIn = CheckIn & {
  goals: {
    id: string;
    title: string;
    employee_id: string;
    profiles: {
      id: string;
      full_name: string;
      manager_id: string | null;
    };
  };
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("No authenticated user.");
  return data.user.id;
}

export function useDraftGoalsQuery(userId?: string) {
  return useQuery({
    queryKey: ["goals", "drafts", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) {
        throw new Error("Missing user id for draft goals query.");
      }
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("employee_id", userId)
        .eq("status", "Draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
  });
}

export function useApprovedGoalsQuery(userId?: string) {
  return useQuery({
    queryKey: ["goals", "approved", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) {
        throw new Error("Missing user id for approved goals query.");
      }
      const { data, error } = await supabase
        .from("goals")
        .select("*, check_ins(*)")
        .eq("employee_id", userId)
        .eq("status", "Approved/Locked")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
  });
}

export function useManagerCheckInsQuery(managerId?: string) {
  return useQuery({
    queryKey: ["check_ins", "manager", managerId],
    enabled: !!managerId,
    queryFn: async () => {
      if (!managerId) {
        throw new Error("Missing manager id for check-ins query.");
      }
      const { data, error } = await supabase
        .from("check_ins")
        .select("*, goals!inner(id, title, employee_id, profiles!inner(id, full_name, manager_id))")
        .eq("goals.profiles.manager_id", managerId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as ManagerCheckIn[];
    },
  });
}

export function useCreateGoalMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!userId) {
        throw new Error("Missing user id for goal creation.");
      }
      const { data, error } = await supabase
        .from("goals")
        .insert({
          employee_id: userId,
          status: "Draft",
          ...input,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goals", "drafts"] });
    },
  });
}

export function useDeleteGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);
      if (error) throw error;
      return goalId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goals", "drafts"] });
    },
  });
}

export function useSubmitDraftGoalsMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Missing user id for goal submission.");
      }
      const { data, error } = await supabase
        .from("goals")
        .update({ status: "Pending Approval" })
        .eq("employee_id", userId)
        .eq("status", "Draft")
        .select("*");

      if (error) throw error;
      return data as Goal[];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
      void queryClient.invalidateQueries({ queryKey: ["goals", "drafts", userId] });
    },
  });
}

export function useCreateCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCheckInInput) => {
      const { data, error } = await supabase
        .from("check_ins")
        .insert(input)
        .select("*")
        .single();

      if (error) throw error;
      return data as CheckIn;
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ["check_ins", input.goal_id] });
      void queryClient.invalidateQueries({ queryKey: ["goals", "approved"] });
    },
  });
}

export function useUpdateCheckInCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { checkInId: string; manager_comment: string | null }) => {
      const { data, error } = await supabase
        .from("check_ins")
        .update({ manager_comment: input.manager_comment })
        .eq("id", input.checkInId)
        .select("*")
        .single();

      if (error) throw error;
      return data as CheckIn;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["check_ins", "manager"] });
    },
  });
}
