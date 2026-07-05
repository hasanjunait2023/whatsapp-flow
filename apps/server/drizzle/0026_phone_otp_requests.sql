CREATE TABLE IF NOT EXISTS phone_otp_requests (
  id          text    NOT NULL PRIMARY KEY,
  user_id     text    NOT NULL,
  phone       text    NOT NULL,
  otp_hash    text    NOT NULL,
  expires_at  text    NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  verified_at text,
  created_at  text    NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

CREATE INDEX IF NOT EXISTS phone_otp_user_idx
  ON phone_otp_requests (user_id, phone, verified_at);
