-- =====================================================================
-- Migração 0004: cadastro não concede acesso nem papel
--
-- Corrige duas falhas da 0001, encontradas ao testar o fluxo de login:
--
-- 1. ESCALADA DE PRIVILÉGIO. O gatilho lia o papel de
--    `raw_user_meta_data`, que é preenchido pelo próprio pedido de
--    cadastro. Com o cadastro público aberto, bastava enviar
--    `{"papel":"administradora"}` para entrar como administradora.
--    O papel agora é sempre `recepcao`; promover é ação da
--    administradora, sob a política de RLS que já existe.
--
-- 2. ACESSO IMEDIATO. O perfil nascia `ativo`, então qualquer conta
--    criada já enxergava dados de paciente. Agora nasce inativo e
--    precisa ser liberado por alguém de dentro.
--
-- Só `nome` continua vindo do cadastro: é texto de exibição, não decide
-- acesso a nada.
--
-- Isto é defesa em profundidade. O cadastro público também será
-- desligado na configuração do projeto — mas o banco não deve depender
-- disso para estar seguro.
-- =====================================================================

alter table public.perfis alter column ativo set default false;

create or replace function public.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.perfis (id, nome, papel, ativo)
  values (
    new.id,
    -- Nome é só rótulo. Limitado para não virar vetor de texto gigante.
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
        split_part(new.email, '@', 1)
      ),
      120
    ),
    'recepcao',  -- nunca vem do pedido de cadastro
    false        -- liberado depois, por quem já está dentro
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.criar_perfil_para_novo_usuario()
  from public, anon, authenticated;

-- O serviço de autenticação executa este gatilho ao criar o usuário.
grant execute on function public.criar_perfil_para_novo_usuario()
  to supabase_auth_admin;

comment on function public.criar_perfil_para_novo_usuario() is
  'Cria o perfil do novo usuário sempre inativo e como recepção. Papel e liberação são decisão da administradora, nunca do pedido de cadastro.';
