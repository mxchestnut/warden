-- Add lore system tables for world building notes (RP tier)
CREATE TABLE IF NOT EXISTS "lore_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"tag" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "channel_lore_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_lore_tags_guild_id_channel_id_unique" UNIQUE("guild_id","channel_id")
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "lore_entries" ADD CONSTRAINT "lore_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_lore_entries_guild_tag" ON "lore_entries"("guild_id", "tag");
CREATE INDEX IF NOT EXISTS "idx_channel_lore_tags_guild_channel" ON "channel_lore_tags"("guild_id", "channel_id");
