create table if not exists public.processed_messages (
  message_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_messages enable row level security;

comment on table public.processed_messages is
  'Message IDs claimed once to prevent duplicate chatbot replies.';
