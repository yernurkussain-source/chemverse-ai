-- =====================================================================
-- 6-күн: AI мұғалім — RAG іздеу және сұраулар журналы
-- Supabase → SQL Editor → New query → осы файлды қойып → Run. Қайта іске қосуға болады.
-- =====================================================================

-- RAG: мағынасы жақын үзінділерді жылдам табу үшін индекс (косинус қашықтығы)
create index if not exists rag_documents_embedding_idx
  on public.rag_documents using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists rag_documents_source_idx on public.rag_documents (source);

-- Сұраққа ең жақын үзінділер (тек сервер шақырады — secret key)
create or replace function public.match_rag_documents(
  query_embedding extensions.vector(1536),
  match_count int default 5,
  min_similarity float default 0.5
)
returns table (id uuid, source text, chunk text, similarity float)
language sql stable
set search_path = ''
as $$
  select d.id, d.source, d.chunk, 1 - (d.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.rag_documents d
  where d.embedding is not null
    and 1 - (d.embedding operator(extensions.<=>) query_embedding) >= min_similarity
  order by d.embedding operator(extensions.<=>) query_embedding
  limit least(match_count, 10);
$$;
revoke execute on function public.match_rag_documents(extensions.vector, int, float) from public, anon, authenticated;

-- AI сұраулар журналы: rate limit (минутына/күніне) және токен шығынын бақылау
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  route text not null default 'chat',
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
-- RLS қосулы, саясат жоқ: журналды тек сервер жазады және оқиды
alter table public.ai_usage enable row level security;
