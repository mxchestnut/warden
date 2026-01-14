-- Add account_code column to users table
ALTER TABLE users ADD COLUMN account_code VARCHAR(6) UNIQUE;

-- Generate unique 6-digit codes for existing users
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE account_code IS NULL LOOP
    LOOP
      -- Generate random 6-digit code
      new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM users WHERE account_code = new_code) INTO code_exists;
      
      -- If unique, update and exit loop
      IF NOT code_exists THEN
        UPDATE users SET account_code = new_code WHERE id = user_record.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Make account_code NOT NULL after populating existing rows
ALTER TABLE users ALTER COLUMN account_code SET NOT NULL;
