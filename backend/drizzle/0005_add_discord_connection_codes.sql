-- Migration: Add discord_connection_codes table for secure Discord account linking
-- Created: 2026-01-13

CREATE TABLE IF NOT EXISTS "discord_connection_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	CONSTRAINT "discord_connection_codes_code_unique" UNIQUE("code")
);

-- Add foreign key constraint
ALTER TABLE "discord_connection_codes" ADD CONSTRAINT "discord_connection_codes_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Add index for faster code lookups
CREATE INDEX IF NOT EXISTS "idx_discord_codes_code" ON "discord_connection_codes"("code");
CREATE INDEX IF NOT EXISTS "idx_discord_codes_user_id" ON "discord_connection_codes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_discord_codes_expires_at" ON "discord_connection_codes"("expires_at");
