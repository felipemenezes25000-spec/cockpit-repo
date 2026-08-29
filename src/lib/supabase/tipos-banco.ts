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
      ajustes_financeiros: {
        Row: {
          criado_em: string
          criado_por: string | null
          exemplo: boolean
          id: string
          motivo: string
          recebimento_id: string | null
          valor: number
          venda_id: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          exemplo?: boolean
          id?: string
          motivo: string
          recebimento_id?: string | null
          valor: number
          venda_id: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          exemplo?: boolean
          id?: string
          motivo?: string
          recebimento_id?: string | null
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_financeiros_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_financeiros_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_financeiros_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_situacoes: {
        Row: {
          atendimento_id: string
          de: Database["public"]["Enums"]["situacao_atendimento"] | null
          em: string
          id: number
          para: Database["public"]["Enums"]["situacao_atendimento"]
          por: string | null
        }
        Insert: {
          atendimento_id: string
          de?: Database["public"]["Enums"]["situacao_atendimento"] | null
          em?: string
          id?: never
          para: Database["public"]["Enums"]["situacao_atendimento"]
          por?: string | null
        }
        Update: {
          atendimento_id?: string
          de?: Database["public"]["Enums"]["situacao_atendimento"] | null
          em?: string
          id?: never
          para?: Database["public"]["Enums"]["situacao_atendimento"]
          por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_situacoes_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_situacoes_por_fkey"
            columns: ["por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          duracao_min: number
          exemplo: boolean
          id: string
          inicio: string
          observacoes: string | null
          paciente_id: string
          procedimento_id: string
          profissional_id: string
          situacao: Database["public"]["Enums"]["situacao_atendimento"]
          valor: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          duracao_min: number
          exemplo?: boolean
          id?: string
          inicio: string
          observacoes?: string | null
          paciente_id: string
          procedimento_id: string
          profissional_id: string
          situacao?: Database["public"]["Enums"]["situacao_atendimento"]
          valor?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          duracao_min?: number
          exemplo?: boolean
          id?: string
          inicio?: string
          observacoes?: string | null
          paciente_id?: string
          procedimento_id?: string
          profissional_id?: string
          situacao?: Database["public"]["Enums"]["situacao_atendimento"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          ator_id: string | null
          dados: Json | null
          em: string
          id: number
          registro_id: string
          tabela: string
        }
        Insert: {
          acao: string
          ator_id?: string | null
          dados?: Json | null
          em?: string
          id?: never
          registro_id: string
          tabela: string
        }
        Update: {
          acao?: string
          ator_id?: string | null
          dados?: Json | null
          em?: string
          id?: never
          registro_id?: string
          tabela?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          atualizado_em: string
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          competencia: string
          criado_em: string
          criado_por: string | null
          descricao: string
          exemplo: boolean
          forma: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          observacoes: string | null
          pago_em: string | null
          situacao: Database["public"]["Enums"]["situacao_despesa"]
          valor: number
          vencimento: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          competencia: string
          criado_em?: string
          criado_por?: string | null
          descricao: string
          exemplo?: boolean
          forma?: Database["public"]["Enums"]["forma_pagamento"] | null
          id?: string
          observacoes?: string | null
          pago_em?: string | null
          situacao?: Database["public"]["Enums"]["situacao_despesa"]
          valor: number
          vencimento: string
        }
        Update: {
          atualizado_em?: string
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          competencia?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string
          exemplo?: boolean
          forma?: Database["public"]["Enums"]["forma_pagamento"] | null
          id?: string
          observacoes?: string | null
          pago_em?: string | null
          situacao?: Database["public"]["Enums"]["situacao_despesa"]
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "despesas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cpf: string | null
          criado_em: string
          criado_por: string | null
          data_nascimento: string | null
          email: string | null
          endereco: Json | null
          exemplo: boolean
          id: string
          nome: string
          nome_social: string | null
          observacoes: string | null
          origem: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          exemplo?: boolean
          id?: string
          nome: string
          nome_social?: string | null
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cpf?: string | null
          criado_em?: string
          criado_por?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          exemplo?: boolean
          id?: string
          nome?: string
          nome_social?: string | null
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      pendencias: {
        Row: {
          atendimento_id: string | null
          atualizado_em: string
          criado_em: string
          descricao: string
          exemplo: boolean
          id: string
          paciente_id: string | null
          prazo: string | null
          prioridade: Database["public"]["Enums"]["prioridade"]
          resolvida_em: string | null
          responsavel_id: string | null
          situacao: Database["public"]["Enums"]["situacao_pendencia"]
          tipo: Database["public"]["Enums"]["tipo_pendencia"]
        }
        Insert: {
          atendimento_id?: string | null
          atualizado_em?: string
          criado_em?: string
          descricao: string
          exemplo?: boolean
          id?: string
          paciente_id?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          resolvida_em?: string | null
          responsavel_id?: string | null
          situacao?: Database["public"]["Enums"]["situacao_pendencia"]
          tipo: Database["public"]["Enums"]["tipo_pendencia"]
        }
        Update: {
          atendimento_id?: string | null
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          exemplo?: boolean
          id?: string
          paciente_id?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          resolvida_em?: string | null
          responsavel_id?: string | null
          situacao?: Database["public"]["Enums"]["situacao_pendencia"]
          tipo?: Database["public"]["Enums"]["tipo_pendencia"]
        }
        Relationships: [
          {
            foreignKeyName: "pendencias_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          papel: Database["public"]["Enums"]["papel_usuario"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id: string
          nome: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
        }
        Relationships: []
      }
      procedimentos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          duracao_min: number
          exemplo: boolean
          id: string
          nome: string
          retorno_sugerido_dias: number | null
          valor_padrao: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          duracao_min?: number
          exemplo?: boolean
          id?: string
          nome: string
          retorno_sugerido_dias?: number | null
          valor_padrao?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          duracao_min?: number
          exemplo?: boolean
          id?: string
          nome?: string
          retorno_sugerido_dias?: number | null
          valor_padrao?: number
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          especialidade: string | null
          exemplo: boolean
          id: string
          nome: string
          perfil_id: string | null
          registro_conselho: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          especialidade?: string | null
          exemplo?: boolean
          id?: string
          nome: string
          perfil_id?: string | null
          registro_conselho?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          especialidade?: string | null
          exemplo?: boolean
          id?: string
          nome?: string
          perfil_id?: string | null
          registro_conselho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      prontuario_imagens: {
        Row: {
          altura: number | null
          arquivada: boolean
          atualizado_em: string
          caminho: string
          criado_em: string
          criado_por: string | null
          data_captura: string
          exemplo: boolean
          id: string
          largura: number | null
          legenda: string
          nome_original: string
          ordem: number
          prontuario_id: string
          tamanho_bytes: number
          tipo_mime: string
        }
        Insert: {
          altura?: number | null
          arquivada?: boolean
          atualizado_em?: string
          caminho: string
          criado_em?: string
          criado_por?: string | null
          data_captura: string
          exemplo?: boolean
          id?: string
          largura?: number | null
          legenda?: string
          nome_original: string
          ordem?: number
          prontuario_id: string
          tamanho_bytes: number
          tipo_mime: string
        }
        Update: {
          altura?: number | null
          arquivada?: boolean
          atualizado_em?: string
          caminho?: string
          criado_em?: string
          criado_por?: string | null
          data_captura?: string
          exemplo?: boolean
          id?: string
          largura?: number | null
          legenda?: string
          nome_original?: string
          ordem?: number
          prontuario_id?: string
          tamanho_bytes?: number
          tipo_mime?: string
        }
        Relationships: [
          {
            foreignKeyName: "prontuario_imagens_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuario_imagens_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prontuario_versoes: {
        Row: {
          atualizado_em: string
          avaliacao: string
          conduta: string
          criado_em: string
          criado_por: string | null
          evolucao: string
          exemplo: boolean
          id: number
          motivo: string
          observacoes: string
          orientacoes: string
          prontuario_id: string
          queixa: string
          versao: number
        }
        Insert: {
          atualizado_em?: string
          avaliacao?: string
          conduta?: string
          criado_em?: string
          criado_por?: string | null
          evolucao?: string
          exemplo?: boolean
          id?: never
          motivo: string
          observacoes?: string
          orientacoes?: string
          prontuario_id: string
          queixa?: string
          versao: number
        }
        Update: {
          atualizado_em?: string
          avaliacao?: string
          conduta?: string
          criado_em?: string
          criado_por?: string | null
          evolucao?: string
          exemplo?: boolean
          id?: never
          motivo?: string
          observacoes?: string
          orientacoes?: string
          prontuario_id?: string
          queixa?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "prontuario_versoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuario_versoes_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prontuarios: {
        Row: {
          atendimento_id: string | null
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          data_registro: string
          exemplo: boolean
          id: string
          paciente_id: string
          titulo: string
        }
        Insert: {
          atendimento_id?: string | null
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_registro: string
          exemplo?: boolean
          id?: string
          paciente_id: string
          titulo: string
        }
        Update: {
          atendimento_id?: string | null
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_registro?: string
          exemplo?: boolean
          id?: string
          paciente_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "prontuarios_atendimento_da_paciente"
            columns: ["atendimento_id", "paciente_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id", "paciente_id"]
          },
          {
            foreignKeyName: "prontuarios_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos: {
        Row: {
          atendimento_id: string | null
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          exemplo: boolean
          forma: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          paciente_id: string
          parcela: number | null
          recebido_em: string | null
          situacao: Database["public"]["Enums"]["situacao_recebimento"]
          taxa_valor: number
          total_parcelas: number | null
          valor: number
          valor_liquido: number | null
          valor_recebido: number | null
          vencimento: string
          venda_id: string | null
        }
        Insert: {
          atendimento_id?: string | null
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          exemplo?: boolean
          forma?: Database["public"]["Enums"]["forma_pagamento"] | null
          id?: string
          paciente_id: string
          parcela?: number | null
          recebido_em?: string | null
          situacao?: Database["public"]["Enums"]["situacao_recebimento"]
          taxa_valor?: number
          total_parcelas?: number | null
          valor: number
          valor_liquido?: number | null
          valor_recebido?: number | null
          vencimento: string
          venda_id?: string | null
        }
        Update: {
          atendimento_id?: string | null
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          exemplo?: boolean
          forma?: Database["public"]["Enums"]["forma_pagamento"] | null
          id?: string
          paciente_id?: string
          parcela?: number | null
          recebido_em?: string | null
          situacao?: Database["public"]["Enums"]["situacao_recebimento"]
          taxa_valor?: number
          total_parcelas?: number | null
          valor?: number
          valor_liquido?: number | null
          valor_recebido?: number | null
          vencimento?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      retornos: {
        Row: {
          atendimento_origem_id: string | null
          atualizado_em: string
          criado_em: string
          exemplo: boolean
          id: string
          observacoes: string | null
          paciente_id: string
          procedimento_id: string | null
          situacao: Database["public"]["Enums"]["situacao_acompanhamento"]
          sugerido_para: string
        }
        Insert: {
          atendimento_origem_id?: string | null
          atualizado_em?: string
          criado_em?: string
          exemplo?: boolean
          id?: string
          observacoes?: string | null
          paciente_id: string
          procedimento_id?: string | null
          situacao?: Database["public"]["Enums"]["situacao_acompanhamento"]
          sugerido_para: string
        }
        Update: {
          atendimento_origem_id?: string | null
          atualizado_em?: string
          criado_em?: string
          exemplo?: boolean
          id?: string
          observacoes?: string | null
          paciente_id?: string
          procedimento_id?: string | null
          situacao?: Database["public"]["Enums"]["situacao_acompanhamento"]
          sugerido_para?: string
        }
        Relationships: [
          {
            foreignKeyName: "retornos_atendimento_origem_id_fkey"
            columns: ["atendimento_origem_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retornos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retornos_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_cartao: {
        Row: {
          ativa: boolean
          atualizado_em: string
          criado_em: string
          id: string
          operadora: string
          parcelas: number
          percentual: number
          tipo: Database["public"]["Enums"]["tipo_cartao"]
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          operadora: string
          parcelas?: number
          percentual: number
          tipo: Database["public"]["Enums"]["tipo_cartao"]
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          operadora?: string
          parcelas?: number
          percentual?: number
          tipo?: Database["public"]["Enums"]["tipo_cartao"]
        }
        Relationships: []
      }
      venda_alteracoes: {
        Row: {
          de: Json
          em: string
          id: number
          motivo: string
          para: Json
          por: string | null
          tipo: string
          venda_id: string
        }
        Insert: {
          de: Json
          em?: string
          id?: never
          motivo: string
          para: Json
          por?: string | null
          tipo: string
          venda_id: string
        }
        Update: {
          de?: Json
          em?: string
          id?: never
          motivo?: string
          para?: Json
          por?: string | null
          tipo?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_alteracoes_por_fkey"
            columns: ["por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_alteracoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          data_venda: string
          desconto: number
          exemplo: boolean
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          observacoes: string | null
          paciente_id: string
          parcelas: number
          procedimento_id: string
          taxa_cartao_id: string | null
          taxa_justificativa: string | null
          taxa_manual: boolean
          taxa_percentual: number
          taxa_valor: number
          valor_final: number
          valor_liquido: number
          valor_original: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_venda: string
          desconto?: number
          exemplo?: boolean
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacoes?: string | null
          paciente_id: string
          parcelas?: number
          procedimento_id: string
          taxa_cartao_id?: string | null
          taxa_justificativa?: string | null
          taxa_manual?: boolean
          taxa_percentual?: number
          taxa_valor?: number
          valor_final: number
          valor_liquido: number
          valor_original: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          data_venda?: string
          desconto?: number
          exemplo?: boolean
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacoes?: string | null
          paciente_id?: string
          parcelas?: number
          procedimento_id?: string
          taxa_cartao_id?: string | null
          taxa_justificativa?: string | null
          taxa_manual?: boolean
          taxa_percentual?: number
          taxa_valor?: number
          valor_final?: number
          valor_liquido?: number
          valor_original?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_taxa_cartao_id_fkey"
            columns: ["taxa_cartao_id"]
            isOneToOne: false
            referencedRelation: "taxas_cartao"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      prontuario_nova_versao: {
        Args: {
          p_atendimento_id: string
          p_avaliacao: string
          p_conduta: string
          p_data_registro: string
          p_evolucao: string
          p_motivo: string
          p_observacoes: string
          p_orientacoes: string
          p_prontuario_id: string
          p_queixa: string
          p_titulo: string
        }
        Returns: undefined
      }
      prontuario_registrar: {
        Args: {
          p_atendimento_id: string
          p_avaliacao: string
          p_conduta: string
          p_data_registro: string
          p_evolucao: string
          p_observacoes: string
          p_orientacoes: string
          p_paciente_id: string
          p_queixa: string
          p_titulo: string
        }
        Returns: string
      }
      venda_alterar_pagamento: {
        Args: {
          p_forma: Database["public"]["Enums"]["forma_pagamento"]
          p_motivo: string
          p_parcelas: number
          p_taxa_cartao_id: string
          p_taxa_manual: boolean
          p_taxa_percentual: number
          p_taxa_valor: number
          p_tipo: string
          p_venda_id: string
        }
        Returns: undefined
      }
      venda_registrar: {
        Args: {
          p_data_venda: string
          p_desconto: number
          p_descricao: string
          p_forma: Database["public"]["Enums"]["forma_pagamento"]
          p_observacoes: string
          p_paciente_id: string
          p_parcelas: number
          p_procedimento_id: string
          p_recebido_em: string
          p_situacao_inicial: Database["public"]["Enums"]["situacao_recebimento"]
          p_taxa_cartao_id: string
          p_taxa_justificativa: string
          p_taxa_manual: boolean
          p_taxa_percentual: number
          p_taxa_valor: number
          p_valor_original: number
          p_vencimento: string
        }
        Returns: string
      }
    }
    Enums: {
      categoria_despesa:
        | "produtos"
        | "estrutura"
        | "equipe"
        | "marketing"
        | "impostos"
        | "outros"
      forma_pagamento:
        | "pix"
        | "credito"
        | "debito"
        | "dinheiro"
        | "transferencia"
        | "boleto"
        | "outra"
      papel_usuario: "administradora" | "recepcao" | "financeiro"
      prioridade: "alta" | "media" | "baixa"
      situacao_acompanhamento:
        | "nao_iniciado"
        | "em_contato"
        | "aguardando_resposta"
        | "agendado"
        | "recusado"
      situacao_atendimento:
        | "agendado"
        | "aguardando_confirmacao"
        | "confirmado"
        | "em_atendimento"
        | "concluido"
        | "cancelado"
        | "ausente"
      situacao_despesa: "pendente" | "paga" | "cancelada"
      situacao_pendencia: "aberta" | "resolvida" | "cancelada"
      situacao_recebimento:
        | "previsto"
        | "recebido"
        | "cancelado"
        | "pendente"
        | "recebido_divergencia"
      tipo_cartao: "debito" | "credito"
      tipo_pendencia:
        | "anamnese"
        | "termo"
        | "confirmacao"
        | "pagamento"
        | "retorno"
        | "pesquisa"
        | "outro"
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
      categoria_despesa: [
        "produtos",
        "estrutura",
        "equipe",
        "marketing",
        "impostos",
        "outros",
      ],
      forma_pagamento: [
        "pix",
        "credito",
        "debito",
        "dinheiro",
        "transferencia",
        "boleto",
        "outra",
      ],
      papel_usuario: ["administradora", "recepcao", "financeiro"],
      prioridade: ["alta", "media", "baixa"],
      situacao_acompanhamento: [
        "nao_iniciado",
        "em_contato",
        "aguardando_resposta",
        "agendado",
        "recusado",
      ],
      situacao_atendimento: [
        "agendado",
        "aguardando_confirmacao",
        "confirmado",
        "em_atendimento",
        "concluido",
        "cancelado",
        "ausente",
      ],
      situacao_despesa: ["pendente", "paga", "cancelada"],
      situacao_pendencia: ["aberta", "resolvida", "cancelada"],
      situacao_recebimento: [
        "previsto",
        "recebido",
        "cancelado",
        "pendente",
        "recebido_divergencia",
      ],
      tipo_cartao: ["debito", "credito"],
      tipo_pendencia: [
        "anamnese",
        "termo",
        "confirmacao",
        "pagamento",
        "retorno",
        "pesquisa",
        "outro",
      ],
    },
  },
} as const
