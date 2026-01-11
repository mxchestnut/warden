CREATE TABLE "activity_feed" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"announcement_channel_id" text,
	"daily_prompt_enabled" boolean DEFAULT false,
	"daily_prompt_channel_id" text,
	"daily_prompt_time" text DEFAULT '09:00:00',
	"last_prompt_posted" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_settings_guild_id_unique" UNIQUE("guild_id")
);
--> statement-breakpoint
CREATE TABLE "channel_character_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"character_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_lore_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_lore_tags_guild_id_channel_id_unique" UNIQUE("guild_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "character_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"guild_id" text NOT NULL,
	"memory" text NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"related_character_name" text NOT NULL,
	"relationship_type" text NOT NULL,
	"description" text,
	"guild_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"total_messages" integer DEFAULT 0,
	"total_dice_rolls" integer DEFAULT 0,
	"nat20_count" integer DEFAULT 0,
	"nat1_count" integer DEFAULT 0,
	"total_damage_dealt" integer DEFAULT 0,
	"last_active" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "character_stats_character_id_guild_id_unique" UNIQUE("character_id","guild_id")
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_reactions_comment_id_user_id_reaction_type_unique" UNIQUE("comment_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"parent_id" integer,
	"anchor" text,
	"is_resolved" boolean DEFAULT false,
	"is_edited" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"can_edit" boolean DEFAULT false,
	"can_comment" boolean DEFAULT true,
	"invited_by" integer,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_collaborators_document_id_user_id_unique" UNIQUE("document_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"title" text NOT NULL,
	"change_summary" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"s3_key" text NOT NULL,
	"s3_bucket" text NOT NULL,
	"document_id" integer,
	"virus_scan_status" text DEFAULT 'pending',
	"virus_scan_details" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"category" text DEFAULT 'document',
	"thumbnail_s3_key" text,
	"thumbnail_url" text,
	"is_optimized" boolean DEFAULT false,
	CONSTRAINT "files_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
CREATE TABLE "game_time" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"current_date" text NOT NULL,
	"current_time" text,
	"calendar" text DEFAULT 'Forgotten Realms',
	"notes" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_time_guild_id_unique" UNIQUE("guild_id")
);
--> statement-breakpoint
CREATE TABLE "gm_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"guild_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"inviter_id" integer NOT NULL,
	"invitee_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "group_invitations_group_id_invitee_id_unique" UNIQUE("group_id","invitee_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	CONSTRAINT "group_members_group_id_user_id_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_post_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"parent_reply_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"is_pinned" boolean DEFAULT false,
	"is_locked" boolean DEFAULT false,
	"reply_count" integer DEFAULT 0,
	"like_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"avatar_url" text,
	"banner_url" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"tags" text,
	"rules" text,
	"member_count" integer DEFAULT 0,
	"discord_guild_id" text,
	"matrix_room_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"author_id" text NOT NULL,
	"character_name" text,
	"content" text NOT NULL,
	"star_count" integer DEFAULT 0,
	"context_messages" text,
	"hall_message_id" text,
	"added_to_hall_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hall_of_fame_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "hc_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"answer_html" text,
	"source_url" text,
	"category" text,
	"ai_generated" boolean DEFAULT false,
	"created_by" integer,
	"upvotes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lore_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"tag" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"link_url" text,
	"metadata" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"time" text NOT NULL,
	"category" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"prompt_text" text NOT NULL,
	"use_count" integer DEFAULT 0,
	"last_used" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tropes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"use_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer NOT NULL,
	"following_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_following_id_unique" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "race" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "alignment" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "deity" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "size" text DEFAULT 'Medium';--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "current_hp" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "max_hp" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "temp_hp" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "armor_class" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "touch_ac" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "flat_footed_ac" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "initiative" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "speed" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "base_attack_bonus" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "cmb" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "cmd" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "fortitude_save" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "reflex_save" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "will_save" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "skills" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "weapons" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "armor" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "feats" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "special_abilities" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "spells" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "titles" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "species" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "age_description" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "cultural_background" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "pronouns" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "gender_identity" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "sexuality" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "occupation" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "current_location" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "current_goal" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "long_term_desire" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "core_motivation" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "deepest_fear" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "core_belief" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "core_misconception" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "moral_code" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "alignment_tendency" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "personality_one_sentence" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "key_virtues" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "key_flaws" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "stress_behavior" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "habits_or_tells" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "speech_style" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "physical_presence" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "identifying_traits" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "clothing_aesthetic" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "notable_equipment" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "skills_relied_on" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "skills_avoided" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "greatest_success" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "greatest_failure" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "regret" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "trauma" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "important_relationships" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "protected_relationship" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "avoided_relationship" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "rival" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "affiliated_groups" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "beliefs_philosophy" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "public_facade" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "hidden_aspect" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "secret" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "recent_change" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "potential_change" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "breaking_point" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "redemption" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "symbol_or_motif" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "legacy" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "remembered_as" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "character_sheets" ADD COLUMN "public_views" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "path_companion_password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_bot_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_quota_bytes" integer DEFAULT 1073741824;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_used_bytes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_character_id_character_sheets_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_character_mappings" ADD CONSTRAINT "channel_character_mappings_character_id_character_sheets_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_character_mappings" ADD CONSTRAINT "channel_character_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_memories" ADD CONSTRAINT "character_memories_character_id_character_sheets_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_relationships" ADD CONSTRAINT "character_relationships_character_id_character_sheets_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_stats" ADD CONSTRAINT "character_stats_character_id_character_sheets_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_notes" ADD CONSTRAINT "gm_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_replies" ADD CONSTRAINT "group_post_replies_post_id_group_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_replies" ADD CONSTRAINT "group_post_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_replies" ADD CONSTRAINT "group_post_replies_parent_reply_id_group_post_replies_id_fk" FOREIGN KEY ("parent_reply_id") REFERENCES "public"."group_post_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lore_entries" ADD CONSTRAINT "lore_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_discord_user_id_unique" UNIQUE("discord_user_id");