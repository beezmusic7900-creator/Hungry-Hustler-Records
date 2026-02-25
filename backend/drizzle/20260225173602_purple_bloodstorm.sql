ALTER TABLE "artists" ADD COLUMN "specialties" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "status" text DEFAULT 'Active';--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "label" text DEFAULT 'Hungry Hustler Records';