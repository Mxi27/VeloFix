create table bike_builds (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  workshop_id uuid references workshops(id) on delete cascade not null,
  brand text not null,
  model text not null,
  color text not null,
  frame_size text not null,
  internal_number text not null,
  battery_serial text,
  notes text,
  mechanic_name text,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table bike_builds enable row level security;

-- Create policy
create policy "Users can view their workshop bike builds"
  on bike_builds for select
  using (
    auth.uid() in (
      select user_id from employees where workshop_id = bike_builds.workshop_id
      union
      select owner_user_id from workshops where id = bike_builds.workshop_id
    )
  );

create policy "Users can insert their workshop bike builds"
  on bike_builds for insert
  with check (
    auth.uid() in (
      select user_id from employees where workshop_id = bike_builds.workshop_id
      union
      select owner_user_id from workshops where id = bike_builds.workshop_id
    )
  );

create policy "Users can update their workshop bike builds"
  on bike_builds for update
  using (
    auth.uid() in (
      select user_id from employees where workshop_id = bike_builds.workshop_id
      union
      select owner_user_id from workshops where id = bike_builds.workshop_id
    )
  );

create policy "Users can delete their workshop bike builds"
  on bike_builds for delete
  using (
    auth.uid() in (
      select user_id from employees where workshop_id = bike_builds.workshop_id
      union
      select owner_user_id from workshops where id = bike_builds.workshop_id
    )
  );

