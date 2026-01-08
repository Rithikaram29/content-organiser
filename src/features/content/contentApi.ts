import { supabase } from "../../data/supabaseClient";
import type { ContentItem, ContentStage } from "../../data/dbTypes";

export async function fetchContentInRange(startYmd: string, endYmd: string) {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .or(`scheduled_date.is.null,scheduled_date.gte.${startYmd}`)
    .lte("scheduled_date", endYmd);

  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function fetchBacklog() {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .is("scheduled_date", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function createContentItem(input: Partial<ContentItem>) {
  const { data, error } = await supabase.from("content_items").insert(input).select("*").single();
  if (error) throw error;
  return data as ContentItem;
}

export async function updateContentItem(id: string, patch: Partial<ContentItem>) {
  const { data, error } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ContentItem;
}

export async function setScheduledDate(id: string, ymdOrNull: string | null) {
  return updateContentItem(id, { scheduled_date: ymdOrNull });
}

export async function setStage(id: string, stage: ContentStage) {
  return updateContentItem(id, { stage });
}