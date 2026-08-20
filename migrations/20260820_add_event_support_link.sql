alter table public.events
  add column if not exists support_link text;

do $$
begin
  alter table public.events
    add constraint events_support_link_check
    check (
      support_link is null
      or (char_length(support_link) <= 2048 and support_link ~ '^https?://')
    );
exception
  when duplicate_object then null;
end
$$;

notify pgrst, 'reload schema';
