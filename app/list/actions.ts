"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function voteCaption(captionId: string, vote: 1 | -1) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const now = new Date().toISOString();

  // 1) Try update first (most common path after first vote)
  const { data: updatedRows, error: updateErr } = await supabase
      .from("caption_votes")
      .update({
        vote_value: vote,
        modified_by_user_id: user.id,
        modified_datetime_utc: now,
      })
      .eq("profile_id", user.id)
      .eq("caption_id", captionId)
      .select("id"); // returns rows that were updated

  if (updateErr) throw new Error(updateErr.message);

  // If a row existed, update succeeded and we're done
  if (updatedRows && updatedRows.length > 0) {
    revalidatePath("/list");
    return;
  }

  // 2) Otherwise insert the first-time vote
  const { error: insertErr } = await supabase.from("caption_votes").insert({
    caption_id: captionId,
    profile_id: user.id,
    vote_value: vote,
    created_by_user_id: user.id,
    modified_by_user_id: user.id,
    created_datetime_utc: now,
    modified_datetime_utc: now,
  });

  if (insertErr) throw new Error(insertErr.message);

  revalidatePath("/list");
}
