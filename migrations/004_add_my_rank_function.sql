-- A function to get a specific user's rank and total score.
create or replace function get_my_rank(my_user_id uuid)
returns table (
  rank bigint,
  total_score bigint
) as $$
begin
  return query
    with ranked_users as (
      select
        qa.user_id,
        sum(qa.score) as total_score,
        rank() over (order by sum(qa.score) desc) as rank
      from quiz_attempts as qa
      group by qa.user_id
    )
    select ru.rank, ru.total_score
    from ranked_users as ru
    where ru.user_id = my_user_id;
end;
$$ language plpgsql;