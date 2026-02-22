-- =============================================================================
-- 1) Series with array_agg of game IDs for a given season
-- =============================================================================
-- Replace 'YOUR_SEASON_ID' with your season UUID (e.g. 'f1b5f635-5f69-43b8-a9fd-8410e0f93ea3').

SELECT
  t.name AS high_seed,
  t2.name AS low_seed,
  t3.name AS winner,
  ps.round,
  ps.conference,
  ps.high_seed_wins,
  ps.low_seed_wins,
  array_agg(g.id ORDER BY g.date, g.id) FILTER (WHERE g.id IS NOT NULL) AS game_ids
FROM playoff_series ps
JOIN teams t ON t.id = ps.high_seed_team_id
JOIN teams t2 ON t2.id = ps.low_seed_team_id
LEFT JOIN teams t3 ON t3.id = ps.winner_team_id
LEFT JOIN games g ON g.playoff_series_id = ps.id
WHERE ps.season_id = 'YOUR_SEASON_ID'
GROUP BY ps.id, t.name, t2.name, t3.name, ps.round, ps.conference, ps.high_seed_wins, ps.low_seed_wins
ORDER BY
  CASE ps.round
    WHEN 'FIRST_ROUND' THEN 1
    WHEN 'SEMIFINALS' THEN 2
    WHEN 'CONFERENCE_FINALS' THEN 3
    WHEN 'FINALS' THEN 4
    ELSE 5
  END,
  ps.sequence;


-- =============================================================================
-- 2) Duplicate games: same season, date, and team pair (inflates series totals)
-- =============================================================================
-- Replace 'YOUR_SEASON_ID' with your season UUID.
-- Rows returned = matchups that have more than one game row (duplicates).

SELECT
  g.season_id,
  g.date,
  LEAST(g.home_team_id, g.away_team_id) AS team_a,
  GREATEST(g.home_team_id, g.away_team_id) AS team_b,
  COUNT(*) AS game_count,
  array_agg(g.id ORDER BY g.id) AS game_ids
FROM games g
WHERE g.season_id = 'YOUR_SEASON_ID'
  AND g.status = 'STATUS_FINAL'
  AND g.home_score IS NOT NULL
  AND g.away_score IS NOT NULL
GROUP BY g.season_id, g.date, LEAST(g.home_team_id, g.away_team_id), GREATEST(g.home_team_id, g.away_team_id)
HAVING COUNT(*) > 1
ORDER BY g.date;
