export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_logs: {
        Row: {
          action_text: string
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          goal_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          action_text: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          goal_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          action_text?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          goal_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          cached: boolean
          created_at: string
          error: string | null
          id: string
          input_tokens: number
          latency_ms: number
          model: string
          output_tokens: number
          pipeline: string
          user_id: string
        }
        Insert: {
          cached?: boolean
          created_at?: string
          error?: string | null
          id?: string
          input_tokens: number
          latency_ms: number
          model: string
          output_tokens: number
          pipeline: string
          user_id: string
        }
        Update: {
          cached?: boolean
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          model?: string
          output_tokens?: number
          pipeline?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_ai_usage: {
        Row: {
          count: number
          date: string
          user_id: string
        }
        Insert: {
          count?: number
          date: string
          user_id: string
        }
        Update: {
          count?: number
          date?: string
          user_id?: string
        }
        Relationships: []
      }
      echo_entries: {
        Row: {
          ai_insight_requested: boolean
          ai_response: string | null
          ai_status: string
          brt: Json | null
          brt_ai: Json | null
          brt_user: Json | null
          confidence: number | null
          content: string
          created_at: string
          embedding: string | null
          embedding_model: string | null
          embedding_text: string | null
          emotion: Json | null
          goal_id: string | null
          guide_response: Json | null
          id: string
          last_attempted_at: string | null
          media_url: string | null
          model_version: string | null
          processed_at: string | null
          retry_count: number
          summarized: boolean
          themes: string[] | null
          title: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          ai_insight_requested?: boolean
          ai_response?: string | null
          ai_status?: string
          brt?: Json | null
          brt_ai?: Json | null
          brt_user?: Json | null
          confidence?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          emotion?: Json | null
          goal_id?: string | null
          guide_response?: Json | null
          id?: string
          last_attempted_at?: string | null
          media_url?: string | null
          model_version?: string | null
          processed_at?: string | null
          retry_count?: number
          summarized?: boolean
          themes?: string[] | null
          title?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          ai_insight_requested?: boolean
          ai_response?: string | null
          ai_status?: string
          brt?: Json | null
          brt_ai?: Json | null
          brt_user?: Json | null
          confidence?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          emotion?: Json | null
          goal_id?: string | null
          guide_response?: Json | null
          id?: string
          last_attempted_at?: string | null
          media_url?: string | null
          model_version?: string | null
          processed_at?: string | null
          retry_count?: number
          summarized?: boolean
          themes?: string[] | null
          title?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_entries_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_entry_links: {
        Row: {
          confidence: number | null
          confirmed: boolean
          container_type: string
          created_at: string
          echo_entry_id: string
          folder_id: string | null
          goal_id: string | null
          id: string
          link_source: string
        }
        Insert: {
          confidence?: number | null
          confirmed?: boolean
          container_type: string
          created_at?: string
          echo_entry_id: string
          folder_id?: string | null
          goal_id?: string | null
          id?: string
          link_source?: string
        }
        Update: {
          confidence?: number | null
          confirmed?: boolean
          container_type?: string
          created_at?: string
          echo_entry_id?: string
          folder_id?: string | null
          goal_id?: string | null
          id?: string
          link_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_entry_links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "echo_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_goal_links_echo_entry_id_fkey"
            columns: ["echo_entry_id"]
            isOneToOne: false
            referencedRelation: "echo_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_goal_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_folders: {
        Row: {
          created_at: string
          id: string
          is_general: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_general?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_general?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      echo_sessions: {
        Row: {
          created_at: string
          goal_id: string | null
          id: string
          summary: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id?: string | null
          id?: string
          summary: Json
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string | null
          id?: string
          summary?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          ai_generated: boolean
          category: string
          color_theme: string
          community_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          embedding: string | null
          embedding_model: string | null
          embedding_text: string | null
          id: string
          is_private: boolean
          previous_goal_id: string | null
          prior_phase_summary: Json | null
          progress: number
          project_id: string | null
          smart_data: Json
          space_id: string | null
          status: string
          target_frequency: Json | null
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          ai_generated?: boolean
          category: string
          color_theme?: string
          community_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          id?: string
          is_private?: boolean
          previous_goal_id?: string | null
          prior_phase_summary?: Json | null
          progress?: number
          project_id?: string | null
          smart_data?: Json
          space_id?: string | null
          status?: string
          target_frequency?: Json | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          ai_generated?: boolean
          category?: string
          color_theme?: string
          community_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          id?: string
          is_private?: boolean
          previous_goal_id?: string | null
          prior_phase_summary?: Json | null
          progress?: number
          project_id?: string | null
          smart_data?: Json
          space_id?: string | null
          status?: string
          target_frequency?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_previous_goal_id_fkey"
            columns: ["previous_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string
          id: string
          name: string
          promoted_goal_id: string | null
          source_thorn_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          promoted_goal_id?: string | null
          source_thorn_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          promoted_goal_id?: string | null
          source_thorn_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_promoted_goal_id_fkey"
            columns: ["promoted_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interests_source_thorn_id_fkey"
            columns: ["source_thorn_id"]
            isOneToOne: false
            referencedRelation: "echo_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      measurable_logs: {
        Row: {
          id: string
          logged_at: string
          measurable_id: string
          note: string | null
          value: number
        }
        Insert: {
          id?: string
          logged_at?: string
          measurable_id: string
          note?: string | null
          value?: number
        }
        Update: {
          id?: string
          logged_at?: string
          measurable_id?: string
          note?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurable_logs_measurable_id_fkey"
            columns: ["measurable_id"]
            isOneToOne: false
            referencedRelation: "measurables"
            referencedColumns: ["id"]
          },
        ]
      }
      measurables: {
        Row: {
          created_at: string
          current_value: number
          frequency: string | null
          goal_id: string
          id: string
          is_ai_suggested: boolean
          sort_order: number
          target_unit: string | null
          target_value: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          frequency?: string | null
          goal_id: string
          id?: string
          is_ai_suggested?: boolean
          sort_order?: number
          target_unit?: string | null
          target_value?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          frequency?: string | null
          goal_id?: string
          id?: string
          is_ai_suggested?: boolean
          sort_order?: number
          target_unit?: string | null
          target_value?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurables_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          complete: boolean
          created_at: string
          due_date: string | null
          goal_id: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          complete?: boolean
          created_at?: string
          due_date?: string | null
          goal_id: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          complete?: boolean
          created_at?: string
          due_date?: string | null
          goal_id?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          character_profile: Json
          context: Json
          created_at: string
          display_name: string
          id: string
          intelligence_enabled: boolean
          interests_ai: Json | null
          interests_user: Json
          last_summarized_at: string | null
          onboarding_complete: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          character_profile?: Json
          context?: Json
          created_at?: string
          display_name?: string
          id: string
          intelligence_enabled?: boolean
          interests_ai?: Json | null
          interests_user?: Json
          last_summarized_at?: string | null
          onboarding_complete?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          character_profile?: Json
          context?: Json
          created_at?: string
          display_name?: string
          id?: string
          intelligence_enabled?: boolean
          interests_ai?: Json | null
          interests_user?: Json
          last_summarized_at?: string | null
          onboarding_complete?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          space_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          space_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          space_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          space_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role: string
          space_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          space_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          owner_id: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          owner_id: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      vault_items: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          embedding: string | null
          embedding_model: string | null
          embedding_text: string | null
          id: string
          item_type: string
          metadata: Json
          sort_order: number
          title: string | null
          updated_at: string
          vault_id: string
          visibility: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          id?: string
          item_type: string
          metadata?: Json
          sort_order?: number
          title?: string | null
          updated_at?: string
          vault_id: string
          visibility?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          id?: string
          item_type?: string
          metadata?: Json
          sort_order?: number
          title?: string | null
          updated_at?: string
          vault_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_items_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      vaults: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          space_id: string | null
          updated_at: string
          user_id: string
          vault_type: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          space_id?: string | null
          updated_at?: string
          user_id: string
          vault_type?: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          space_id?: string | null
          updated_at?: string
          user_id?: string
          vault_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaults_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: true
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaults_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_daily_ai_quota: {
        Args: { p_date: string; p_limit?: number }
        Returns: {
          allowed: boolean
          count: number
        }[]
      }
      delete_folder_reassign: {
        Args: { p_folder_id: string; p_general_folder_id: string }
        Returns: undefined
      }
      delete_folder_with_contents: {
        Args: { p_folder_id: string }
        Returns: undefined
      }
      get_or_create_general_folder: {
        Args: { p_user_id: string }
        Returns: string
      }
      match_echo_entries: {
        Args: {
          match_limit?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          brt: Json
          content: string
          created_at: string
          goal_id: string
          id: string
          similarity: number
          user_id: string
        }[]
      }
      match_goals: {
        Args: {
          match_limit?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          similarity: number
          smart_data: Json
          status: string
          title: string
          user_id: string
        }[]
      }
      match_vault_items: {
        Args: {
          match_limit?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          created_by: string
          id: string
          item_type: string
          similarity: number
          title: string
          vault_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
