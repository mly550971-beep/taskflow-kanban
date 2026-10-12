-- TaskFlow Supabase starter schema.
-- Apply in a fresh Supabase project after reviewing it for your deployment.
-- Never expose the service_role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  status text not null default 'todo' check (status in ('todo','progress','done')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  label text not null default 'Product' check (char_length(label) between 1 and 40),
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_workspace_id_idx on public.boards(workspace_id);
create index if not exists tasks_board_status_position_idx on public.tasks(board_id, status, position);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','member')
  );
$$;

create or replace function public.is_workspace_admin(target_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.tasks enable row level security;

-- Workspace creator becomes a member via trusted backend/admin workflow or a reviewed trigger.
create policy "members can view workspaces" on public.workspaces
for select to authenticated using (public.is_workspace_member(id));
create policy "members can update workspaces" on public.workspaces
for update to authenticated using (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin'))
) with check (
  exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin'))
);

create policy "members can view workspace membership" on public.workspace_members
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "admins manage membership" on public.workspace_members
for all to authenticated using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "members can view boards" on public.boards
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "editors can create boards" on public.boards
for insert to authenticated with check (public.can_edit_workspace(workspace_id) and created_by = (select auth.uid()));
create policy "editors can update boards" on public.boards
for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "admins can delete boards" on public.boards
for delete to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));

create policy "members can view tasks" on public.tasks
for select to authenticated using (exists (select 1 from public.boards b where b.id = board_id and public.is_workspace_member(b.workspace_id)));
create policy "editors can create tasks" on public.tasks
for insert to authenticated with check (exists (select 1 from public.boards b where b.id = board_id and public.can_edit_workspace(b.workspace_id)) and created_by = (select auth.uid()));
create policy "editors can update tasks" on public.tasks
for update to authenticated using (exists (select 1 from public.boards b where b.id = board_id and public.can_edit_workspace(b.workspace_id))) with check (exists (select 1 from public.boards b where b.id = board_id and public.can_edit_workspace(b.workspace_id)));
create policy "editors can delete tasks" on public.tasks
for delete to authenticated using (exists (select 1 from public.boards b where b.id = board_id and public.can_edit_workspace(b.workspace_id)));

-- NOTE: Before production, review the membership management policy carefully: avoid allowing
-- admins to grant themselves owner role. Prefer server-side invitation/role-change RPCs that
-- validate the caller's role and allowed role transitions. Enable backup/PITR and configure
-- Auth redirect URLs, email templates, rate limits, and allowed origins in Supabase dashboard.
