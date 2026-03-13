CREATE TYPE "public"."person_status" AS ENUM('active', 'inactive', 'draft');--> statement-breakpoint
CREATE TYPE "public"."theater_group_member_role" AS ENUM('member', 'actor', 'actress', 'director', 'producer', 'technician', 'playwright', 'musician', 'other');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('theater', 'street', 'square', 'cultural_center', 'school', 'independent_space', 'gallery', 'other');--> statement-breakpoint
CREATE TYPE "public"."credit_department" AS ENUM('artistic', 'technical', 'production', 'accessibility', 'music', 'communication', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('regular', 'premiere', 'festival', 'invited', 'special', 'other');--> statement-breakpoint
CREATE TYPE "public"."show_group_relationship" AS ENUM('primary', 'coproduction', 'partner', 'invited');--> statement-breakpoint
CREATE TYPE "public"."show_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."link_entity_type" AS ENUM('show', 'theater_group', 'person', 'venue');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('review', 'article', 'interview', 'ticket', 'official_site', 'instagram', 'facebook', 'youtube', 'press', 'program', 'other');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"state_id" integer,
	"country_id" integer,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(10),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer,
	"name" varchar(120) NOT NULL,
	"code" varchar(10),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"social_name" varchar(160),
	"bio" text,
	"photo_url" text,
	"email" varchar(180),
	"phone" varchar(40),
	"website_url" text,
	"instagram_url" text,
	"facebook_url" text,
	"youtube_url" text,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"status" "person_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "theater_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"theater_group_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"role" "theater_group_member_role" DEFAULT 'member',
	"role_name" varchar(120),
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_founder" boolean DEFAULT false NOT NULL,
	"is_current_member" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "theater_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"short_description" varchar(255),
	"full_description" text,
	"foundation_year" integer,
	"logo_url" text,
	"cover_image_url" text,
	"email" varchar(180),
	"phone" varchar(40),
	"website_url" text,
	"instagram_url" text,
	"facebook_url" text,
	"youtube_url" text,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"venue_type" "venue_type" DEFAULT 'theater',
	"address" text,
	"neighborhood" varchar(120),
	"postal_code" varchar(20),
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"latitude" varchar(30),
	"longitude" varchar(30),
	"email" varchar(180),
	"phone" varchar(40),
	"website_url" text,
	"instagram_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "credit_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"department" "credit_department" DEFAULT 'other',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "show_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"credit_role_id" integer NOT NULL,
	"custom_role_name" varchar(120),
	"credit_group_name" varchar(120),
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "show_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"venue_id" integer,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"session_type" "session_type" DEFAULT 'regular',
	"room_name" varchar(120),
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"ticket_url" text,
	"notes" text,
	"credit_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "show_theater_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"theater_group_id" integer NOT NULL,
	"relationship_type" "show_group_relationship" DEFAULT 'primary',
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"subtitle" varchar(220),
	"short_description" varchar(255),
	"synopsis" text,
	"full_description" text,
	"duration_minutes" integer,
	"premiere_date" date,
	"age_rating" varchar(40),
	"language" varchar(80),
	"cover_image_url" text,
	"status" "show_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "external_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" "link_entity_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"link_type" "link_type" NOT NULL,
	"title" varchar(180) NOT NULL,
	"url" text NOT NULL,
	"source_name" varchar(140),
	"description" text,
	"published_at" timestamp with time zone,
	"is_official" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theater_group_members" ADD CONSTRAINT "theater_group_members_theater_group_id_theater_groups_id_fk" FOREIGN KEY ("theater_group_id") REFERENCES "public"."theater_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theater_group_members" ADD CONSTRAINT "theater_group_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theater_groups" ADD CONSTRAINT "theater_groups_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theater_groups" ADD CONSTRAINT "theater_groups_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theater_groups" ADD CONSTRAINT "theater_groups_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_credits" ADD CONSTRAINT "show_credits_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_credits" ADD CONSTRAINT "show_credits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_credits" ADD CONSTRAINT "show_credits_credit_role_id_credit_roles_id_fk" FOREIGN KEY ("credit_role_id") REFERENCES "public"."credit_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_sessions" ADD CONSTRAINT "show_sessions_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_sessions" ADD CONSTRAINT "show_sessions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_sessions" ADD CONSTRAINT "show_sessions_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_sessions" ADD CONSTRAINT "show_sessions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_sessions" ADD CONSTRAINT "show_sessions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_theater_groups" ADD CONSTRAINT "show_theater_groups_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_theater_groups" ADD CONSTRAINT "show_theater_groups_theater_group_id_theater_groups_id_fk" FOREIGN KEY ("theater_group_id") REFERENCES "public"."theater_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cities_state_idx" ON "cities" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "cities_country_idx" ON "cities" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "cities_name_idx" ON "cities" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_name_idx" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_code_idx" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE INDEX "states_country_idx" ON "states" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "states_name_idx" ON "states" USING btree ("name");--> statement-breakpoint
CREATE INDEX "states_code_idx" ON "states" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "people_slug_idx" ON "people" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "people_name_idx" ON "people" USING btree ("name");--> statement-breakpoint
CREATE INDEX "people_city_idx" ON "people" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "people_status_idx" ON "people" USING btree ("status");--> statement-breakpoint
CREATE INDEX "theater_group_members_group_idx" ON "theater_group_members" USING btree ("theater_group_id");--> statement-breakpoint
CREATE INDEX "theater_group_members_person_idx" ON "theater_group_members" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "theater_group_members_unique_idx" ON "theater_group_members" USING btree ("theater_group_id","person_id","role_name");--> statement-breakpoint
CREATE UNIQUE INDEX "theater_groups_slug_idx" ON "theater_groups" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "theater_groups_name_idx" ON "theater_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "theater_groups_city_idx" ON "theater_groups" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "theater_groups_active_idx" ON "theater_groups" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_slug_idx" ON "venues" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "venues_name_idx" ON "venues" USING btree ("name");--> statement-breakpoint
CREATE INDEX "venues_city_idx" ON "venues" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "venues_active_idx" ON "venues" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_roles_slug_idx" ON "credit_roles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_roles_name_idx" ON "credit_roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "credit_roles_department_idx" ON "credit_roles" USING btree ("department");--> statement-breakpoint
CREATE INDEX "show_credits_show_idx" ON "show_credits" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "show_credits_person_idx" ON "show_credits" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "show_credits_role_idx" ON "show_credits" USING btree ("credit_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "show_credits_unique_idx" ON "show_credits" USING btree ("show_id","person_id","credit_role_id");--> statement-breakpoint
CREATE INDEX "show_sessions_show_idx" ON "show_sessions" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "show_sessions_venue_idx" ON "show_sessions" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "show_sessions_start_at_idx" ON "show_sessions" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "show_sessions_status_idx" ON "show_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "show_sessions_city_idx" ON "show_sessions" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "show_theater_groups_show_idx" ON "show_theater_groups" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "show_theater_groups_group_idx" ON "show_theater_groups" USING btree ("theater_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "show_theater_groups_unique_idx" ON "show_theater_groups" USING btree ("show_id","theater_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shows_slug_idx" ON "shows" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shows_title_idx" ON "shows" USING btree ("title");--> statement-breakpoint
CREATE INDEX "shows_status_idx" ON "shows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "external_links_entity_idx" ON "external_links" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "external_links_link_type_idx" ON "external_links" USING btree ("link_type");--> statement-breakpoint
CREATE INDEX "external_links_official_idx" ON "external_links" USING btree ("is_official");