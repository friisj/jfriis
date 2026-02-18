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
      activities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          sequence: number
          story_map_id: string
          updated_at: string
          user_goal: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          sequence: number
          story_map_id: string
          updated_at?: string
          user_goal?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          sequence?: number
          story_map_id?: string
          updated_at?: string
          user_goal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_story_map_id_fkey"
            columns: ["story_map_id"]
            isOneToOne: false
            referencedRelation: "story_maps"
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
      blueprint_cells: {
        Row: {
          actors: string | null
          content: string | null
          cost_implication: string | null
          created_at: string | null
          duration_estimate: string | null
          failure_risk: string | null
          id: string
          layer_type: string
          sequence: number | null
          step_id: string
          updated_at: string | null
        }
        Insert: {
          actors?: string | null
          content?: string | null
          cost_implication?: string | null
          created_at?: string | null
          duration_estimate?: string | null
          failure_risk?: string | null
          id?: string
          layer_type: string
          sequence?: number | null
          step_id: string
          updated_at?: string | null
        }
        Update: {
          actors?: string | null
          content?: string | null
          cost_implication?: string | null
          created_at?: string | null
          duration_estimate?: string | null
          failure_risk?: string | null
          id?: string
          layer_type?: string
          sequence?: number | null
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_cells_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "blueprint_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_steps: {
        Row: {
          actors: Json | null
          cost_implication: string | null
          created_at: string
          customer_value_delivery: string | null
          description: string | null
          duration_estimate: string | null
          failure_impact: string | null
          failure_risk: string | null
          id: string
          layers: Json
          metadata: Json | null
          name: string
          sequence: number
          service_blueprint_id: string
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          actors?: Json | null
          cost_implication?: string | null
          created_at?: string
          customer_value_delivery?: string | null
          description?: string | null
          duration_estimate?: string | null
          failure_impact?: string | null
          failure_risk?: string | null
          id?: string
          layers?: Json
          metadata?: Json | null
          name: string
          sequence: number
          service_blueprint_id: string
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          actors?: Json | null
          cost_implication?: string | null
          created_at?: string
          customer_value_delivery?: string | null
          description?: string | null
          duration_estimate?: string | null
          failure_impact?: string | null
          failure_risk?: string | null
          id?: string
          layers?: Json
          metadata?: Json | null
          name?: string
          sequence?: number
          service_blueprint_id?: string
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_steps_service_blueprint_id_fkey"
            columns: ["service_blueprint_id"]
            isOneToOne: false
            referencedRelation: "service_blueprints"
            referencedColumns: ["id"]
          },
        ]
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
      canvas_item_assumptions: {
        Row: {
          assumption_id: string
          canvas_item_id: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          assumption_id: string
          canvas_item_id: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          assumption_id?: string
          canvas_item_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_item_assumptions_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_creator_id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_id"]
          },
          {
            foreignKeyName: "canvas_item_assumptions_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_reliever_id"]
          },
        ]
      }
      canvas_item_mappings: {
        Row: {
          created_at: string
          fit_strength: string | null
          id: string
          mapping_type: string
          notes: string | null
          source_item_id: string
          target_item_id: string
          updated_at: string
          validation_method: string | null
        }
        Insert: {
          created_at?: string
          fit_strength?: string | null
          id?: string
          mapping_type: string
          notes?: string | null
          source_item_id: string
          target_item_id: string
          updated_at?: string
          validation_method?: string | null
        }
        Update: {
          created_at?: string
          fit_strength?: string | null
          id?: string
          mapping_type?: string
          notes?: string | null
          source_item_id?: string
          target_item_id?: string
          updated_at?: string
          validation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_creator_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_reliever_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_creator_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_id"]
          },
          {
            foreignKeyName: "canvas_item_mappings_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_reliever_id"]
          },
        ]
      }
      canvas_item_placements: {
        Row: {
          block_name: string
          canvas_id: string
          canvas_item_id: string
          canvas_type: string
          created_at: string
          id: string
          position: number | null
          validation_status_override: string | null
        }
        Insert: {
          block_name: string
          canvas_id: string
          canvas_item_id: string
          canvas_type: string
          created_at?: string
          id?: string
          position?: number | null
          validation_status_override?: string | null
        }
        Update: {
          block_name?: string
          canvas_id?: string
          canvas_item_id?: string
          canvas_type?: string
          created_at?: string
          id?: string
          position?: number | null
          validation_status_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_assumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "canvas_items_with_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_creator_id"]
          },
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_gain_creation"
            referencedColumns: ["gain_id"]
          },
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_id"]
          },
          {
            foreignKeyName: "canvas_item_placements_canvas_item_id_fkey"
            columns: ["canvas_item_id"]
            isOneToOne: false
            referencedRelation: "fit_pain_relief"
            referencedColumns: ["pain_reliever_id"]
          },
        ]
      }
      canvas_items: {
        Row: {
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          importance: string | null
          intensity: string | null
          item_type: string
          job_context: string | null
          job_type: string | null
          metadata: Json | null
          notes: string | null
          studio_project_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          importance?: string | null
          intensity?: string | null
          item_type: string
          job_context?: string | null
          job_type?: string | null
          metadata?: Json | null
          notes?: string | null
          studio_project_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          importance?: string | null
          intensity?: string | null
          item_type?: string
          job_context?: string | null
          job_type?: string | null
          metadata?: Json | null
          notes?: string | null
          studio_project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_items_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chalk_boards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          tldraw_snapshot: Json
          updated_at: string
          viewport: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id: string
          tldraw_snapshot?: Json
          updated_at?: string
          viewport?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          tldraw_snapshot?: Json
          updated_at?: string
          viewport?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chalk_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chalk_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chalk_chat_messages: {
        Row: {
          board_id: string
          content: Json
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          board_id: string
          content: Json
          context_id?: string | null
          context_type: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          board_id?: string
          content?: Json
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chalk_chat_messages_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "chalk_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      chalk_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chalk_versions: {
        Row: {
          board_id: string
          created_at: string
          fidelity_level: number | null
          id: string
          name: string | null
          parent_id: string | null
          screenshot_url: string | null
          tldraw_snapshot: Json
        }
        Insert: {
          board_id: string
          created_at?: string
          fidelity_level?: number | null
          id?: string
          name?: string | null
          parent_id?: string | null
          screenshot_url?: string | null
          tldraw_snapshot: Json
        }
        Update: {
          board_id?: string
          created_at?: string
          fidelity_level?: number | null
          id?: string
          name?: string | null
          parent_id?: string | null
          screenshot_url?: string | null
          tldraw_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chalk_versions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "chalk_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chalk_versions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chalk_versions"
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
      cog_benchmark_images: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          image_index: number
          rating: string | null
          round_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          image_index: number
          rating?: string | null
          round_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          image_index?: number
          rating?: string | null
          round_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_benchmark_images_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "cog_benchmark_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_benchmark_rounds: {
        Row: {
          config_id: string
          config_type: string
          created_at: string
          distilled_prompt: string
          feedback: string | null
          id: string
          round_number: number
          status: string
        }
        Insert: {
          config_id: string
          config_type: string
          created_at?: string
          distilled_prompt: string
          feedback?: string | null
          id?: string
          round_number: number
          status?: string
        }
        Update: {
          config_id?: string
          config_type?: string
          created_at?: string
          distilled_prompt?: string
          feedback?: string | null
          id?: string
          round_number?: number
          status?: string
        }
        Relationships: []
      }
      cog_calibration_seeds: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          seed_image_path: string | null
          seed_subject: string
          type_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          seed_image_path?: string | null
          seed_subject: string
          type_key: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          seed_image_path?: string | null
          seed_subject?: string
          type_key?: string
        }
        Relationships: []
      }
      cog_director_configs: {
        Row: {
          approach_description: string
          created_at: string | null
          description: string | null
          id: string
          interview_mapping: Json | null
          methods: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approach_description: string
          created_at?: string | null
          description?: string | null
          id?: string
          interview_mapping?: Json | null
          methods?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approach_description?: string
          created_at?: string | null
          description?: string | null
          id?: string
          interview_mapping?: Json | null
          methods?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cog_eval_profiles: {
        Row: {
          created_at: string | null
          criteria: Json
          description: string | null
          id: string
          name: string
          selection_threshold: number
          system_prompt: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          name: string
          selection_threshold?: number
          system_prompt?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          name?: string
          selection_threshold?: number
          system_prompt?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cog_image_tags: {
        Row: {
          created_at: string | null
          id: string
          image_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_image_tags_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_image_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_images: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          group_id: string | null
          group_position: number | null
          height: number | null
          id: string
          job_id: string | null
          metadata: Json | null
          mime_type: string
          parent_image_id: string | null
          prompt: string | null
          series_id: string
          source: string
          star_rating: number | null
          storage_path: string
          thumbnail_128: string | null
          thumbnail_256: string | null
          thumbnail_64: string | null
          title: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          group_id?: string | null
          group_position?: number | null
          height?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          mime_type?: string
          parent_image_id?: string | null
          prompt?: string | null
          series_id: string
          source: string
          star_rating?: number | null
          storage_path: string
          thumbnail_128?: string | null
          thumbnail_256?: string | null
          thumbnail_64?: string | null
          title?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          group_id?: string | null
          group_position?: number | null
          height?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          mime_type?: string
          parent_image_id?: string | null
          prompt?: string | null
          series_id?: string
          source?: string
          star_rating?: number | null
          storage_path?: string
          thumbnail_128?: string | null
          thumbnail_256?: string | null
          thumbnail_64?: string | null
          title?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_images_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_images_parent_image_id_fkey"
            columns: ["parent_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_images_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cog_images_job"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_job_inputs: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          image_id: string
          job_id: string
          negative_prompt: string | null
          reference_id: number
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          image_id: string
          job_id: string
          negative_prompt?: string | null
          reference_id: number
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          image_id?: string
          job_id?: string
          negative_prompt?: string | null
          reference_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cog_job_inputs_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_job_inputs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_job_steps: {
        Row: {
          completed_at: string | null
          context: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          job_id: string
          model: string
          output: Json | null
          prompt: string
          sequence: number
          started_at: string | null
          status: string
          step_type: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          model: string
          output?: Json | null
          prompt: string
          sequence: number
          started_at?: string | null
          status?: string
          step_type: string
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          model?: string
          output?: Json | null
          prompt?: string
          sequence?: number
          started_at?: string | null
          status?: string
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_job_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_jobs: {
        Row: {
          art_direction: string | null
          aspect_ratio: string | null
          base_prompt: string
          camera: string | null
          colors: string[] | null
          completed_at: string | null
          created_at: string | null
          director_config_id: string | null
          error_message: string | null
          foundation_model: string
          foundation_status: string | null
          framing: string | null
          id: string
          image_model: string | null
          image_size: string | null
          include_negative_prompt: boolean | null
          inference_log: Json | null
          inference_model: string | null
          inference_step_configs: Json | null
          initial_images: Json | null
          job_type: string | null
          lighting: string | null
          max_reference_images: number | null
          negative_prompt: string | null
          num_base_images: number | null
          photographer_config_id: string | null
          production_config_id: string | null
          reference_image_configs: Json | null
          scene: string | null
          selected_base_image_id: string | null
          sequence_status: string | null
          series_id: string
          started_at: string | null
          status: string
          styling: string | null
          synthesized_prompt: string | null
          themes: string[] | null
          title: string | null
          updated_at: string | null
          use_thinking: boolean | null
          use_thinking_infer4: boolean | null
          use_thinking_infer6: boolean | null
        }
        Insert: {
          art_direction?: string | null
          aspect_ratio?: string | null
          base_prompt: string
          camera?: string | null
          colors?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          director_config_id?: string | null
          error_message?: string | null
          foundation_model?: string
          foundation_status?: string | null
          framing?: string | null
          id?: string
          image_model?: string | null
          image_size?: string | null
          include_negative_prompt?: boolean | null
          inference_log?: Json | null
          inference_model?: string | null
          inference_step_configs?: Json | null
          initial_images?: Json | null
          job_type?: string | null
          lighting?: string | null
          max_reference_images?: number | null
          negative_prompt?: string | null
          num_base_images?: number | null
          photographer_config_id?: string | null
          production_config_id?: string | null
          reference_image_configs?: Json | null
          scene?: string | null
          selected_base_image_id?: string | null
          sequence_status?: string | null
          series_id: string
          started_at?: string | null
          status?: string
          styling?: string | null
          synthesized_prompt?: string | null
          themes?: string[] | null
          title?: string | null
          updated_at?: string | null
          use_thinking?: boolean | null
          use_thinking_infer4?: boolean | null
          use_thinking_infer6?: boolean | null
        }
        Update: {
          art_direction?: string | null
          aspect_ratio?: string | null
          base_prompt?: string
          camera?: string | null
          colors?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          director_config_id?: string | null
          error_message?: string | null
          foundation_model?: string
          foundation_status?: string | null
          framing?: string | null
          id?: string
          image_model?: string | null
          image_size?: string | null
          include_negative_prompt?: boolean | null
          inference_log?: Json | null
          inference_model?: string | null
          inference_step_configs?: Json | null
          initial_images?: Json | null
          job_type?: string | null
          lighting?: string | null
          max_reference_images?: number | null
          negative_prompt?: string | null
          num_base_images?: number | null
          photographer_config_id?: string | null
          production_config_id?: string | null
          reference_image_configs?: Json | null
          scene?: string | null
          selected_base_image_id?: string | null
          sequence_status?: string | null
          series_id?: string
          started_at?: string | null
          status?: string
          styling?: string | null
          synthesized_prompt?: string | null
          themes?: string[] | null
          title?: string | null
          updated_at?: string | null
          use_thinking?: boolean | null
          use_thinking_infer4?: boolean | null
          use_thinking_infer6?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_jobs_director_config_id_fkey"
            columns: ["director_config_id"]
            isOneToOne: false
            referencedRelation: "cog_director_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_jobs_photographer_config_id_fkey"
            columns: ["photographer_config_id"]
            isOneToOne: false
            referencedRelation: "cog_photographer_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_jobs_production_config_id_fkey"
            columns: ["production_config_id"]
            isOneToOne: false
            referencedRelation: "cog_production_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_jobs_selected_base_image_id_fkey"
            columns: ["selected_base_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_jobs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_photographer_configs: {
        Row: {
          created_at: string | null
          description: string | null
          distilled_prompt: string | null
          id: string
          name: string
          style_description: string
          style_references: string[] | null
          techniques: string
          testbed_notes: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          distilled_prompt?: string | null
          id?: string
          name: string
          style_description: string
          style_references?: string[] | null
          techniques?: string
          testbed_notes?: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          distilled_prompt?: string | null
          id?: string
          name?: string
          style_description?: string
          style_references?: string[] | null
          techniques?: string
          testbed_notes?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cog_pipeline_base_candidates: {
        Row: {
          candidate_index: number
          created_at: string | null
          id: string
          image_id: string
          job_id: string
        }
        Insert: {
          candidate_index: number
          created_at?: string | null
          id?: string
          image_id: string
          job_id: string
        }
        Update: {
          candidate_index?: number
          created_at?: string | null
          id?: string
          image_id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_pipeline_base_candidates_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_pipeline_base_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_pipeline_step_outputs: {
        Row: {
          created_at: string
          id: string
          image_id: string
          metadata: Json | null
          step_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          metadata?: Json | null
          step_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          metadata?: Json | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_pipeline_step_outputs_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_pipeline_step_outputs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: true
            referencedRelation: "cog_pipeline_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_pipeline_steps: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          model: string
          started_at: string | null
          status: string
          step_order: number
          step_type: string
        }
        Insert: {
          completed_at?: string | null
          config: Json
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          model: string
          started_at?: string | null
          status?: string
          step_order: number
          step_type: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          model?: string
          started_at?: string | null
          status?: string
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_pipeline_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_production_configs: {
        Row: {
          conceptual_notes: string
          costume_notes: string
          created_at: string | null
          description: string | null
          editorial_notes: string
          id: string
          name: string
          shoot_details: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conceptual_notes?: string
          costume_notes?: string
          created_at?: string | null
          description?: string | null
          editorial_notes?: string
          id?: string
          name: string
          shoot_details?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conceptual_notes?: string
          costume_notes?: string
          created_at?: string | null
          description?: string | null
          editorial_notes?: string
          id?: string
          name?: string
          shoot_details?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cog_remix_augment_steps: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          input_image_id: string | null
          job_id: string
          output_image_id: string | null
          status: string
          step_order: number
          step_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          input_image_id?: string | null
          job_id: string
          output_image_id?: string | null
          status?: string
          step_order: number
          step_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          input_image_id?: string | null
          job_id?: string
          output_image_id?: string | null
          status?: string
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_remix_augment_steps_input_image_id_fkey"
            columns: ["input_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_augment_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_augment_steps_output_image_id_fkey"
            columns: ["output_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_remix_candidates: {
        Row: {
          created_at: string | null
          eval_reasoning: string | null
          eval_score: number | null
          height: number | null
          id: string
          image_id: string | null
          iteration_id: string
          job_id: string
          photographer: string | null
          photographer_url: string | null
          selected: boolean | null
          source: string
          source_id: string
          source_url: string
          thumbnail_url: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          eval_reasoning?: string | null
          eval_score?: number | null
          height?: number | null
          id?: string
          image_id?: string | null
          iteration_id: string
          job_id: string
          photographer?: string | null
          photographer_url?: string | null
          selected?: boolean | null
          source: string
          source_id: string
          source_url: string
          thumbnail_url: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          eval_reasoning?: string | null
          eval_score?: number | null
          height?: number | null
          id?: string
          image_id?: string | null
          iteration_id?: string
          job_id?: string
          photographer?: string | null
          photographer_url?: string | null
          selected?: boolean | null
          source?: string
          source_id?: string
          source_url?: string
          thumbnail_url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_remix_candidates_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_candidates_iteration_id_fkey"
            columns: ["iteration_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_search_iterations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_remix_eval_results: {
        Row: {
          candidate_id: string
          created_at: string | null
          criterion_scores: Json | null
          id: string
          reasoning: string | null
          run_id: string
          score: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          criterion_scores?: Json | null
          id?: string
          reasoning?: string | null
          run_id: string
          score?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          criterion_scores?: Json | null
          id?: string
          reasoning?: string | null
          run_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_remix_eval_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_eval_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_eval_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_remix_eval_runs: {
        Row: {
          created_at: string | null
          eval_profile_id: string
          id: string
          is_initial: boolean
          job_id: string
          selected_candidate_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          eval_profile_id: string
          id?: string
          is_initial?: boolean
          job_id: string
          selected_candidate_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          eval_profile_id?: string
          id?: string
          is_initial?: boolean
          job_id?: string
          selected_candidate_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_remix_eval_runs_eval_profile_id_fkey"
            columns: ["eval_profile_id"]
            isOneToOne: false
            referencedRelation: "cog_eval_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_eval_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_eval_runs_selected_candidate_id_fkey"
            columns: ["selected_candidate_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_remix_jobs: {
        Row: {
          augment_status: string
          colors: string[] | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          eval_profile_id: string | null
          eval_profile_ids: string[] | null
          id: string
          selected_image_id: string | null
          series_id: string
          source_status: string
          started_at: string | null
          status: string
          story: string
          target_aspect_ratio: string | null
          target_colors: string[] | null
          title: string | null
          topics: string[] | null
          trace: Json | null
          updated_at: string | null
        }
        Insert: {
          augment_status?: string
          colors?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          eval_profile_id?: string | null
          eval_profile_ids?: string[] | null
          id?: string
          selected_image_id?: string | null
          series_id: string
          source_status?: string
          started_at?: string | null
          status?: string
          story: string
          target_aspect_ratio?: string | null
          target_colors?: string[] | null
          title?: string | null
          topics?: string[] | null
          trace?: Json | null
          updated_at?: string | null
        }
        Update: {
          augment_status?: string
          colors?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          eval_profile_id?: string | null
          eval_profile_ids?: string[] | null
          id?: string
          selected_image_id?: string | null
          series_id?: string
          source_status?: string
          started_at?: string | null
          status?: string
          story?: string
          target_aspect_ratio?: string | null
          target_colors?: string[] | null
          title?: string | null
          topics?: string[] | null
          trace?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_remix_jobs_eval_profile_id_fkey"
            columns: ["eval_profile_id"]
            isOneToOne: false
            referencedRelation: "cog_eval_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_jobs_selected_image_id_fkey"
            columns: ["selected_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_remix_jobs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_remix_search_iterations: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          iteration_number: number
          job_id: string
          llm_reasoning: string | null
          search_params: Json
          status: string
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          iteration_number: number
          job_id: string
          llm_reasoning?: string | null
          search_params?: Json
          status?: string
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          iteration_number?: number
          job_id?: string
          llm_reasoning?: string | null
          search_params?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_remix_search_iterations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cog_remix_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_series: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_private: boolean | null
          parent_id: string | null
          primary_image_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          parent_id?: string | null
          primary_image_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          parent_id?: string | null
          primary_image_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_series_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_series_primary_image_id_fkey"
            columns: ["primary_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_series_tags: {
        Row: {
          created_at: string | null
          id: string
          position: number
          series_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number
          series_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number
          series_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_series_tags_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_series_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_tag_groups: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      cog_tags: {
        Row: {
          color: string | null
          created_at: string | null
          group_id: string | null
          id: string
          name: string
          position: number
          series_id: string | null
          shortcut: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name: string
          position?: number
          series_id?: string | null
          shortcut?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string
          position?: number
          series_id?: string | null
          shortcut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cog_tags_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "cog_tag_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_tags_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
        ]
      }
      cog_thinking_jobs: {
        Row: {
          aspect_ratio: string | null
          completed_at: string | null
          created_at: string
          creative_direction: string | null
          derived_subject: string | null
          direction_thinking: string | null
          error_message: string | null
          generated_image_id: string | null
          generation_prompt: string | null
          id: string
          image_size: string | null
          photographer: string
          publication: string
          series_id: string
          started_at: string | null
          status: string
          story: string
          style_hints: string | null
          subject_thinking: string | null
          title: string | null
          trace: Json[] | null
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string
          creative_direction?: string | null
          derived_subject?: string | null
          direction_thinking?: string | null
          error_message?: string | null
          generated_image_id?: string | null
          generation_prompt?: string | null
          id?: string
          image_size?: string | null
          photographer: string
          publication: string
          series_id: string
          started_at?: string | null
          status?: string
          story: string
          style_hints?: string | null
          subject_thinking?: string | null
          title?: string | null
          trace?: Json[] | null
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string
          creative_direction?: string | null
          derived_subject?: string | null
          direction_thinking?: string | null
          error_message?: string | null
          generated_image_id?: string | null
          generation_prompt?: string | null
          id?: string
          image_size?: string | null
          photographer?: string
          publication?: string
          series_id?: string
          started_at?: string | null
          status?: string
          story?: string
          style_hints?: string | null
          subject_thinking?: string | null
          title?: string | null
          trace?: Json[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cog_thinking_jobs_generated_image_id_fkey"
            columns: ["generated_image_id"]
            isOneToOne: false
            referencedRelation: "cog_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cog_thinking_jobs_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "cog_series"
            referencedColumns: ["id"]
          },
        ]
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
      entity_links: {
        Row: {
          created_at: string | null
          id: string
          link_type: string
          metadata: Json | null
          notes: string | null
          position: number | null
          source_id: string
          source_type: string
          strength: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_type?: string
          metadata?: Json | null
          notes?: string | null
          position?: number | null
          source_id: string
          source_type: string
          strength?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_type?: string
          metadata?: Json | null
          notes?: string | null
          position?: number | null
          source_id?: string
          source_type?: string
          strength?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          collected_at: string | null
          collector_notes: string | null
          confidence: number | null
          content: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          evidence_type: string
          id: string
          metadata: Json | null
          source_reference: string | null
          source_url: string | null
          supports: boolean | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          collected_at?: string | null
          collector_notes?: string | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          evidence_type: string
          id?: string
          metadata?: Json | null
          source_reference?: string | null
          source_url?: string | null
          supports?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          collected_at?: string | null
          collector_notes?: string | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          evidence_type?: string
          id?: string
          metadata?: Json | null
          source_reference?: string | null
          source_url?: string | null
          supports?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      journey_cells: {
        Row: {
          channel_type: string | null
          content: string | null
          created_at: string | null
          emotion_score: number | null
          id: string
          layer_type: string
          sequence: number | null
          stage_id: string
          updated_at: string | null
        }
        Insert: {
          channel_type?: string | null
          content?: string | null
          created_at?: string | null
          emotion_score?: number | null
          id?: string
          layer_type: string
          sequence?: number | null
          stage_id: string
          updated_at?: string | null
        }
        Update: {
          channel_type?: string | null
          content?: string | null
          created_at?: string | null
          emotion_score?: number | null
          id?: string
          layer_type?: string
          sequence?: number | null
          stage_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_cells_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_stages: {
        Row: {
          created_at: string
          customer_emotion: string | null
          customer_goal: string | null
          customer_mindset: string | null
          description: string | null
          drop_off_risk: string | null
          duration_estimate: string | null
          id: string
          metadata: Json | null
          name: string
          sequence: number
          stage_type: string | null
          updated_at: string
          user_journey_id: string
          validation_status: string | null
        }
        Insert: {
          created_at?: string
          customer_emotion?: string | null
          customer_goal?: string | null
          customer_mindset?: string | null
          description?: string | null
          drop_off_risk?: string | null
          duration_estimate?: string | null
          id?: string
          metadata?: Json | null
          name: string
          sequence: number
          stage_type?: string | null
          updated_at?: string
          user_journey_id: string
          validation_status?: string | null
        }
        Update: {
          created_at?: string
          customer_emotion?: string | null
          customer_goal?: string | null
          customer_mindset?: string | null
          description?: string | null
          drop_off_risk?: string | null
          duration_estimate?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          sequence?: number
          stage_type?: string | null
          updated_at?: string
          user_journey_id?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_stages_user_journey_id_fkey"
            columns: ["user_journey_id"]
            isOneToOne: false
            referencedRelation: "journey_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_stages_user_journey_id_fkey"
            columns: ["user_journey_id"]
            isOneToOne: false
            referencedRelation: "user_journeys"
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
          idea_stage: string | null
          images: Json | null
          is_private: boolean | null
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
          idea_stage?: string | null
          images?: Json | null
          is_private?: boolean | null
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
          idea_stage?: string | null
          images?: Json | null
          is_private?: boolean | null
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
      log_entry_drafts: {
        Row: {
          content: string
          created_at: string
          generation_instructions: string | null
          generation_mode: string | null
          generation_model: string | null
          generation_temperature: number | null
          id: string
          is_primary: boolean
          label: string | null
          log_entry_id: string
          source_draft_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          generation_instructions?: string | null
          generation_mode?: string | null
          generation_model?: string | null
          generation_temperature?: number | null
          id?: string
          is_primary?: boolean
          label?: string | null
          log_entry_id: string
          source_draft_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          generation_instructions?: string | null
          generation_mode?: string | null
          generation_model?: string | null
          generation_temperature?: number | null
          id?: string
          is_primary?: boolean
          label?: string | null
          log_entry_id?: string
          source_draft_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entry_drafts_log_entry_id_fkey"
            columns: ["log_entry_id"]
            isOneToOne: false
            referencedRelation: "log_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entry_drafts_source_draft_id_fkey"
            columns: ["source_draft_id"]
            isOneToOne: false
            referencedRelation: "log_entry_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_gameplay_analysis: {
        Row: {
          analyzed_at: string
          id: string
          patterns_found: string[] | null
          performance_score: number | null
          recommendations: string[] | null
          session_id: string
          stats: Json
        }
        Insert: {
          analyzed_at?: string
          id?: string
          patterns_found?: string[] | null
          performance_score?: number | null
          recommendations?: string[] | null
          session_id: string
          stats?: Json
        }
        Update: {
          analyzed_at?: string
          id?: string
          patterns_found?: string[] | null
          performance_score?: number | null
          recommendations?: string[] | null
          session_id?: string
          stats?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ludo_gameplay_analysis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ludo_gameplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_gameplay_events: {
        Row: {
          ai_personality: string | null
          ai_preset: string | null
          anomaly_description: string | null
          anomaly_severity: string | null
          anomaly_type: string | null
          available_moves_count: number | null
          decision_time_ms: number | null
          dice_roll: number[] | null
          evaluation_score: number | null
          event_type: string
          game_number: number
          id: number
          is_anomaly: boolean | null
          move_distance: number | null
          move_from: number | null
          move_number: number
          move_to: number | null
          opening_book_match: boolean | null
          opening_book_name: string | null
          player: string | null
          post_move_valid: boolean | null
          pre_move_valid: boolean | null
          rule_check_passed: boolean | null
          session_id: string
          strategy_weights: Json | null
          timestamp_ms: number
          validation_errors: string[] | null
        }
        Insert: {
          ai_personality?: string | null
          ai_preset?: string | null
          anomaly_description?: string | null
          anomaly_severity?: string | null
          anomaly_type?: string | null
          available_moves_count?: number | null
          decision_time_ms?: number | null
          dice_roll?: number[] | null
          evaluation_score?: number | null
          event_type: string
          game_number: number
          id?: number
          is_anomaly?: boolean | null
          move_distance?: number | null
          move_from?: number | null
          move_number: number
          move_to?: number | null
          opening_book_match?: boolean | null
          opening_book_name?: string | null
          player?: string | null
          post_move_valid?: boolean | null
          pre_move_valid?: boolean | null
          rule_check_passed?: boolean | null
          session_id: string
          strategy_weights?: Json | null
          timestamp_ms: number
          validation_errors?: string[] | null
        }
        Update: {
          ai_personality?: string | null
          ai_preset?: string | null
          anomaly_description?: string | null
          anomaly_severity?: string | null
          anomaly_type?: string | null
          available_moves_count?: number | null
          decision_time_ms?: number | null
          dice_roll?: number[] | null
          evaluation_score?: number | null
          event_type?: string
          game_number?: number
          id?: number
          is_anomaly?: boolean | null
          move_distance?: number | null
          move_from?: number | null
          move_number?: number
          move_to?: number | null
          opening_book_match?: boolean | null
          opening_book_name?: string | null
          player?: string | null
          post_move_valid?: boolean | null
          pre_move_valid?: boolean | null
          rule_check_passed?: boolean | null
          session_id?: string
          strategy_weights?: Json | null
          timestamp_ms?: number
          validation_errors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ludo_gameplay_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ludo_gameplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_gameplay_issues: {
        Row: {
          description: string | null
          detected_at: string
          event_id: number | null
          evidence: Json | null
          game_number: number | null
          id: string
          issue_type: string
          move_number: number | null
          player: string | null
          resolution_notes: string | null
          resolved_at: string | null
          session_id: string
          severity: string
          status: string | null
          tags: string[] | null
          title: string | null
        }
        Insert: {
          description?: string | null
          detected_at?: string
          event_id?: number | null
          evidence?: Json | null
          game_number?: number | null
          id?: string
          issue_type: string
          move_number?: number | null
          player?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          session_id: string
          severity: string
          status?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          description?: string | null
          detected_at?: string
          event_id?: number | null
          evidence?: Json | null
          game_number?: number | null
          id?: string
          issue_type?: string
          move_number?: number | null
          player?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          session_id?: string
          severity?: string
          status?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ludo_gameplay_issues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ludo_gameplay_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ludo_gameplay_issues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ludo_gameplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_gameplay_sessions: {
        Row: {
          anomaly_count: number | null
          app_version: string | null
          avg_game_duration_ms: number | null
          black_ai_personality: string | null
          black_ai_preset: string | null
          black_wins: number | null
          completed_at: string | null
          created_at: string
          id: string
          iteration_count: number | null
          match_length: number | null
          mode: string
          notes: string | null
          random_seed: string | null
          rule_violations: number | null
          strategy_inconsistencies: number | null
          total_games: number | null
          total_moves: number | null
          white_ai_personality: string | null
          white_ai_preset: string | null
          white_wins: number | null
        }
        Insert: {
          anomaly_count?: number | null
          app_version?: string | null
          avg_game_duration_ms?: number | null
          black_ai_personality?: string | null
          black_ai_preset?: string | null
          black_wins?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          iteration_count?: number | null
          match_length?: number | null
          mode: string
          notes?: string | null
          random_seed?: string | null
          rule_violations?: number | null
          strategy_inconsistencies?: number | null
          total_games?: number | null
          total_moves?: number | null
          white_ai_personality?: string | null
          white_ai_preset?: string | null
          white_wins?: number | null
        }
        Update: {
          anomaly_count?: number | null
          app_version?: string | null
          avg_game_duration_ms?: number | null
          black_ai_personality?: string | null
          black_ai_preset?: string | null
          black_wins?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          iteration_count?: number | null
          match_length?: number | null
          mode?: string
          notes?: string | null
          random_seed?: string | null
          rule_violations?: number | null
          strategy_inconsistencies?: number | null
          total_games?: number | null
          total_moves?: number | null
          white_ai_personality?: string | null
          white_ai_preset?: string | null
          white_wins?: number | null
        }
        Relationships: []
      }
      ludo_gameplay_snapshots: {
        Row: {
          black_checkers_off: number | null
          black_checkers_on_bar: number | null
          black_pip_count: number | null
          board_state_compressed: string
          game_number: number
          id: number
          is_keyframe: boolean | null
          move_number: number
          session_id: string
          snapshot_type: string
          white_checkers_off: number | null
          white_checkers_on_bar: number | null
          white_pip_count: number | null
        }
        Insert: {
          black_checkers_off?: number | null
          black_checkers_on_bar?: number | null
          black_pip_count?: number | null
          board_state_compressed: string
          game_number: number
          id?: number
          is_keyframe?: boolean | null
          move_number: number
          session_id: string
          snapshot_type: string
          white_checkers_off?: number | null
          white_checkers_on_bar?: number | null
          white_pip_count?: number | null
        }
        Update: {
          black_checkers_off?: number | null
          black_checkers_on_bar?: number | null
          black_pip_count?: number | null
          board_state_compressed?: string
          game_number?: number
          id?: number
          is_keyframe?: boolean | null
          move_number?: number
          session_id?: string
          snapshot_type?: string
          white_checkers_off?: number | null
          white_checkers_on_bar?: number | null
          white_pip_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ludo_gameplay_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ludo_gameplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_mcts_evaluations: {
        Row: {
          actual_time_ms: number
          ai_difficulty: string
          alternative_moves: Json | null
          created_at: string
          exceeded_time_budget: boolean | null
          exploration_constant: number
          fallback_reason: string | null
          fallback_to_rules: boolean | null
          game_number: number
          games_per_second: number | null
          id: number
          is_bearoff_with_contact: boolean
          is_contact_position: boolean
          is_cube_decision: boolean
          is_forced_move: boolean
          is_match_critical: boolean
          is_opening_move: boolean
          mcts_rule_agreement: boolean | null
          mcts_time_budget_ms: number
          move_count: number
          move_number: number
          nodes_created: number | null
          player: string
          position_hash: string | null
          rollout_count_actual: number
          rollout_count_target: number
          rollout_policy: string
          rule_based_move_from: number | null
          rule_based_move_to: number | null
          rule_based_score: number | null
          selected_move_from: number
          selected_move_to: number
          selected_move_visits: number | null
          selected_move_win_rate: number | null
          session_id: string | null
          simulations_run: number | null
          thinking_time_budget_ms: number
        }
        Insert: {
          actual_time_ms: number
          ai_difficulty: string
          alternative_moves?: Json | null
          created_at?: string
          exceeded_time_budget?: boolean | null
          exploration_constant: number
          fallback_reason?: string | null
          fallback_to_rules?: boolean | null
          game_number: number
          games_per_second?: number | null
          id?: number
          is_bearoff_with_contact?: boolean
          is_contact_position?: boolean
          is_cube_decision?: boolean
          is_forced_move?: boolean
          is_match_critical?: boolean
          is_opening_move?: boolean
          mcts_rule_agreement?: boolean | null
          mcts_time_budget_ms: number
          move_count: number
          move_number: number
          nodes_created?: number | null
          player: string
          position_hash?: string | null
          rollout_count_actual: number
          rollout_count_target: number
          rollout_policy: string
          rule_based_move_from?: number | null
          rule_based_move_to?: number | null
          rule_based_score?: number | null
          selected_move_from: number
          selected_move_to: number
          selected_move_visits?: number | null
          selected_move_win_rate?: number | null
          session_id?: string | null
          simulations_run?: number | null
          thinking_time_budget_ms: number
        }
        Update: {
          actual_time_ms?: number
          ai_difficulty?: string
          alternative_moves?: Json | null
          created_at?: string
          exceeded_time_budget?: boolean | null
          exploration_constant?: number
          fallback_reason?: string | null
          fallback_to_rules?: boolean | null
          game_number?: number
          games_per_second?: number | null
          id?: number
          is_bearoff_with_contact?: boolean
          is_contact_position?: boolean
          is_cube_decision?: boolean
          is_forced_move?: boolean
          is_match_critical?: boolean
          is_opening_move?: boolean
          mcts_rule_agreement?: boolean | null
          mcts_time_budget_ms?: number
          move_count?: number
          move_number?: number
          nodes_created?: number | null
          player?: string
          position_hash?: string | null
          rollout_count_actual?: number
          rollout_count_target?: number
          rollout_policy?: string
          rule_based_move_from?: number | null
          rule_based_move_to?: number | null
          rule_based_score?: number | null
          selected_move_from?: number
          selected_move_to?: number
          selected_move_visits?: number | null
          selected_move_win_rate?: number | null
          session_id?: string | null
          simulations_run?: number | null
          thinking_time_budget_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "ludo_mcts_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ludo_gameplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_mcts_performance_benchmarks: {
        Row: {
          app_version: string | null
          created_at: string
          device_info: Json | null
          duration_ms: number
          games_per_second: number
          games_simulated: number
          id: number
          performance_tier: string | null
          rollout_policy: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_info?: Json | null
          duration_ms: number
          games_per_second: number
          games_simulated: number
          id?: number
          performance_tier?: string | null
          rollout_policy: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_info?: Json | null
          duration_ms?: number
          games_per_second?: number
          games_simulated?: number
          id?: number
          performance_tier?: string | null
          rollout_policy?: string
        }
        Relationships: []
      }
      ludo_mcts_position_library: {
        Row: {
          best_move_from: number | null
          best_move_to: number | null
          best_move_win_rate: number | null
          black_pip_count: number | null
          board_state_compressed: string
          category: string | null
          created_at: string
          current_player: string
          description: string | null
          evaluation_simulations: number | null
          id: string
          last_evaluated_at: string | null
          name: string | null
          position_hash: string | null
          tags: string[] | null
          times_evaluated: number | null
          white_pip_count: number | null
        }
        Insert: {
          best_move_from?: number | null
          best_move_to?: number | null
          best_move_win_rate?: number | null
          black_pip_count?: number | null
          board_state_compressed: string
          category?: string | null
          created_at?: string
          current_player: string
          description?: string | null
          evaluation_simulations?: number | null
          id?: string
          last_evaluated_at?: string | null
          name?: string | null
          position_hash?: string | null
          tags?: string[] | null
          times_evaluated?: number | null
          white_pip_count?: number | null
        }
        Update: {
          best_move_from?: number | null
          best_move_to?: number | null
          best_move_win_rate?: number | null
          black_pip_count?: number | null
          board_state_compressed?: string
          category?: string | null
          created_at?: string
          current_player?: string
          description?: string | null
          evaluation_simulations?: number | null
          id?: string
          last_evaluated_at?: string | null
          name?: string | null
          position_hash?: string | null
          tags?: string[] | null
          times_evaluated?: number | null
          white_pip_count?: number | null
        }
        Relationships: []
      }
      ludo_mcts_training_sessions: {
        Row: {
          avg_games_per_second: number | null
          baseline_configuration: Json | null
          best_configuration: Json | null
          best_performance_score: number | null
          completed_at: string | null
          created_at: string
          id: string
          improvement_percent: number | null
          notes: string | null
          parameters_tested: Json
          status: string | null
          total_positions_evaluated: number | null
          total_simulations_run: number | null
          training_type: string
        }
        Insert: {
          avg_games_per_second?: number | null
          baseline_configuration?: Json | null
          best_configuration?: Json | null
          best_performance_score?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          improvement_percent?: number | null
          notes?: string | null
          parameters_tested: Json
          status?: string | null
          total_positions_evaluated?: number | null
          total_simulations_run?: number | null
          training_type: string
        }
        Update: {
          avg_games_per_second?: number | null
          baseline_configuration?: Json | null
          best_configuration?: Json | null
          best_performance_score?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          improvement_percent?: number | null
          notes?: string | null
          parameters_tested?: Json
          status?: string | null
          total_positions_evaluated?: number | null
          total_simulations_run?: number | null
          training_type?: string
        }
        Relationships: []
      }
      ludo_sound_collection_assignments: {
        Row: {
          collection_id: string
          created_at: string
          gameplay_event: string
          id: string
          playback_config: Json | null
          sound_library_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          gameplay_event: string
          id?: string
          playback_config?: Json | null
          sound_library_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          gameplay_event?: string
          id?: string
          playback_config?: Json | null
          sound_library_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ludo_sound_collection_assignments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "ludo_sound_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_sound_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ludo_themes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          theme_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          theme_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          theme_data?: Json
          updated_at?: string
        }
        Relationships: []
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
      service_blueprints: {
        Row: {
          blueprint_type: string | null
          created_at: string
          description: string | null
          hypothesis_id: string | null
          id: string
          metadata: Json | null
          name: string
          parent_version_id: string | null
          service_duration: string | null
          service_scope: string | null
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          validated_at: string | null
          validation_status: string | null
          version: number
        }
        Insert: {
          blueprint_type?: string | null
          created_at?: string
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          parent_version_id?: string | null
          service_duration?: string | null
          service_scope?: string | null
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: string | null
          version?: number
        }
        Update: {
          blueprint_type?: string | null
          created_at?: string
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          parent_version_id?: string | null
          service_duration?: string | null
          service_scope?: string | null
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_blueprints_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blueprints_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "service_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blueprints_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
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
      stable_assets: {
        Row: {
          asset_type: string
          character_id: string
          created_at: string
          created_by: string | null
          data: Json | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          name: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          asset_type: string
          character_id: string
          created_at?: string
          created_by?: string | null
          data?: Json | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          character_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stable_assets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "stable_characters"
            referencedColumns: ["id"]
          },
        ]
      }
      stable_character_relationships: {
        Row: {
          character_a_id: string
          character_b_id: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: string
          updated_at: string
        }
        Insert: {
          character_a_id: string
          character_b_id: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type: string
          updated_at?: string
        }
        Update: {
          character_a_id?: string
          character_b_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stable_character_relationships_character_a_id_fkey"
            columns: ["character_a_id"]
            isOneToOne: false
            referencedRelation: "stable_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stable_character_relationships_character_b_id_fkey"
            columns: ["character_b_id"]
            isOneToOne: false
            referencedRelation: "stable_characters"
            referencedColumns: ["id"]
          },
        ]
      }
      stable_characters: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          parametric_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          parametric_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          parametric_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      story_map_layers: {
        Row: {
          created_at: string
          customer_profile_id: string | null
          description: string | null
          id: string
          layer_type: string | null
          metadata: Json | null
          name: string
          sequence: number
          story_map_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_profile_id?: string | null
          description?: string | null
          id?: string
          layer_type?: string | null
          metadata?: Json | null
          name: string
          sequence: number
          story_map_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_profile_id?: string | null
          description?: string | null
          id?: string
          layer_type?: string | null
          metadata?: Json | null
          name?: string
          sequence?: number
          story_map_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_map_layers_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_map_layers_story_map_id_fkey"
            columns: ["story_map_id"]
            isOneToOne: false
            referencedRelation: "story_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      story_maps: {
        Row: {
          created_at: string
          description: string | null
          hypothesis_id: string | null
          id: string
          map_type: string | null
          metadata: Json | null
          name: string
          parent_version_id: string | null
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          validated_at: string | null
          validation_status: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          map_type?: string | null
          metadata?: Json | null
          name: string
          parent_version_id?: string | null
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          hypothesis_id?: string | null
          id?: string
          map_type?: string | null
          metadata?: Json | null
          name?: string
          parent_version_id?: string | null
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "story_maps_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_maps_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "story_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_maps_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      story_releases: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          release_date: string | null
          release_name: string
          release_order: number | null
          updated_at: string
          user_story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          release_date?: string | null
          release_name: string
          release_order?: number | null
          updated_at?: string
          user_story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          release_date?: string | null
          release_name?: string
          release_order?: number | null
          updated_at?: string
          user_story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_releases_user_story_id_fkey"
            columns: ["user_story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_experiments: {
        Row: {
          created_at: string
          description: string | null
          expected_outcome: string | null
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
          expected_outcome?: string | null
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
          expected_outcome?: string | null
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
          rationale: string | null
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
          rationale?: string | null
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
          rationale?: string | null
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
          app_path: string | null
          created_at: string
          current_focus: string | null
          description: string | null
          has_pending_survey: boolean | null
          id: string
          is_private: boolean | null
          name: string
          problem_statement: string | null
          scope_out: string | null
          slug: string
          status: string
          success_criteria: string | null
          survey_generated_at: string | null
          temperature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_path?: string | null
          created_at?: string
          current_focus?: string | null
          description?: string | null
          has_pending_survey?: boolean | null
          id?: string
          is_private?: boolean | null
          name: string
          problem_statement?: string | null
          scope_out?: string | null
          slug: string
          status?: string
          success_criteria?: string | null
          survey_generated_at?: string | null
          temperature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_path?: string | null
          created_at?: string
          current_focus?: string | null
          description?: string | null
          has_pending_survey?: boolean | null
          id?: string
          is_private?: boolean | null
          name?: string
          problem_statement?: string | null
          scope_out?: string | null
          slug?: string
          status?: string
          success_criteria?: string | null
          survey_generated_at?: string | null
          temperature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_survey_artifacts: {
        Row: {
          artifact_field: string | null
          artifact_id: string | null
          artifact_type: string
          confidence_score: number | null
          created_at: string
          id: string
          source_questions: string[] | null
          survey_id: string
          user_accepted: boolean | null
          user_modified: boolean | null
        }
        Insert: {
          artifact_field?: string | null
          artifact_id?: string | null
          artifact_type: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          source_questions?: string[] | null
          survey_id: string
          user_accepted?: boolean | null
          user_modified?: boolean | null
        }
        Update: {
          artifact_field?: string | null
          artifact_id?: string | null
          artifact_type?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          source_questions?: string[] | null
          survey_id?: string
          user_accepted?: boolean | null
          user_modified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_survey_artifacts_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "studio_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_survey_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_text: string | null
          response_value: Json
          skipped: boolean | null
          survey_id: string
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_text?: string | null
          response_value: Json
          skipped?: boolean | null
          survey_id: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_text?: string | null
          response_value?: Json
          skipped?: boolean | null
          survey_id?: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "studio_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_surveys: {
        Row: {
          completed_at: string | null
          created_at: string
          current_question_index: number | null
          generation_context: Json
          generation_model: string
          id: string
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
          project_id: string
          questions: Json
          started_at: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_question_index?: number | null
          generation_context: Json
          generation_model: string
          id?: string
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project_id: string
          questions: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_question_index?: number | null
          generation_context?: Json
          generation_model?: string
          id?: string
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project_id?: string
          questions?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      touchpoints: {
        Row: {
          channel_type: string | null
          created_at: string
          current_experience_quality: string | null
          delight_potential: string | null
          description: string | null
          id: string
          importance: string | null
          interaction_type: string | null
          journey_stage_id: string
          metadata: Json | null
          name: string
          pain_level: string | null
          sequence: number
          system_response: Json | null
          updated_at: string
          user_actions: Json | null
          validated_at: string | null
          validation_status: string | null
        }
        Insert: {
          channel_type?: string | null
          created_at?: string
          current_experience_quality?: string | null
          delight_potential?: string | null
          description?: string | null
          id?: string
          importance?: string | null
          interaction_type?: string | null
          journey_stage_id: string
          metadata?: Json | null
          name: string
          pain_level?: string | null
          sequence: number
          system_response?: Json | null
          updated_at?: string
          user_actions?: Json | null
          validated_at?: string | null
          validation_status?: string | null
        }
        Update: {
          channel_type?: string | null
          created_at?: string
          current_experience_quality?: string | null
          delight_potential?: string | null
          description?: string | null
          id?: string
          importance?: string | null
          interaction_type?: string | null
          journey_stage_id?: string
          metadata?: Json | null
          name?: string
          pain_level?: string | null
          sequence?: number
          system_response?: Json | null
          updated_at?: string
          user_actions?: Json | null
          validated_at?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_journey_stage_id_fkey"
            columns: ["journey_stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journeys: {
        Row: {
          context: Json | null
          created_at: string
          customer_profile_id: string | null
          description: string | null
          duration_estimate: string | null
          goal: string | null
          hypothesis_id: string | null
          id: string
          journey_type: string | null
          metadata: Json | null
          name: string
          parent_version_id: string | null
          slug: string
          status: string
          studio_project_id: string | null
          tags: string[] | null
          updated_at: string
          validated_at: string | null
          validation_confidence: string | null
          validation_status: string | null
          version: number
        }
        Insert: {
          context?: Json | null
          created_at?: string
          customer_profile_id?: string | null
          description?: string | null
          duration_estimate?: string | null
          goal?: string | null
          hypothesis_id?: string | null
          id?: string
          journey_type?: string | null
          metadata?: Json | null
          name: string
          parent_version_id?: string | null
          slug: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_confidence?: string | null
          validation_status?: string | null
          version?: number
        }
        Update: {
          context?: Json | null
          created_at?: string
          customer_profile_id?: string | null
          description?: string | null
          duration_estimate?: string | null
          goal?: string | null
          hypothesis_id?: string | null
          id?: string
          journey_type?: string | null
          metadata?: Json | null
          name?: string
          parent_version_id?: string | null
          slug?: string
          status?: string
          studio_project_id?: string | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validation_confidence?: string | null
          validation_status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_journeys_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journeys_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "studio_hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journeys_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "journey_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journeys_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "user_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journeys_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stories: {
        Row: {
          acceptance_criteria: string | null
          activity_id: string
          created_at: string
          description: string | null
          id: string
          layer_id: string | null
          metadata: Json | null
          priority: string | null
          status: string | null
          story_points: number | null
          story_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
          validated_at: string | null
          validation_status: string | null
          vertical_position: number | null
        }
        Insert: {
          acceptance_criteria?: string | null
          activity_id: string
          created_at?: string
          description?: string | null
          id?: string
          layer_id?: string | null
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          story_points?: number | null
          story_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string | null
          vertical_position?: number | null
        }
        Update: {
          acceptance_criteria?: string | null
          activity_id?: string
          created_at?: string
          description?: string | null
          id?: string
          layer_id?: string | null
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          story_points?: number | null
          story_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validation_status?: string | null
          vertical_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stories_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stories_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "story_map_layers"
            referencedColumns: ["id"]
          },
        ]
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
      ventures: {
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
      verbivore_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      verbivore_entries: {
        Row: {
          category_id: string | null
          complexity_score: number
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          published_at: string | null
          reading_time: number
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          thumbnail_image_url: string | null
          title: string
          updated_at: string
          view_count: number
          word_count: number
        }
        Insert: {
          category_id?: string | null
          complexity_score?: number
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          reading_time?: number
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          thumbnail_image_url?: string | null
          title: string
          updated_at?: string
          view_count?: number
          word_count?: number
        }
        Update: {
          category_id?: string | null
          complexity_score?: number
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          reading_time?: number
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          thumbnail_image_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "verbivore_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "verbivore_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      verbivore_entry_relationships: {
        Row: {
          child_entry_id: string
          created_at: string
          id: string
          parent_entry_id: string
          relationship_type: string
          sequence_order: number
          split_strategy: Json | null
        }
        Insert: {
          child_entry_id: string
          created_at?: string
          id?: string
          parent_entry_id: string
          relationship_type?: string
          sequence_order?: number
          split_strategy?: Json | null
        }
        Update: {
          child_entry_id?: string
          created_at?: string
          id?: string
          parent_entry_id?: string
          relationship_type?: string
          sequence_order?: number
          split_strategy?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "verbivore_entry_relationships_child_entry_id_fkey"
            columns: ["child_entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_entry_relationships_child_entry_id_fkey"
            columns: ["child_entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_entry_relationships_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_entry_relationships_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      verbivore_entry_terms: {
        Row: {
          created_at: string
          display_order: number
          entry_id: string
          id: string
          is_primary: boolean
          term_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          entry_id: string
          id?: string
          is_primary?: boolean
          term_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          entry_id?: string
          id?: string
          is_primary?: boolean
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verbivore_entry_terms_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_entry_terms_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_entry_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_entry_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      verbivore_sources: {
        Row: {
          author: string | null
          created_at: string
          id: string
          publication_date: string | null
          source_type: string | null
          title: string
          url: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          publication_date?: string | null
          source_type?: string | null
          title: string
          url?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          publication_date?: string | null
          source_type?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      verbivore_splitting_sessions: {
        Row: {
          analysis_result: Json | null
          created_at: string
          entry_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          entry_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          entry_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verbivore_splitting_sessions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_splitting_sessions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      verbivore_style_guides: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          prompt: string
          slug: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          prompt: string
          slug: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          prompt?: string
          slug?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      verbivore_term_relationships: {
        Row: {
          created_at: string
          id: string
          related_term_id: string
          relationship_type: string
          term_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          related_term_id: string
          relationship_type?: string
          term_id: string
        }
        Update: {
          created_at?: string
          id?: string
          related_term_id?: string
          relationship_type?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verbivore_term_relationships_related_term_id_fkey"
            columns: ["related_term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_term_relationships_related_term_id_fkey"
            columns: ["related_term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_term_relationships_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_term_relationships_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      verbivore_term_sources: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          page_number: string | null
          source_id: string
          term_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          page_number?: string | null
          source_id: string
          term_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          page_number?: string | null
          source_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verbivore_term_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "verbivore_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_term_sources_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_public_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verbivore_term_sources_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "verbivore_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      verbivore_terms: {
        Row: {
          created_at: string
          definition: string
          difficulty_level: string | null
          etymology_source: string | null
          id: string
          image_url: string | null
          origin: string | null
          pronunciation: string | null
          slug: string
          synonyms: string[] | null
          tags: string[] | null
          term: string
          updated_at: string
          usage_examples: string[] | null
          view_count: number
        }
        Insert: {
          created_at?: string
          definition: string
          difficulty_level?: string | null
          etymology_source?: string | null
          id?: string
          image_url?: string | null
          origin?: string | null
          pronunciation?: string | null
          slug: string
          synonyms?: string[] | null
          tags?: string[] | null
          term: string
          updated_at?: string
          usage_examples?: string[] | null
          view_count?: number
        }
        Update: {
          created_at?: string
          definition?: string
          difficulty_level?: string | null
          etymology_source?: string | null
          id?: string
          image_url?: string | null
          origin?: string | null
          pronunciation?: string | null
          slug?: string
          synonyms?: string[] | null
          tags?: string[] | null
          term?: string
          updated_at?: string
          usage_examples?: string[] | null
          view_count?: number
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          backed_up: boolean
          counter: number
          created_at: string
          device_type: string
          id: string
          last_used_at: string | null
          name: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          backed_up?: boolean
          counter?: number
          created_at?: string
          device_type: string
          id: string
          last_used_at?: string | null
          name?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          backed_up?: boolean
          counter?: number
          created_at?: string
          device_type?: string
          id?: string
          last_used_at?: string | null
          name?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      canvas_items_with_assumptions: {
        Row: {
          assumption_count: number | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string | null
          importance: string | null
          intensity: string | null
          invalidated_assumption_count: number | null
          item_type: string | null
          job_context: string | null
          job_type: string | null
          metadata: Json | null
          notes: string | null
          studio_project_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          validated_assumption_count: number | null
          validation_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_items_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_items_with_placements: {
        Row: {
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string | null
          importance: string | null
          intensity: string | null
          item_type: string | null
          job_context: string | null
          job_type: string | null
          metadata: Json | null
          notes: string | null
          placement_count: number | null
          placements: Json | null
          studio_project_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          validation_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_items_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fit_gain_creation: {
        Row: {
          fit_strength: string | null
          gain: string | null
          gain_creator: string | null
          gain_creator_id: string | null
          gain_id: string | null
          gain_intensity: string | null
          mapping_id: string | null
          notes: string | null
          studio_project_id: string | null
          validation_method: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_items_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fit_pain_relief: {
        Row: {
          fit_strength: string | null
          mapping_id: string | null
          notes: string | null
          pain: string | null
          pain_id: string | null
          pain_intensity: string | null
          pain_reliever: string | null
          pain_reliever_id: string | null
          studio_project_id: string | null
          validation_method: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_items_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_summaries: {
        Row: {
          created_at: string | null
          customer_profile_id: string | null
          customer_profile_name: string | null
          description: string | null
          goal: string | null
          high_pain_count: number | null
          id: string | null
          journey_type: string | null
          name: string | null
          slug: string | null
          stage_count: number | null
          status: string | null
          studio_project_id: string | null
          studio_project_name: string | null
          tags: string[] | null
          touchpoint_count: number | null
          updated_at: string | null
          validation_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_journeys_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journeys_studio_project_id_fkey"
            columns: ["studio_project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ludo_mcts_performance_by_complexity: {
        Row: {
          avg_games_per_second: number | null
          avg_rollouts: number | null
          avg_time_budget: number | null
          avg_time_ms: number | null
          position_type: string | null
          total_evaluations: number | null
        }
        Relationships: []
      }
      ludo_mcts_performance_by_difficulty: {
        Row: {
          ai_difficulty: string | null
          avg_games_per_second: number | null
          avg_rollouts: number | null
          avg_time_ms: number | null
          fallback_count: number | null
          rule_agreement_rate: number | null
          total_evaluations: number | null
        }
        Relationships: []
      }
      studio_project_relationships: {
        Row: {
          created_at: string | null
          id: string | null
          link_type: string | null
          metadata: Json | null
          notes: string | null
          relationship_category: string | null
          source_id: string | null
          source_project_name: string | null
          source_project_slug: string | null
          source_type: string | null
          strength: string | null
          target_id: string | null
          target_project_name: string | null
          target_project_slug: string | null
          target_type: string | null
        }
        Relationships: []
      }
      verbivore_public_entries: {
        Row: {
          category_color: string | null
          category_name: string | null
          category_slug: string | null
          content: string | null
          cover_image_url: string | null
          excerpt: string | null
          featured: boolean | null
          id: string | null
          published_at: string | null
          reading_time: number | null
          slug: string | null
          terms: Json[] | null
          thumbnail_image_url: string | null
          title: string | null
          view_count: number | null
          word_count: number | null
        }
        Relationships: []
      }
      verbivore_public_terms: {
        Row: {
          definition: string | null
          difficulty_level: string | null
          entry_titles: string[] | null
          id: string | null
          image_url: string | null
          origin: string | null
          pronunciation: string | null
          slug: string | null
          synonyms: string[] | null
          tags: string[] | null
          term: string | null
          usage_examples: string[] | null
          view_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_webauthn_challenges: { Args: never; Returns: undefined }
      get_canvas_item_counts: {
        Args: { item_ids: string[] }
        Returns: {
          assumption_count: number
          evidence_count: number
          item_id: string
        }[]
      }
      get_canvas_items_with_counts: {
        Args: never
        Returns: {
          assumption_count: number
          created_at: string
          description: string
          evidence_count: number
          id: string
          importance: string
          item_type: string
          placement_count: number
          studio_project: Json
          studio_project_id: string
          tags: string[]
          title: string
          updated_at: string
          validation_status: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      remove_entity_link: {
        Args: {
          p_link_type: string
          p_source_id: string
          p_source_type: string
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      reorder_blueprint_steps: {
        Args: { p_blueprint_id: string; p_step_ids: string[] }
        Returns: number
      }
      reorder_journey_stages: {
        Args: { p_journey_id: string; p_stage_ids: string[] }
        Returns: number
      }
      resequence_journey_stages: {
        Args: { p_journey_id: string }
        Returns: undefined
      }
      resequence_stage_touchpoints: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      upsert_entity_link: {
        Args: {
          p_link_type: string
          p_source_id: string
          p_source_type: string
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      user_has_project_access: {
        Args: { project_id: string }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
