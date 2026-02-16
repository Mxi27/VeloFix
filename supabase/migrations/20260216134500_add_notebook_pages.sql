-- Create notebook_pages table for hierarchical notebook (OneNote-style)
create table if not exists public.notebook_pages (
    id uuid not null default gen_random_uuid(),
    workshop_id uuid not null references public.workshops(id) on delete cascade,
    parent_id uuid references public.notebook_pages(id) on delete cascade,
    title text not null default 'Neue Seite',
    content text default '',
    icon text,
    is_folder boolean not null default false,
    sort_order integer not null default 0,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id)
);

-- Enable RLS
alter table public.notebook_pages enable row level security;

-- RLS: Workshop members can manage notebook pages
drop policy if exists "Workshop members can manage notebook pages" on public.notebook_pages;

create policy "Workshop members can manage notebook pages"
    on public.notebook_pages
    for all
    to authenticated
    using (
        exists (
            select 1 from public.workshops
            where id = notebook_pages.workshop_id
            and owner_user_id = (select auth.uid())
        )
        or
        exists (
            select 1 from public.employees
            where workshop_id = notebook_pages.workshop_id
            and user_id = (select auth.uid())
        )
    );

-- Indexes
create index if not exists notebook_pages_workshop_id_idx on public.notebook_pages(workshop_id);
create index if not exists notebook_pages_parent_id_idx on public.notebook_pages(parent_id);
create index if not exists notebook_pages_sort_order_idx on public.notebook_pages(sort_order);
