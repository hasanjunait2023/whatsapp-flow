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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_access_requests: {
        Row: {
          created_at: string
          id: string
          permissions: Json | null
          reason: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json | null
          reason?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json | null
          reason?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      admin_customer_journey: {
        Row: {
          channel: string | null
          created_at: string | null
          description_bn: string | null
          entity_id: string
          entity_type: string
          event_category: string | null
          event_type: string
          id: string
          metadata: Json | null
          title_bn: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          description_bn?: string | null
          entity_id: string
          entity_type: string
          event_category?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          title_bn: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          description_bn?: string | null
          entity_id?: string
          entity_type?: string
          event_category?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          title_bn?: string
        }
        Relationships: []
      }
      admin_facebook_pages: {
        Row: {
          app_secret: string | null
          created_at: string | null
          created_by: string | null
          id: string
          page_access_token: string | null
          page_id: string
          page_name: string
          profile_picture_url: string | null
          status: string | null
          updated_at: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          app_secret?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          page_access_token?: string | null
          page_id: string
          page_name: string
          profile_picture_url?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          app_secret?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          page_access_token?: string | null
          page_id?: string
          page_name?: string
          profile_picture_url?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      admin_marketing_campaigns: {
        Row: {
          alternate_channels: boolean | null
          blackout_hours: Json | null
          created_at: string | null
          created_by: string | null
          frequency_per_month: number | null
          frequency_per_week: number | null
          id: string
          max_discount_percent: number | null
          min_days_between_messages: number | null
          name: string
          name_bn: string | null
          status: string | null
          target_audience: Json | null
          target_tier: string[] | null
          type: string
          updated_at: string | null
          use_email: boolean | null
          use_whatsapp: boolean | null
        }
        Insert: {
          alternate_channels?: boolean | null
          blackout_hours?: Json | null
          created_at?: string | null
          created_by?: string | null
          frequency_per_month?: number | null
          frequency_per_week?: number | null
          id?: string
          max_discount_percent?: number | null
          min_days_between_messages?: number | null
          name: string
          name_bn?: string | null
          status?: string | null
          target_audience?: Json | null
          target_tier?: string[] | null
          type: string
          updated_at?: string | null
          use_email?: boolean | null
          use_whatsapp?: boolean | null
        }
        Update: {
          alternate_channels?: boolean | null
          blackout_hours?: Json | null
          created_at?: string | null
          created_by?: string | null
          frequency_per_month?: number | null
          frequency_per_week?: number | null
          id?: string
          max_discount_percent?: number | null
          min_days_between_messages?: number | null
          name?: string
          name_bn?: string | null
          status?: string | null
          target_audience?: Json | null
          target_tier?: string[] | null
          type?: string
          updated_at?: string | null
          use_email?: boolean | null
          use_whatsapp?: boolean | null
        }
        Relationships: []
      }
      admin_marketing_enrollments: {
        Row: {
          campaign_id: string
          completed_at: string | null
          current_step: number | null
          current_week: number | null
          enrolled_at: string | null
          entity_id: string
          entity_type: string
          id: string
          last_message_at: string | null
          messages_this_month: number | null
          messages_this_week: number | null
          metadata: Json | null
          month_reset_at: string | null
          next_message_at: string | null
          status: string | null
          total_messages_sent: number | null
          unsubscribed_at: string | null
          week_reset_at: string | null
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          current_step?: number | null
          current_week?: number | null
          enrolled_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_message_at?: string | null
          messages_this_month?: number | null
          messages_this_week?: number | null
          metadata?: Json | null
          month_reset_at?: string | null
          next_message_at?: string | null
          status?: string | null
          total_messages_sent?: number | null
          unsubscribed_at?: string | null
          week_reset_at?: string | null
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          current_step?: number | null
          current_week?: number | null
          enrolled_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_message_at?: string | null
          messages_this_month?: number | null
          messages_this_week?: number | null
          metadata?: Json | null
          month_reset_at?: string | null
          next_message_at?: string | null
          status?: string | null
          total_messages_sent?: number | null
          unsubscribed_at?: string | null
          week_reset_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_marketing_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "admin_marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketing_sends: {
        Row: {
          ai_generated: boolean | null
          channel: string
          clicked_at: string | null
          content: Json | null
          created_at: string | null
          delivered_at: string | null
          enrollment_id: string
          error_message: string | null
          id: string
          opened_at: string | null
          retry_after: string | null
          retry_count: number | null
          sent_at: string | null
          sequence_id: string
          status: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          channel: string
          clicked_at?: string | null
          content?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          enrollment_id: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          retry_after?: string | null
          retry_count?: number | null
          sent_at?: string | null
          sequence_id: string
          status?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          channel?: string
          clicked_at?: string | null
          content?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          enrollment_id?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          retry_after?: string | null
          retry_count?: number | null
          sent_at?: string | null
          sequence_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_marketing_sends_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "admin_marketing_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_marketing_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "admin_marketing_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_marketing_sequences: {
        Row: {
          ai_personalize: boolean | null
          campaign_id: string
          channel: string
          content_template: Json
          created_at: string | null
          day_of_week: number | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string | null
          step_order: number
          theme: string | null
          week_number: number
        }
        Insert: {
          ai_personalize?: boolean | null
          campaign_id: string
          channel: string
          content_template?: Json
          created_at?: string | null
          day_of_week?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn?: string | null
          step_order: number
          theme?: string | null
          week_number: number
        }
        Update: {
          ai_personalize?: boolean | null
          campaign_id?: string
          channel?: string
          content_template?: Json
          created_at?: string | null
          day_of_week?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string | null
          step_order?: number
          theme?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_marketing_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "admin_marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          tenant_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          tenant_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_tenant_id: string | null
          related_ticket_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_tenant_id?: string | null
          related_ticket_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_tenant_id?: string | null
          related_ticket_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_related_tenant_id_fkey"
            columns: ["related_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_whatsapp_instances: {
        Row: {
          api_key_encrypted: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          name: string
          phone_number: string | null
          qr_code: string | null
          session_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          phone_number?: string | null
          qr_code?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          api_key_prefix: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          request_body: Json | null
          response_status: number | null
          response_time_ms: number | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          api_key_prefix?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          request_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          api_key_prefix?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          request_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "tenant_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          tenant_id: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          tenant_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_type_features: {
        Row: {
          business_type_id: string | null
          category_id: string | null
          created_at: string | null
          display_order: number | null
          feature_description: string | null
          feature_flag_key: string | null
          feature_key: string
          feature_label: string
          feature_label_bn: string | null
          icon: string | null
          id: string
          is_core: boolean | null
          is_highlight: boolean | null
          min_tier: string | null
          tooltip: string | null
        }
        Insert: {
          business_type_id?: string | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          feature_description?: string | null
          feature_flag_key?: string | null
          feature_key: string
          feature_label: string
          feature_label_bn?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          is_highlight?: boolean | null
          min_tier?: string | null
          tooltip?: string | null
        }
        Update: {
          business_type_id?: string | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          feature_description?: string | null
          feature_flag_key?: string | null
          feature_key?: string
          feature_label?: string
          feature_label_bn?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          is_highlight?: boolean | null
          min_tier?: string | null
          tooltip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_type_features_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_type_features_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feature_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_types: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
          woo_category_id: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
          woo_category_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
          woo_category_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          contact_id: string | null
          created_at: string
          description: string
          id: string
          order_id: string | null
          priority: Database["public"]["Enums"]["complaint_priority"]
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          contact_id?: string | null
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          contact_id?: string | null
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "complaints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_labels: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          label_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          label_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_reason: string | null
          contact_id: string | null
          id: string
          segment_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_reason?: string | null
          contact_id?: string | null
          id?: string
          segment_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_reason?: string | null
          contact_id?: string | null
          id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_segments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_segments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_thread_state: {
        Row: {
          assigned_to: string | null
          contact_avatar_url: string | null
          contact_id: string
          contact_name: string | null
          contact_phone: string | null
          contact_type: string
          created_at: string
          handoff_reason: string | null
          instance_id: string | null
          is_archived: boolean
          is_blocked: boolean
          label_ids: string[] | null
          last_inbound_at: string | null
          last_message_at: string
          last_message_direction: string | null
          last_message_preview: string | null
          last_message_type: string | null
          needs_handoff: boolean
          tenant_id: string
          total_messages: number
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_avatar_url?: string | null
          contact_id: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_type?: string
          created_at?: string
          handoff_reason?: string | null
          instance_id?: string | null
          is_archived?: boolean
          is_blocked?: boolean
          label_ids?: string[] | null
          last_inbound_at?: string | null
          last_message_at?: string
          last_message_direction?: string | null
          last_message_preview?: string | null
          last_message_type?: string | null
          needs_handoff?: boolean
          tenant_id: string
          total_messages?: number
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_avatar_url?: string | null
          contact_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_type?: string
          created_at?: string
          handoff_reason?: string | null
          instance_id?: string | null
          is_archived?: boolean
          is_blocked?: boolean
          label_ids?: string[] | null
          last_inbound_at?: string | null
          last_message_at?: string
          last_message_direction?: string | null
          last_message_preview?: string | null
          last_message_type?: string | null
          needs_handoff?: boolean
          tenant_id?: string
          total_messages?: number
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_thread_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          created_at: string
          device_typing_at: string | null
          handoff_at: string | null
          handoff_reason: string | null
          id: string
          instance_id: string | null
          is_archived: boolean
          is_blocked: boolean
          opted_out: boolean
          last_message_at: string | null
          name: string | null
          needs_handoff: boolean
          phone_number: string
          profile_pic_synced_at: string | null
          profile_pic_url: string | null
          replying_started_at: string | null
          replying_user_id: string | null
          tenant_id: string
          unread_count: number
          updated_at: string
          wa_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          device_typing_at?: string | null
          handoff_at?: string | null
          handoff_reason?: string | null
          id?: string
          instance_id?: string | null
          is_archived?: boolean
          is_blocked?: boolean
          opted_out?: boolean
          last_message_at?: string | null
          name?: string | null
          needs_handoff?: boolean
          phone_number: string
          profile_pic_synced_at?: string | null
          profile_pic_url?: string | null
          replying_started_at?: string | null
          replying_user_id?: string | null
          tenant_id: string
          unread_count?: number
          updated_at?: string
          wa_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          device_typing_at?: string | null
          handoff_at?: string | null
          handoff_reason?: string | null
          id?: string
          instance_id?: string | null
          is_archived?: boolean
          is_blocked?: boolean
          opted_out?: boolean
          last_message_at?: string | null
          name?: string | null
          needs_handoff?: boolean
          phone_number?: string
          profile_pic_synced_at?: string | null
          profile_pic_url?: string | null
          replying_started_at?: string | null
          replying_user_id?: string | null
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_integrations: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string | null
          default_pickup_address: Json | null
          id: string
          is_active: boolean | null
          provider: string
          settings: Json | null
          store_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          default_pickup_address?: Json | null
          id?: string
          is_active?: boolean | null
          provider: string
          settings?: Json | null
          store_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          default_pickup_address?: Json | null
          id?: string
          is_active?: boolean | null
          provider?: string
          settings?: Json | null
          store_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_journey_events: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string
          title: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_category: string
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
          title: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_journey_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "customer_journey_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_journey_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_journey_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_scores: {
        Row: {
          avg_order_value: number | null
          contact_id: string | null
          created_at: string | null
          first_order_date: string | null
          id: string
          last_calculated_at: string | null
          last_order_date: string | null
          message_count: number | null
          score: number | null
          score_tier: string | null
          tenant_id: string
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          avg_order_value?: number | null
          contact_id?: string | null
          created_at?: string | null
          first_order_date?: string | null
          id?: string
          last_calculated_at?: string | null
          last_order_date?: string | null
          message_count?: number | null
          score?: number | null
          score_tier?: string | null
          tenant_id: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_order_value?: number | null
          contact_id?: string | null
          created_at?: string | null
          first_order_date?: string | null
          id?: string
          last_calculated_at?: string | null
          last_order_date?: string | null
          message_count?: number | null
          score?: number | null
          score_tier?: string | null
          tenant_id?: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "customer_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_scoring_rules: {
        Row: {
          created_at: string | null
          criteria_type: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          operator: string
          points: number
          tenant_id: string
          value_max: number | null
          value_min: number | null
        }
        Insert: {
          created_at?: string | null
          criteria_type: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          operator: string
          points?: number
          tenant_id: string
          value_max?: number | null
          value_min?: number | null
        }
        Update: {
          created_at?: string | null
          criteria_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          operator?: string
          points?: number
          tenant_id?: string
          value_max?: number | null
          value_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_scoring_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_auto: boolean | null
          name: string
          rules: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_auto?: boolean | null
          name: string
          rules?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_auto?: boolean | null
          name?: string
          rules?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string | null
          reference_number: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      external_sales_orders: {
        Row: {
          amount: number
          billing_cycle: string
          business_name: string
          business_type: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          error_message: string | null
          external_order_id: string
          id: string
          notification_errors: string[] | null
          payment_method: string | null
          plan_id: string | null
          processed_at: string | null
          raw_payload: Json | null
          source: string
          status: string
          tenant_id: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string | null
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string
          business_name: string
          business_type: string
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          error_message?: string | null
          external_order_id: string
          id?: string
          notification_errors?: string[] | null
          payment_method?: string | null
          plan_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          source?: string
          status?: string
          tenant_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string
          business_name?: string
          business_type?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          error_message?: string | null
          external_order_id?: string
          id?: string
          notification_errors?: string[] | null
          payment_method?: string | null
          plan_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          source?: string
          status?: string
          tenant_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_sales_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_sales_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_pages: {
        Row: {
          app_secret: string | null
          created_at: string
          id: string
          is_default: boolean
          last_connected_at: string | null
          page_access_token: string
          page_id: string
          page_name: string
          profile_picture_url: string | null
          status: Database["public"]["Enums"]["fb_page_status"]
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
          webhook_verify_token: string
        }
        Insert: {
          app_secret?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          last_connected_at?: string | null
          page_access_token: string
          page_id: string
          page_name: string
          profile_picture_url?: string | null
          status?: Database["public"]["Enums"]["fb_page_status"]
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_verify_token?: string
        }
        Update: {
          app_secret?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          last_connected_at?: string | null
          page_access_token?: string
          page_id?: string
          page_name?: string
          profile_picture_url?: string | null
          status?: Database["public"]["Enums"]["fb_page_status"]
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_contact_labels: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          label_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          label_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fb_contact_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "fb_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_contact_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_contacts: {
        Row: {
          assigned_to: string | null
          created_at: string
          handoff_at: string | null
          handoff_reason: string | null
          id: string
          is_archived: boolean
          is_blocked: boolean
          last_message_at: string | null
          locale: string | null
          name: string | null
          needs_handoff: boolean
          page_id: string
          profile_pic_synced_at: string | null
          profile_pic_url: string | null
          psid: string
          tags: string[] | null
          tenant_id: string
          typing_at: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          handoff_at?: string | null
          handoff_reason?: string | null
          id?: string
          is_archived?: boolean
          is_blocked?: boolean
          last_message_at?: string | null
          locale?: string | null
          name?: string | null
          needs_handoff?: boolean
          page_id: string
          profile_pic_synced_at?: string | null
          profile_pic_url?: string | null
          psid: string
          tags?: string[] | null
          tenant_id: string
          typing_at?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          handoff_at?: string | null
          handoff_reason?: string | null
          id?: string
          is_archived?: boolean
          is_blocked?: boolean
          last_message_at?: string | null
          locale?: string | null
          name?: string | null
          needs_handoff?: boolean
          page_id?: string
          profile_pic_synced_at?: string | null
          profile_pic_url?: string | null
          psid?: string
          tags?: string[] | null
          tenant_id?: string
          typing_at?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fb_contacts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_messages: {
        Row: {
          attachment_id: string | null
          contact_id: string
          content: string | null
          content_type: string
          created_at: string
          delivered_at: string | null
          direction: Database["public"]["Enums"]["fb_message_direction"]
          error_message: string | null
          id: string
          is_from_ai: boolean
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          mid: string | null
          original_media_url: string | null
          page_id: string
          quick_reply_payload: string | null
          read_at: string | null
          reply_to_id: string | null
          retry_count: number
          sent_at: string
          sent_by_user_id: string | null
          status: Database["public"]["Enums"]["fb_message_status"]
          tenant_id: string
          text_preview: string | null
        }
        Insert: {
          attachment_id?: string | null
          contact_id: string
          content?: string | null
          content_type?: string
          created_at?: string
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["fb_message_direction"]
          error_message?: string | null
          id?: string
          is_from_ai?: boolean
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          mid?: string | null
          original_media_url?: string | null
          page_id: string
          quick_reply_payload?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          retry_count?: number
          sent_at?: string
          sent_by_user_id?: string | null
          status?: Database["public"]["Enums"]["fb_message_status"]
          tenant_id: string
          text_preview?: string | null
        }
        Update: {
          attachment_id?: string | null
          contact_id?: string
          content?: string | null
          content_type?: string
          created_at?: string
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["fb_message_direction"]
          error_message?: string | null
          id?: string
          is_from_ai?: boolean
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          mid?: string | null
          original_media_url?: string | null
          page_id?: string
          quick_reply_payload?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          retry_count?: number
          sent_at?: string
          sent_by_user_id?: string | null
          status?: Database["public"]["Enums"]["fb_message_status"]
          tenant_id?: string
          text_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "fb_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_messages_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "fb_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_post_comments: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          commenter_fb_id: string
          commenter_name: string | null
          commenter_picture_url: string | null
          created_at: string | null
          created_time: string | null
          fb_comment_id: string
          fb_contact_id: string | null
          id: string
          is_from_page: boolean | null
          is_hidden: boolean | null
          is_read: boolean | null
          like_count: number | null
          message: string | null
          page_id: string
          parent_comment_id: string | null
          post_id: string
          reply_count: number | null
          sent_by_user_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          commenter_fb_id: string
          commenter_name?: string | null
          commenter_picture_url?: string | null
          created_at?: string | null
          created_time?: string | null
          fb_comment_id: string
          fb_contact_id?: string | null
          id?: string
          is_from_page?: boolean | null
          is_hidden?: boolean | null
          is_read?: boolean | null
          like_count?: number | null
          message?: string | null
          page_id: string
          parent_comment_id?: string | null
          post_id: string
          reply_count?: number | null
          sent_by_user_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          commenter_fb_id?: string
          commenter_name?: string | null
          commenter_picture_url?: string | null
          created_at?: string | null
          created_time?: string | null
          fb_comment_id?: string
          fb_contact_id?: string | null
          id?: string
          is_from_page?: boolean | null
          is_hidden?: boolean | null
          is_read?: boolean | null
          like_count?: number | null
          message?: string | null
          page_id?: string
          parent_comment_id?: string | null
          post_id?: string
          reply_count?: number | null
          sent_by_user_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_post_comments_fb_contact_id_fkey"
            columns: ["fb_contact_id"]
            isOneToOne: false
            referencedRelation: "fb_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_post_comments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "fb_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "fb_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_post_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_posts: {
        Row: {
          comment_count: number | null
          created_at: string | null
          created_time: string | null
          fb_post_id: string
          full_picture: string | null
          id: string
          is_hidden: boolean | null
          last_comment_at: string | null
          message: string | null
          page_id: string
          permalink_url: string | null
          post_type: string | null
          tenant_id: string
          unread_comment_count: number | null
          updated_at: string | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          created_time?: string | null
          fb_post_id: string
          full_picture?: string | null
          id?: string
          is_hidden?: boolean | null
          last_comment_at?: string | null
          message?: string | null
          page_id: string
          permalink_url?: string | null
          post_type?: string | null
          tenant_id: string
          unread_comment_count?: number | null
          updated_at?: string | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          created_time?: string | null
          fb_post_id?: string
          full_picture?: string | null
          id?: string
          is_hidden?: boolean | null
          last_comment_at?: string | null
          message?: string | null
          page_id?: string
          permalink_url?: string | null
          post_type?: string | null
          tenant_id?: string
          unread_comment_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_webhook_events_log: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          page_id: string | null
          payload: Json
          processed: boolean
          sender_psid: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          page_id?: string | null
          payload: Json
          processed?: boolean
          sender_psid?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          page_id?: string | null
          payload?: Json
          processed?: boolean
          sender_psid?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_webhook_events_log_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          name_bn: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          name_bn?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          name_bn?: string | null
        }
        Relationships: []
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          net_income: number | null
          notes: string | null
          period_end: string
          period_start: string
          status: string | null
          total_expenses: number | null
          total_revenue: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_expenses?: number | null
          total_revenue?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_expenses?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      group_add_queue: {
        Row: {
          batch_size: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_log: Json | null
          failed_count: number | null
          group_id: string
          id: string
          interval_minutes: number | null
          phone_numbers: string[]
          processed_count: number | null
          scheduled_for: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          failed_count?: number | null
          group_id: string
          id?: string
          interval_minutes?: number | null
          phone_numbers: string[]
          processed_count?: number | null
          scheduled_for: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          batch_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          failed_count?: number | null
          group_id?: string
          id?: string
          interval_minutes?: number | null
          phone_numbers?: string[]
          processed_count?: number | null
          scheduled_for?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_add_queue_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_add_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_members: {
        Row: {
          id: string
          is_admin: boolean
          joined_at: string
          last_read_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["chat_room_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["chat_room_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["chat_room_type"]
          updated_at?: string
        }
        Relationships: []
      }
      internal_messages: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          media_filename: string | null
          media_url: string | null
          mentions: string[] | null
          reply_to_id: string | null
          room_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          media_filename?: string | null
          media_url?: string | null
          mentions?: string[] | null
          reply_to_id?: string | null
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          media_filename?: string | null
          media_url?: string | null
          mentions?: string[] | null
          reply_to_id?: string | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_items: {
        Row: {
          count_id: string
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          expected_quantity: number
          id: string
          notes: string | null
          product_id: string
          variant_id: string | null
        }
        Insert: {
          count_id: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          expected_quantity: number
          id?: string
          notes?: string | null
          product_id: string
          variant_id?: string | null
        }
        Update: {
          count_id?: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          count_date: string
          count_number: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          count_date: string
          count_number: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          count_date?: string
          count_number?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          footer_text: string | null
          id: string
          invoice_prefix: string | null
          logo_url: string | null
          next_invoice_number: number | null
          payment_terms: string | null
          tax_id: string | null
          tenant_id: string
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_url?: string | null
          next_invoice_number?: number | null
          payment_terms?: string | null
          tax_id?: string | null
          tenant_id: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_url?: string | null
          next_invoice_number?: number | null
          payment_terms?: string | null
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          id: string
          invoice_number: string
          order_id: string | null
          pdf_url: string | null
          sent_at: string | null
          sent_via_whatsapp: boolean | null
          tenant_id: string
          total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_number: string
          order_id?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          sent_via_whatsapp?: boolean | null
          tenant_id: string
          total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_number?: string
          order_id?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          sent_via_whatsapp?: boolean | null
          tenant_id?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_leads: {
        Row: {
          business_name: string
          created_at: string | null
          demo_access_count: number | null
          demo_accessed_at: string | null
          email: string
          full_name: string
          id: string
          notes: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          business_name: string
          created_at?: string | null
          demo_access_count?: number | null
          demo_accessed_at?: string | null
          email: string
          full_name: string
          id?: string
          notes?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_number: string
        }
        Update: {
          business_name?: string
          created_at?: string | null
          demo_access_count?: number | null
          demo_accessed_at?: string | null
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      media_cleanup_logs: {
        Row: {
          duration_ms: number
          errors: Json | null
          fb_messages_cleaned: number
          files_deleted: number
          id: string
          messages_processed: number
          run_at: string
          storage_freed_bytes: number
          wa_messages_cleaned: number
        }
        Insert: {
          duration_ms?: number
          errors?: Json | null
          fb_messages_cleaned?: number
          files_deleted?: number
          id?: string
          messages_processed?: number
          run_at?: string
          storage_freed_bytes?: number
          wa_messages_cleaned?: number
        }
        Update: {
          duration_ms?: number
          errors?: Json | null
          fb_messages_cleaned?: number
          files_deleted?: number
          id?: string
          messages_processed?: number
          run_at?: string
          storage_freed_bytes?: number
          wa_messages_cleaned?: number
        }
        Relationships: []
      }
      message_raw_payloads: {
        Row: {
          created_at: string
          message_id: string
          provider_metadata: Json | null
          raw_payload: Json | null
        }
        Insert: {
          created_at?: string
          message_id: string
          provider_metadata?: Json | null
          raw_payload?: Json | null
        }
        Update: {
          created_at?: string
          message_id?: string
          provider_metadata?: Json | null
          raw_payload?: Json | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string
          channel: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          placeholders: Json | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          channel?: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          placeholders?: Json | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          channel?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          placeholders?: Json | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          contact_id: string | null
          content: string | null
          content_type: string
          created_at: string
          delivered_at: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_message: string | null
          id: string
          instance_id: string | null
          is_from_ai: boolean
          is_synced_from_device: boolean | null
          location_lat: number | null
          location_lng: number | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_phone: string | null
          sent_at: string
          sent_by_user_id: string | null
          status: Database["public"]["Enums"]["message_status"]
          tenant_id: string
          text_preview: string | null
          wa_group_id: string | null
          wa_message_id: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          id?: string
          instance_id?: string | null
          is_from_ai?: boolean
          is_synced_from_device?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_phone?: string | null
          sent_at?: string
          sent_by_user_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id: string
          text_preview?: string | null
          wa_group_id?: string | null
          wa_message_id?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          id?: string
          instance_id?: string | null
          is_from_ai?: boolean
          is_synced_from_device?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_phone?: string | null
          sent_at?: string
          sent_by_user_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id?: string
          text_preview?: string | null
          wa_group_id?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          instance_id: string | null
          metadata: Json | null
          recipient: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string | null
          metadata?: Json | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string | null
          metadata?: Json | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          instance_id: string | null
          metadata: Json | null
          next_retry_at: string | null
          retry_count: number
          status: string
          step: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          retry_count?: number
          status?: string
          step?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          instance_id?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          retry_count?: number
          status?: string
          step?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_jobs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          discount_amount: number | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          total: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          total: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancelled_at: string | null
          contact_id: string | null
          courier: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          discount_amount: number | null
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          payment_status: string
          shipped_at: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          source: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total: number
          tracking_number: string | null
          updated_at: string
          woo_order_id: number | null
        }
        Insert: {
          billing_address?: Json | null
          cancelled_at?: string | null
          contact_id?: string | null
          courier?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number: string
          payment_status?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          source?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id: string
          total?: number
          tracking_number?: string | null
          updated_at?: string
          woo_order_id?: number | null
        }
        Update: {
          billing_address?: Json | null
          cancelled_at?: string | null
          contact_id?: string | null
          courier?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          payment_status?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          source?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total?: number
          tracking_number?: string | null
          updated_at?: string
          woo_order_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway_response: Json | null
          id: string
          notes: string | null
          payment_gateway: string | null
          payment_method: string
          status: string
          subscription_id: string | null
          tenant_id: string
          transaction_id: string | null
          uddoktapay_invoice_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          notes?: string | null
          payment_gateway?: string | null
          payment_method: string
          status?: string
          subscription_id?: string | null
          tenant_id: string
          transaction_id?: string | null
          uddoktapay_invoice_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          notes?: string | null
          payment_gateway?: string | null
          payment_method?: string
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          transaction_id?: string | null
          uddoktapay_invoice_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          permissions: Json
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          permissions?: Json
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          permissions?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ai_enabled: boolean
          business_type_id: string | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_agents: number
          max_instances: number
          max_messages_per_month: number
          name: string
          price_monthly: number
          price_yearly: number | null
          tier: string | null
          tier_order: number | null
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          business_type_id?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_agents?: number
          max_instances?: number
          max_messages_per_month?: number
          name: string
          price_monthly?: number
          price_yearly?: number | null
          tier?: string | null
          tier_order?: number | null
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          business_type_id?: string | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_agents?: number
          max_instances?: number
          max_messages_per_month?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          tier?: string | null
          tier_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          options: Json | null
          position: number | null
          price: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          tenant_id: string
          updated_at: string | null
          woo_variant_id: number | null
        }
        Insert: {
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          options?: Json | null
          position?: number | null
          price?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          tenant_id: string
          updated_at?: string | null
          woo_variant_id?: number | null
        }
        Update: {
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          options?: Json | null
          position?: number | null
          price?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          tenant_id?: string
          updated_at?: string | null
          woo_variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          tags: string[] | null
          tenant_id: string
          track_inventory: boolean | null
          updated_at: string
          variant_options: Json | null
          variants: Json | null
          woo_last_synced_at: string | null
          woo_product_id: number | null
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          tenant_id: string
          track_inventory?: boolean | null
          updated_at?: string
          variant_options?: Json | null
          variants?: Json | null
          woo_last_synced_at?: string | null
          woo_product_id?: number | null
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          tenant_id?: string
          track_inventory?: boolean | null
          updated_at?: string
          variant_options?: Json | null
          variants?: Json | null
          woo_last_synced_at?: string | null
          woo_product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_behavior_checks: {
        Row: {
          cancelled_deliveries: number | null
          checked_at: string | null
          checked_by: string | null
          contact_id: string | null
          courier_stats: Json | null
          created_at: string | null
          customer_rating: number | null
          id: string
          phone_number: string
          raw_response: Json | null
          returned_deliveries: number | null
          risk_level: string | null
          successful_deliveries: number | null
          tenant_id: string
          total_deliveries: number | null
          updated_at: string | null
        }
        Insert: {
          cancelled_deliveries?: number | null
          checked_at?: string | null
          checked_by?: string | null
          contact_id?: string | null
          courier_stats?: Json | null
          created_at?: string | null
          customer_rating?: number | null
          id?: string
          phone_number: string
          raw_response?: Json | null
          returned_deliveries?: number | null
          risk_level?: string | null
          successful_deliveries?: number | null
          tenant_id: string
          total_deliveries?: number | null
          updated_at?: string | null
        }
        Update: {
          cancelled_deliveries?: number | null
          checked_at?: string | null
          checked_by?: string | null
          contact_id?: string | null
          courier_stats?: Json | null
          created_at?: string | null
          customer_rating?: number | null
          id?: string
          phone_number?: string
          raw_response?: Json | null
          returned_deliveries?: number | null
          risk_level?: string | null
          successful_deliveries?: number | null
          tenant_id?: string
          total_deliveries?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_behavior_checks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "purchase_behavior_checks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_behavior_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          content: string
          content_type: string | null
          created_at: string
          id: string
          media_filename: string | null
          media_items: Json | null
          media_url: string | null
          shortcut: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          content_type?: string | null
          created_at?: string
          id?: string
          media_filename?: string | null
          media_items?: Json | null
          media_url?: string | null
          shortcut?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string | null
          created_at?: string
          id?: string
          media_filename?: string | null
          media_items?: Json | null
          media_url?: string | null
          shortcut?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_state: {
        Row: {
          api_key_hash: string
          id: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          api_key_hash: string
          id?: string
          request_count?: number | null
          window_start: string
        }
        Update: {
          api_key_hash?: string
          id?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          currency: string | null
          day_of_month: number | null
          description: string
          frequency: string
          id: string
          is_active: boolean | null
          last_generated_at: string | null
          next_due_date: string
          notes: string | null
          payment_method: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          day_of_month?: number | null
          description: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          next_due_date: string
          notes?: string | null
          payment_method?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          day_of_month?: number | null
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          next_due_date?: string
          notes?: string | null
          payment_method?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          reminder_type: string
          sent_at: string | null
          status: string
          subscription_id: string | null
          tenant_id: string | null
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          reminder_type: string
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          channel: string
          created_at: string | null
          days_offset: number[]
          email_subject: string | null
          id: string
          is_active: boolean | null
          reminder_type: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          days_offset?: number[]
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          reminder_type: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          days_offset?: number[]
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          reminder_type?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          report_data: Json | null
          report_type: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          report_data?: Json | null
          report_type: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          report_data?: Json | null
          report_type?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_settings: {
        Row: {
          created_at: string
          daily_enabled: boolean
          id: string
          monthly_enabled: boolean
          send_time: string
          tenant_id: string
          timezone: string
          updated_at: string
          weekly_enabled: boolean
        }
        Insert: {
          created_at?: string
          daily_enabled?: boolean
          id?: string
          monthly_enabled?: boolean
          send_time?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
          weekly_enabled?: boolean
        }
        Update: {
          created_at?: string
          daily_enabled?: boolean
          id?: string
          monthly_enabled?: boolean
          send_time?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
          weekly_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_attachments: {
        Row: {
          card_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          card_id: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          card_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_board_members: {
        Row: {
          board_id: string
          id: string
          joined_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          board_id: string
          id?: string
          joined_at?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          board_id?: string
          id?: string
          joined_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "service_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_board_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_boards: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_boards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_card_activity: {
        Row: {
          card_id: string
          created_at: string
          event_type: string
          from_value: string | null
          id: string
          metadata_json: Json | null
          tenant_id: string
          to_value: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          event_type: string
          from_value?: string | null
          id?: string
          metadata_json?: Json | null
          tenant_id: string
          to_value?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          event_type?: string
          from_value?: string | null
          id?: string
          metadata_json?: Json | null
          tenant_id?: string
          to_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_card_activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_card_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_card_comments: {
        Row: {
          card_id: string
          content: string
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          content: string
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          content?: string
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_card_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_card_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_card_labels: {
        Row: {
          card_id: string
          created_at: string
          id: string
          label_id: string
          tenant_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          label_id: string
          tenant_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          label_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_card_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "service_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_card_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_card_members: {
        Row: {
          card_id: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_card_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_card_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_cards: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          board_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          list_id: string
          position_numeric: number
          priority: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          board_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          list_id: string
          position_numeric?: number
          priority?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          board_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string
          position_numeric?: number
          priority?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "service_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_cards_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "service_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_chat_message_links: {
        Row: {
          card_id: string
          chat_message_id: string
          created_at: string
          created_by: string
          id: string
          room_id: string
          tenant_id: string
        }
        Insert: {
          card_id: string
          chat_message_id: string
          created_at?: string
          created_by: string
          id?: string
          room_id: string
          tenant_id: string
        }
        Update: {
          card_id?: string
          chat_message_id?: string
          created_at?: string
          created_by?: string
          id?: string
          room_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_chat_message_links_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_chat_message_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_checklist_items: {
        Row: {
          checklist_id: string
          content: string
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          position_numeric: number
          tenant_id: string
        }
        Insert: {
          checklist_id: string
          content: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          position_numeric?: number
          tenant_id: string
        }
        Update: {
          checklist_id?: string
          content?: string
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          position_numeric?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "service_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_checklists: {
        Row: {
          card_id: string
          created_at: string
          id: string
          position_numeric: number
          tenant_id: string
          title: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          position_numeric?: number
          tenant_id: string
          title: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          position_numeric?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_checklists_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "service_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_labels: {
        Row: {
          board_id: string
          color: string
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          board_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          board_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "service_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_lists: {
        Row: {
          board_id: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
          position_numeric: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          position_numeric?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          position_numeric?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_lists_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "service_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          booked_at: string | null
          cod_amount: number | null
          consignment_id: string | null
          courier: string
          courier_response: Json | null
          created_at: string | null
          delivered_at: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          id: string
          item_description: string | null
          order_id: string
          pickup_address: Json | null
          special_instructions: string | null
          status: string | null
          tenant_id: string
          tracking_code: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          booked_at?: string | null
          cod_amount?: number | null
          consignment_id?: string | null
          courier: string
          courier_response?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          id?: string
          item_description?: string | null
          order_id: string
          pickup_address?: Json | null
          special_instructions?: string | null
          status?: string | null
          tenant_id: string
          tracking_code?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          booked_at?: string | null
          cod_amount?: number | null
          consignment_id?: string | null
          courier?: string
          courier_response?: Json | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          id?: string
          item_description?: string | null
          order_id?: string
          pickup_address?: Json | null
          special_instructions?: string | null
          status?: string | null
          tenant_id?: string
          tracking_code?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          product_id: string
          tenant_id: string
          threshold: number
          variant_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          product_id: string
          tenant_id: string
          threshold: number
          variant_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          product_id?: string
          tenant_id?: string
          threshold?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reason: string | null
          recorded_by: string | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reason?: string | null
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_orders: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          plan_id: string
          status: string | null
          tenant_id: string
          transaction_id: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          plan_id: string
          status?: string | null
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          plan_id?: string
          status?: string | null
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          feature_overrides: Json | null
          grace_period_ends_at: string | null
          id: string
          plan_id: string
          resource_overrides: Json | null
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          feature_overrides?: Json | null
          grace_period_ends_at?: string | null
          id?: string
          plan_id: string
          resource_overrides?: Json | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          feature_overrides?: Json | null
          grace_period_ends_at?: string | null
          id?: string
          plan_id?: string
          resource_overrides?: Json | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal_note: boolean | null
          message: string
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message: string
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message?: string
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          subject: string
          tenant_id: string | null
          ticket_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          subject: string
          tenant_id?: string | null
          ticket_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string | null
          ticket_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_roles: {
        Row: {
          created_at: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_super_admin: boolean | null
          permissions: Json | null
          role: Database["public"]["Enums"]["system_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_super_admin?: boolean | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["system_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_super_admin?: boolean | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["system_role"]
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      team_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_kpi_targets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metric: string
          period: string
          target_value: number
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metric: string
          period?: string
          target_value: number
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metric?: string
          period?: string
          target_value?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_kpi_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_access: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string
          resource_type: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          resource_id: string
          resource_type: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string
          resource_type?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_permissions: {
        Row: {
          can_access_accounts: boolean | null
          can_access_ai_agent: boolean | null
          can_access_analytics: boolean | null
          can_access_automation: boolean | null
          can_access_complaints: boolean | null
          can_access_contacts: boolean | null
          can_access_fb_inbox: boolean | null
          can_access_groups: boolean | null
          can_access_inbox: boolean | null
          can_access_internal_chat: boolean | null
          can_access_orders: boolean | null
          can_access_products: boolean | null
          can_access_reports: boolean | null
          can_access_service_boards: boolean | null
          can_access_settings: boolean | null
          can_access_team: boolean | null
          can_access_workflows: boolean | null
          can_assign_contacts: boolean | null
          can_create_contacts: boolean | null
          can_create_orders: boolean | null
          can_create_products: boolean | null
          can_delete_contacts: boolean | null
          can_delete_messages: boolean | null
          can_delete_orders: boolean | null
          can_delete_products: boolean | null
          can_edit_contacts: boolean | null
          can_edit_orders: boolean | null
          can_edit_products: boolean | null
          can_export_data: boolean | null
          can_send_bulk_messages: boolean | null
          can_send_messages: boolean | null
          can_update_order_status: boolean | null
          can_update_payment_status: boolean | null
          can_view_revenue: boolean | null
          created_at: string | null
          id: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_access_accounts?: boolean | null
          can_access_ai_agent?: boolean | null
          can_access_analytics?: boolean | null
          can_access_automation?: boolean | null
          can_access_complaints?: boolean | null
          can_access_contacts?: boolean | null
          can_access_fb_inbox?: boolean | null
          can_access_groups?: boolean | null
          can_access_inbox?: boolean | null
          can_access_internal_chat?: boolean | null
          can_access_orders?: boolean | null
          can_access_products?: boolean | null
          can_access_reports?: boolean | null
          can_access_service_boards?: boolean | null
          can_access_settings?: boolean | null
          can_access_team?: boolean | null
          can_access_workflows?: boolean | null
          can_assign_contacts?: boolean | null
          can_create_contacts?: boolean | null
          can_create_orders?: boolean | null
          can_create_products?: boolean | null
          can_delete_contacts?: boolean | null
          can_delete_messages?: boolean | null
          can_delete_orders?: boolean | null
          can_delete_products?: boolean | null
          can_edit_contacts?: boolean | null
          can_edit_orders?: boolean | null
          can_edit_products?: boolean | null
          can_export_data?: boolean | null
          can_send_bulk_messages?: boolean | null
          can_send_messages?: boolean | null
          can_update_order_status?: boolean | null
          can_update_payment_status?: boolean | null
          can_view_revenue?: boolean | null
          created_at?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_access_accounts?: boolean | null
          can_access_ai_agent?: boolean | null
          can_access_analytics?: boolean | null
          can_access_automation?: boolean | null
          can_access_complaints?: boolean | null
          can_access_contacts?: boolean | null
          can_access_fb_inbox?: boolean | null
          can_access_groups?: boolean | null
          can_access_inbox?: boolean | null
          can_access_internal_chat?: boolean | null
          can_access_orders?: boolean | null
          can_access_products?: boolean | null
          can_access_reports?: boolean | null
          can_access_service_boards?: boolean | null
          can_access_settings?: boolean | null
          can_access_team?: boolean | null
          can_access_workflows?: boolean | null
          can_assign_contacts?: boolean | null
          can_create_contacts?: boolean | null
          can_create_orders?: boolean | null
          can_create_products?: boolean | null
          can_delete_contacts?: boolean | null
          can_delete_messages?: boolean | null
          can_delete_orders?: boolean | null
          can_delete_products?: boolean | null
          can_edit_contacts?: boolean | null
          can_edit_orders?: boolean | null
          can_edit_products?: boolean | null
          can_export_data?: boolean | null
          can_send_bulk_messages?: boolean | null
          can_send_messages?: boolean | null
          can_update_order_status?: boolean | null
          can_update_payment_status?: boolean | null
          can_view_revenue?: boolean | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_presence_logs: {
        Row: {
          current_page: string | null
          date: string
          day_of_week: number
          hour_of_day: number
          id: string
          recorded_at: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          current_page?: string | null
          date: string
          day_of_week: number
          hour_of_day: number
          id?: string
          recorded_at?: string
          status: string
          tenant_id: string
          user_id: string
        }
        Update: {
          current_page?: string | null
          date?: string
          day_of_week?: number
          hour_of_day?: number
          id?: string
          recorded_at?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_presence_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_work_sessions: {
        Row: {
          break_count: number | null
          conversations_handled: number | null
          created_at: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          longest_session_minutes: number | null
          messages_received: number | null
          messages_sent: number | null
          page_activity: Json | null
          session_date: string
          tenant_id: string
          total_active_minutes: number | null
          total_away_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          break_count?: number | null
          conversations_handled?: number | null
          created_at?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          longest_session_minutes?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          page_activity?: Json | null
          session_date: string
          tenant_id: string
          total_active_minutes?: number | null
          total_away_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          break_count?: number | null
          conversations_handled?: number | null
          created_at?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          longest_session_minutes?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          page_activity?: Json | null
          session_date?: string
          tenant_id?: string
          total_active_minutes?: number | null
          total_away_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_work_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_api_keys: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_minute: number | null
          revoked_at: string | null
          scopes: Json | null
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          scopes?: Json | null
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          scopes?: Json | null
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_daily_group_limits: {
        Row: {
          date: string
          id: string
          max_daily_limit: number | null
          members_added: number | null
          tenant_id: string
        }
        Insert: {
          date?: string
          id?: string
          max_daily_limit?: number | null
          members_added?: number | null
          tenant_id: string
        }
        Update: {
          date?: string
          id?: string
          max_daily_limit?: number | null
          members_added?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_daily_group_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_daily_stats: {
        Row: {
          active_conversations: number
          fb_inbound: number
          fb_outbound: number
          inbound_count: number
          new_conversations: number
          outbound_count: number
          stat_date: string
          tenant_id: string
          updated_at: string
          wa_inbound: number
          wa_outbound: number
        }
        Insert: {
          active_conversations?: number
          fb_inbound?: number
          fb_outbound?: number
          inbound_count?: number
          new_conversations?: number
          outbound_count?: number
          stat_date: string
          tenant_id: string
          updated_at?: string
          wa_inbound?: number
          wa_outbound?: number
        }
        Update: {
          active_conversations?: number
          fb_inbound?: number
          fb_outbound?: number
          inbound_count?: number
          new_conversations?: number
          outbound_count?: number
          stat_date?: string
          tenant_id?: string
          updated_at?: string
          wa_inbound?: number
          wa_outbound?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_daily_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string | null
          reference_number: string | null
          tenant_id: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          tenant_id: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          tenant_id?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tenant_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_recurring_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          currency: string | null
          day_of_month: number | null
          description: string
          frequency: string
          id: string
          is_active: boolean | null
          last_generated_at: string | null
          next_due_date: string | null
          notes: string | null
          payment_method: string | null
          tenant_id: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          day_of_month?: number | null
          description: string
          frequency: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          payment_method?: string | null
          tenant_id: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          day_of_month?: number | null
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          next_due_date?: string | null
          notes?: string | null
          payment_method?: string | null
          tenant_id?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tenant_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_recurring_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_webhooks: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          secret: string
          subscribed_events: Json | null
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret?: string
          subscribed_events?: Json | null
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret?: string
          subscribed_events?: Json | null
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          business_type_id: string | null
          created_at: string
          id: string
          is_activated: boolean | null
          logo_url: string | null
          name: string
          onboarding_status: Json | null
          owner_id: string
          pending_plan_id: string | null
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          business_type_id?: string | null
          created_at?: string
          id?: string
          is_activated?: boolean | null
          logo_url?: string | null
          name: string
          onboarding_status?: Json | null
          owner_id: string
          pending_plan_id?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          business_type_id?: string | null
          created_at?: string
          id?: string
          is_activated?: boolean | null
          logo_url?: string | null
          name?: string
          onboarding_status?: Json | null
          owner_id?: string
          pending_plan_id?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          ai_messages: number
          created_at: string
          id: string
          messages_received: number
          messages_sent: number
          period_end: string
          period_start: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_messages?: number
          created_at?: string
          id?: string
          messages_received?: number
          messages_sent?: number
          period_end: string
          period_start: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_messages?: number
          created_at?: string
          id?: string
          messages_received?: number
          messages_sent?: number
          period_end?: string
          period_start?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          current_page: string | null
          is_typing_in: string | null
          last_seen_at: string
          status: Database["public"]["Enums"]["presence_status"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          current_page?: string | null
          is_typing_in?: string | null
          last_seen_at?: string
          status?: Database["public"]["Enums"]["presence_status"]
          tenant_id: string
          user_id: string
        }
        Update: {
          current_page?: string | null
          is_typing_in?: string | null
          last_seen_at?: string
          status?: Database["public"]["Enums"]["presence_status"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_is_typing_in_fkey"
            columns: ["is_typing_in"]
            isOneToOne: false
            referencedRelation: "internal_chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          last_status_code: number | null
          max_attempts: number | null
          next_retry_at: string | null
          payload: Json
          tenant_id: string
          webhook_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          last_status_code?: number | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload: Json
          tenant_id: string
          webhook_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          last_status_code?: number | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json
          tenant_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "tenant_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events_log: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          instance_id: string | null
          payload: Json
          processed: boolean
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          instance_id?: string | null
          payload?: Json
          processed?: boolean
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          instance_id?: string | null
          payload?: Json
          processed?: boolean
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_auto_message_log: {
        Row: {
          contact_id: string
          id: string
          message_type: string
          sent_at: string | null
          tenant_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          message_type: string
          sent_at?: string | null
          tenant_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          message_type?: string
          sent_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_auto_message_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "whatsapp_auto_message_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_auto_message_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_auto_messages: {
        Row: {
          away_cooldown_hours: number | null
          away_enabled: boolean | null
          away_media_items: Json | null
          away_message: string | null
          created_at: string | null
          followup_delay_hours: number | null
          followup_enabled: boolean | null
          followup_media_items: Json | null
          followup_message: string | null
          id: string
          tenant_id: string
          updated_at: string | null
          welcome_enabled: boolean | null
          welcome_media_items: Json | null
          welcome_message: string | null
        }
        Insert: {
          away_cooldown_hours?: number | null
          away_enabled?: boolean | null
          away_media_items?: Json | null
          away_message?: string | null
          created_at?: string | null
          followup_delay_hours?: number | null
          followup_enabled?: boolean | null
          followup_media_items?: Json | null
          followup_message?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          welcome_enabled?: boolean | null
          welcome_media_items?: Json | null
          welcome_message?: string | null
        }
        Update: {
          away_cooldown_hours?: number | null
          away_enabled?: boolean | null
          away_media_items?: Json | null
          away_message?: string | null
          created_at?: string | null
          followup_delay_hours?: number | null
          followup_enabled?: boolean | null
          followup_media_items?: Json | null
          followup_message?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          welcome_enabled?: boolean | null
          welcome_media_items?: Json | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_auto_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_followup_queue: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          instance_id: string
          scheduled_for: string
          skip_reason: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          instance_id: string
          scheduled_for: string
          skip_reason?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          instance_id?: string
          scheduled_for?: string
          skip_reason?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_followup_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "whatsapp_followup_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_followup_queue_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_followup_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_participants: {
        Row: {
          added_at: string | null
          added_by: string | null
          contact_id: string | null
          group_id: string
          id: string
          is_admin: boolean | null
          phone_number: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          contact_id?: string | null
          group_id: string
          id?: string
          is_admin?: boolean | null
          phone_number: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          contact_id?: string | null
          group_id?: string
          id?: string
          is_admin?: boolean | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "whatsapp_group_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          instance_id: string | null
          invite_link: string | null
          is_admin: boolean | null
          is_created_by_tenant: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          name: string
          participant_count: number | null
          synced_at: string | null
          tenant_id: string
          unread_count: number | null
          updated_at: string | null
          wa_group_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          instance_id?: string | null
          invite_link?: string | null
          is_admin?: boolean | null
          is_created_by_tenant?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name: string
          participant_count?: number | null
          synced_at?: string | null
          tenant_id: string
          unread_count?: number | null
          updated_at?: string | null
          wa_group_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          instance_id?: string | null
          invite_link?: string | null
          is_admin?: boolean | null
          is_created_by_tenant?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string
          participant_count?: number | null
          synced_at?: string | null
          tenant_id?: string
          unread_count?: number | null
          updated_at?: string | null
          wa_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key_encrypted: string | null
          connection_error: string | null
          created_at: string
          deleted_at: string | null
          device_info: Json | null
          id: string
          is_default: boolean
          is_deleted: boolean | null
          last_connected_at: string | null
          last_qr_sent_at: string | null
          last_status_at: string | null
          name: string
          phone_number: string | null
          qr_code: string | null
          qr_expires_at: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["instance_status"]
          tenant_id: string
          updated_at: string
          wasender_session_id: string | null
          webhook_secret: string
        }
        Insert: {
          api_key_encrypted?: string | null
          connection_error?: string | null
          created_at?: string
          deleted_at?: string | null
          device_info?: Json | null
          id?: string
          is_default?: boolean
          is_deleted?: boolean | null
          last_connected_at?: string | null
          last_qr_sent_at?: string | null
          last_status_at?: string | null
          name: string
          phone_number?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["instance_status"]
          tenant_id: string
          updated_at?: string
          wasender_session_id?: string | null
          webhook_secret?: string
        }
        Update: {
          api_key_encrypted?: string | null
          connection_error?: string | null
          created_at?: string
          deleted_at?: string | null
          device_info?: Json | null
          id?: string
          is_default?: boolean
          is_deleted?: boolean | null
          last_connected_at?: string | null
          last_qr_sent_at?: string | null
          last_status_at?: string | null
          name?: string
          phone_number?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["instance_status"]
          tenant_id?: string
          updated_at?: string
          wasender_session_id?: string | null
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_integrations: {
        Row: {
          auto_sync_enabled: boolean | null
          consumer_key_encrypted: string
          consumer_secret_encrypted: string
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          next_scheduled_sync: string | null
          settings: Json | null
          store_url: string
          sync_error: string | null
          sync_interval_hours: number | null
          sync_orders_enabled: boolean | null
          sync_status: string | null
          tenant_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          consumer_key_encrypted: string
          consumer_secret_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          next_scheduled_sync?: string | null
          settings?: Json | null
          store_url: string
          sync_error?: string | null
          sync_interval_hours?: number | null
          sync_orders_enabled?: boolean | null
          sync_status?: string | null
          tenant_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          consumer_key_encrypted?: string
          consumer_secret_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          next_scheduled_sync?: string | null
          settings?: Json | null
          store_url?: string
          sync_error?: string | null
          sync_interval_hours?: number | null
          sync_orders_enabled?: boolean | null
          sync_status?: string | null
          tenant_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_sync_logs: {
        Row: {
          categories_synced: number | null
          completed_at: string | null
          errors: Json | null
          id: string
          integration_id: string
          products_synced: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          categories_synced?: number | null
          completed_at?: string | null
          errors?: Json | null
          id?: string
          integration_id: string
          products_synced?: number | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          categories_synced?: number | null
          completed_at?: string | null
          errors?: Json | null
          id?: string
          integration_id?: string
          products_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "woocommerce_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          error_message: string | null
          execution_data: Json | null
          id: string
          started_at: string | null
          status: string | null
          tenant_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          tenant_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_customer_status"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "workflow_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          created_at: string | null
          id: string
          node_config: Json | null
          node_subtype: string | null
          node_type: string
          position_x: number | null
          position_y: number | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          node_config?: Json | null
          node_subtype?: string | null
          node_type: string
          position_x?: number | null
          position_y?: number | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          node_config?: Json | null
          node_subtype?: string | null
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contact_customer_status: {
        Row: {
          business_type: string | null
          business_type_id: string | null
          contact_id: string | null
          days_since_last_order: number | null
          last_order_date: string | null
          phone_number: string | null
          score_tier: string | null
          tenant_id: string | null
          total_orders: number | null
          total_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_product_stock: {
        Args: {
          p_adjustment_type: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reason: string
          p_tenant_id: string
          p_user_id?: string
        }
        Returns: number
      }
      admin_purge_contacts_batch: {
        Args: { _batch_size?: number; _tenant_id: string }
        Returns: number
      }
      admin_purge_fb_webhook_events_log_batch: {
        Args: { _batch_size?: number; _tenant_id: string }
        Returns: number
      }
      admin_purge_messages_batch: {
        Args: { _batch_size?: number; _tenant_id: string }
        Returns: number
      }
      admin_purge_orders_batch: {
        Args: { _batch_size?: number; _tenant_id: string }
        Returns: number
      }
      admin_purge_webhook_events_log_batch: {
        Args: { _batch_size?: number; _tenant_id: string }
        Returns: number
      }
      aggregate_daily_work_session: {
        Args: { p_date: string; p_tenant_id: string; p_user_id: string }
        Returns: undefined
      }
      backfill_contact_thread_state: {
        Args: never
        Returns: {
          fb_contacts_processed: number
          wa_contacts_processed: number
        }[]
      }
      cleanup_old_webhook_logs: {
        Args: { p_batch_size?: number; p_webhook_retention_days?: number }
        Returns: Json
      }
      deduct_product_stock: {
        Args: {
          p_order_id: string
          p_product_id: string
          p_quantity: number
          p_tenant_id: string
          p_user_id?: string
        }
        Returns: undefined
      }
      generate_inventory_count_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_order_number: { Args: { p_tenant_id: string }; Returns: string }
      get_admin_permissions: { Args: never; Returns: Json }
      get_fb_thread_messages: {
        Args: {
          p_contact_id: string
          p_cursor_id?: string
          p_cursor_timestamp?: string
          p_direction?: string
          p_limit?: number
        }
        Returns: {
          content: string
          content_type: string
          delivered_at: string
          direction: string
          error_message: string
          id: string
          is_from_ai: boolean
          media_filename: string
          media_mime_type: string
          media_url: string
          mid: string
          read_at: string
          reply_to_id: string
          sent_at: string
          sent_by_user_id: string
          status: string
          text_preview: string
        }[]
      }
      get_inbox_contacts: {
        Args: {
          p_assigned_to?: string
          p_contact_type?: string
          p_cursor_id?: string
          p_cursor_timestamp?: string
          p_is_archived?: boolean
          p_limit?: number
          p_tenant_id: string
          p_unread_only?: boolean
        }
        Returns: {
          assigned_to: string
          contact_avatar_url: string
          contact_id: string
          contact_name: string
          contact_phone: string
          contact_type: string
          created_at: string
          handoff_reason: string
          instance_id: string
          is_archived: boolean
          is_blocked: boolean
          label_ids: string[]
          last_message_at: string
          last_message_direction: string
          last_message_preview: string
          last_message_type: string
          needs_handoff: boolean
          total_messages: number
          unread_count: number
        }[]
      }
      get_last_messages_for_contacts: {
        Args: { p_contact_ids: string[] }
        Returns: {
          contact_id: string
          content: string
          content_type: string
          direction: string
        }[]
      }
      get_service_board_role: {
        Args: { p_board_id: string; p_user_id: string }
        Returns: string
      }
      get_sidebar_unread_counts: {
        Args: { p_tenant_id: string }
        Returns: {
          fb_unread: number
          total_unread: number
          wa_unread: number
        }[]
      }
      get_thread_messages: {
        Args: {
          p_contact_id: string
          p_cursor_id?: string
          p_cursor_timestamp?: string
          p_direction?: string
          p_limit?: number
        }
        Returns: {
          content: string
          content_type: string
          delivered_at: string
          direction: string
          error_message: string
          id: string
          is_from_ai: boolean
          location_lat: number
          location_lng: number
          media_filename: string
          media_mime_type: string
          media_url: string
          read_at: string
          reply_to_id: string
          sent_at: string
          sent_by_user_id: string
          status: string
          text_preview: string
          wa_message_id: string
        }[]
      }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      increment_daily_stats: {
        Args: {
          p_channel?: string
          p_direction: string
          p_is_new_conversation?: boolean
          p_tenant_id: string
        }
        Returns: undefined
      }
      increment_usage_counter: {
        Args: { p_amount?: number; p_field: string; p_tenant_id: string }
        Returns: undefined
      }
      is_room_admin: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      is_room_creator: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      is_room_member: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      is_service_board_member: {
        Args: { p_board_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_system_admin: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_owner: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_owner_or_manager: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      mark_thread_as_read: {
        Args: { p_contact_id: string }
        Returns: undefined
      }
      restore_stock_for_order: {
        Args: {
          p_order_id: string
          p_reason?: string
          p_tenant_id: string
          p_user_id?: string
        }
        Returns: undefined
      }
      update_thread_state_on_message: {
        Args: {
          p_contact_id: string
          p_last_message_at: string
          p_last_message_direction: string
          p_last_message_preview: string
          p_last_message_type?: string
          p_unread_delta?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      chat_room_type: "direct" | "group"
      complaint_category: "product_issue" | "delivery" | "refund" | "other"
      complaint_priority: "low" | "medium" | "high" | "critical"
      complaint_status: "open" | "in_progress" | "resolved" | "closed"
      fb_message_direction: "inbound" | "outbound"
      fb_message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      fb_page_status: "active" | "disconnected" | "token_expired"
      instance_status: "active" | "disconnected" | "banned"
      message_direction: "inbound" | "outbound"
      message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      presence_status: "online" | "away" | "offline"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "suspended"
        | "cancelled"
        | "expired"
      system_role: "admin" | "user"
      tenant_role: "owner" | "manager" | "agent"
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
    Enums: {
      chat_room_type: ["direct", "group"],
      complaint_category: ["product_issue", "delivery", "refund", "other"],
      complaint_priority: ["low", "medium", "high", "critical"],
      complaint_status: ["open", "in_progress", "resolved", "closed"],
      fb_message_direction: ["inbound", "outbound"],
      fb_message_status: ["pending", "sent", "delivered", "read", "failed"],
      fb_page_status: ["active", "disconnected", "token_expired"],
      instance_status: ["active", "disconnected", "banned"],
      message_direction: ["inbound", "outbound"],
      message_status: ["pending", "sent", "delivered", "read", "failed"],
      presence_status: ["online", "away", "offline"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "suspended",
        "cancelled",
        "expired",
      ],
      system_role: ["admin", "user"],
      tenant_role: ["owner", "manager", "agent"],
    },
  },
} as const
