CREATE TYPE "public"."step_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "arranque_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"status" "step_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arranque_steps" ADD CONSTRAINT "arranque_steps_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arranque_steps_idea_created_idx" ON "arranque_steps" USING btree ("idea_id","created_at");