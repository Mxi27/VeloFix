-- Create shop_tasks table
create table if not exists public.shop_tasks (
    id uuid not null default gen_random_uuid(),
    workshop_id uuid not null references public.workshops(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'archived')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    due_date timestamptz,
    assigned_to uuid references public.employees(id) on delete set null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id)
);

-- Enable RLS
alter table public.shop_tasks enable row level security;

-- Create unified RLS policy (drop if exists first to allow updates)
drop policy if exists "Workshop members can manage shop tasks" on public.shop_tasks;

create policy "Workshop members can manage shop tasks"
    on public.shop_tasks
    for all
    to authenticated
    using (
        exists (
            select 1 from public.workshops
            where id = shop_tasks.workshop_id
            and owner_user_id = (select auth.uid())
        )
        or
        exists (
            select 1 from public.employees
            where workshop_id = shop_tasks.workshop_id
            and user_id = (select auth.uid())
        )
    );

-- Add index for performance on common queries
create index if not exists shop_tasks_workshop_id_idx on public.shop_tasks(workshop_id);
create index if not exists shop_tasks_assigned_to_idx on public.shop_tasks(assigned_to);
create index if not exists shop_tasks_status_idx on public.shop_tasks(status);
