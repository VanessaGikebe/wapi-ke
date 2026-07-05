/**
 * Supabase database types.
 *
 * Hand-authored for the tables the app touches directly. After you apply the
 * SQL migrations you can regenerate the full set with:
 *
 *   supabase gen types typescript --project-id qcvlmwahpnyehsmlgmuj > lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  favorite_categories: string[] | null;
  home_county: string | null;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      user_preferences: {
        Row: UserPreferencesRow;
        Insert: Partial<UserPreferencesRow> & { user_id: string };
        Update: Partial<UserPreferencesRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      event_status: "upcoming" | "ongoing" | "ended" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
}
