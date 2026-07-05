-- message.react support: track the most recent emoji reaction per message
-- (last-wins — sufficient for CRM badge display without a full reactions table)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS last_reaction text,
  ADD COLUMN IF NOT EXISTS last_reaction_at text;
