import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  companyId: string;
  isOwner: boolean;
  canRegisterExpenses: boolean;
  canRegisterMaterials: boolean;
};

export const currentUserQuery = queryOptions({
  queryKey: ["current-user"],
  queryFn: async (): Promise<CurrentUser | null> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    ]);
    if (!profile) return null;
    const isOwner = (roles ?? []).some((r) => r.role === "owner");
    return {
      id: auth.user.id,
      email: auth.user.email ?? null,
      fullName: profile.full_name,
      companyId: profile.company_id,
      isOwner,
      canRegisterExpenses: isOwner || profile.can_register_expenses,
      canRegisterMaterials: isOwner || profile.can_register_materials,
    };
  },
});

export function useCurrentUser() {
  return useQuery(currentUserQuery);
}
