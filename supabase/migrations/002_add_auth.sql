-- Add user_id to documents table
alter table documents add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Drop all existing policies before recreating
drop policy if exists "allow all on documents" on documents;
drop policy if exists "allow all on chunks" on chunks;
drop policy if exists "users manage own documents" on documents;
drop policy if exists "users access own chunks" on chunks;

-- Users can only see and manage their own documents
create policy "users manage own documents" on documents
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chunks are accessible when the parent document belongs to the user
create policy "users access own chunks" on chunks
  for all using (
    document_id in (
      select id from documents where user_id = auth.uid()
    )
  )
  with check (
    document_id in (
      select id from documents where user_id = auth.uid()
    )
  );
