-- Chat reply / edit metadata. Idempotent.

alter table chat_messages add column if not exists reply_to_id text;
alter table chat_messages add column if not exists edited_at timestamptz;
