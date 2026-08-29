-- Prontuários clínicos versionados.
-- Conteúdo clínico é dado sensível: até existir o perfil "profissional",
-- o acesso fica restrito à administradora em UI, ação de servidor e RLS.

alter table public.atendimentos
  add constraint atendimentos_id_paciente_unico unique (id, paciente_id);

create table public.prontuarios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  atendimento_id uuid,
  data_registro date not null,
  titulo text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis(id) on delete set null,
  exemplo boolean not null default false,
  constraint prontuarios_titulo_minimo check (length(trim(titulo)) >= 3),
  constraint prontuarios_atendimento_da_paciente foreign key (atendimento_id, paciente_id)
    references public.atendimentos(id, paciente_id)
    on delete restrict
);

create table public.prontuario_versoes (
  id bigint generated always as identity primary key,
  prontuario_id uuid not null references public.prontuarios(id) on delete restrict,
  versao integer not null,
  motivo text not null,
  queixa text not null default '',
  avaliacao text not null default '',
  conduta text not null default '',
  evolucao text not null default '',
  orientacoes text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis(id) on delete set null,
  exemplo boolean not null default false,
  constraint prontuario_versoes_numero_positivo check (versao > 0),
  constraint prontuario_versoes_conteudo check (
    length(trim(queixa)) > 0
    or length(trim(avaliacao)) > 0
    or length(trim(conduta)) > 0
    or length(trim(evolucao)) > 0
    or length(trim(orientacoes)) > 0
    or length(trim(observacoes)) > 0
  ),
  constraint prontuario_versoes_unica unique (prontuario_id, versao)
);

create index prontuarios_paciente_idx on public.prontuarios (paciente_id, data_registro desc);
create index prontuarios_atendimento_idx on public.prontuarios (atendimento_id) where atendimento_id is not null;
create index prontuario_versoes_prontuario_idx on public.prontuario_versoes (prontuario_id, versao desc);

alter table public.prontuarios enable row level security;
alter table public.prontuario_versoes enable row level security;

create policy prontuarios_leitura
  on public.prontuarios
  for select
  to authenticated
  using (private.e_administradora());

create policy prontuarios_insercao
  on public.prontuarios
  for insert
  to authenticated
  with check (private.e_administradora());

create policy prontuarios_edicao
  on public.prontuarios
  for update
  to authenticated
  using (private.e_administradora())
  with check (private.e_administradora());

create policy prontuario_versoes_leitura
  on public.prontuario_versoes
  for select
  to authenticated
  using (private.e_administradora());

create policy prontuario_versoes_insercao
  on public.prontuario_versoes
  for insert
  to authenticated
  with check (private.e_administradora());

grant select, insert, update on public.prontuarios to authenticated;
grant select, insert on public.prontuario_versoes to authenticated;
revoke all on public.prontuarios from anon;
revoke all on public.prontuario_versoes from anon;

create trigger prontuarios_tocar_atualizado_em
  before update on public.prontuarios
  for each row
  execute function public.tocar_atualizado_em();

create trigger prontuario_versoes_tocar_atualizado_em
  before update on public.prontuario_versoes
  for each row
  execute function public.tocar_atualizado_em();

create trigger prontuarios_auditoria
  after insert or update or delete on public.prontuarios
  for each row
  execute function public.auditar();

create trigger prontuario_versoes_auditoria
  after insert or update or delete on public.prontuario_versoes
  for each row
  execute function public.auditar();

create or replace function public.prontuario_registrar(
  p_paciente_id uuid,
  p_atendimento_id uuid,
  p_data_registro date,
  p_titulo text,
  p_queixa text,
  p_avaliacao text,
  p_conduta text,
  p_evolucao text,
  p_orientacoes text,
  p_observacoes text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_prontuario_id uuid;
  v_titulo text := trim(coalesce(p_titulo, ''));
  v_queixa text := trim(coalesce(p_queixa, ''));
  v_avaliacao text := trim(coalesce(p_avaliacao, ''));
  v_conduta text := trim(coalesce(p_conduta, ''));
  v_evolucao text := trim(coalesce(p_evolucao, ''));
  v_orientacoes text := trim(coalesce(p_orientacoes, ''));
  v_observacoes text := trim(coalesce(p_observacoes, ''));
begin
  if not private.e_administradora() then
    raise exception 'Acesso negado ao prontuário';
  end if;

  if p_paciente_id is null then
    raise exception 'Paciente obrigatório';
  end if;

  if p_data_registro is null then
    raise exception 'Data obrigatória';
  end if;

  if length(v_titulo) < 3 then
    raise exception 'Título obrigatório';
  end if;

  if length(v_queixa) = 0
    and length(v_avaliacao) = 0
    and length(v_conduta) = 0
    and length(v_evolucao) = 0
    and length(v_orientacoes) = 0
    and length(v_observacoes) = 0
  then
    raise exception 'Conteúdo clínico obrigatório';
  end if;

  if p_atendimento_id is not null and not exists (
    select 1
    from public.atendimentos
    where id = p_atendimento_id
      and paciente_id = p_paciente_id
  ) then
    raise exception 'Atendimento não pertence à paciente';
  end if;

  insert into public.prontuarios (
    paciente_id,
    atendimento_id,
    data_registro,
    titulo,
    criado_por
  )
  values (
    p_paciente_id,
    p_atendimento_id,
    p_data_registro,
    v_titulo,
    auth.uid()
  )
  returning id into v_prontuario_id;

  insert into public.prontuario_versoes (
    prontuario_id,
    versao,
    motivo,
    queixa,
    avaliacao,
    conduta,
    evolucao,
    orientacoes,
    observacoes,
    criado_por
  )
  values (
    v_prontuario_id,
    1,
    'Registro inicial',
    v_queixa,
    v_avaliacao,
    v_conduta,
    v_evolucao,
    v_orientacoes,
    v_observacoes,
    auth.uid()
  );

  return v_prontuario_id;
end;
$$;

create or replace function public.prontuario_nova_versao(
  p_prontuario_id uuid,
  p_atendimento_id uuid,
  p_data_registro date,
  p_titulo text,
  p_motivo text,
  p_queixa text,
  p_avaliacao text,
  p_conduta text,
  p_evolucao text,
  p_orientacoes text,
  p_observacoes text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_paciente_id uuid;
  v_versao integer;
  v_titulo text := trim(coalesce(p_titulo, ''));
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_queixa text := trim(coalesce(p_queixa, ''));
  v_avaliacao text := trim(coalesce(p_avaliacao, ''));
  v_conduta text := trim(coalesce(p_conduta, ''));
  v_evolucao text := trim(coalesce(p_evolucao, ''));
  v_orientacoes text := trim(coalesce(p_orientacoes, ''));
  v_observacoes text := trim(coalesce(p_observacoes, ''));
begin
  if not private.e_administradora() then
    raise exception 'Acesso negado ao prontuário';
  end if;

  select paciente_id
  into v_paciente_id
  from public.prontuarios
  where id = p_prontuario_id
  for update;

  if v_paciente_id is null then
    raise exception 'Prontuário não encontrado';
  end if;

  if p_data_registro is null then
    raise exception 'Data obrigatória';
  end if;

  if length(v_titulo) < 3 then
    raise exception 'Título obrigatório';
  end if;

  if length(v_motivo) < 5 then
    raise exception 'Motivo obrigatório';
  end if;

  if length(v_queixa) = 0
    and length(v_avaliacao) = 0
    and length(v_conduta) = 0
    and length(v_evolucao) = 0
    and length(v_orientacoes) = 0
    and length(v_observacoes) = 0
  then
    raise exception 'Conteúdo clínico obrigatório';
  end if;

  if p_atendimento_id is not null and not exists (
    select 1
    from public.atendimentos
    where id = p_atendimento_id
      and paciente_id = v_paciente_id
  ) then
    raise exception 'Atendimento não pertence à paciente';
  end if;

  select coalesce(max(versao), 0) + 1
  into v_versao
  from public.prontuario_versoes
  where prontuario_id = p_prontuario_id;

  update public.prontuarios
  set
    atendimento_id = p_atendimento_id,
    data_registro = p_data_registro,
    titulo = v_titulo
  where id = p_prontuario_id;

  insert into public.prontuario_versoes (
    prontuario_id,
    versao,
    motivo,
    queixa,
    avaliacao,
    conduta,
    evolucao,
    orientacoes,
    observacoes,
    criado_por
  )
  values (
    p_prontuario_id,
    v_versao,
    v_motivo,
    v_queixa,
    v_avaliacao,
    v_conduta,
    v_evolucao,
    v_orientacoes,
    v_observacoes,
    auth.uid()
  );
end;
$$;

revoke all on function public.prontuario_registrar(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;

revoke all on function public.prontuario_nova_versao(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.prontuario_registrar(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

grant execute on function public.prontuario_nova_versao(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

comment on table public.prontuarios is 'Prontuário clínico da paciente, com cabeçalho mutável e conteúdo versionado.';
comment on table public.prontuario_versoes is 'Versões imutáveis do conteúdo clínico do prontuário.';
comment on function public.prontuario_registrar(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) is 'Cria prontuário e primeira versão em uma única operação.';
comment on function public.prontuario_nova_versao(
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) is 'Atualiza o cabeçalho do prontuário e cria uma nova versão do conteúdo clínico.';
