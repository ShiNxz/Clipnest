CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"title" varchar(60) DEFAULT 'Clipnest' NOT NULL,
	"description" varchar(160) DEFAULT 'Clips and memes, between friends.' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
