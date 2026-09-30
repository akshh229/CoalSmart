-- Run once in the Supabase SQL editor. All public writes go through server routes.
create extension if not exists vector with schema public;
create table if not exists public.demo_state (id text primary key check (id='sample'), version bigint not null default 1, data jsonb not null);
create table if not exists public.mines (id text primary key, payload jsonb not null);
create table if not exists public.documents (id text primary key, mine_id text not null references public.mines(id), payload jsonb not null);
create table if not exists public.evidence (id text primary key, document_id text not null references public.documents(id), payload jsonb not null);
create table if not exists public.facts (id text primary key, mine_id text not null references public.mines(id), evidence_id text not null references public.evidence(id), year integer not null, metric text not null, version integer not null, payload jsonb not null);
create table if not exists public.chunks (id text primary key, mine_id text not null references public.mines(id), year integer not null, evidence_id text not null references public.evidence(id), payload jsonb not null, embedding public.vector(1536));
create table if not exists public.conflicts (id text primary key, mine_id text not null references public.mines(id), payload jsonb not null);
create table if not exists public.reports (id text primary key, mine_id text not null references public.mines(id), payload jsonb not null);
create table if not exists public.review_events (id text primary key, payload jsonb not null);
create table if not exists public.ai_usage (bucket text primary key, count integer not null, expires_at timestamptz not null);
create index if not exists facts_lookup on public.facts (mine_id,year,metric);
create index if not exists chunks_lookup on public.chunks (mine_id,year);

do $$ declare name text; begin
  foreach name in array array['demo_state','mines','documents','evidence','facts','chunks','conflicts','reports','review_events','ai_usage'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from anon, authenticated', name);
    execute format('grant all on public.%I to service_role', name);
  end loop;
end $$;

create or replace function public.project_demo(state jsonb) returns void language plpgsql security invoker set search_path=public as $$
begin
  insert into mines select x->>'id',x from jsonb_array_elements(state->'mines') x on conflict(id) do update set payload=excluded.payload;
  insert into documents select x->>'id',x->>'mineId',x from jsonb_array_elements(state->'documents') x on conflict(id) do update set payload=excluded.payload;
  insert into evidence select x->>'id',x->>'documentId',x from jsonb_array_elements(state->'evidence') x on conflict(id) do update set payload=excluded.payload;
  insert into facts select x->>'id',x->>'mineId',x->>'evidenceId',(x->>'year')::int,x->>'metric',(x->>'version')::int,x from jsonb_array_elements(state->'facts') x on conflict(id) do update set payload=excluded.payload, version=excluded.version;
  insert into chunks(id,mine_id,year,evidence_id,payload) select x->>'id',x->>'mineId',(x->>'year')::int,x->>'evidenceId',x from jsonb_array_elements(state->'chunks') x on conflict(id) do update set payload=excluded.payload;
  delete from conflicts where id not in (select x->>'id' from jsonb_array_elements(state->'conflicts') x);
  insert into conflicts select x->>'id',x->>'mineId',x from jsonb_array_elements(state->'conflicts') x on conflict(id) do update set payload=excluded.payload;
  insert into reports select x->>'id',x->>'mineId',x from jsonb_array_elements(state->'reports') x on conflict(id) do update set payload=excluded.payload;
  insert into review_events select x->>'id',x from jsonb_array_elements(state->'events') x on conflict(id) do nothing;
end $$;

create or replace function public.seed_demo(seed_data jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare inserted integer;
begin
  insert into demo_state(id,data) values('sample',seed_data) on conflict(id) do nothing;
  get diagnostics inserted = row_count;
  if inserted>0 then perform project_demo(seed_data); end if;
  return inserted>0;
end $$;

create or replace function public.commit_demo(expected_version bigint,next_data jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare updated integer;
begin
  update demo_state set data=next_data,version=version+1 where id='sample' and version=expected_version;
  get diagnostics updated = row_count;
  if updated=0 then return false; end if;
  perform project_demo(next_data);
  return true;
end $$;

create or replace function public.consume_ai(ip_bucket text,day_bucket text,minute_limit integer,day_limit integer) returns boolean language plpgsql security invoker set search_path=public as $$
declare minute_count integer; daily_count integer;
begin
  -- Global lock order makes concurrent checks and increments atomic across Vercel instances.
  perform pg_advisory_xact_lock(703104);
  delete from ai_usage where expires_at<now();
  select count into daily_count from ai_usage where bucket=day_bucket;
  select count into minute_count from ai_usage where bucket=ip_bucket;
  if coalesce(daily_count,0)>=day_limit or coalesce(minute_count,0)>=minute_limit then return false; end if;
  insert into ai_usage values(day_bucket,1,now()+interval '2 days') on conflict(bucket) do update set count=ai_usage.count+1;
  insert into ai_usage values(ip_bucket,1,now()+interval '2 minutes') on conflict(bucket) do update set count=ai_usage.count+1;
  return true;
end $$;

create or replace function public.match_chunks(query_embedding public.vector(1536),selected_mine text,start_year int,end_year int) returns table(payload jsonb,similarity float) language sql stable security invoker set search_path=public as $$
  select payload, 1-(embedding <=> query_embedding) as similarity from chunks
  where mine_id=selected_mine and year between start_year and end_year and embedding is not null
  order by embedding <=> query_embedding limit 6;
$$;

revoke execute on function public.project_demo(jsonb),public.seed_demo(jsonb),public.commit_demo(bigint,jsonb),public.consume_ai(text,text,integer,integer),public.match_chunks(public.vector,text,int,int) from public,anon,authenticated;
grant execute on function public.project_demo(jsonb),public.seed_demo(jsonb),public.commit_demo(bigint,jsonb),public.consume_ai(text,text,integer,integer),public.match_chunks(public.vector,text,int,int) to service_role;
