CREATE TYPE "public"."publication_status" AS ENUM('draft', 'scheduled', 'published');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'restore', 'publish', 'result', 'login');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('fighter_body', 'fighter_headshot', 'event_hero', 'event_hero_mobile', 'event_poster', 'news_cover', 'gallery', 'sponsor_logo', 'og_image');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'ready');--> statement-breakpoint
CREATE TYPE "public"."fighter_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."career_status" AS ENUM('active', 'inactive', 'retired');--> statement-breakpoint
CREATE TYPE "public"."fighter_stance" AS ENUM('orthodox', 'southpaw', 'switch');--> statement-breakpoint
CREATE TYPE "public"."bonus" AS ENUM('fight_of_night', 'performance_of_night', 'ko_of_night');--> statement-breakpoint
CREATE TYPE "public"."bout_corner" AS ENUM('red', 'blue');--> statement-breakpoint
CREATE TYPE "public"."bout_level" AS ENUM('pro', 'amateur');--> statement-breakpoint
CREATE TYPE "public"."method" AS ENUM('ko_tko', 'decision', 'technical_decision', 'disqualification', 'no_contest');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('red_win', 'blue_win', 'draw', 'no_contest');--> statement-breakpoint
CREATE TYPE "public"."bout_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."decision_type" AS ENUM('unanimous', 'split', 'majority');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ko_tko_type" AS ENUM('ko', 'tko_referee', 'tko_doctor', 'rtd', 'tko_injury');--> statement-breakpoint
CREATE TYPE "public"."nc_reason" AS ENUM('accidental_foul', 'overturned', 'other');--> statement-breakpoint
CREATE TYPE "public"."sponsor_tier" AS ENUM('principal', 'oficial', 'colaborador');--> statement-breakpoint
CREATE TYPE "public"."inbox_kind" AS ENUM('fighter_application', 'sponsorship');--> statement-breakpoint
CREATE TYPE "public"."inbox_status" AS ENUM('new', 'contacted', 'discarded');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allowed_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"summary" text NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "media_kind" NOT NULL,
	"original_key" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"crop" jsonb,
	"rotation" integer DEFAULT 0 NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"adjustments" jsonb DEFAULT '{"brightness":1,"contrast":1,"saturation":1}'::jsonb NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"gender" "fighter_gender" NOT NULL,
	"limit_kg" numeric(5, 1) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"ranking_slots" integer DEFAULT 5 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fighter_gallery" (
	"fighter_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fighter_gallery_fighter_id_media_id_pk" PRIMARY KEY("fighter_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "fighters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nickname" text,
	"gender" "fighter_gender" NOT NULL,
	"birth_date" date,
	"nationality" char(2) NOT NULL,
	"hometown" text,
	"division_id" uuid NOT NULL,
	"weight_kg" numeric(5, 1),
	"height_cm" integer,
	"reach_cm" integer,
	"stance" "fighter_stance",
	"gym" text,
	"coach" text,
	"base_discipline" text,
	"bio" text,
	"career_status" "career_status" DEFAULT 'active' NOT NULL,
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body_media_id" uuid,
	"headshot_media_id" uuid,
	"pro_wins" integer DEFAULT 0 NOT NULL,
	"pro_losses" integer DEFAULT 0 NOT NULL,
	"pro_draws" integer DEFAULT 0 NOT NULL,
	"pro_nc" integer DEFAULT 0 NOT NULL,
	"am_wins" integer DEFAULT 0 NOT NULL,
	"am_losses" integer DEFAULT 0 NOT NULL,
	"am_draws" integer DEFAULT 0 NOT NULL,
	"am_nc" integer DEFAULT 0 NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fighters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"red_fighter_id" uuid NOT NULL,
	"blue_fighter_id" uuid NOT NULL,
	"division_id" uuid,
	"catchweight_kg" numeric(5, 1),
	"level" "bout_level" DEFAULT 'pro' NOT NULL,
	"scheduled_rounds" integer DEFAULT 6 NOT NULL,
	"round_seconds" integer DEFAULT 180 NOT NULL,
	"is_title_fight" boolean DEFAULT false NOT NULL,
	"champion_corner" "bout_corner" DEFAULT 'red' NOT NULL,
	"bout_status" "bout_status" DEFAULT 'scheduled' NOT NULL,
	"cancel_reason" text,
	"outcome" "outcome",
	"method" "method",
	"ko_tko_type" "ko_tko_type",
	"decision_type" "decision_type",
	"dq_reason" text,
	"nc_reason" "nc_reason",
	"nc_note" text,
	"end_round" integer,
	"end_time_seconds" integer,
	"referee" text,
	"scorecards" jsonb,
	"bonuses" "bonus"[] DEFAULT '{}' NOT NULL,
	"overturned_from" jsonb,
	"video_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bouts_corners_differ" CHECK ("bouts"."red_fighter_id" <> "bouts"."blue_fighter_id"),
	CONSTRAINT "bouts_scheduled_rounds_valid" CHECK ("bouts"."scheduled_rounds" in (3, 4, 5, 6, 8, 10, 12)),
	CONSTRAINT "bouts_round_seconds_valid" CHECK ("bouts"."round_seconds" between 60 and 300)
);
--> statement-breakpoint
CREATE TABLE "card_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_gallery" (
	"event_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "event_gallery_event_id_media_id_pk" PRIMARY KEY("event_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"number" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"doors_at" timestamp with time zone,
	"ends_estimated_at" timestamp with time zone,
	"venue_name" text NOT NULL,
	"venue_address" text NOT NULL,
	"venue_city" text NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"hero_media_id" uuid,
	"hero_mobile_media_id" uuid,
	"poster_media_id" uuid,
	"ticket_url" text,
	"ticket_provider" text,
	"ticket_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ticket_points" text,
	"stream_url" text,
	"event_status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_body_media" (
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	CONSTRAINT "post_body_media_post_id_media_id_pk" PRIMARY KEY("post_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "post_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "post_events" (
	"post_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "post_events_post_id_event_id_pk" PRIMARY KEY("post_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "post_fighters" (
	"post_id" uuid NOT NULL,
	"fighter_id" uuid NOT NULL,
	CONSTRAINT "post_fighters_post_id_fighter_id_pk" PRIMARY KEY("post_id","fighter_id")
);
--> statement-breakpoint
CREATE TABLE "post_gallery" (
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_gallery_post_id_media_id_pk" PRIMARY KEY("post_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"cover_media_id" uuid,
	"body" jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb NOT NULL,
	"category_id" uuid NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"has_media" boolean DEFAULT false NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dismissed_suggestions" (
	"event_id" uuid NOT NULL,
	"fighter_id" uuid NOT NULL,
	"scope_key" text NOT NULL,
	CONSTRAINT "dismissed_suggestions_event_id_fighter_id_scope_key_pk" PRIMARY KEY("event_id","fighter_id","scope_key")
);
--> statement-breakpoint
CREATE TABLE "ranking_entries" (
	"version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"fighter_id" uuid NOT NULL,
	CONSTRAINT "ranking_entries_version_id_position_pk" PRIMARY KEY("version_id","position"),
	CONSTRAINT "ranking_entries_version_fighter_unique" UNIQUE("version_id","fighter_id")
);
--> statement-breakpoint
CREATE TABLE "ranking_levels" (
	"level" "bout_level" PRIMARY KEY NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "bout_level" NOT NULL,
	"division_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "bout_level" NOT NULL,
	"division_id" uuid NOT NULL,
	"champion_fighter_id" uuid,
	"since" date,
	CONSTRAINT "titles_level_division_unique" UNIQUE("level","division_id")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_events" (
	"sponsor_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "sponsor_events_sponsor_id_event_id_pk" PRIMARY KEY("sponsor_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_media_id" uuid NOT NULL,
	"url" text,
	"tier" "sponsor_tier" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"all_events" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_rate_limits" (
	"ip_hash" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "inbox_kind" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"payload" jsonb NOT NULL,
	"status" "inbox_status" DEFAULT 'new' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_watch_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fighter_gallery" ADD CONSTRAINT "fighter_gallery_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fighter_gallery" ADD CONSTRAINT "fighter_gallery_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fighters" ADD CONSTRAINT "fighters_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fighters" ADD CONSTRAINT "fighters_body_media_id_media_id_fk" FOREIGN KEY ("body_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fighters" ADD CONSTRAINT "fighters_headshot_media_id_media_id_fk" FOREIGN KEY ("headshot_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_segment_id_card_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."card_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_red_fighter_id_fighters_id_fk" FOREIGN KEY ("red_fighter_id") REFERENCES "public"."fighters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_blue_fighter_id_fighters_id_fk" FOREIGN KEY ("blue_fighter_id") REFERENCES "public"."fighters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_segments" ADD CONSTRAINT "card_segments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_gallery" ADD CONSTRAINT "event_gallery_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_gallery" ADD CONSTRAINT "event_gallery_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_hero_mobile_media_id_media_id_fk" FOREIGN KEY ("hero_mobile_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_poster_media_id_media_id_fk" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_body_media" ADD CONSTRAINT "post_body_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_body_media" ADD CONSTRAINT "post_body_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_events" ADD CONSTRAINT "post_events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_events" ADD CONSTRAINT "post_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_fighters" ADD CONSTRAINT "post_fighters_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_fighters" ADD CONSTRAINT "post_fighters_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_gallery" ADD CONSTRAINT "post_gallery_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_gallery" ADD CONSTRAINT "post_gallery_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_post_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."post_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dismissed_suggestions" ADD CONSTRAINT "dismissed_suggestions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dismissed_suggestions" ADD CONSTRAINT "dismissed_suggestions_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_version_id_ranking_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."ranking_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_versions" ADD CONSTRAINT "ranking_versions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_champion_fighter_id_fighters_id_fk" FOREIGN KEY ("champion_fighter_id") REFERENCES "public"."fighters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_events" ADD CONSTRAINT "sponsor_events_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_events" ADD CONSTRAINT "sponsor_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_watch_platforms" ADD CONSTRAINT "event_watch_platforms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_watch_platforms" ADD CONSTRAINT "event_watch_platforms_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "media_status_created_at_idx" ON "media" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "media_deleted_at_idx" ON "media" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "divisions_gender_sort_order_idx" ON "divisions" USING btree ("gender","sort_order");--> statement-breakpoint
CREATE INDEX "divisions_active_idx" ON "divisions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "fighter_gallery_media_id_idx" ON "fighter_gallery" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "fighters_status_idx" ON "fighters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fighters_publish_at_idx" ON "fighters" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "fighters_deleted_at_idx" ON "fighters" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "fighters_division_id_idx" ON "fighters" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "fighters_body_media_id_idx" ON "fighters" USING btree ("body_media_id");--> statement-breakpoint
CREATE INDEX "fighters_headshot_media_id_idx" ON "fighters" USING btree ("headshot_media_id");--> statement-breakpoint
CREATE INDEX "fighters_nationality_idx" ON "fighters" USING btree ("nationality");--> statement-breakpoint
CREATE INDEX "fighters_career_status_idx" ON "fighters" USING btree ("career_status");--> statement-breakpoint
CREATE INDEX "bouts_event_id_idx" ON "bouts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "bouts_segment_sort_idx" ON "bouts" USING btree ("segment_id","sort_order");--> statement-breakpoint
CREATE INDEX "bouts_red_fighter_id_idx" ON "bouts" USING btree ("red_fighter_id");--> statement-breakpoint
CREATE INDEX "bouts_blue_fighter_id_idx" ON "bouts" USING btree ("blue_fighter_id");--> statement-breakpoint
CREATE INDEX "bouts_division_id_idx" ON "bouts" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "bouts_bout_status_idx" ON "bouts" USING btree ("bout_status");--> statement-breakpoint
CREATE INDEX "card_segments_event_sort_idx" ON "card_segments" USING btree ("event_id","sort_order");--> statement-breakpoint
CREATE INDEX "event_gallery_media_id_idx" ON "event_gallery" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_publish_at_idx" ON "events" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "events_deleted_at_idx" ON "events" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_event_status_idx" ON "events" USING btree ("event_status");--> statement-breakpoint
CREATE INDEX "events_hero_media_id_idx" ON "events" USING btree ("hero_media_id");--> statement-breakpoint
CREATE INDEX "events_hero_mobile_media_id_idx" ON "events" USING btree ("hero_mobile_media_id");--> statement-breakpoint
CREATE INDEX "events_poster_media_id_idx" ON "events" USING btree ("poster_media_id");--> statement-breakpoint
CREATE INDEX "post_body_media_media_id_idx" ON "post_body_media" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "post_events_event_id_idx" ON "post_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "post_fighters_fighter_id_idx" ON "post_fighters" USING btree ("fighter_id");--> statement-breakpoint
CREATE INDEX "post_gallery_media_id_idx" ON "post_gallery" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "posts_category_id_idx" ON "posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "posts_featured_idx" ON "posts" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "posts_has_media_idx" ON "posts" USING btree ("has_media");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_publish_at_idx" ON "posts" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "posts_deleted_at_idx" ON "posts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "posts_cover_media_id_idx" ON "posts" USING btree ("cover_media_id");--> statement-breakpoint
CREATE INDEX "posts_date_idx" ON "posts" USING btree (coalesce("publish_at", "created_at") desc,"id" desc);--> statement-breakpoint
CREATE INDEX "dismissed_suggestions_fighter_id_idx" ON "dismissed_suggestions" USING btree ("fighter_id");--> statement-breakpoint
CREATE INDEX "ranking_entries_fighter_id_idx" ON "ranking_entries" USING btree ("fighter_id");--> statement-breakpoint
CREATE INDEX "ranking_versions_scope_idx" ON "ranking_versions" USING btree ("level","division_id","created_at");--> statement-breakpoint
CREATE INDEX "titles_champion_fighter_id_idx" ON "titles" USING btree ("champion_fighter_id");--> statement-breakpoint
CREATE INDEX "sponsor_events_event_id_idx" ON "sponsor_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sponsors_logo_media_id_idx" ON "sponsors" USING btree ("logo_media_id");--> statement-breakpoint
CREATE INDEX "sponsors_deleted_at_idx" ON "sponsors" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "sponsors_tier_sort_order_idx" ON "sponsors" USING btree ("tier","sort_order");--> statement-breakpoint
CREATE INDEX "form_rate_limits_window_start_idx" ON "form_rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "inbox_messages_status_created_at_idx" ON "inbox_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "inbox_messages_kind_status_created_at_idx" ON "inbox_messages" USING btree ("kind","status","created_at");--> statement-breakpoint
CREATE INDEX "event_watch_platforms_event_sort_idx" ON "event_watch_platforms" USING btree ("event_id","sort_order");--> statement-breakpoint
CREATE INDEX "event_watch_platforms_media_idx" ON "event_watch_platforms" USING btree ("media_id");