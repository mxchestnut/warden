CREATE TABLE IF NOT EXISTS "character_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"strength" integer DEFAULT 10 NOT NULL,
	"dexterity" integer DEFAULT 10 NOT NULL,
	"constitution" integer DEFAULT 10 NOT NULL,
	"intelligence" integer DEFAULT 10 NOT NULL,
	"wisdom" integer DEFAULT 10 NOT NULL,
	"charisma" integer DEFAULT 10 NOT NULL,
	"character_class" text,
	"level" integer DEFAULT 1,
	"is_path_companion" boolean DEFAULT false,
	"path_companion_id" text,
	"path_companion_data" text,
	"path_companion_session" text,
	"last_synced" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"is_folder" boolean DEFAULT false NOT NULL,
	"s3_key" text,
	"mime_type" text,
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"path_companion_username" text,
	"path_companion_session_ticket" text,
	"path_companion_playfab_id" text,
	"path_companion_connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_documents" ADD CONSTRAINT "shared_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
