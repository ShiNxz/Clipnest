ALTER TABLE "posts" ADD COLUMN "shared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "shared_by_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_shared_by_id_users_id_fk" FOREIGN KEY ("shared_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;