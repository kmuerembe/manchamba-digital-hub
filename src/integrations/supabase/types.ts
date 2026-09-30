export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      analises_cultura: {
        Row: {
          confianca: number | null;
          criado_em: string;
          cultura: string | null;
          descricao: string | null;
          diagnostico: string | null;
          estado: string;
          foto_url: string | null;
          gravidade: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          produtos_sugeridos: Json;
          provincia: string | null;
          recomendacao: string | null;
          revisado_por_id: string | null;
          revisao_nota: string | null;
          utilizador_id: string;
        };
        Insert: {
          confianca?: number | null;
          criado_em?: string;
          cultura?: string | null;
          descricao?: string | null;
          diagnostico?: string | null;
          estado?: string;
          foto_url?: string | null;
          gravidade?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          produtos_sugeridos?: Json;
          provincia?: string | null;
          recomendacao?: string | null;
          revisado_por_id?: string | null;
          revisao_nota?: string | null;
          utilizador_id: string;
        };
        Update: {
          confianca?: number | null;
          criado_em?: string;
          cultura?: string | null;
          descricao?: string | null;
          diagnostico?: string | null;
          estado?: string;
          foto_url?: string | null;
          gravidade?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          produtos_sugeridos?: Json;
          provincia?: string | null;
          recomendacao?: string | null;
          revisado_por_id?: string | null;
          revisao_nota?: string | null;
          utilizador_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analises_utilizador_fk";
            columns: ["utilizador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      artigos: {
        Row: {
          autor_id: string | null;
          conteudo: string | null;
          criado_em: string;
          id: string;
          imagem_url: string | null;
          publicado: boolean;
          resumo: string | null;
          slug: string;
          titulo: string;
        };
        Insert: {
          autor_id?: string | null;
          conteudo?: string | null;
          criado_em?: string;
          id?: string;
          imagem_url?: string | null;
          publicado?: boolean;
          resumo?: string | null;
          slug: string;
          titulo: string;
        };
        Update: {
          autor_id?: string | null;
          conteudo?: string | null;
          criado_em?: string;
          id?: string;
          imagem_url?: string | null;
          publicado?: boolean;
          resumo?: string | null;
          slug?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artigos_autor_fk";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      avaliacoes: {
        Row: {
          avaliado_id: string;
          avaliador_id: string;
          comentario: string | null;
          criado_em: string;
          estrelas: number;
          id: string;
        };
        Insert: {
          avaliado_id: string;
          avaliador_id: string;
          comentario?: string | null;
          criado_em?: string;
          estrelas: number;
          id?: string;
        };
        Update: {
          avaliado_id?: string;
          avaliador_id?: string;
          comentario?: string | null;
          criado_em?: string;
          estrelas?: number;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "avaliacoes_avaliado_fk";
            columns: ["avaliado_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avaliacoes_avaliador_fk";
            columns: ["avaliador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categorias: {
        Row: {
          ativo: boolean;
          cor: string | null;
          icone: string | null;
          id: string;
          nome: string;
          ordem: number;
          slug: string;
          tipo: string;
        };
        Insert: {
          ativo?: boolean;
          cor?: string | null;
          icone?: string | null;
          id?: string;
          nome: string;
          ordem?: number;
          slug: string;
          tipo?: string;
        };
        Update: {
          ativo?: boolean;
          cor?: string | null;
          icone?: string | null;
          id?: string;
          nome?: string;
          ordem?: number;
          slug?: string;
          tipo?: string;
        };
        Relationships: [];
      };
      conversas: {
        Row: {
          criado_em: string;
          id: string;
          participante1_id: string;
          participante2_id: string;
          produto_id: string | null;
          ultima_mensagem: string | null;
          ultima_mensagem_em: string | null;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          participante1_id: string;
          participante2_id: string;
          produto_id?: string | null;
          ultima_mensagem?: string | null;
          ultima_mensagem_em?: string | null;
        };
        Update: {
          criado_em?: string;
          id?: string;
          participante1_id?: string;
          participante2_id?: string;
          produto_id?: string | null;
          ultima_mensagem?: string | null;
          ultima_mensagem_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversas_p1_fk";
            columns: ["participante1_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversas_p2_fk";
            columns: ["participante2_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      denuncias: {
        Row: {
          criado_em: string;
          denunciante_id: string;
          descricao: string | null;
          estado: string;
          id: string;
          motivo: string;
          produto_id: string | null;
          resolucao: string | null;
        };
        Insert: {
          criado_em?: string;
          denunciante_id: string;
          descricao?: string | null;
          estado?: string;
          id?: string;
          motivo: string;
          produto_id?: string | null;
          resolucao?: string | null;
        };
        Update: {
          criado_em?: string;
          denunciante_id?: string;
          descricao?: string | null;
          estado?: string;
          id?: string;
          motivo?: string;
          produto_id?: string | null;
          resolucao?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "denuncias_denunciante_fk";
            columns: ["denunciante_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "denuncias_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      favoritos: {
        Row: {
          criado_em: string;
          id: string;
          produto_id: string;
          utilizador_id: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          produto_id: string;
          utilizador_id: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          produto_id?: string;
          utilizador_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favoritos_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favoritos_utilizador_fk";
            columns: ["utilizador_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mensagens: {
        Row: {
          conteudo: string;
          conversa_id: string;
          criado_em: string;
          destinatario_id: string;
          id: string;
          lida: boolean;
          remetente_id: string;
        };
        Insert: {
          conteudo: string;
          conversa_id: string;
          criado_em?: string;
          destinatario_id: string;
          id?: string;
          lida?: boolean;
          remetente_id: string;
        };
        Update: {
          conteudo?: string;
          conversa_id?: string;
          criado_em?: string;
          destinatario_id?: string;
          id?: string;
          lida?: boolean;
          remetente_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey";
            columns: ["conversa_id"];
            isOneToOne: false;
            referencedRelation: "conversas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mensagens_destinatario_fk";
            columns: ["destinatario_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mensagens_remetente_fk";
            columns: ["remetente_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          criado_em: string;
          id: string;
          lida: boolean;
          link: string | null;
          mensagem: string | null;
          tipo: string;
          titulo: string;
          utilizador_id: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          lida?: boolean;
          link?: string | null;
          mensagem?: string | null;
          tipo: string;
          titulo: string;
          utilizador_id: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          lida?: boolean;
          link?: string | null;
          mensagem?: string | null;
          tipo?: string;
          titulo?: string;
          utilizador_id?: string;
        };
        Relationships: [];
      };
      produto_fotos: {
        Row: {
          id: string;
          ordem: number;
          produto_id: string;
          url: string;
        };
        Insert: {
          id?: string;
          ordem?: number;
          produto_id: string;
          url: string;
        };
        Update: {
          id?: string;
          ordem?: number;
          produto_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "produto_fotos_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      enderecos: {
        Row: {
          id: string;
          utilizador_id: string;
          nome: string;
          telefone: string;
          provincia: string;
          distrito: string;
          bairro: string | null;
          referencia: string | null;
          principal: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          utilizador_id: string;
          nome: string;
          telefone: string;
          provincia: string;
          distrito: string;
          bairro?: string | null;
          referencia?: string | null;
          principal?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          utilizador_id?: string;
          nome?: string;
          telefone?: string;
          provincia?: string;
          distrito?: string;
          bairro?: string | null;
          referencia?: string | null;
          principal?: boolean;
          criado_em?: string;
        };
        Relationships: [];
      };
      pedidos: {
        Row: {
          id: string;
          numero: string;
          comprador_id: string;
          estado: string;
          subtotal: number;
          envio: number;
          total: number;
          moeda: string;
          metodo_pagamento: string | null;
          telefone_pagamento: string | null;
          endereco: Json;
          notas: string | null;
          pago_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          numero?: string;
          comprador_id: string;
          estado?: string;
          subtotal: number;
          envio?: number;
          total: number;
          moeda?: string;
          metodo_pagamento?: string | null;
          telefone_pagamento?: string | null;
          endereco: Json;
          notas?: string | null;
          pago_em?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          numero?: string;
          comprador_id?: string;
          estado?: string;
          subtotal?: number;
          envio?: number;
          total?: number;
          moeda?: string;
          metodo_pagamento?: string | null;
          telefone_pagamento?: string | null;
          endereco?: Json;
          notas?: string | null;
          pago_em?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      pedido_itens: {
        Row: {
          id: string;
          pedido_id: string;
          produto_id: string | null;
          vendedor_id: string;
          titulo: string;
          preco: number;
          quantidade: number;
          imagem_url: string | null;
          estado: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          produto_id?: string | null;
          vendedor_id: string;
          titulo: string;
          preco: number;
          quantidade: number;
          imagem_url?: string | null;
          estado?: string;
          criado_em?: string;
        };
        Update: {
          id?: string;
          pedido_id?: string;
          produto_id?: string | null;
          vendedor_id?: string;
          titulo?: string;
          preco?: number;
          quantidade?: number;
          imagem_url?: string | null;
          estado?: string;
          criado_em?: string;
        };
        Relationships: [];
      };
      pagamentos: {
        Row: {
          id: string;
          pedido_id: string;
          metodo: string;
          telefone: string;
          valor: number;
          referencia: string;
          estado: string;
          ambiente: string;
          codigo_resposta: string | null;
          mensagem: string | null;
          transacao_id: string | null;
          conversa_id: string | null;
          resposta: Json | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          metodo: string;
          telefone: string;
          valor: number;
          referencia: string;
          estado?: string;
          ambiente?: string;
          codigo_resposta?: string | null;
          mensagem?: string | null;
          transacao_id?: string | null;
          conversa_id?: string | null;
          resposta?: Json | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          pedido_id?: string;
          metodo?: string;
          telefone?: string;
          valor?: number;
          referencia?: string;
          estado?: string;
          ambiente?: string;
          codigo_resposta?: string | null;
          mensagem?: string | null;
          transacao_id?: string | null;
          conversa_id?: string | null;
          resposta?: Json | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      produtos: {
        Row: {
          atualizado_em: string;
          bairro: string | null;
          categoria_id: string | null;
          criado_em: string;
          descricao: string | null;
          destaque: boolean;
          distrito: string | null;
          estado: string;
          id: string;
          latitude: number | null;
          longitude: number | null;
          moeda: string;
          negociavel: boolean;
          preco: number;
          provincia: string | null;
          quantidade: number | null;
          titulo: string;
          unidade: string;
          vendedor_id: string;
          visualizacoes: number;
          stock: number;
          preco_antigo: number | null;
          envio_gratis: boolean;
          custo_envio: number;
          vendas: number;
          marca: string | null;
        };
        Insert: {
          atualizado_em?: string;
          bairro?: string | null;
          categoria_id?: string | null;
          criado_em?: string;
          descricao?: string | null;
          destaque?: boolean;
          distrito?: string | null;
          estado?: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          moeda?: string;
          negociavel?: boolean;
          preco: number;
          provincia?: string | null;
          quantidade?: number | null;
          titulo: string;
          unidade?: string;
          vendedor_id: string;
          visualizacoes?: number;
          stock?: number;
          preco_antigo?: number | null;
          envio_gratis?: boolean;
          custo_envio?: number;
          vendas?: number;
          marca?: string | null;
        };
        Update: {
          atualizado_em?: string;
          bairro?: string | null;
          categoria_id?: string | null;
          criado_em?: string;
          descricao?: string | null;
          destaque?: boolean;
          distrito?: string | null;
          estado?: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          moeda?: string;
          negociavel?: boolean;
          preco?: number;
          provincia?: string | null;
          quantidade?: number | null;
          titulo?: string;
          unidade?: string;
          vendedor_id?: string;
          visualizacoes?: number;
          stock?: number;
          preco_antigo?: number | null;
          envio_gratis?: boolean;
          custo_envio?: number;
          vendas?: number;
          marca?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produtos_vendedor_fk";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          ativo: boolean;
          criado_em: string;
          distrito: string | null;
          email: string | null;
          foto_perfil: string | null;
          id: string;
          nome: string;
          provincia: string | null;
          sou_agronomo: boolean;
          telefone: string | null;
          tipo: string;
          verificado: boolean;
        };
        Insert: {
          ativo?: boolean;
          criado_em?: string;
          distrito?: string | null;
          email?: string | null;
          foto_perfil?: string | null;
          id: string;
          nome?: string;
          provincia?: string | null;
          sou_agronomo?: boolean;
          telefone?: string | null;
          tipo?: string;
          verificado?: boolean;
        };
        Update: {
          ativo?: boolean;
          criado_em?: string;
          distrito?: string | null;
          email?: string | null;
          foto_perfil?: string | null;
          id?: string;
          nome?: string;
          provincia?: string | null;
          sou_agronomo?: boolean;
          telefone?: string | null;
          tipo?: string;
          verificado?: boolean;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_perfil_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderador" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderador", "user"],
    },
  },
} as const;
