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
    PostgrestVersion: "14.5"
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
      circle_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          image_path: string | null
          link_category: string | null
          link_description: string | null
          link_kind: string | null
          link_ref_id: string | null
          link_title: string | null
          post_kind: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          link_category?: string | null
          link_description?: string | null
          link_kind?: string | null
          link_ref_id?: string | null
          link_title?: string | null
          post_kind?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          link_category?: string | null
          link_description?: string | null
          link_kind?: string | null
          link_ref_id?: string | null
          link_title?: string | null
          post_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      constellation_goal_links: {
        Row: {
          created_at: string
          id: string
          note: string
          owner_id: string
          source_goal_id: string
          target_goal_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          owner_id: string
          source_goal_id: string
          target_goal_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          owner_id?: string
          source_goal_id?: string
          target_goal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "constellation_goal_links_source_owner_fkey"
            columns: ["source_goal_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "constellation_goal_links_target_owner_fkey"
            columns: ["target_goal_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      constellation_layout_positions: {
        Row: {
          coordinate_space: string
          created_at: string
          owner_id: string
          selection_key: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          coordinate_space: string
          created_at?: string
          owner_id: string
          selection_key: string
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          coordinate_space?: string
          created_at?: string
          owner_id?: string
          selection_key?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: []
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
      entries: {
        Row: {
          archived: boolean
          brt_category: string | null
          client_request_id: string | null
          completed_at: string | null
          content: Json
          content_version: number
          conversation_turns: Json
          created_at: string
          entry_type: string
          id: string
          pinned: boolean
          plain_text: string
          project_id: string | null
          reflection_type: string | null
          schema_version: number
          takeaway: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          brt_category?: string | null
          client_request_id?: string | null
          completed_at?: string | null
          content?: Json
          content_version?: number
          conversation_turns?: Json
          created_at?: string
          entry_type: string
          id?: string
          pinned?: boolean
          plain_text?: string
          project_id?: string | null
          reflection_type?: string | null
          schema_version?: number
          takeaway?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          brt_category?: string | null
          client_request_id?: string | null
          completed_at?: string | null
          content?: Json
          content_version?: number
          conversation_turns?: Json
          created_at?: string
          entry_type?: string
          id?: string
          pinned?: boolean
          plain_text?: string
          project_id?: string | null
          reflection_type?: string | null
          schema_version?: number
          takeaway?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_category_links: {
        Row: {
          category_id: string
          created_at: string
          entry_id: string
          id: string
          link_source: string
        }
        Insert: {
          category_id: string
          created_at?: string
          entry_id: string
          id?: string
          link_source?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          link_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_category_links_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_goal_links: {
        Row: {
          created_at: string
          entry_id: string
          goal_id: string
          id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          goal_id: string
          id?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_goal_links_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_goal_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_goal_progress_events: {
        Row: {
          block_id: string | null
          created_at: string
          entry_id: string
          event_type: string
          goal_id: string
          id: string
          occurred_at: string
          owner_id: string
          payload: Json
          reference_id: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          entry_id: string
          event_type?: string
          goal_id: string
          id?: string
          occurred_at?: string
          owner_id: string
          payload?: Json
          reference_id: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          entry_id?: string
          event_type?: string
          goal_id?: string
          id?: string
          occurred_at?: string
          owner_id?: string
          payload?: Json
          reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_goal_progress_events_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_goal_progress_events_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_goal_progress_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_goal_progress_evidence: {
        Row: {
          block_id: string | null
          checkbox_completed: boolean
          completed_at: string | null
          completion_count: number
          created_at: string
          entry_id: string
          excerpt: string
          goal_id: string
          id: string
          owner_id: string
          reference_created_at: string | null
          reference_id: string
          source_type: string
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          checkbox_completed?: boolean
          completed_at?: string | null
          completion_count?: number
          created_at?: string
          entry_id: string
          excerpt?: string
          goal_id: string
          id?: string
          owner_id: string
          reference_created_at?: string | null
          reference_id: string
          source_type: string
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          checkbox_completed?: boolean
          completed_at?: string | null
          completion_count?: number
          created_at?: string
          entry_id?: string
          excerpt?: string
          goal_id?: string
          id?: string
          owner_id?: string
          reference_created_at?: string | null
          reference_id?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_goal_progress_evidence_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_goal_progress_evidence_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_goal_progress_evidence_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      goal_deadline_history: {
        Row: {
          changed_at: string
          goal_id: string
          id: string
          new_deadline: string | null
          previous_deadline: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          goal_id: string
          id?: string
          new_deadline?: string | null
          previous_deadline?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          goal_id?: string
          id?: string
          new_deadline?: string | null
          previous_deadline?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_deadline_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_difficulty_profiles: {
        Row: {
          category: string
          category_config_version: string
          composite_score: number
          created_at: string
          difficulty_band: string
          difficulty_version: string
          dimension_scores: Json
          effective_weights: Json
          goal_id: string
          goal_mode: string
          id: string
          plan_revision_key: string
          source_inputs: Json
          user_id: string
        }
        Insert: {
          category: string
          category_config_version: string
          composite_score: number
          created_at?: string
          difficulty_band: string
          difficulty_version: string
          dimension_scores: Json
          effective_weights: Json
          goal_id: string
          goal_mode: string
          id?: string
          plan_revision_key: string
          source_inputs: Json
          user_id: string
        }
        Update: {
          category?: string
          category_config_version?: string
          composite_score?: number
          created_at?: string
          difficulty_band?: string
          difficulty_version?: string
          dimension_scores?: Json
          effective_weights?: Json
          goal_id?: string
          goal_mode?: string
          id?: string
          plan_revision_key?: string
          source_inputs?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_difficulty_profiles_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_difficulty_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_momentum_profiles: {
        Row: {
          algorithm_version: string
          created_at: string
          current_value: number
          difficulty_profile_version: string
          goal_id: string
          last_calculated_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm_version?: string
          created_at?: string
          current_value?: number
          difficulty_profile_version?: string
          goal_id: string
          last_calculated_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm_version?: string
          created_at?: string
          current_value?: number
          difficulty_profile_version?: string
          goal_id?: string
          last_calculated_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_momentum_profiles_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_momentum_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_momentum_weekly_snapshots: {
        Row: {
          algorithm_version: string
          calculation_hash: string
          category_config_version: string
          created_at: string
          current_value: number
          difficulty_profile_id: string
          difficulty_version: string
          effective_weights: Json
          goal_id: string
          id: string
          input_events: Json
          pillar_components: Json
          pillar_scores: Json
          previous_value: number | null
          raw_aggregates: Json
          raw_score: number
          reason_codes: Json
          revision: number
          score_status: string
          supersedes_snapshot_id: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          algorithm_version: string
          calculation_hash: string
          category_config_version: string
          created_at?: string
          current_value: number
          difficulty_profile_id: string
          difficulty_version: string
          effective_weights: Json
          goal_id: string
          id?: string
          input_events: Json
          pillar_components: Json
          pillar_scores: Json
          previous_value?: number | null
          raw_aggregates: Json
          raw_score: number
          reason_codes: Json
          revision?: number
          score_status: string
          supersedes_snapshot_id?: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          algorithm_version?: string
          calculation_hash?: string
          category_config_version?: string
          created_at?: string
          current_value?: number
          difficulty_profile_id?: string
          difficulty_version?: string
          effective_weights?: Json
          goal_id?: string
          id?: string
          input_events?: Json
          pillar_components?: Json
          pillar_scores?: Json
          previous_value?: number | null
          raw_aggregates?: Json
          raw_score?: number
          reason_codes?: Json
          revision?: number
          score_status?: string
          supersedes_snapshot_id?: string | null
          timezone?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_momentum_weekly_snapshots_difficulty_profile_id_fkey"
            columns: ["difficulty_profile_id"]
            isOneToOne: false
            referencedRelation: "goal_difficulty_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_momentum_weekly_snapshots_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_momentum_weekly_snapshots_supersedes_snapshot_id_fkey"
            columns: ["supersedes_snapshot_id"]
            isOneToOne: false
            referencedRelation: "goal_momentum_weekly_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_momentum_weekly_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_share_invites: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          invitee_id: string
          owner_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          invitee_id: string
          owner_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          invitee_id?: string
          owner_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_share_invites_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_share_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_share_invites_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          ai_generated: boolean
          archived_at: string | null
          category: string
          color_theme: string
          community_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          embedding: string | null
          embedding_model: string | null
          embedding_text: string | null
          expired_at: string | null
          id: string
          is_private: boolean
          momentum_scoring_profile: string
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
          archived_at?: string | null
          category: string
          color_theme?: string
          community_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          expired_at?: string | null
          id?: string
          is_private?: boolean
          momentum_scoring_profile?: string
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
          archived_at?: string | null
          category?: string
          color_theme?: string
          community_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_text?: string | null
          expired_at?: string | null
          id?: string
          is_private?: boolean
          momentum_scoring_profile?: string
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
          kind: string
          parent_id: string | null
          photo_url: string | null
          sort_order: number
          target_count: number | null
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
          kind?: string
          parent_id?: string | null
          photo_url?: string | null
          sort_order?: number
          target_count?: number | null
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
          kind?: string
          parent_id?: string | null
          photo_url?: string | null
          sort_order?: number
          target_count?: number | null
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
          {
            foreignKeyName: "milestones_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_events: {
        Row: {
          created_at: string
          deduplication_key: string
          eligibility_status: string
          event_type: string
          exclusion_reason: string | null
          id: string
          occurred_at: string
          payload: Json
          source_entity_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deduplication_key: string
          eligibility_status: string
          event_type: string
          exclusion_reason?: string | null
          id?: string
          occurred_at: string
          payload?: Json
          source_entity_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deduplication_key?: string
          eligibility_status?: string
          event_type?: string
          exclusion_reason?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          source_entity_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_profiles: {
        Row: {
          created_at: string
          current_value: number
          current_version: string
          last_calculated_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          current_version?: string
          last_calculated_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          current_version?: string
          last_calculated_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_weekly_snapshots: {
        Row: {
          algorithm_version: string
          calculation_hash: string
          configuration_version: string | null
          created_at: string
          difficulty_multiplier: number
          effective_weights: Json
          growth_quality_score: number
          id: string
          input_actions: Json
          input_events: Json
          next_value: number
          pillar_scores: Json
          portfolio_components: Json | null
          previous_value: number
          raw_aggregates: Json
          raw_score: number | null
          reason_codes: Json
          revision: number
          score_status: string | null
          source_goal_snapshot_ids: Json
          supersedes_snapshot_id: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
          weekly_drag: number
          weekly_gain: number
        }
        Insert: {
          algorithm_version: string
          calculation_hash: string
          configuration_version?: string | null
          created_at?: string
          difficulty_multiplier: number
          effective_weights: Json
          growth_quality_score: number
          id?: string
          input_actions: Json
          input_events: Json
          next_value: number
          pillar_scores: Json
          portfolio_components?: Json | null
          previous_value: number
          raw_aggregates: Json
          raw_score?: number | null
          reason_codes: Json
          revision?: number
          score_status?: string | null
          source_goal_snapshot_ids?: Json
          supersedes_snapshot_id?: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
          weekly_drag: number
          weekly_gain: number
        }
        Update: {
          algorithm_version?: string
          calculation_hash?: string
          configuration_version?: string | null
          created_at?: string
          difficulty_multiplier?: number
          effective_weights?: Json
          growth_quality_score?: number
          id?: string
          input_actions?: Json
          input_events?: Json
          next_value?: number
          pillar_scores?: Json
          portfolio_components?: Json | null
          previous_value?: number
          raw_aggregates?: Json
          raw_score?: number | null
          reason_codes?: Json
          revision?: number
          score_status?: string | null
          source_goal_snapshot_ids?: Json
          supersedes_snapshot_id?: string | null
          timezone?: string
          user_id?: string
          week_end?: string
          week_start?: string
          weekly_drag?: number
          weekly_gain?: number
        }
        Relationships: [
          {
            foreignKeyName: "momentum_weekly_snapshots_supersedes_snapshot_id_fkey"
            columns: ["supersedes_snapshot_id"]
            isOneToOne: false
            referencedRelation: "momentum_weekly_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_weekly_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_encouragements: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_encouragements_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_encouragements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      project_goal_events: {
        Row: {
          event_type: string
          goal_id: string
          id: string
          occurred_at: string
          owner_id: string
          prior_project_id: string | null
          project_id: string | null
        }
        Insert: {
          event_type: string
          goal_id: string
          id?: string
          occurred_at?: string
          owner_id: string
          prior_project_id?: string | null
          project_id?: string | null
        }
        Update: {
          event_type?: string
          goal_id?: string
          id?: string
          occurred_at?: string
          owner_id?: string
          prior_project_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_goal_events_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_goal_events_prior_project_id_fkey"
            columns: ["prior_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_goal_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      reflection_milestone_links: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          milestone_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          milestone_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          milestone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_milestone_links_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflection_milestone_links_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "circle_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      task_mutation_receipts: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          idempotency_key: string
          operation: string
          result_entity_id: string | null
          result_payload: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          idempotency_key: string
          operation: string
          result_entity_id?: string | null
          result_payload?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          idempotency_key?: string
          operation?: string
          result_entity_id?: string | null
          result_payload?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_mutation_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_occurrences: {
        Row: {
          actual_quantity: number | null
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          legacy_action_log_id: string | null
          legacy_raw_value: number | null
          legacy_tracker_log_id: string | null
          note: string | null
          occurrence_key: string
          schedule_id: string | null
          schedule_timezone: string | null
          scheduled_at: string | null
          scheduled_local_date: string | null
          scheduled_local_time: string | null
          skipped_at: string | null
          source: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_quantity?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          legacy_action_log_id?: string | null
          legacy_raw_value?: number | null
          legacy_tracker_log_id?: string | null
          note?: string | null
          occurrence_key: string
          schedule_id?: string | null
          schedule_timezone?: string | null
          scheduled_at?: string | null
          scheduled_local_date?: string | null
          scheduled_local_time?: string | null
          skipped_at?: string | null
          source?: string
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_quantity?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          legacy_action_log_id?: string | null
          legacy_raw_value?: number | null
          legacy_tracker_log_id?: string | null
          note?: string | null
          occurrence_key?: string
          schedule_id?: string | null
          schedule_timezone?: string | null
          scheduled_at?: string | null
          scheduled_local_date?: string | null
          scheduled_local_time?: string | null
          skipped_at?: string | null
          source?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_occurrences_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "task_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_occurrences_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_occurrences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_schedules: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          interval_count: number
          is_active: boolean
          local_time: string | null
          recurrence_kind: string
          source: string
          start_date: string
          task_id: string
          timezone: string
          updated_at: string
          user_id: string
          version: number
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          interval_count?: number
          is_active?: boolean
          local_time?: string | null
          recurrence_kind: string
          source?: string
          start_date: string
          task_id: string
          timezone: string
          updated_at?: string
          user_id: string
          version: number
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          interval_count?: number
          is_active?: boolean
          local_time?: string | null
          recurrence_kind?: string
          source?: string
          start_date?: string
          task_id?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          version?: number
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "task_schedules_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          completion_mode: string
          create_idempotency_key: string | null
          created_at: string
          description: string | null
          due_date: string | null
          goal_id: string
          id: string
          legacy_action_log_id: string | null
          legacy_current_value: number | null
          legacy_frequency: string | null
          legacy_is_ai_suggested: boolean | null
          legacy_status: string | null
          legacy_target_unit: string | null
          legacy_target_value: number | null
          legacy_tracker_id: string | null
          legacy_tracker_type: string | null
          milestone_id: string | null
          quantity_unit: string | null
          sort_order: number
          source: string
          status: string
          target_quantity: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          completion_mode: string
          create_idempotency_key?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id: string
          id?: string
          legacy_action_log_id?: string | null
          legacy_current_value?: number | null
          legacy_frequency?: string | null
          legacy_is_ai_suggested?: boolean | null
          legacy_status?: string | null
          legacy_target_unit?: string | null
          legacy_target_value?: number | null
          legacy_tracker_id?: string | null
          legacy_tracker_type?: string | null
          milestone_id?: string | null
          quantity_unit?: string | null
          sort_order?: number
          source?: string
          status?: string
          target_quantity?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          completion_mode?: string
          create_idempotency_key?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id?: string
          id?: string
          legacy_action_log_id?: string | null
          legacy_current_value?: number | null
          legacy_frequency?: string | null
          legacy_is_ai_suggested?: boolean | null
          legacy_status?: string | null
          legacy_target_unit?: string | null
          legacy_target_value?: number | null
          legacy_tracker_id?: string | null
          legacy_tracker_type?: string | null
          milestone_id?: string | null
          quantity_unit?: string | null
          sort_order?: number
          source?: string
          status?: string
          target_quantity?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          content_kind: string
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
          content_kind?: string
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
          content_kind?: string
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
          goal_id: string | null
          id: string
          project_id: string | null
          space_id: string | null
          updated_at: string
          user_id: string
          vault_type: string
        }
        Insert: {
          created_at?: string
          goal_id?: string | null
          id?: string
          project_id?: string | null
          space_id?: string | null
          updated_at?: string
          user_id: string
          vault_type?: string
        }
        Update: {
          created_at?: string
          goal_id?: string | null
          id?: string
          project_id?: string | null
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
            foreignKeyName: "vaults_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
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
      assign_goals_to_project_v1: {
        Args: {
          p_allow_reassignment?: boolean
          p_goal_ids: string[]
          p_project_id: string
        }
        Returns: number
      }
      adjust_task_occurrence_quantity_v1: {
        Args: {
          p_delta: number
          p_idempotency_key: string
          p_occurrence_id: string
        }
        Returns: number
      }
      archive_task_v1: {
        Args: { p_idempotency_key: string; p_task_id: string }
        Returns: string
      }
      are_friends: { Args: { p_a: string; p_b: string }; Returns: boolean }
      check_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      circles_goal_summary: {
        Args: { p_access: string; p_goal_id: string }
        Returns: Json
      }
      consume_daily_ai_quota: {
        Args: { p_date: string; p_limit?: number }
        Returns: {
          allowed: boolean
          count: number
        }[]
      }
      create_circle_post: {
        Args: {
          p_body: string
          p_image_path?: string
          p_link_description?: string
          p_link_kind?: string
          p_link_ref_id?: string
        }
        Returns: string
      }
      create_project_v1: {
        Args: {
          p_allow_reassignment?: boolean
          p_description?: string
          p_goal_ids?: string[]
          p_title: string
        }
        Returns: string
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
      create_task_v1: {
        Args: {
          p_completion_mode: string
          p_description?: string
          p_due_date?: string
          p_goal_id: string
          p_idempotency_key?: string
          p_milestone_id?: string
          p_quantity_unit?: string
          p_schedule_end?: string
          p_schedule_interval?: number
          p_schedule_kind?: string
          p_schedule_local_time?: string
          p_schedule_start?: string
          p_schedule_timezone?: string
          p_schedule_weekdays?: number[]
          p_sort_order?: number
          p_target_quantity?: number
          p_title: string
        }
        Returns: string
      }
      delete_circle_comment: { Args: { p_comment_id: string }; Returns: string }
      delete_circle_post: { Args: { p_post_id: string }; Returns: string }
      delete_folder_reassign: {
        Args: { p_folder_id: string; p_general_folder_id: string }
        Returns: undefined
      }
      delete_folder_with_contents: {
        Args: { p_folder_id: string }
        Returns: undefined
      }
      detach_goal_from_project_v1: {
        Args: { p_goal_id: string; p_project_id: string }
        Returns: boolean
      }
      extend_goal_deadline_v1: {
        Args: { p_goal_id: string; p_new_deadline: string }
        Returns: string
      }
      finalize_tasks_legacy_cutover_v1: {
        Args: never
        Returns: {
          duplicate_mappings: number
          mapped_rows: number
          source_name: string
          source_rows: number
          unmapped_rows: number
        }[]
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
      freeze_tasks_legacy_writes_v1: { Args: never; Returns: undefined }
      generate_invite_code: { Args: never; Returns: string }
      generate_unique_username: {
        Args: { p_base: string; p_id: string }
        Returns: string
      }
      get_circles_feed: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          author_id: string
          body: string
          comment_count: number
          created_at: string
          encouraged_by_me: boolean
          encouragement_count: number
          id: string
          image_path: string
          link_category: string
          link_description: string
          link_kind: string
          link_ref_id: string
          link_title: string
          post_kind: string
          saved_by_me: boolean
        }[]
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
      get_viewable_goal: { Args: { p_goal_id: string }; Returns: Json }
      list_friend_public_goals: { Args: never; Returns: Json[] }
      list_goals_shared_with_me: { Args: never; Returns: Json[] }
      list_my_goal_invites: {
        Args: never
        Returns: {
          created_at: string
          goal: Json
          invite_id: string
        }[]
      }
      log_completed_task_v1: {
        Args: {
          p_actual_quantity?: number
          p_completed_at: string
          p_completion_mode: string
          p_description?: string
          p_goal_id: string
          p_idempotency_key?: string
          p_milestone_id?: string
          p_quantity_unit?: string
          p_target_quantity?: number
          p_title: string
        }
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
      publish_goal_momentum_v1_snapshot: {
        Args: {
          p_algorithm_version: string
          p_calculation_hash: string
          p_category: string
          p_category_config_version: string
          p_current_value: number
          p_difficulty_band: string
          p_difficulty_dimensions: Json
          p_difficulty_effective_weights: Json
          p_difficulty_score: number
          p_difficulty_source_inputs: Json
          p_difficulty_version: string
          p_effective_weights: Json
          p_goal_id: string
          p_goal_mode: string
          p_input_events: Json
          p_pillar_components: Json
          p_pillar_scores: Json
          p_plan_revision_key: string
          p_previous_value: number
          p_raw_aggregates: Json
          p_raw_score: number
          p_reason_codes: Json
          p_score_status: string
          p_timezone: string
          p_user_id: string
          p_week_end: string
          p_week_start: string
        }
        Returns: {
          algorithm_version: string
          calculation_hash: string
          category_config_version: string
          created_at: string
          current_value: number
          difficulty_profile_id: string
          difficulty_version: string
          effective_weights: Json
          goal_id: string
          id: string
          input_events: Json
          pillar_components: Json
          pillar_scores: Json
          previous_value: number | null
          raw_aggregates: Json
          raw_score: number
          reason_codes: Json
          revision: number
          score_status: string
          supersedes_snapshot_id: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
        }
        SetofOptions: {
          from: "*"
          to: "goal_momentum_weekly_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_momentum_snapshot: {
        Args: {
          p_algorithm_version: string
          p_calculation_hash: string
          p_difficulty_multiplier: number
          p_effective_weights: Json
          p_events: Json
          p_growth_quality_score: number
          p_input_actions: Json
          p_input_events: Json
          p_next_value: number
          p_pillar_scores: Json
          p_previous_value: number
          p_raw_aggregates: Json
          p_reason_codes: Json
          p_timezone: string
          p_user_id: string
          p_week_end: string
          p_week_start: string
          p_weekly_drag: number
          p_weekly_gain: number
        }
        Returns: {
          algorithm_version: string
          calculation_hash: string
          configuration_version: string | null
          created_at: string
          difficulty_multiplier: number
          effective_weights: Json
          growth_quality_score: number
          id: string
          input_actions: Json
          input_events: Json
          next_value: number
          pillar_scores: Json
          portfolio_components: Json | null
          previous_value: number
          raw_aggregates: Json
          raw_score: number | null
          reason_codes: Json
          revision: number
          score_status: string | null
          source_goal_snapshot_ids: Json
          supersedes_snapshot_id: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
          weekly_drag: number
          weekly_gain: number
        }
        SetofOptions: {
          from: "*"
          to: "momentum_weekly_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_ohara_momentum_v1_snapshot: {
        Args: {
          p_algorithm_version: string
          p_calculation_hash: string
          p_configuration_version: string
          p_current_value: number
          p_effective_weights: Json
          p_input_events: Json
          p_portfolio_components: Json
          p_previous_value: number
          p_raw_aggregates: Json
          p_raw_score: number
          p_reason_codes: Json
          p_score_status: string
          p_source_goal_snapshot_ids: Json
          p_timezone: string
          p_user_id: string
          p_week_end: string
          p_week_start: string
        }
        Returns: {
          algorithm_version: string
          calculation_hash: string
          configuration_version: string | null
          created_at: string
          difficulty_multiplier: number
          effective_weights: Json
          growth_quality_score: number
          id: string
          input_actions: Json
          input_events: Json
          next_value: number
          pillar_scores: Json
          portfolio_components: Json | null
          previous_value: number
          raw_aggregates: Json
          raw_score: number | null
          reason_codes: Json
          revision: number
          score_status: string | null
          source_goal_snapshot_ids: Json
          supersedes_snapshot_id: string | null
          timezone: string
          user_id: string
          week_end: string
          week_start: string
          weekly_drag: number
          weekly_gain: number
        }
        SetofOptions: {
          from: "*"
          to: "momentum_weekly_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_goal_expiration_v1: { Args: never; Returns: number }
      reconcile_task_occurrences_v1: {
        Args: { p_task_id: string; p_through_date?: string }
        Returns: number
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
      replace_entry_relationships: {
        Args: {
          p_category_ids: string[]
          p_entry_id: string
          p_goal_ids: string[]
          p_milestone_ids: string[]
        }
        Returns: undefined
      }
      replace_task_schedule_v1: {
        Args: {
          p_due_date?: string
          p_end_date?: string
          p_idempotency_key?: string
          p_interval_count?: number
          p_local_time?: string
          p_recurrence_kind: string
          p_start_date?: string
          p_task_id: string
          p_timezone?: string
          p_weekdays?: number[]
        }
        Returns: string
      }
      respond_to_friend_request: {
        Args: { p_connection_id: string; p_response: string }
        Returns: string
      }
      respond_to_goal_invite: {
        Args: { p_invite_id: string; p_response: string }
        Returns: string
      }
      restore_tasks_legacy_writes_v1: { Args: never; Returns: undefined }
      run_tasks_legacy_catchup_v1: { Args: never; Returns: undefined }
      save_entry: {
        Args: {
          p_archived: boolean
          p_category_ids: string[]
          p_completed_at: string
          p_content: Json
          p_conversation_turns: Json
          p_entry_id: string
          p_entry_type: string
          p_goal_ids: string[]
          p_milestone_ids: string[]
          p_pinned: boolean
          p_plain_text: string
          p_reflection_type: string
          p_takeaway: string
          p_title: string
        }
        Returns: string
      }
      save_entry_v2: {
        Args: {
          p_archived: boolean
          p_category_ids: string[]
          p_completed_at: string
          p_content: Json
          p_conversation_turns: Json
          p_entry_id: string
          p_entry_type: string
          p_expected_content_version: number
          p_goal_ids: string[]
          p_milestone_ids: string[]
          p_pinned: boolean
          p_plain_text: string
          p_progress_evidence: Json
          p_reflection_type: string
          p_takeaway: string
          p_title: string
        }
        Returns: string
      }
      save_entry_v3: {
        Args: {
          p_archived: boolean
          p_category_ids: string[]
          p_completed_at: string
          p_content: Json
          p_conversation_turns: Json
          p_entry_id: string
          p_entry_type: string
          p_expected_content_version: number
          p_goal_ids: string[]
          p_milestone_ids: string[]
          p_pinned: boolean
          p_plain_text: string
          p_progress_evidence: Json
          p_project_id: string
          p_reflection_type: string
          p_takeaway: string
          p_title: string
        }
        Returns: string
      }
      save_entry_v4: {
        Args: {
          p_archived: boolean
          p_brt_category: string
          p_brt_category_provided: boolean
          p_category_ids: string[]
          p_client_request_id: string
          p_completed_at: string
          p_content: Json
          p_conversation_turns: Json
          p_entry_id: string
          p_entry_type: string
          p_expected_content_version: number
          p_goal_ids: string[]
          p_milestone_ids: string[]
          p_pinned: boolean
          p_plain_text: string
          p_progress_evidence: Json
          p_project_id: string
          p_reflection_type: string
          p_takeaway: string
          p_title: string
        }
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
      send_goal_invites: {
        Args: { p_goal_id: string; p_invitee_ids: string[] }
        Returns: string[]
      }
      set_public_goal: { Args: { p_goal_id: string }; Returns: string }
      set_task_occurrence_quantity_v1: {
        Args: {
          p_idempotency_key: string
          p_occurrence_id: string
          p_quantity: number
        }
        Returns: number
      }
      set_task_occurrence_status_v1: {
        Args: {
          p_idempotency_key: string
          p_occurrence_id: string
          p_status: string
        }
        Returns: string
      }
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
      start_goal_new_phase_v1: {
        Args: {
          p_deadline: string
          p_embedding_text?: string
          p_previous_goal_id: string
          p_reflection?: string
          p_title?: string
        }
        Returns: string
      }
      sync_entry_goal_progress_evidence: {
        Args: { p_entry_id: string; p_evidence: Json }
        Returns: undefined
      }
      task_local_instant_v1: {
        Args: { p_date: string; p_time: string; p_timezone: string }
        Returns: string
      }
      update_task_v1: {
        Args: {
          p_completion_mode: string
          p_description?: string
          p_due_date?: string
          p_milestone_id?: string
          p_quantity_unit?: string
          p_target_quantity?: number
          p_task_id: string
          p_title: string
        }
        Returns: string
      }
      verify_tasks_legacy_cutover_v1: {
        Args: never
        Returns: {
          duplicate_mappings: number
          mapped_rows: number
          source_name: string
          source_rows: number
          unmapped_rows: number
        }[]
      }
      withdraw_goal_invite: { Args: { p_invite_id: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
