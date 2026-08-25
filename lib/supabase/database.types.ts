export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { user_id: string; display_name: string | null; preferred_translation: string; history_enabled: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; display_name?: string | null; preferred_translation?: string; history_enabled?: boolean; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; preferred_translation?: string; history_enabled?: boolean; updated_at?: string; user_id?: string };
        Relationships: [];
      };
      saved_passages: {
        Row: { id: string; user_id: string; reference: string; translation: string; excerpt: string | null; context_note: string | null; created_at: string };
        Insert: { id?: string; user_id: string; reference: string; translation?: string; excerpt?: string | null; context_note?: string | null; created_at?: string };
        Update: { reference?: string; translation?: string; excerpt?: string | null; context_note?: string | null; user_id?: string };
        Relationships: [];
      };
      private_notes: {
        Row: { id: string; user_id: string; passage_reference: string | null; body: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; passage_reference?: string | null; body: string; created_at?: string; updated_at?: string };
        Update: { passage_reference?: string | null; body?: string; updated_at?: string; user_id?: string };
        Relationships: [];
      };
      response_feedback: {
        Row: { id: string; user_id: string | null; rating: string; safety_level: string | null; response_source: string | null; detail: string | null; consent_to_review: boolean; created_at: string };
        Insert: { id?: string; user_id?: string | null; rating: string; safety_level?: string | null; response_source?: string | null; detail?: string | null; consent_to_review?: boolean; created_at?: string };
        Update: { rating?: string; safety_level?: string | null; response_source?: string | null; detail?: string | null; consent_to_review?: boolean; user_id?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
