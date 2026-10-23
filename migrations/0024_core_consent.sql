CREATE FUNCTION "core"."consent_channels_valid"(channels text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT channels IS NOT NULL
    AND cardinality(channels) BETWEEN 1 AND 5
    AND NOT EXISTS (
      SELECT 1 FROM unnest(channels) AS channel
      WHERE channel IS NULL OR channel NOT IN ('phone', 'sms', 'whatsapp', 'email', 'linkedin')
    )
    AND (SELECT count(DISTINCT channel) FROM unnest(channels) AS channel) = cardinality(channels)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."consent_channels_valid"(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "core"."consent_channels_valid"(text[]) TO closeline_core;
--> statement-breakpoint
-- The foreign key from a form to its wording is deferred to commit: deleting an Organization
-- cascades to the forms and to the wording in one statement, and an immediate check there would
-- depend on which cascade the server happens to run first.
CREATE TABLE "core"."consent_form" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"wording_id" text NOT NULL,
	"name" text NOT NULL,
	"channels" text[] NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "consent_form_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "consent_form_id_shape" CHECK ("id" ~ '^cfm_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "consent_form_wording_id_shape" CHECK ("wording_id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_created_by_user_id_shape" CHECK ("created_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "consent_form_name_shape" CHECK (char_length("core"."consent_form"."name") between 1 and 100 and "core"."consent_form"."name" = btrim("core"."consent_form"."name")),
	CONSTRAINT "consent_form_channels_valid" CHECK (core.consent_channels_valid("channels")),
	CONSTRAINT "consent_form_state_known" CHECK ("core"."consent_form"."state" in ('draft', 'published', 'closed')),
	CONSTRAINT "consent_form_token_shape" CHECK ("core"."consent_form"."token" is null or (char_length("core"."consent_form"."token") between 22 and 256 and "core"."consent_form"."token" collate "C" ~ '^[A-Za-z0-9_-]+$')),
	CONSTRAINT "consent_form_lifecycle" CHECK (("core"."consent_form"."state" = 'draft') = ("core"."consent_form"."published_at" is null)
        and ("core"."consent_form"."state" = 'draft') = ("core"."consent_form"."token" is null)
        and ("core"."consent_form"."state" = 'closed') = ("core"."consent_form"."closed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."consent_wording" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"version" integer NOT NULL,
	"text" text NOT NULL,
	"channels" text[] NOT NULL,
	"supersedes_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" text NOT NULL,
	CONSTRAINT "consent_wording_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "consent_wording_id_shape" CHECK ("id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "consent_wording_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "consent_wording_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "consent_wording_supersedes_id_shape" CHECK ("supersedes_id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "consent_wording_created_by_user_id_shape" CHECK ("created_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "consent_wording_version_bounds" CHECK ("core"."consent_wording"."version" >= 1),
	CONSTRAINT "consent_wording_version_matches_lineage" CHECK (("core"."consent_wording"."version" = 1) = ("core"."consent_wording"."supersedes_id" is null)),
	CONSTRAINT "consent_wording_text_shape" CHECK (char_length("core"."consent_wording"."text") between 1 and 5000 and "core"."consent_wording"."text" = btrim("core"."consent_wording"."text")),
	CONSTRAINT "consent_wording_channels_valid" CHECK (core.consent_channels_valid("channels"))
);
--> statement-breakpoint
CREATE TABLE "core"."contact_check_log" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"prospect_id" text,
	"channel" text NOT NULL,
	"purpose" text NOT NULL,
	"caller" text NOT NULL,
	"allowed" boolean NOT NULL,
	"code" text,
	"basis" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_check_log_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "contact_check_log_id_shape" CHECK ("id" ~ '^chk_[0-9a-f]{32}$'),
	CONSTRAINT "contact_check_log_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "contact_check_log_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "contact_check_log_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "contact_check_log_channel_known" CHECK ("core"."contact_check_log"."channel" in ('phone', 'sms', 'whatsapp', 'email', 'linkedin')),
	CONSTRAINT "contact_check_log_purpose_known" CHECK ("core"."contact_check_log"."purpose" in ('agent_initiated', 'rep_initiated', 'reply')),
	CONSTRAINT "contact_check_log_caller_shape" CHECK (char_length("core"."contact_check_log"."caller") between 1 and 32 and "core"."contact_check_log"."caller" collate "C" ~ '^[a-z][a-z0-9_-]*$'),
	CONSTRAINT "contact_check_log_code_known" CHECK ("core"."contact_check_log"."code" in ('consent.missing', 'consent.withdrawn', 'consent.suppressed')),
	CONSTRAINT "contact_check_log_basis_known" CHECK ("core"."contact_check_log"."basis" in ('consent_granted', 'rep_initiated', 'reply', 'email_no_suppression')),
	CONSTRAINT "contact_check_log_outcome_consistent" CHECK (("core"."contact_check_log"."allowed" and "core"."contact_check_log"."basis" is not null and "core"."contact_check_log"."code" is null)
        or (not "core"."contact_check_log"."allowed" and "core"."contact_check_log"."basis" is null and "core"."contact_check_log"."code" is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."contact_consent_event" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "core"."contact_consent_event_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"prospect_id" text NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"wording_id" text,
	"evidence_ref" text,
	"call_id" text,
	"form_id" text,
	"ip_address" text,
	"user_agent" text,
	"stop_all" boolean DEFAULT false NOT NULL,
	"recorded_by_user_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_consent_event_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "contact_consent_event_id_shape" CHECK ("id" ~ '^cev_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "contact_consent_event_prospect_id_shape" CHECK ("prospect_id" ~ '^prs_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_wording_id_shape" CHECK ("wording_id" ~ '^cwd_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_call_id_shape" CHECK ("call_id" ~ '^call_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_form_id_shape" CHECK ("form_id" ~ '^cfm_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_recorded_by_user_id_shape" CHECK ("recorded_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "contact_consent_event_channel_known" CHECK ("core"."contact_consent_event"."channel" in ('phone', 'sms', 'whatsapp', 'email', 'linkedin')),
	CONSTRAINT "contact_consent_event_kind_known" CHECK ("core"."contact_consent_event"."kind" in ('granted', 'withdrawn')),
	CONSTRAINT "contact_consent_event_source_matches_kind" CHECK (("core"."contact_consent_event"."kind" = 'granted' and "core"."contact_consent_event"."source" in ('hosted_form', 'verbal_call', 'import_attestation', 'crm', 'manual'))
        or ("core"."contact_consent_event"."kind" = 'withdrawn' and "core"."contact_consent_event"."source" in ('unsubscribe', 'stop_reply', 'manual', 'crm'))),
	CONSTRAINT "contact_consent_event_grant_has_evidence" CHECK ("core"."contact_consent_event"."kind" <> 'granted' or ("core"."contact_consent_event"."wording_id" is not null and "core"."contact_consent_event"."evidence_ref" is not null)),
	CONSTRAINT "contact_consent_event_evidence_ref_shape" CHECK ("core"."contact_consent_event"."evidence_ref" is null or char_length("core"."contact_consent_event"."evidence_ref") between 1 and 200),
	CONSTRAINT "contact_consent_event_stop_all_withdrawal" CHECK (not "core"."contact_consent_event"."stop_all" or "core"."contact_consent_event"."kind" = 'withdrawn'),
	CONSTRAINT "contact_consent_event_call_matches_source" CHECK (("core"."contact_consent_event"."source" = 'verbal_call') = ("core"."contact_consent_event"."call_id" is not null)),
	CONSTRAINT "contact_consent_event_form_matches_source" CHECK (("core"."contact_consent_event"."source" = 'hosted_form') = ("core"."contact_consent_event"."form_id" is not null)),
	CONSTRAINT "contact_consent_event_submission_matches_source" CHECK (("core"."contact_consent_event"."source" = 'hosted_form') = ("core"."contact_consent_event"."ip_address" is not null and "core"."contact_consent_event"."user_agent" is not null)
        and ("core"."contact_consent_event"."ip_address" is null) = ("core"."contact_consent_event"."user_agent" is null)
        and ("core"."contact_consent_event"."ip_address" is null or char_length("core"."contact_consent_event"."ip_address") between 1 and 64)
        and ("core"."contact_consent_event"."user_agent" is null or char_length("core"."contact_consent_event"."user_agent") <= 512))
);
--> statement-breakpoint
CREATE TABLE "core"."suppression_entry" (
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"address_kind" text NOT NULL,
	"address_hash" "bytea" NOT NULL,
	"masked_address" text,
	"reason" text NOT NULL,
	"channel" text,
	"source_ref" text,
	"added_by_user_id" text,
	"removable" boolean GENERATED ALWAYS AS (reason in ('manual')) STORED NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" text,
	"removal_reason" text,
	CONSTRAINT "suppression_entry_pkey" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "suppression_entry_id_shape" CHECK ("id" ~ '^sup_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_entry_organization_id_shape" CHECK ("organization_id" ~ '^org_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_entry_organization_not_global" CHECK ("organization_id" <> 'org_00000000000000000000000000000000'),
	CONSTRAINT "suppression_entry_added_by_user_id_shape" CHECK ("added_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_entry_removed_by_user_id_shape" CHECK ("removed_by_user_id" ~ '^usr_[0-9a-f]{32}$'),
	CONSTRAINT "suppression_entry_address_kind_known" CHECK ("core"."suppression_entry"."address_kind" in ('email', 'phone', 'linkedin')),
	CONSTRAINT "suppression_entry_address_hash_length" CHECK (octet_length("core"."suppression_entry"."address_hash") = 32),
	CONSTRAINT "suppression_entry_reason_known" CHECK ("core"."suppression_entry"."reason" in ('unsubscribe', 'stop', 'bounce', 'complaint', 'manual', 'crm', 'erased')),
	CONSTRAINT "suppression_entry_channel_known" CHECK ("core"."suppression_entry"."channel" in ('phone', 'sms', 'whatsapp', 'email', 'linkedin')),
	CONSTRAINT "suppression_entry_masked_address_shape" CHECK (("core"."suppression_entry"."reason" = 'erased') = ("core"."suppression_entry"."masked_address" is null)
        and ("core"."suppression_entry"."masked_address" is null or char_length("core"."suppression_entry"."masked_address") between 1 and 100)),
	CONSTRAINT "suppression_entry_source_ref_shape" CHECK ("core"."suppression_entry"."source_ref" is null or char_length("core"."suppression_entry"."source_ref") between 1 and 200),
	CONSTRAINT "suppression_entry_removal_complete" CHECK (("core"."suppression_entry"."removed_at" is null) = ("core"."suppression_entry"."removed_by_user_id" is null)
        and ("core"."suppression_entry"."removed_at" is null) = ("core"."suppression_entry"."removal_reason" is null)),
	CONSTRAINT "suppression_entry_removal_reason_shape" CHECK ("core"."suppression_entry"."removal_reason" is null or (char_length("core"."suppression_entry"."removal_reason") between 1 and 500
        and "core"."suppression_entry"."removal_reason" = btrim("core"."suppression_entry"."removal_reason"))),
	CONSTRAINT "suppression_entry_only_removable_removed" CHECK ("core"."suppression_entry"."removed_at" is null or "core"."suppression_entry"."removable")
);
--> statement-breakpoint
ALTER TABLE "core"."consent_form" ADD CONSTRAINT "consent_form_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."consent_form" ADD CONSTRAINT "consent_form_wording_fk" FOREIGN KEY ("organization_id","wording_id") REFERENCES "core"."consent_wording"("organization_id","id") ON DELETE no action ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "core"."consent_wording" ADD CONSTRAINT "consent_wording_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."consent_wording" ADD CONSTRAINT "consent_wording_supersedes_fk" FOREIGN KEY ("organization_id","supersedes_id") REFERENCES "core"."consent_wording"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."contact_check_log" ADD CONSTRAINT "contact_check_log_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."contact_consent_event" ADD CONSTRAINT "contact_consent_event_prospect_fk" FOREIGN KEY ("organization_id","prospect_id") REFERENCES "core"."prospects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."contact_consent_event" ADD CONSTRAINT "contact_consent_event_wording_fk" FOREIGN KEY ("organization_id","wording_id") REFERENCES "core"."consent_wording"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."contact_consent_event" ADD CONSTRAINT "contact_consent_event_form_fk" FOREIGN KEY ("organization_id","form_id") REFERENCES "core"."consent_form"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."suppression_entry" ADD CONSTRAINT "suppression_entry_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_form_token_key" ON "core"."consent_form" USING btree ("token") WHERE "core"."consent_form"."token" is not null;--> statement-breakpoint
CREATE INDEX "consent_forms_list_idx" ON "core"."consent_form" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consent_forms_state_list_idx" ON "core"."consent_form" USING btree ("organization_id","state","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consent_forms_wording_idx" ON "core"."consent_form" USING btree ("organization_id","wording_id");--> statement-breakpoint
CREATE INDEX "consent_wordings_list_idx" ON "core"."consent_wording" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "consent_wording_supersedes_key" ON "core"."consent_wording" USING btree ("organization_id","supersedes_id") WHERE "core"."consent_wording"."supersedes_id" is not null;--> statement-breakpoint
CREATE INDEX "contact_check_log_list_idx" ON "core"."contact_check_log" USING btree ("organization_id","checked_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_check_log_prospect_idx" ON "core"."contact_check_log" USING btree ("organization_id","prospect_id","checked_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."contact_check_log"."prospect_id" is not null;--> statement-breakpoint
CREATE INDEX "contact_consent_events_channel_idx" ON "core"."contact_consent_event" USING btree ("organization_id","prospect_id","channel","seq" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_consent_events_prospect_idx" ON "core"."contact_consent_event" USING btree ("organization_id","prospect_id","seq" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_consent_events_wording_idx" ON "core"."contact_consent_event" USING btree ("organization_id","wording_id") WHERE "core"."contact_consent_event"."wording_id" is not null;--> statement-breakpoint
CREATE INDEX "contact_consent_events_form_idx" ON "core"."contact_consent_event" USING btree ("organization_id","form_id") WHERE "core"."contact_consent_event"."form_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_entry_live_key" ON "core"."suppression_entry" USING btree ("organization_id","address_kind","address_hash") WHERE "core"."suppression_entry"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "suppression_entries_live_list_idx" ON "core"."suppression_entry" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."suppression_entry"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "suppression_entries_removed_list_idx" ON "core"."suppression_entry" USING btree ("organization_id","removed_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "core"."suppression_entry"."removed_at" is not null;--> statement-breakpoint
CREATE INDEX "suppression_entries_reason_list_idx" ON "core"."suppression_entry" USING btree ("organization_id","reason","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "suppression_entries_kind_list_idx" ON "core"."suppression_entry" USING btree ("organization_id","address_kind","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "core"."consent_wording" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."consent_wording" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "consent_wording_tenant_isolation" ON "core"."consent_wording" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."consent_form" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."consent_form" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "consent_form_tenant_isolation" ON "core"."consent_form" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."contact_consent_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."contact_consent_event" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "contact_consent_event_tenant_isolation" ON "core"."contact_consent_event" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."suppression_entry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."suppression_entry" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "suppression_entry_tenant_isolation" ON "core"."suppression_entry" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
ALTER TABLE "core"."contact_check_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "core"."contact_check_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "contact_check_log_tenant_isolation" ON "core"."contact_check_log" AS PERMISSIVE FOR ALL TO PUBLIC USING ("organization_id" = NULLIF(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = NULLIF(current_setting('app.organization_id', true), ''));
--> statement-breakpoint
-- Consent Wording is immutable once something relies on it: a ledger event that cites it, or a
-- published or closed form that offers it. Changing it would rewrite what a Prospect agreed to.
-- The change is a new version. The row is locked FOR UPDATE first: an event insert holds a KEY
-- SHARE lock on it through the foreign key, so this waits for that insert to finish and then sees
-- it, instead of both passing.
CREATE FUNCTION "core"."refuse_locked_wording_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NEW;
  END IF;
  PERFORM 1 FROM "core"."consent_wording"
    WHERE "organization_id" = OLD."organization_id" AND "id" = OLD."id" FOR UPDATE;
  IF EXISTS (
      SELECT 1 FROM "core"."contact_consent_event"
      WHERE "organization_id" = OLD."organization_id" AND "wording_id" = OLD."id")
    OR EXISTS (
      SELECT 1 FROM "core"."consent_form"
      WHERE "organization_id" = OLD."organization_id" AND "wording_id" = OLD."id"
        AND "state" IN ('published', 'closed')) THEN
    RAISE EXCEPTION 'core.consent_wording_locked: a Consent Wording that a consent event or a published form relies on cannot change; add a new version'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "consent_wording_locked" BEFORE UPDATE ON "core"."consent_wording"
  FOR EACH ROW EXECUTE FUNCTION "core"."refuse_locked_wording_change"();
--> statement-breakpoint
-- The consent ledger is append-only. An UPDATE never passes. A DELETE passes only when the
-- Prospect the event belongs to is already gone, which is how erasing a Prospect (or deleting an
-- Organization) removes its events through the foreign key cascades, which may reach an event
-- from its Prospect, its wording or its form, in either order; a direct DELETE of an event
-- whose Prospect exists is refused.
CREATE FUNCTION "core"."refuse_consent_ledger_change"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' AND (
      NOT EXISTS (
        SELECT 1 FROM "core"."prospects"
        WHERE "organization_id" = OLD."organization_id" AND "id" = OLD."prospect_id")
      OR NOT EXISTS (
        SELECT 1 FROM "core"."organizations" WHERE "organization_id" = OLD."organization_id")) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'core.consent_ledger_append_only: a consent event cannot be changed or deleted; append a new event'
    USING ERRCODE = 'restrict_violation';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "contact_consent_event_append_only" BEFORE UPDATE OR DELETE ON "core"."contact_consent_event"
  FOR EACH ROW EXECUTE FUNCTION "core"."refuse_consent_ledger_change"();
--> statement-breakpoint
CREATE FUNCTION "core"."refuse_consent_ledger_truncate"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'core.consent_ledger_append_only: the consent ledger cannot be truncated'
    USING ERRCODE = 'feature_not_supported';
END
$$;
--> statement-breakpoint
CREATE TRIGGER "contact_consent_event_no_truncate" BEFORE TRUNCATE ON "core"."contact_consent_event"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."refuse_consent_ledger_truncate"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."refuse_locked_wording_change"(), "core"."refuse_consent_ledger_change"(), "core"."refuse_consent_ledger_truncate"() FROM PUBLIC;
--> statement-breakpoint
-- Publishing a form (or inserting one already published) takes a KEY SHARE lock on its wording, so
-- a wording edit running at the same time waits for the publish, then sees the published form and
-- is refused, instead of both passing.
CREATE FUNCTION "core"."lock_form_wording"() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW."state" IN ('published', 'closed') THEN
    PERFORM 1 FROM "core"."consent_wording"
      WHERE "organization_id" = NEW."organization_id" AND "id" = NEW."wording_id" FOR KEY SHARE;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "consent_form_lock_wording" BEFORE INSERT OR UPDATE ON "core"."consent_form"
  FOR EACH ROW EXECUTE FUNCTION "core"."lock_form_wording"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "core"."lock_form_wording"() FROM PUBLIC;
