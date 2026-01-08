export type UserRole = "admin" | "editor" | "viewer";
export type ContentStage = "idea" | "script" | "shooting" | "editing" | "scheduled" | "posted";
export type ContentPlatform =
  | "instagram"
  | "youtube"
  | "youtube_shorts"
  | "tiktok"
  | "podcast"
  | "twitter"
  | "linkedin"
  | "other";

export type AssetType = "raw_files" | "inspiration" | "final_post";

export type Profile = {
  user_id: string;
  display_name: string | null;
  role: UserRole;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  platform: ContentPlatform;
  stage: ContentStage;
  category_id: string | null;
  scheduled_date: string | null; // yyyy-mm-dd
  timeline_days: number;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  content_item_id: string;
  type: AssetType;
  url: string;
  label: string | null;
  drive_file_id: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  content_item_id: string;
  author_id: string;
  body: string;
  created_at: string;
};