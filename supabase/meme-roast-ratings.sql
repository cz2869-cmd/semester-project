create table if not exists public.meme_roast_ratings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  client_rating_id uuid not null unique,
  profile_id uuid null references public.profiles (id) on delete set null,
  image_id uuid null references public.images (id) on delete set null,
  prompt text not null,
  roast text not null,
  verdict text not null,
  reaction text not null,
  constraint meme_roast_ratings_reaction_check
    check (reaction in ('so_funny', 'boring', 'offended')),
  constraint meme_roast_ratings_prompt_length_check
    check (char_length(prompt) between 1 and 300),
  constraint meme_roast_ratings_roast_length_check
    check (char_length(roast) between 1 and 500)
);

alter table public.meme_roast_ratings enable row level security;

grant select, insert, update on public.meme_roast_ratings to anon, authenticated;
grant usage, select on sequence public.meme_roast_ratings_id_seq to anon, authenticated;

drop policy if exists "read roast ratings" on public.meme_roast_ratings;
create policy "read roast ratings"
  on public.meme_roast_ratings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "save roast ratings" on public.meme_roast_ratings;
create policy "save roast ratings"
  on public.meme_roast_ratings
  for insert
  to anon, authenticated
  with check (
    reaction in ('so_funny', 'boring', 'offended')
    and char_length(prompt) between 1 and 300
    and char_length(roast) between 1 and 500
  );

drop policy if exists "change roast ratings" on public.meme_roast_ratings;
create policy "change roast ratings"
  on public.meme_roast_ratings
  for update
  to anon, authenticated
  using (true)
  with check (reaction in ('so_funny', 'boring', 'offended'));

insert into public.meme_roast_ratings (
  client_rating_id,
  image_id,
  prompt,
  roast,
  verdict,
  reaction
)
select
  (source_url::jsonb ->> 'clientRatingId')::uuid,
  (source_url::jsonb ->> 'imageId')::uuid,
  left(source_url::jsonb ->> 'prompt', 300),
  left(source_url::jsonb ->> 'roast', 500),
  source_url::jsonb ->> 'verdict',
  source_url::jsonb ->> 'reaction'
from public.news_snippets
where category = 'meme-roast-rating'
  and source_url is not null
on conflict (client_rating_id) do update
set
  reaction = excluded.reaction,
  roast = excluded.roast,
  prompt = excluded.prompt,
  verdict = excluded.verdict;

delete from public.news_snippets
where category = 'meme-roast-rating';
