-- Add recurring task support and category to shop_tasks
alter table public.shop_tasks
    add column if not exists is_recurring boolean not null default false,
    add column if not exists recurrence_rule jsonb,
    add column if not exists recurrence_next_due timestamptz,
    add column if not exists category text;

-- Index for recurring tasks lookup
create index if not exists shop_tasks_recurring_idx on public.shop_tasks(is_recurring) where is_recurring = true;
create index if not exists shop_tasks_category_idx on public.shop_tasks(category) where category is not null;

comment on column public.shop_tasks.recurrence_rule is 'JSON object: { "type": "daily"|"weekly"|"biweekly"|"monthly", "interval": number, "days": ["monday",...] }';
