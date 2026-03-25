CREATE TABLE "merch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"stripe_url" text,
	"uploaded_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "songs" DROP CONSTRAINT "songs_artist_id_artists_id_fk";
--> statement-breakpoint
ALTER TABLE "videos" DROP CONSTRAINT "videos_artist_id_artists_id_fk";
--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "video_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "artist" text NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "album" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "file_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "category" text DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "uploaded_by" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "artist" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "youtube_url" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "category" text DEFAULT 'music_video' NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "uploaded_by" text;--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "artist_id";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "mp3_url";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "cover_photo_url";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "is_exclusive";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN "release_date";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "artist_id";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "is_exclusive";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "release_date";