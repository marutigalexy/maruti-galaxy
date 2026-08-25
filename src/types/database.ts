export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      parties: {
        Row: {
          id: string;
          company_name: string;
          contact_person_name: string | null;
          mobile_number: string;
          price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_person_name?: string | null;
          mobile_number: string;
          price: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          contact_person_name?: string | null;
          mobile_number?: string;
          price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          name: string;
          mobile_number: string;
          commission: number;
          employee_type: Database["public"]["Enums"]["employee_type"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          mobile_number: string;
          commission: number;
          employee_type?: Database["public"]["Enums"]["employee_type"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          mobile_number?: string;
          commission?: number;
          employee_type?: Database["public"]["Enums"]["employee_type"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_works: {
        Row: {
          id: string;
          lot_number: string;
          party_id: string;
          job_type: Database["public"]["Enums"]["job_type"];
          than: number;
          price: number;
          kapan_number: string;
          weight: number;
          billing_amount: number | null;
          status: Database["public"]["Enums"]["job_status"];
          stages: string[];
          current_stage: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lot_number: string;
          party_id: string;
          job_type?: Database["public"]["Enums"]["job_type"];
          than: number;
          price: number;
          kapan_number: string;
          weight: number;
          billing_amount?: number | null;
          status?: Database["public"]["Enums"]["job_status"];
          stages?: string[];
          current_stage?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lot_number?: string;
          party_id?: string;
          job_type?: Database["public"]["Enums"]["job_type"];
          than?: number;
          price?: number;
          kapan_number?: string;
          weight?: number;
          billing_amount?: number | null;
          status?: Database["public"]["Enums"]["job_status"];
          stages?: string[];
          current_stage?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_works_party_id_fkey";
            columns: ["party_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_jobs: {
        Row: {
          id: string;
          invoice_id: string;
          job_work_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          job_work_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          job_work_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_jobs_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_jobs_job_work_id_fkey";
            columns: ["job_work_id"];
            isOneToOne: false;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
        ];
      };
      sub_jobs: {
        Row: {
          id: string;
          job_id: string;
          sequence_no: number;
          than: number;
          weight: number;
          status: Database["public"]["Enums"]["job_status"];
          stage: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          sequence_no: number;
          than: number;
          weight: number;
          status?: Database["public"]["Enums"]["job_status"];
          stage?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          sequence_no?: number;
          than?: number;
          weight?: number;
          status?: Database["public"]["Enums"]["job_status"];
          stage?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_jobs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
        ];
      };
      sub_job_employee_work: {
        Row: {
          id: string;
          sub_job_id: string;
          employee_id: string;
          done_than: number;
          commission: number;
          earning: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sub_job_id: string;
          employee_id: string;
          done_than: number;
          commission: number;
          earning: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sub_job_id?: string;
          employee_id?: string;
          done_than?: number;
          commission?: number;
          earning?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_job_employee_work_sub_job_id_fkey";
            columns: ["sub_job_id"];
            isOneToOne: false;
            referencedRelation: "sub_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sub_job_employee_work_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          job_work_id: string;
          invoice_date: string;
          due_date: string | null;
          amount: number;
          status: Database["public"]["Enums"]["invoice_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          job_work_id: string;
          invoice_date: string;
          due_date?: string | null;
          amount: number;
          status?: Database["public"]["Enums"]["invoice_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          job_work_id?: string;
          invoice_date?: string;
          due_date?: string | null;
          amount?: number;
          status?: Database["public"]["Enums"]["invoice_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_job_work_id_fkey";
            columns: ["job_work_id"];
            isOneToOne: true;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          opening_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          opening_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          opening_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["entry_type"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: Database["public"]["Enums"]["entry_type"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["entry_type"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          party_id: string | null;
          employee_id: string | null;
          account_id: string;
          category_id: string;
          entry_type: Database["public"]["Enums"]["entry_type"];
          entry_date: string;
          amount: number;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_id?: string | null;
          employee_id?: string | null;
          account_id: string;
          category_id: string;
          entry_type: Database["public"]["Enums"]["entry_type"];
          entry_date: string;
          amount: number;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          party_id?: string | null;
          employee_id?: string | null;
          account_id?: string;
          category_id?: string;
          entry_type?: Database["public"]["Enums"]["entry_type"];
          entry_date?: string;
          amount?: number;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entries_party_id_fkey";
            columns: ["party_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      entry_invoice_allocations: {
        Row: {
          id: string;
          entry_id: string;
          invoice_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          invoice_id: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string;
          invoice_id?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entry_invoice_allocations_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entry_invoice_allocations_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_sub_jobs_display: {
        Row: {
          id: string | null;
          job_id: string | null;
          lot_number: string | null;
          sequence_no: number | null;
          display_no: string | null;
          than: number | null;
          weight: number | null;
          status: Database["public"]["Enums"]["job_status"] | null;
          stage: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      v_invoice_outstanding: {
        Row: {
          invoice_id: string | null;
          invoice_number: string | null;
          job_work_id: string | null;
          invoice_date: string | null;
          amount: number | null;
          allocated: number | null;
          outstanding: number | null;
          derived_status: Database["public"]["Enums"]["invoice_status"] | null;
          stored_status: Database["public"]["Enums"]["invoice_status"] | null;
        };
        Relationships: [];
      };
      v_account_balances: {
        Row: {
          account_id: string | null;
          name: string | null;
          opening_balance: number | null;
          total_in: number | null;
          total_out: number | null;
          current_balance: number | null;
          entry_count: number | null;
          is_active: boolean | null;
        };
        Relationships: [];
      };
      v_party_outstanding: {
        Row: {
          party_id: string | null;
          outstanding_sum: number | null;
        };
        Relationships: [];
      };
      v_employee_earnings: {
        Row: {
          employee_id: string | null;
          total_done_than: number | null;
          total_earning: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_active_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      sequence_to_alpha: { Args: { n: number }; Returns: string };
      next_lot_number: { Args: Record<PropertyKey, never>; Returns: string };
      next_invoice_number: { Args: Record<PropertyKey, never>; Returns: string };
      create_job_with_invoice: {
        Args: {
          p_party_id: string;
          p_job_type: Database["public"]["Enums"]["job_type"];
          p_than: number;
          p_price: number;
          p_kapan_number: string;
          p_weight: number;
          p_status?: Database["public"]["Enums"]["job_status"];
          p_invoice_date?: string;
        };
        Returns: {
          job_id: string;
          lot_number: string;
          invoice_id: string;
          invoice_number: string;
          amount: number;
        }[];
      };
      create_job: {
        Args: {
          p_party_id: string;
          p_job_type?: Database["public"]["Enums"]["job_type"];
          p_than: number;
          p_price: number;
          p_kapan_number: string;
          p_weight: number;
          p_status?: Database["public"]["Enums"]["job_status"];
          p_stages?: string[];
        };
        Returns: { job_id: string; lot_number: string }[];
      };
      create_invoice_for_job: {
        Args: { p_party_id: string; p_job_id: string; p_invoice_date?: string; p_due_date?: string };
        Returns: { invoice_id: string; invoice_number: string; amount: number }[];
      };
      create_invoice_for_jobs: {
        Args: { p_party_id: string; p_job_ids: string[]; p_invoice_date?: string };
        Returns: { invoice_id: string; invoice_number: string; amount: number }[];
      };
      update_job_billing_amount: {
        Args: { p_job_id: string; p_billing_amount: number | null };
        Returns: undefined;
      };
      update_job_with_invoice_recalc: {
        Args: {
          p_job_id: string;
          p_than: number;
          p_price: number;
          p_kapan_number?: string;
          p_weight?: number;
          p_status?: Database["public"]["Enums"]["job_status"];
          p_job_type?: Database["public"]["Enums"]["job_type"];
          p_stages?: string[];
          p_current_stage?: string;
        };
        Returns: {
          job_id: string;
          lot_number: string;
          invoice_id: string;
          invoice_number: string;
          amount: number;
          status: Database["public"]["Enums"]["invoice_status"];
        }[];
      };
      create_sub_job: {
        Args: {
          p_job_id: string;
          p_than: number;
          p_weight: number;
          p_status?: Database["public"]["Enums"]["job_status"];
          p_stage?: string;
        };
        Returns: Database["public"]["Tables"]["sub_jobs"]["Row"];
      };
      update_sub_job: {
        Args: {
          p_sub_job_id: string;
          p_than: number;
          p_weight?: number;
          p_status?: Database["public"]["Enums"]["job_status"];
        };
        Returns: Database["public"]["Tables"]["sub_jobs"]["Row"];
      };
      add_employee_work: {
        Args: {
          p_sub_job_id: string;
          p_employee_id: string;
          p_done_than: number;
        };
        Returns: Database["public"]["Tables"]["sub_job_employee_work"]["Row"];
      };
      update_employee_work: {
        Args: { p_work_id: string; p_done_than: number };
        Returns: Database["public"]["Tables"]["sub_job_employee_work"]["Row"];
      };
      delete_employee_work: {
        Args: { p_work_id: string };
        Returns: undefined;
      };
      advance_job_stage: {
        Args: { p_job_id: string };
        Returns: {
          job_id: string;
          current_stage: string;
          status: Database["public"]["Enums"]["job_status"];
        }[];
      };
      allocate_entry_to_invoices: {
        Args: {
          p_entry_id: string;
          p_items: Database["public"]["CompositeTypes"]["allocation_item"][];
        };
        Returns: Database["public"]["Tables"]["entry_invoice_allocations"]["Row"][];
      };
      set_invoice_status_from_allocations: {
        Args: { p_invoice_id: string };
        Returns: Database["public"]["Enums"]["invoice_status"];
      };
      dashboard_kpis: {
        Args: { p_from: string; p_to: string };
        Returns: {
          jobs_total: number;
          jobs_pending: number;
          jobs_progress: number;
          jobs_completed: number;
          total_than: number;
          employee_earnings: number;
          month_income: number;
          month_expense: number;
          outstanding: number;
        }[];
      };
    };
    Enums: {
      user_role: "admin";
      job_type: "Sarin" | "Dropping" | "Galaxy";
      employee_type: "Sarin" | "Dropping" | "Galaxy";
      job_stage: "Sarin" | "Dropping" | "Galaxy" | "Completed";
      job_status: "Pending" | "Progress" | "Completed";
      invoice_status: "Unpaid" | "Partially Paid" | "Paid";
      entry_type: "Income" | "Expense";
    };
    CompositeTypes: {
      allocation_item: {
        invoice_id: string | null;
        amount: number | null;
      };
    };
  };
};

export type PublicTableName = keyof Database["public"]["Tables"];
export type PublicRow<T extends PublicTableName> =
  Database["public"]["Tables"][T]["Row"];
