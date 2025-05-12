export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      anexos: {
        Row: {
          conteudo: string
          created_at: string | null
          id: string
          nome: string
          tipo: string
          url: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          id?: string
          nome: string
          tipo: string
          url?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string
          url?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          cor: string
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          cor: string
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      config_notificacoes: {
        Row: {
          antecedencia_unidade: string
          antecedencia_valor: number
          ativadas: boolean
          com_som: boolean
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          antecedencia_unidade?: string
          antecedencia_valor?: number
          ativadas?: boolean
          com_som?: boolean
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          antecedencia_unidade?: string
          antecedencia_valor?: number
          ativadas?: boolean
          com_som?: boolean
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          cor_subtitulo: string | null
          cor_titulo: string | null
          created_at: string | null
          id: string
          logo: string | null
          nome: string
          nome_app: string | null
          subtitulo: string | null
        }
        Insert: {
          avatar?: string | null
          cor_subtitulo?: string | null
          cor_titulo?: string | null
          created_at?: string | null
          id: string
          logo?: string | null
          nome: string
          nome_app?: string | null
          subtitulo?: string | null
        }
        Update: {
          avatar?: string | null
          cor_subtitulo?: string | null
          cor_titulo?: string | null
          created_at?: string | null
          id?: string
          logo?: string | null
          nome?: string
          nome_app?: string | null
          subtitulo?: string | null
        }
        Relationships: []
      }
      rotinas: {
        Row: {
          created_at: string | null
          descricao: string | null
          dias: Json | null
          dias_do_mes: Json | null
          horario: string | null
          id: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          dias?: Json | null
          dias_do_mes?: Json | null
          horario?: string | null
          id?: string
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          dias?: Json | null
          dias_do_mes?: Json | null
          horario?: string | null
          id?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      tarefa_anexos: {
        Row: {
          anexo_id: string
          created_at: string | null
          id: string
          tarefa_id: string
        }
        Insert: {
          anexo_id: string
          created_at?: string | null
          id?: string
          tarefa_id: string
        }
        Update: {
          anexo_id?: string
          created_at?: string | null
          id?: string
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_anexos_anexo_id_fkey"
            columns: ["anexo_id"]
            isOneToOne: false
            referencedRelation: "anexos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_anexos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          categoria_id: string
          concluida: boolean
          created_at: string | null
          data: string
          data_criacao: string | null
          descricao: string | null
          hora: string | null
          id: string
          prioridade: string
          titulo: string
          user_id: string
          notificar: boolean | null
        }
        Insert: {
          categoria_id: string
          concluida?: boolean
          created_at?: string | null
          data: string
          data_criacao?: string | null
          descricao?: string | null
          hora?: string | null
          id?: string
          prioridade?: string
          titulo: string
          user_id: string
          notificar?: boolean | null
        }
        Update: {
          categoria_id?: string
          concluida?: boolean
          created_at?: string | null
          data?: string
          data_criacao?: string | null
          descricao?: string | null
          hora?: string | null
          id?: string
          prioridade?: string
          titulo?: string
          user_id?: string
          notificar?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
