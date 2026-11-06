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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          work_id: string | null
          work_task_id: string | null
        }
        Insert: {
          all_day?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          work_id?: string | null
          work_task_id?: string | null
        }
        Update: {
          all_day?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          work_id?: string | null
          work_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_work_task_id_work_id_fkey"
            columns: ["company_id", "work_task_id", "work_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["company_id", "id", "work_id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          client_type: string
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          legal_name: string | null
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          client_type?: string
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          client_type?: string
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          default_vat: number
          email: string | null
          id: string
          invoice_prefix: string
          legal_name: string | null
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_vat?: number
          email?: string | null
          id?: string
          invoice_prefix?: string
          legal_name?: string | null
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          default_vat?: number
          email?: string | null
          id?: string
          invoice_prefix?: string
          legal_name?: string | null
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_assignments: {
        Row: {
          company_id: string
          created_at: string
          event_id: string
          updated_at: string
          worker_id: string
          worker_notes: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id: string
          updated_at?: string
          worker_id: string
          worker_notes?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string
          updated_at?: string
          worker_id?: string
          worker_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_company_id_event_id_fkey"
            columns: ["company_id", "event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "event_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignments_company_id_worker_id_fkey"
            columns: ["company_id", "worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_path: string | null
          supplier: string | null
          updated_at: string
          vat_amount: number | null
          work_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          company_id: string
          created_at?: string
          created_by?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_path?: string | null
          supplier?: string | null
          updated_at?: string
          vat_amount?: number | null
          work_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_path?: string | null
          supplier?: string | null
          updated_at?: string
          vat_amount?: number | null
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          min_stock: number
          name: string
          unit: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          min_stock?: number
          name: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          min_stock?: number
          name?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          method: string
          notes: string | null
          payment_date: string
          quote_id: string | null
          reference: string | null
          updated_at: string
          work_id: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          quote_id?: string | null
          reference?: string | null
          updated_at?: string
          work_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          quote_id?: string | null
          reference?: string | null
          updated_at?: string
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_client_id_fkey"
            columns: ["company_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_quote_id_fkey"
            columns: ["company_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payments_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          can_register_expenses: boolean
          can_register_materials: boolean
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          can_register_expenses?: boolean
          can_register_materials?: boolean
          company_id: string
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          can_register_expenses?: boolean
          can_register_materials?: boolean
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          position: number
          quantity: number
          quote_id: string
          unit: string
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          position?: number
          quantity?: number
          quote_id: string
          unit?: string
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          quantity?: number
          quote_id?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_company_id_quote_id_fkey"
            columns: ["company_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string
          status: string
          title: string
          updated_at: string
          valid_until: string | null
          vat_rate: number
          work_id: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          status?: string
          title: string
          updated_at?: string
          valid_until?: string | null
          vat_rate?: number
          work_id?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          status?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
          vat_rate?: number
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_client_id_fkey"
            columns: ["company_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          material_id: string
          movement_date: string
          notes: string | null
          quantity: number
          work_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          material_id: string
          movement_date?: string
          notes?: string | null
          quantity: number
          work_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          material_id?: string
          movement_date?: string
          notes?: string | null
          quantity?: number
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_material_id_fkey"
            columns: ["company_id", "material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          company_id: string
          created_at: string
          task_id: string
          updated_at: string
          worker_id: string
          worker_notes: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          task_id: string
          updated_at?: string
          worker_id: string
          worker_notes?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          task_id?: string
          updated_at?: string
          worker_id?: string
          worker_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_company_id_task_id_fkey"
            columns: ["company_id", "task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "task_assignments_company_id_worker_id_fkey"
            columns: ["company_id", "worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      work_assignments: {
        Row: {
          company_id: string
          created_at: string
          updated_at: string
          work_id: string
          worker_id: string
          worker_notes: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          updated_at?: string
          work_id: string
          worker_id: string
          worker_notes?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          updated_at?: string
          work_id?: string
          worker_id?: string
          worker_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_assignments_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "work_assignments_company_id_worker_id_fkey"
            columns: ["company_id", "worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      work_tasks: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          planned_end_at: string | null
          planned_start_at: string | null
          priority: number
          status: string
          title: string
          updated_at: string
          work_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          planned_end_at?: string | null
          planned_start_at?: string | null
          priority?: number
          status?: string
          title: string
          updated_at?: string
          work_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          planned_end_at?: string | null
          planned_start_at?: string | null
          priority?: number
          status?: string
          title?: string
          updated_at?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_company_id_work_id_fkey"
            columns: ["company_id", "work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      works: {
        Row: {
          address: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          planned_end_date: string | null
          planned_start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_company_id_client_id_fkey"
            columns: ["company_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      company_exists: { Args: never; Returns: boolean }
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_owner: { Args: { _company_id: string }; Returns: boolean }
      material_stock: {
        Args: { _company: string }
        Returns: {
          material_id: string
          stock: number
        }[]
      }
      phase2_active_member: { Args: { _company: string }; Returns: boolean }
      phase2_event_assigned: {
        Args: { _company: string; _id: string }
        Returns: boolean
      }
      phase2_owner: { Args: { _company: string }; Returns: boolean }
      phase2_task_assigned: {
        Args: { _company: string; _id: string }
        Returns: boolean
      }
      phase2_work_visible: {
        Args: { _company: string; _id: string }
        Returns: boolean
      }
      phase3_can_register_expenses: {
        Args: { _company: string }
        Returns: boolean
      }
      phase3_can_register_materials: {
        Args: { _company: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "worker"
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
    Enums: {
      app_role: ["owner", "worker"],
    },
  },
} as const
