-- Add character relationships table (RP tier)
CREATE TABLE IF NOT EXISTS "character_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"related_character_name" text NOT NULL,
	"relationship_type" text NOT NULL,
	"description" text,
	"guild_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "character_relationships" ADD CONSTRAINT "character_relationships_character_id_character_sheets_id_fk" FOREIGN KEY ("character_id") REFERENCES "character_sheets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_character_relationships_character" ON "character_relationships"("character_id");
CREATE INDEX IF NOT EXISTS "idx_character_relationships_guild" ON "character_relationships"("guild_id");
