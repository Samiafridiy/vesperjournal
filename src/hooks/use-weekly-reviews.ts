import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type WeeklyReview = {
  id: string;
  user_id: string;
  week_start: string; // date YYYY-MM-DD
  biggest_mistake: string | null;
  did_well: string | null;
  broken_rule: string | null;
  do_differently: string | null;
  discipline_rating: number;
  created_at: string;
  updated_at: string;
};

export function useWeeklyReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_reviews")
      .select("*")
      .order("week_start", { ascending: false });
    if (!error && data) setReviews(data as WeeklyReview[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`reviews-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_reviews", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  return { reviews, loading, refetch };
}