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
      constellation_annotations: {
        Row: {
          anchor_earned_node_id: string | null
          anchor_goal_id: string | null
          archived_at: string | null
          authorship: string
          body: string | null
          created_at: string
          id: string
          is_draft: boolean
          kind: string
          label: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          anchor_earned_node_id?: string | null
          anchor_goal_id?: string | null
          archived_at?: string | null
          authorship?: string
          body?: string | null
          created_at?: string
          id?: string
          is_draft?: boolean
          kind: string
          label: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          anchor_earned_node_id?: string | null
          anchor_goal_id?: string | null
          archived_at?: string | null
          authorship?: string
          body?: string | null
          created_at?: string
          id?: string
          is_draft?: boolean
          kind?: string
          label?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "constellation_annotations_anchor_earned_node_id_fkey"
            columns: ["anchor_earned_node_id"]
            isOneToOne: false
            referencedRelation: "constellation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constellation_annotations_anchor_goal_fkey"
            columns: ["anchor_goal_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      constellation_edges: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          kind: string
          last_activity_at: string | null
          owner_id: string
          source_node_id: string
          status: string
          target_node_id: string
          updated_at: string
          valence: string | null
          weight: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          kind: string
          last_activity_at?: string | null
          owner_id: string
          source_node_id: string
          status?: string
          target_node_id: string
          updated_at?: string
          valence?: string | null
          weight?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_activity_at?: string | null
          owner_id?: string
          source_node_id?: string
          status?: string
          target_node_id?: string
          updated_at?: string
          valence?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "constellation_edges_source_node_fkey"
            columns: ["source_node_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "constellation_nodes"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "constellation_edges_target_node_fkey"
            columns: ["target_node_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "constellation_nodes"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      constellation_evidence_links: {
        Row: {
          created_at: string
          echo_entry_id: string
          goal_id: string
          id: string
          note: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          echo_entry_id: string
          goal_id: string
          id?: string
          note?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          echo_entry_id?: string
          goal_id?: string
          id?: string
          note?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "constellation_evidence_links_echo_owner_fkey"
            columns: ["echo_entry_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "echo_entries"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "constellation_evidence_links_goal_owner_fkey"
            columns: ["goal_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      constellation_nodes: {
        Row: {
          archived_at: string | null
          authorship: string
          created_at: string
          description: string | null
          first_seen_at: string | null
          id: string
          is_earned: boolean
          kind: string
          label: string
          last_activity_at: string | null
          owner_id: string
          season_id: string | null
          source_goal_id: string | null
          source_key: string | null
          source_profile_id: string | null
          source_project_id: string | null
          source_type: string
          status: string
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          archived_at?: string | null
          authorship?: string
          created_at?: string
          description?: string | null
          first_seen_at?: string | null
          id?: string
          is_earned?: boolean
          kind: string
          label: string
          last_activity_at?: string | null
          owner_id: string
          season_id?: string | null
          source_goal_id?: string | null
          source_key?: string | null
          source_profile_id?: string | null
          source_project_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          archived_at?: string | null
          authorship?: string
          created_at?: string
          description?: string | null
          first_seen_at?: string | null
          id?: string
          is_earned?: boolean
          kind?: string
          label?: string
          last_activity_at?: string | null
          owner_id?: string
          season_id?: string | null
          source_goal_id?: string | null
          source_key?: string | null
          source_profile_id?: string | null
          source_project_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "constellation_nodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "constellation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constellation_nodes_source_goal_fkey"
            columns: ["source_goal_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "constellation_nodes_source_project_fkey"
            columns: ["source_project_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
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
          brt_category: string | null
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
          brt_category?: string | null
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
          brt_category?: string | null
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
      echo_session_events: {
        Row: {
          created_at: string
          event_key: string
          event_type: string
          id: string
          payload: Json
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          payload?: Json
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          payload?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "echo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      echo_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          external_session_id: string | null
          final_entry_id: string | null
          goal_id: string | null
          id: string
          project_id: string | null
          started_at: string
          status: string
          summary: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          external_session_id?: string | null
          final_entry_id?: string | null
          goal_id?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          status?: string
          summary?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          external_session_id?: string | null
          final_entry_id?: string | null
          goal_id?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
          status?: string
          summary?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echo_sessions_final_entry_id_fkey"
            columns: ["final_entry_id"]
            isOneToOne: false
            referencedRelation: "echo_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echo_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          reflected_at: string | null
          reflection: string | null
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
          reflected_at?: string | null
          reflection?: string | null
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
          reflected_at?: string | null
          reflection?: string | null
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
      invite_links: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          uses_count: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          goal_id: string
          id: string
          is_ai_suggested: boolean
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id: string
          id?: string
          is_ai_suggested?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id?: string
          id?: string
          is_ai_suggested?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
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
          username: string
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
          username: string
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
          username?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          period_key: string | null
          space_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          period_key?: string | null
          space_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          period_key?: string | null
          space_id?: string | null
          start_date?: string | null
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
      tracker_logs: {
        Row: {
          id: string
          logged_at: string
          note: string | null
          tracker_id: string
          value: number
        }
        Insert: {
          id?: string
          logged_at?: string
          note?: string | null
          tracker_id: string
          value?: number
        }
        Update: {
          id?: string
          logged_at?: string
          note?: string | null
          tracker_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracker_logs_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      trackers: {
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
            foreignKeyName: "trackers_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      username_change_limits: {
        Row: {
          change_timestamps: string[]
          user_id: string
        }
        Insert: {
          change_timestamps?: string[]
          user_id: string
        }
        Update: {
          change_timestamps?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "username_change_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      check_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      consume_daily_ai_quota: {
        Args: { p_date: string; p_limit?: number }
        Returns: {
          allowed: boolean
          count: number
        }[]
      }
      create_echo_entry_with_container: {
        Args: {
          p_ai_insight_requested: boolean
          p_brt: Json
          p_content: string
          p_embedding_text: string
          p_emotion: Json
          p_goal_id: string
          p_title: string
        }
        Returns: string
      }
      delete_folder_reassign: {
        Args: { p_folder_id: string; p_general_folder_id: string }
        Returns: undefined
      }
      delete_folder_with_contents: {
        Args: { p_folder_id: string }
        Returns: undefined
      }
      finish_agent_session: {
        Args: {
          p_idempotency_key: string
          p_session_id: string
          p_summary: Json
        }
        Returns: {
          final_entry_id: string
          requires_approval: boolean
          session_status: string
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_unique_username: {
        Args: { p_base: string; p_id: string }
        Returns: string
      }
      get_friend_count: { Args: { user_id: string }; Returns: number }
      get_or_create_general_folder: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_profiles_by_ids: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
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
      publish_agent_session: {
        Args: {
          p_content: string
          p_embedding_text: string
          p_idempotency_key: string
          p_session_id: string
          p_title: string
          p_user_approved: boolean
        }
        Returns: string
      }
      record_agent_session_change: {
        Args: {
          p_event_key: string
          p_event_type: string
          p_payload: Json
          p_session_id: string
        }
        Returns: string
      }
      redeem_invite_link: { Args: { code: string }; Returns: Json }
      respond_to_friend_request: {
        Args: { p_connection_id: string; p_response: string }
        Returns: string
      }
      search_profiles_by_username: {
        Args: { query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      send_friend_request: { Args: { p_addressee_id: string }; Returns: string }
      start_agent_session: {
        Args: {
          p_end_date: string
          p_external_session_id: string
          p_goal_category: string
          p_goal_color_theme: string
          p_goal_description: string
          p_goal_title: string
          p_period_key: string
          p_project_description: string
          p_project_id: string
          p_project_title: string
          p_start_date: string
        }
        Returns: {
          goal_id: string
          project_id: string
          session_id: string
          was_created: boolean
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
