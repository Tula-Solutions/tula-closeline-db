ALTER TABLE "voice"."lines" DROP CONSTRAINT "lines_assignment_kind_known";--> statement-breakpoint
ALTER TABLE "voice"."lines" DROP CONSTRAINT "lines_assignment_matches_kind";--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD COLUMN "assignment_role" text;--> statement-breakpoint
CREATE INDEX "lines_role_idx" ON "voice"."lines" USING btree ("organization_id","assignment_role") WHERE "voice"."lines"."assignment_role" is not null;--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD CONSTRAINT "lines_assignment_role_known" CHECK ("voice"."lines"."assignment_role" is null or "voice"."lines"."assignment_role" in ('owner', 'admin', 'manager', 'rep'));--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD CONSTRAINT "lines_assignment_kind_known" CHECK ("voice"."lines"."assignment_kind" in ('unassigned', 'team', 'rep', 'role'));--> statement-breakpoint
ALTER TABLE "voice"."lines" ADD CONSTRAINT "lines_assignment_matches_kind" CHECK (("voice"."lines"."assignment_kind" = 'team') = ("voice"."lines"."assignment_team_id" is not null)
        and ("voice"."lines"."assignment_kind" = 'rep') = ("voice"."lines"."assignment_membership_id" is not null)
        and ("voice"."lines"."assignment_kind" = 'role') = ("voice"."lines"."assignment_role" is not null));