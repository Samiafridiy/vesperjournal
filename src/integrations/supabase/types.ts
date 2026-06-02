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
      coach_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_presets: {
        Row: {
          account_id: string | null
          account_type: string
          challenge_deadline: string | null
          created_at: string
          daily_loss_limit: number | null
          funded_enabled: boolean
          id: string
          is_default: boolean
          max_daily_risk_pct: number | null
          max_drawdown_amount: number | null
          max_weekly_risk_pct: number | null
          min_trading_days: number | null
          name: string
          profit_target: number | null
          risk_pct: number
          rr_ratio: number | null
          starting_balance: number | null
          strategy_tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_type?: string
          challenge_deadline?: string | null
          created_at?: string
          daily_loss_limit?: number | null
          funded_enabled?: boolean
          id?: string
          is_default?: boolean
          max_daily_risk_pct?: number | null
          max_drawdown_amount?: number | null
          max_weekly_risk_pct?: number | null
          min_trading_days?: number | null
          name: string
          profit_target?: number | null
          risk_pct?: number
          rr_ratio?: number | null
          starting_balance?: number | null
          strategy_tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_type?: string
          challenge_deadline?: string | null
          created_at?: string
          daily_loss_limit?: number | null
          funded_enabled?: boolean
          id?: string
          is_default?: boolean
          max_daily_risk_pct?: number | null
          max_drawdown_amount?: number | null
          max_weekly_risk_pct?: number | null
          min_trading_days?: number | null
          name?: string
          profit_target?: number | null
          risk_pct?: number
          rr_ratio?: number | null
          starting_balance?: number | null
          strategy_tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_presets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          behavior_flags: string[]
          close_price: number | null
          confidence: number | null
          created_at: string
          direction: string
          emotion_after: string | null
          emotion_before: string | null
          entry_price: number
          followed_plan: boolean | null
          id: string
          lot_size: number
          mistakes: string[] | null
          notes: string | null
          pair: string
          pnl: number | null
          result: string | null
          risk_preset_id: string | null
          rr: number | null
          screenshot_url: string | null
          session: string | null
          stop_loss: number | null
          strategy: string | null
          take_profit: number | null
          trade_date: string
          updated_at: string
          user_id: string
          wins_well: string[]
        }
        Insert: {
          account_id?: string | null
          behavior_flags?: string[]
          close_price?: number | null
          confidence?: number | null
          created_at?: string
          direction: string
          emotion_after?: string | null
          emotion_before?: string | null
          entry_price: number
          followed_plan?: boolean | null
          id?: string
          lot_size: number
          mistakes?: string[] | null
          notes?: string | null
          pair: string
          pnl?: number | null
          result?: string | null
          risk_preset_id?: string | null
          rr?: number | null
          screenshot_url?: string | null
          session?: string | null
          stop_loss?: number | null
          strategy?: string | null
          take_profit?: number | null
          trade_date?: string
          updated_at?: string
          user_id: string
          wins_well?: string[]
        }
        Update: {
          account_id?: string | null
          behavior_flags?: string[]
          close_price?: number | null
          confidence?: number | null
          created_at?: string
          direction?: string
          emotion_after?: string | null
          emotion_before?: string | null
          entry_price?: number
          followed_plan?: boolean | null
          id?: string
          lot_size?: number
          mistakes?: string[] | null
          notes?: string | null
          pair?: string
          pnl?: number | null
          result?: string | null
          risk_preset_id?: string | null
          rr?: number | null
          screenshot_url?: string | null
          session?: string | null
          stop_loss?: number | null
          strategy?: string | null
          take_profit?: number | null
          trade_date?: string
          updated_at?: string
          user_id?: string
          wins_well?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_risk_preset_id_fkey"
            columns: ["risk_preset_id"]
            isOneToOne: false
            referencedRelation: "risk_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          balance: number
          broker: string | null
          created_at: string
          currency: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          broker?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          broker?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
