-- Embeddings from different models must never be compared in the same space.
alter table public.chunks add column if not exists embedding_model text;
update public.chunks set embedding_model='text-embedding-3-small' where embedding is not null and embedding_model is null;
create or replace function public.match_chunks_for_model(query_embedding public.vector(1536),selected_mine text,start_year int,end_year int,selected_model text)
returns table(payload jsonb,similarity float) language sql stable security invoker set search_path=public as $$
  select payload,1-(embedding <=> query_embedding) from chunks
  where mine_id=selected_mine and year between start_year and end_year and embedding is not null and embedding_model=selected_model
  order by embedding <=> query_embedding limit 6;
$$;
revoke execute on function public.match_chunks_for_model(public.vector,text,int,int,text) from public,anon,authenticated;
grant execute on function public.match_chunks_for_model(public.vector,text,int,int,text) to service_role;
