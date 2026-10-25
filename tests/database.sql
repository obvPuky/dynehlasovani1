-- Spouštět pouze v izolované TESTOVACÍ databázi po aplikaci setup.sql.
\set ON_ERROR_STOP on
begin;
truncate private.votes, private.settings;

-- Bez hesla výsledky zůstávají nepřístupné.
do $$
begin
  begin
    perform public.admin_results('unconfigured-password');
    raise exception 'Results must not be accessible before password setup';
  exception when invalid_authorization_specification then null;
  end;
  begin
    perform public.set_results_password('short');
    raise exception 'Short password was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_results_password(repeat('ě', 40));
    raise exception 'Password exceeding bcrypt byte limit was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

select public.set_results_password('test-only-password-2026');

set local role anon;
do $$
declare row_count integer; total_votes bigint; saved integer;
begin
  select count(*), sum(r.votes) into row_count, total_votes
    from public.admin_results('test-only-password-2026') r;
  if row_count <> 16 or total_votes <> 0 then raise exception 'Initial results invalid'; end if;

  saved := public.submit_vote(3, '00000000-0000-4000-8000-000000000001');
  if saved <> 3 then raise exception 'First vote not saved'; end if;
  saved := public.submit_vote(9, '00000000-0000-4000-8000-000000000001');
  if saved <> 3 then raise exception 'Duplicate vote changed choice'; end if;
  perform public.submit_vote(3, '00000000-0000-4000-8000-000000000002');
  perform public.submit_vote(16, '00000000-0000-4000-8000-000000000003');

  select count(*), sum(r.votes) into row_count, total_votes
    from public.admin_results('test-only-password-2026') r;
  if row_count <> 16 or total_votes <> 3 then raise exception 'Vote totals invalid'; end if;
  if (select r.votes from public.admin_results('test-only-password-2026') r where r.pumpkin = 3) <> 2 then
    raise exception 'Wrong per-pumpkin total';
  end if;

  begin
    perform public.submit_vote(17, '00000000-0000-4000-8000-000000000004');
    raise exception 'Invalid pumpkin accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_vote(null, '00000000-0000-4000-8000-000000000004');
    raise exception 'Null pumpkin accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_vote(1, null);
    raise exception 'Null token accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_results('wrong-password');
    raise exception 'Wrong password accepted';
  exception when invalid_authorization_specification then null;
  end;
  begin
    perform public.admin_results(null);
    raise exception 'Null password accepted';
  exception when invalid_authorization_specification then null;
  end;
  begin
    perform 1 from private.votes;
    raise exception 'Anon can read votes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from private.settings;
    raise exception 'Anon can read password hash';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_results_password('attacker-password-2026');
    raise exception 'Anon can change password';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Test změny hesla bez ztráty hlasů.
select public.set_results_password('replacement-test-password');
do $$
begin
  if (select sum(r.votes) from public.admin_results('replacement-test-password') r) <> 3 then
    raise exception 'Password change lost votes';
  end if;
  begin
    perform public.admin_results('test-only-password-2026');
    raise exception 'Old password still works';
  exception when invalid_authorization_specification then null;
  end;
end $$;
rollback;
\echo 'Database checks passed (changes rolled back).'
