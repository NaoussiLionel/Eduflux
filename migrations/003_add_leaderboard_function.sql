-- A function to aggregate scores and get top users for the leaderboard.
create or replace function get_leaderboard()
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  total_score bigint
) as $$
begin
  return query
    select
      p.id as user_id,
      p.full_name,
      p.avatar_url,
      sum(qa.score)::bigint as total_score
    from quiz_attempts as qa
    join profiles as p on qa.user_id = p.id
    group by p.id, p.full_name, p.avatar_url
    order by total_score desc
    limit 100;
end;
$$ language plpgsql;