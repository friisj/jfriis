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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assumption_evidence: {
        Row: {
          assumption_id: string
          collected_at: string | null
          confidence: string | null
          created_at: string
          evidence_type: string
          id: string
          metadata: Json | null
          summary: string | null
          supports_assumption: boolean | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          assumption_id: string
          collected_at?: string | null
          confidence?: string | null
          created_at?: string
          evidence_type: string
          id?: string
          metadata?: Json | null
          summary?: string | null
          supports_assumption?: boolean | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          assumption_id?: string
          collected_at?: string | null
          confidence?: string | null
          created_at?: string
          evidence_type?: string
          id?: string
          metadata?: Json | null
          summary?: string | null
          supports_assumption?: boolean | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assumption_evidence_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "assumptions"
            referencedColumns: ["id"]
          },
        ]
      }
      assumption_experiments: {
        Row: {
          assumption_id: string
          confidence: string | null
          created_at: string
          experiment_id: string
          id: string
          notes: string | null
          result: string | null
          updated_at: string
        }
        Insert: {
          assumption_id: string
          confidence?: string | null
          created_at?: string
          experiment_id: string
          id?: string
          notes?: string | null
          result?: string | null
          updated_at?: string
        }
        Update: {
          assumption_id?: string
          confidence?: string | null
          created_at?: string
          experiment_id?: string
          id?: string
          notes?: string | null
          result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assumption_experiments_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assumption_experiments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "studio_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      assumptions: {
        Row: {
          category: string
          created_at: string
          decision: string | null
          decision_notes: string | null
          evidence_level: string
          hypothesis_id: string | null
          id: string
          importance: string
          invalidated_at: string | null
          is_leap_of_faith: boolean | null
          metadata: Json | null
          notes: string | null
          slug: string
          source_block: string | null
          source_id: string | null
          source_type: string | null
          statement: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          validated_at: string | null
          validation_criteria: string | null
        }
        Insert: {
          category: string
          created_at?: string
          decision?: string | null
          decision_notes?: string | null
          evidence_level?: string
          hypothesis_id?: string | null
          id?: string
          importance?: string
          invalidated_at?: string | null
          is_leap_of_faith?: boolean | null
          metadata?: Json | null
          notes?: string | null
          slug: string
          source_block?: string | null
          source_id?: string | null
          source_type?: string | null
          statement: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_criteria?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          decision?: string | null
          decision_notes?: string | null
          evidence_level?: string
          hypothesis_id?: string | null
          id?: string
          importance?: string
          invalidated_at?: string | null
          is_leap_of_faith?: boolean | null
          metadata?: Json | null
          notes?: string | null
          slug?: string
          source_block?: string | null
          source_id?: string | null
          source_type?: string | null
          statement?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_criteria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assumptions_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assumptions_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_items: {
        Row: {
          content: string | null
          converted_id: string | null
          converted_to: string | null
          created_at: string
          id: string
          media: Json | null
          metadata: Json | null
          status: string
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          converted_id?: string | null
          converted_to?: string | null
          created_at?: string
          id?: string
          media?: Json | null
          metadata?: Json | null
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          converted_id?: string | null
          converted_to?: string | null
          created_at?: string
          id?: string
          media?: Json | null
          metadata?: Json | null
          status?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_model_canvases: {
        Row: {
          channels: Json
          cost_structure: Json
          created_at: string
          customer_relationships: Json
          customer_segments: Json
          description: string | null
          hypothesis_id: string | null
          id: string
          key_activities: Json
          key_partners: Json
          key_resources: Json
          metadata: Json | null
          name: string
          parent_version_id: string | null
          related_customer_profile_ids: string[] | null
          related_value_proposition_ids: string[] | null
          revenue_streams: Json
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          value_propositions: Json
          version: number
        }
        Insert: {
          channels?: Json
          cost_structure?: Json
          created_at?: string
          customer_relationships?: Json
          customer_segments?: Json
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          key_activities?: Json
          key_partners?: Json
          key_resources?: Json
          metadata?: Json | null
          name: string
          parent_version_id?: string | null
          related_customer_profile_ids?: string[] | null
          related_value_proposition_ids?: string[] | null
          revenue_streams?: Json
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          value_propositions?: Json
          version?: number
        }
        Update: {
          channels?: Json
          cost_structure?: Json
          created_at?: string
          customer_relationships?: Json
          customer_segments?: Json
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          key_activities?: Json
          key_partners?: Json
          key_resources?: Json
          metadata?: Json | null
          name?: string
          parent_version_id?: string | null
          related_customer_profile_ids?: string[] | null
          related_value_proposition_ids?: string[] | null
          revenue_streams?: Json
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          value_propositions?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_model_canvases_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_model_canvases_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "business_model_canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_model_canvases_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          config: Json | null
          created_at: string
          display_name: string
          enabled: boolean
          id: string
          metadata: Json | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          display_name: string
          enabled?: boolean
          id?: string
          metadata?: Json | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          display_name?: string
          enabled?: boolean
          id?: string
          metadata?: Json | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          addressable_percentage: number | null
          behaviors: Json
          created_at: string
          demographics: Json
          description: string | null
          environment: Json
          evidence_sources: Json
          gains: Json
          hypothesis_id: string | null
          id: string
          jobs: Json
          journey_stages: Json
          last_validated_at: string | null
          market_size_estimate: string | null
          metadata: Json | null
          name: string
          pains: Json
          parent_version_id: string | null
          profile_type: string | null
          psychographics: Json
          related_business_model_ids: string[] | null
          related_value_proposition_ids: string[] | null
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          validation_confidence: string | null
          version: number
        }
        Insert: {
          addressable_percentage?: number | null
          behaviors?: Json
          created_at?: string
          demographics?: Json
          description?: string | null
          environment?: Json
          evidence_sources?: Json
          gains?: Json
          hypothesis_id?: string | null
          id?: string
          jobs?: Json
          journey_stages?: Json
          last_validated_at?: string | null
          market_size_estimate?: string | null
          metadata?: Json | null
          name: string
          pains?: Json
          parent_version_id?: string | null
          profile_type?: string | null
          psychographics?: Json
          related_business_model_ids?: string[] | null
          related_value_proposition_ids?: string[] | null
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validation_confidence?: string | null
          version?: number
        }
        Update: {
          addressable_percentage?: number | null
          behaviors?: Json
          created_at?: string
          demographics?: Json
          description?: string | null
          environment?: Json
          evidence_sources?: Json
          gains?: Json
          hypothesis_id?: string | null
          id?: string
          jobs?: Json
          journey_stages?: Json
          last_validated_at?: string | null
          market_size_estimate?: string | null
          metadata?: Json | null
          name?: string
          pains?: Json
          parent_version_id?: string | null
          profile_type?: string | null
          psychographics?: Json
          related_business_model_ids?: string[] | null
          related_value_proposition_ids?: string[] | null
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validation_confidence?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_posts: {
        Row: {
          body: string | null
          channel_id: string
          content_id: string
          content_type: string
          created_at: string
          engagement: Json | null
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          posted_at: string | null
          scheduled_for: string | null
          status: string
          title: string | null
          updated_at: string
          url: string | null
          views: number | null
        }
        Insert: {
          body?: string | null
          channel_id: string
          content_id: string
          content_type: string
          created_at?: string
          engagement?: Json | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          views?: number | null
        }
        Update: {
          body?: string | null
          channel_id?: string
          content_id?: string
          content_type?: string
          created_at?: string
          engagement?: Json | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_queue: {
        Row: {
          attempts: number
          channel_id: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          metadata: Json | null
          priority: number
          process_after: string | null
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel_id: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          metadata?: Json | null
          priority?: number
          process_after?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel_id?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          metadata?: Json | null
          priority?: number
          process_after?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_queue_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          published: boolean
          sequence_order: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          published?: boolean
          sequence_order?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          published?: boolean
          sequence_order?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_specimen_items: {
        Row: {
          created_at: string
          display_config: Json | null
          gallery_sequence_id: string
          id: string
          position: number
          specimen_id: string
        }
        Insert: {
          created_at?: string
          display_config?: Json | null
          gallery_sequence_id: string
          id?: string
          position: number
          specimen_id: string
        }
        Update: {
          created_at?: string
          display_config?: Json | null
          gallery_sequence_id?: string
          id?: string
          position?: number
          specimen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_specimen_items_gallery_sequence_id_fkey"
            columns: ["gallery_sequence_id"]
            isOneToOne: false
            referencedRelation: "gallery_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_specimen_items_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          metadata: Json | null
          published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      log_entries: {
        Row: {
          content: Json | null
          created_at: string
          entry_date: string
          featured_image: string | null
          id: string
          images: Json | null
          metadata: Json | null
          published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          studio_experiment_id: string | null
          studio_project_id: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          entry_date?: string
          featured_image?: string | null
          id?: string
          images?: Json | null
          metadata?: Json | null
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          studio_experiment_id?: string | null
          studio_project_id?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          entry_date?: string
          featured_image?: string | null
          id?: string
          images?: Json | null
          metadata?: Json | null
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          studio_experiment_id?: string | null
          studio_project_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_studio_experiment_id_fkey"
            columns: ["studio_experiment_id"]
            isOneToOne: false
            referencedRelation: "studio_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entry_projects: {
        Row: {
          created_at: string
          id: string
          log_entry_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_entry_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_entry_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entry_projects_log_entry_id_fkey"
            columns: ["log_entry_id"]
            isOneToOne: false
            referencedRelation: "log_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entry_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entry_specimens: {
        Row: {
          created_at: string
          id: string
          log_entry_id: string
          position: number | null
          specimen_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_entry_id: string
          position?: number | null
          specimen_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_entry_id?: string
          position?: number | null
          specimen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entry_specimens_log_entry_id_fkey"
            columns: ["log_entry_id"]
            isOneToOne: false
            referencedRelation: "log_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entry_specimens_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_projects: string[] | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          metadata: Json | null
          role: string | null
          updated_at: string
        }
        Insert: {
          assigned_projects?: string[] | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          metadata?: Json | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          assigned_projects?: string[] | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          metadata?: Json | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_specimens: {
        Row: {
          created_at: string
          id: string
          position: number | null
          project_id: string
          specimen_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number | null
          project_id: string
          specimen_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number | null
          project_id?: string
          specimen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_specimens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_specimens_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "specimens"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          end_date: string | null
          featured_image: string | null
          id: string
          images: Json | null
          metadata: Json | null
          published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          start_date: string | null
          status: string
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          metadata?: Json | null
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          featured_image?: string | null
          id?: string
          images?: Json | null
          metadata?: Json | null
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      specimens: {
        Row: {
          component_code: string | null
          component_props: Json | null
          created_at: string
          custom_css: string | null
          description: string | null
          fonts: Json | null
          id: string
          media: Json | null
          metadata: Json | null
          published: boolean
          slug: string
          studio_project_id: string | null
          tags: string[] | null
          theme_config: Json | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          component_code?: string | null
          component_props?: Json | null
          created_at?: string
          custom_css?: string | null
          description?: string | null
          fonts?: Json | null
          id?: string
          media?: Json | null
          metadata?: Json | null
          published?: boolean
          slug: string
          studio_project_id?: string | null
          tags?: string[] | null
          theme_config?: Json | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          component_code?: string | null
          component_props?: Json | null
          created_at?: string
          custom_css?: string | null
          description?: string | null
          fonts?: Json | null
          id?: string
          media?: Json | null
          metadata?: Json | null
          published?: boolean
          slug?: string
          studio_project_id?: string | null
          tags?: string[] | null
          theme_config?: Json | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specimens_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_experiments: {
        Row: {
          created_at: string
          description: string | null
          hypothesis_id: string | null
          id: string
          learnings: string | null
          name: string
          outcome: string | null
          project_id: string
          slug: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          learnings?: string | null
          name: string
          outcome?: string | null
          project_id: string
          slug: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          learnings?: string | null
          name?: string
          outcome?: string | null
          project_id?: string
          slug?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_experiments_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_hypotheses: {
        Row: {
          created_at: string
          id: string
          project_id: string
          sequence: number
          statement: string
          status: string
          updated_at: string
          validation_criteria: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          sequence?: number
          statement: string
          status?: string
          updated_at?: string
          validation_criteria?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          sequence?: number
          statement?: string
          status?: string
          updated_at?: string
          validation_criteria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_hypotheses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          created_at: string
          current_focus: string | null
          description: string | null
          hypothesis: string | null
          id: string
          name: string
          path: string | null
          problem_statement: string | null
          scaffolded_at: string | null
          scope_out: string | null
          slug: string
          status: string
          success_criteria: string | null
          temperature: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_focus?: string | null
          description?: string | null
          hypothesis?: string | null
          id?: string
          name: string
          path?: string | null
          problem_statement?: string | null
          scaffolded_at?: string | null
          scope_out?: string | null
          slug: string
          status?: string
          success_criteria?: string | null
          temperature?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_focus?: string | null
          description?: string | null
          hypothesis?: string | null
          id?: string
          name?: string
          path?: string | null
          problem_statement?: string | null
          scaffolded_at?: string | null
          scope_out?: string | null
          slug?: string
          status?: string
          success_criteria?: string | null
          temperature?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      value_maps: {
        Row: {
          business_model_canvas_id: string | null
          created_at: string
          customer_jobs: Json
          customer_profile_id: string | null
          description: string | null
          fit_score: number | null
          gain_creators: Json
          gains: Json
          hypothesis_id: string | null
          id: string
          metadata: Json | null
          name: string
          pain_relievers: Json
          pains: Json
          parent_version_id: string | null
          products_services: Json
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          version: number
        }
        Insert: {
          business_model_canvas_id?: string | null
          created_at?: string
          customer_jobs?: Json
          customer_profile_id?: string | null
          description?: string | null
          fit_score?: number | null
          gain_creators?: Json
          gains?: Json
          hypothesis_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          pain_relievers?: Json
          pains?: Json
          parent_version_id?: string | null
          products_services?: Json
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          version?: number
        }
        Update: {
          business_model_canvas_id?: string | null
          created_at?: string
          customer_jobs?: Json
          customer_profile_id?: string | null
          description?: string | null
          fit_score?: number | null
          gain_creators?: Json
          gains?: Json
          hypothesis_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          pain_relievers?: Json
          pains?: Json
          parent_version_id?: string | null
          products_services?: Json
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "value_proposition_canvases_business_model_canvas_id_fkey"
            columns: ["business_model_canvas_id"]
            isOneToOne: false
            referencedRelation: "business_model_canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "value_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      value_proposition_canvases: {
        Row: {
          addressed_gains: Json
          addressed_jobs: Json
          addressed_pains: Json
          assumptions: Json
          created_at: string
          customer_profile_id: string
          description: string | null
          evidence: Json
          fit_analysis: Json
          fit_score: number | null
          hypothesis_id: string | null
          id: string
          last_validated_at: string | null
          metadata: Json | null
          name: string
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          validation_status: string
          value_map_id: string
        }
        Insert: {
          addressed_gains?: Json
          addressed_jobs?: Json
          addressed_pains?: Json
          assumptions?: Json
          created_at?: string
          customer_profile_id: string
          description?: string | null
          evidence?: Json
          fit_analysis?: Json
          fit_score?: number | null
          hypothesis_id?: string | null
          id?: string
          last_validated_at?: string | null
          metadata?: Json | null
          name: string
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validation_status?: string
          value_map_id: string
        }
        Update: {
          addressed_gains?: Json
          addressed_jobs?: Json
          addressed_pains?: Json
          assumptions?: Json
          created_at?: string
          customer_profile_id?: string
          description?: string | null
          evidence?: Json
          fit_analysis?: Json
          fit_score?: number | null
          hypothesis_id?: string | null
          id?: string
          last_validated_at?: string | null
          metadata?: Json | null
          name?: string
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validation_status?: string
          value_map_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_proposition_canvases_customer_profile_id_fkey1"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_hypothesis_id_fkey1"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_studio_project_id_fkey1"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_proposition_canvases_value_map_id_fkey"
            columns: ["value_map_id"]
            isOneToOne: false
            referencedRelation: "value_maps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
