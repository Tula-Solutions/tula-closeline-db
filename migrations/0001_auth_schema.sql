CREATE TABLE "auth"."api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_four" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_key" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "auth"."audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."backup_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "backup_codes_user_code_hash_key" UNIQUE("user_id","code_hash")
);
--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"secret" text NOT NULL,
	"policy_version" integer DEFAULT 1 NOT NULL,
	"secret_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credentials_user_type_key" UNIQUE("user_id","type")
);
--> statement-breakpoint
ALTER TABLE "auth"."credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."environment_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"settings" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"managed_by" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "environment_settings_environment_id_key" UNIQUE("environment_id")
);
--> statement-breakpoint
ALTER TABLE "auth"."environment_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."environments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "environments_project_kind_key" UNIQUE("project_id","kind"),
	CONSTRAINT "environments_id_project_key" UNIQUE("id","project_id")
);
--> statement-breakpoint
CREATE TABLE "auth"."events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "events_environment_id_id_key" UNIQUE("environment_id","id")
);
--> statement-breakpoint
ALTER TABLE "auth"."events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."flow_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"user_id" uuid,
	"identifier" text NOT NULL,
	"secret_hash" text,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flow_attempts_environment_id_id_key" UNIQUE("environment_id","id")
);
--> statement-breakpoint
ALTER TABLE "auth"."flow_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."hook_call_counts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"hook_id" uuid NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hook_call_counts_hook_hour_outcome_key" UNIQUE("hook_id","hour","outcome"),
	CONSTRAINT "hook_call_counts_outcome_known" CHECK ("auth"."hook_call_counts"."outcome" in ('allowed', 'denied', 'failed', 'timed_out')),
	CONSTRAINT "hook_call_counts_calls_bounds" CHECK ("auth"."hook_call_counts"."calls" >= 0),
	CONSTRAINT "hook_call_counts_hour_whole" CHECK ("auth"."hook_call_counts"."hour" = date_trunc('hour', "auth"."hook_call_counts"."hour", 'UTC')),
	CONSTRAINT "hook_call_counts_last_at_in_hour" CHECK ("auth"."hook_call_counts"."last_at" >= "auth"."hook_call_counts"."hour" and "auth"."hook_call_counts"."last_at" < "auth"."hook_call_counts"."hour" + interval '1 hour')
);
--> statement-breakpoint
ALTER TABLE "auth"."hook_call_counts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."hooks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"point" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"deadline_ms" integer DEFAULT 2000 NOT NULL,
	"failure_mode" text DEFAULT 'deny' NOT NULL,
	"last_failed_at" timestamp with time zone,
	"last_failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hooks_environment_point_key" UNIQUE("environment_id","point"),
	CONSTRAINT "hooks_environment_id_id_key" UNIQUE("environment_id","id"),
	CONSTRAINT "hooks_deadline_bounds" CHECK ("auth"."hooks"."deadline_ms" between 100 and 5000),
	CONSTRAINT "hooks_failure_mode_known" CHECK ("auth"."hooks"."failure_mode" in ('deny', 'allow')),
	CONSTRAINT "hooks_last_failure_whole" CHECK (("auth"."hooks"."last_failed_at" is null) = ("auth"."hooks"."last_failure_reason" is null))
);
--> statement-breakpoint
ALTER TABLE "auth"."hooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_environment_provider_subject_key" UNIQUE("environment_id","provider","provider_subject"),
	CONSTRAINT "identities_user_provider_key" UNIQUE("user_id","provider")
);
--> statement-breakpoint
ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."instance_audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."native_apps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"identifier" text NOT NULL,
	"team_id" text,
	"sha256_cert_fingerprints" text[] DEFAULT '{}'::text[] NOT NULL,
	"app_link_paths" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "native_apps_environment_platform_identifier_key" UNIQUE("environment_id","platform","identifier"),
	CONSTRAINT "native_apps_platform_known" CHECK ("auth"."native_apps"."platform" in ('ios', 'android')),
	CONSTRAINT "native_apps_identifier_shape" CHECK (char_length("auth"."native_apps"."identifier") <= 255 and "auth"."native_apps"."identifier" ~ '^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$'),
	CONSTRAINT "native_apps_ios_whole" CHECK ("auth"."native_apps"."platform" <> 'ios' or ("auth"."native_apps"."team_id" is not null and "auth"."native_apps"."team_id" ~ '^[A-Z0-9]{10}$' and cardinality("auth"."native_apps"."sha256_cert_fingerprints") = 0)),
	CONSTRAINT "native_apps_android_whole" CHECK ("auth"."native_apps"."platform" <> 'android' or ("auth"."native_apps"."team_id" is null and cardinality("auth"."native_apps"."sha256_cert_fingerprints") between 1 and 10)),
	CONSTRAINT "native_apps_fingerprints_shape" CHECK (array_position("auth"."native_apps"."sha256_cert_fingerprints", null) is null and array_to_string("auth"."native_apps"."sha256_cert_fingerprints", ',') ~ '^(([0-9A-F]{2}:){31}[0-9A-F]{2}(,([0-9A-F]{2}:){31}[0-9A-F]{2})*)?$' and char_length(array_to_string("auth"."native_apps"."sha256_cert_fingerprints", ',')) = greatest(96 * cardinality("auth"."native_apps"."sha256_cert_fingerprints") - 1, 0)),
	CONSTRAINT "native_apps_app_link_paths_shape" CHECK (cardinality("auth"."native_apps"."app_link_paths") <= 10 and array_position("auth"."native_apps"."app_link_paths", null) is null and array_to_string("auth"."native_apps"."app_link_paths", ',') ~ '^((/[A-Za-z0-9._~-]+)+(,(/[A-Za-z0-9._~-]+)+)*)?$' and array_to_string("auth"."native_apps"."app_link_paths", ',') !~ '/\.\.?(/|,|$)' and char_length(array_to_string("auth"."native_apps"."app_link_paths", ',')) - char_length(replace(array_to_string("auth"."native_apps"."app_link_paths", ','), ',', '')) = greatest(cardinality("auth"."native_apps"."app_link_paths") - 1, 0) and char_length(array_to_string("auth"."native_apps"."app_link_paths", ',')) <= 2560 and (cardinality("auth"."native_apps"."app_link_paths") = 0 or char_length(array_to_string("auth"."native_apps"."app_link_paths", ',')) >= 2))
);
--> statement-breakpoint
ALTER TABLE "auth"."native_apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."oauth_providers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"client_id" text NOT NULL,
	"secret" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_providers_environment_provider_key" UNIQUE("environment_id","provider")
);
--> statement-breakpoint
ALTER TABLE "auth"."oauth_providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."passkey_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"challenge" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkey_challenges_session_purpose_key" UNIQUE("session_id","purpose")
);
--> statement-breakpoint
ALTER TABLE "auth"."passkey_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."passkeys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" "bytea" NOT NULL,
	"sign_count" bigint DEFAULT 0 NOT NULL,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aaguid" text NOT NULL,
	"backup_eligible" boolean DEFAULT false NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"user_handle" text NOT NULL,
	"name" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passkeys_environment_credential_id_key" UNIQUE("environment_id","credential_id")
);
--> statement-breakpoint
ALTER TABLE "auth"."passkeys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."password_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"secret" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_history_position_positive" CHECK ("auth"."password_history"."position" >= 1)
);
--> statement-breakpoint
ALTER TABLE "auth"."password_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"proposed_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_by_type" text,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_status_known" CHECK ("auth"."proposals"."status" in ('pending', 'approved', 'executed', 'failed')),
	CONSTRAINT "proposals_operation_shape" CHECK ("auth"."proposals"."operation" ~ '^[a-z_]{1,64}$'),
	CONSTRAINT "proposals_target_type_shape" CHECK ("auth"."proposals"."target_type" ~ '^[a-z_]{1,64}$'),
	CONSTRAINT "proposals_approval_whole" CHECK (("auth"."proposals"."status" = 'pending') = ("auth"."proposals"."approved_at" is null) and ("auth"."proposals"."status" = 'pending') = ("auth"."proposals"."approved_by_type" is null) and ("auth"."proposals"."approved_by_type" is null or "auth"."proposals"."approved_by_type" in ('admin', 'instance_admin')) and ("auth"."proposals"."approved_by_id" is null or ("auth"."proposals"."approved_by_type" is not null and char_length("auth"."proposals"."approved_by_id") between 1 and 128))),
	CONSTRAINT "proposals_failure_whole" CHECK (("auth"."proposals"."status" = 'failed') = ("auth"."proposals"."failure_reason" is not null) and ("auth"."proposals"."failure_reason" is null or "auth"."proposals"."failure_reason" ~ '^[a-z_]{1,64}$')),
	CONSTRAINT "proposals_lifetime_bounds" CHECK ("auth"."proposals"."expires_at" <= "auth"."proposals"."created_at" + interval '1 hour')
);
--> statement-breakpoint
ALTER TABLE "auth"."proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"parent_id" uuid,
	"replaced_by_id" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "refresh_tokens_environment_id_id_key" UNIQUE("environment_id","id")
);
--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"profile" text NOT NULL,
	"type" text DEFAULT 'hybrid' NOT NULL,
	"client" text NOT NULL,
	"user_agent" text,
	"ip_address" "inet",
	"last_active_at" timestamp with time zone NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone,
	"factor_verified_at" timestamp with time zone,
	"auth_methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"hook_claims" jsonb,
	"device_thumbprint" text,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_environment_id_id_key" UNIQUE("environment_id","id"),
	CONSTRAINT "sessions_hook_claims_bounds" CHECK ("auth"."sessions"."hook_claims" is null or (jsonb_typeof("auth"."sessions"."hook_claims") = 'object' and octet_length("auth"."sessions"."hook_claims"::text) <= 4096)),
	CONSTRAINT "sessions_device_thumbprint_shape" CHECK ("auth"."sessions"."device_thumbprint" is null or ("auth"."sessions"."type" = 'hybrid' and "auth"."sessions"."device_thumbprint" ~ '^[A-Za-z0-9_-]{43}$'))
);
--> statement-breakpoint
ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."signing_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"algorithm" text DEFAULT 'EdDSA' NOT NULL,
	"public_jwk" jsonb NOT NULL,
	"private_key_ciphertext" text NOT NULL,
	"status" text NOT NULL,
	"activated_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."signing_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."sms_code_counts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"day" date NOT NULL,
	"prefix" text NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_code_counts_environment_day_prefix_key" UNIQUE("environment_id","day","prefix"),
	CONSTRAINT "sms_code_counts_prefix_shape" CHECK ("auth"."sms_code_counts"."prefix" ~ '^\+[0-9]{1,4}$'),
	CONSTRAINT "sms_code_counts_bounds" CHECK ("auth"."sms_code_counts"."sent" >= 0 and "auth"."sms_code_counts"."used" >= 0 and "auth"."sms_code_counts"."used" <= "auth"."sms_code_counts"."sent")
);
--> statement-breakpoint
ALTER TABLE "auth"."sms_code_counts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."user_factors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"secret" text NOT NULL,
	"name" text,
	"confirmed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"last_used_step" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_factors_user_type_key" UNIQUE("user_id","type")
);
--> statement-breakpoint
ALTER TABLE "auth"."user_factors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"email" text,
	"email_normalized" text,
	"email_verified_at" timestamp with time zone,
	"first_name" text,
	"last_name" text,
	"banned_at" timestamp with time zone,
	"last_sign_in_at" timestamp with time zone,
	"phone_number" text,
	"phone_number_verified_at" timestamp with time zone,
	"sms_factor_enabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_environment_email_key" UNIQUE("environment_id","email_normalized"),
	CONSTRAINT "users_environment_id_id_key" UNIQUE("environment_id","id"),
	CONSTRAINT "users_email_whole" CHECK (("auth"."users"."email" IS NULL) = ("auth"."users"."email_normalized" IS NULL) AND ("auth"."users"."email" IS NOT NULL OR "auth"."users"."email_verified_at" IS NULL)),
	CONSTRAINT "users_phone_number_whole" CHECK (("auth"."users"."phone_number" IS NULL) = ("auth"."users"."phone_number_verified_at" IS NULL)),
	CONSTRAINT "users_sms_factor_needs_number" CHECK ("auth"."users"."sms_factor_enabled_at" IS NULL OR "auth"."users"."phone_number" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."verification_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"user_id" uuid,
	"flow_attempt_id" uuid,
	"purpose" text NOT NULL,
	"destination" text NOT NULL,
	"code_hash" text NOT NULL,
	"link_token_hash" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_link_token_hash_key" UNIQUE("link_token_hash")
);
--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."webhook_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_id" uuid,
	"event_type" text NOT NULL,
	"test" boolean DEFAULT false NOT NULL,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"status_code" integer,
	"failure_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_deliveries_endpoint_event_key" UNIQUE("endpoint_id","event_id"),
	CONSTRAINT "webhook_deliveries_environment_id_id_key" UNIQUE("environment_id","id")
);
--> statement-breakpoint
ALTER TABLE "auth"."webhook_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."webhook_delivery_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"status_code" integer,
	"duration_ms" integer NOT NULL,
	"failure_reason" text,
	CONSTRAINT "webhook_delivery_attempts_delivery_attempt_key" UNIQUE("delivery_id","attempt")
);
--> statement-breakpoint
ALTER TABLE "auth"."webhook_delivery_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."webhook_endpoints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"url" text NOT NULL,
	"event_types" text[] NOT NULL,
	"secret" text NOT NULL,
	"previous_secret" text,
	"previous_secret_expires_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_reason" text,
	"failing_since" timestamp with time zone,
	"last_failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_endpoints_environment_id_id_key" UNIQUE("environment_id","id"),
	CONSTRAINT "webhook_endpoints_previous_secret_whole" CHECK (("auth"."webhook_endpoints"."previous_secret" is null) = ("auth"."webhook_endpoints"."previous_secret_expires_at" is null))
);
--> statement-breakpoint
ALTER TABLE "auth"."webhook_endpoints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."api_keys" ADD CONSTRAINT "api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."api_keys" ADD CONSTRAINT "api_keys_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."api_keys" ADD CONSTRAINT "api_keys_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."audit_logs" ADD CONSTRAINT "audit_logs_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."audit_logs" ADD CONSTRAINT "audit_logs_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."credentials" ADD CONSTRAINT "credentials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."credentials" ADD CONSTRAINT "credentials_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."credentials" ADD CONSTRAINT "credentials_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."credentials" ADD CONSTRAINT "credentials_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."environment_settings" ADD CONSTRAINT "environment_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."environment_settings" ADD CONSTRAINT "environment_settings_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."environment_settings" ADD CONSTRAINT "environment_settings_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."environments" ADD CONSTRAINT "environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."events" ADD CONSTRAINT "events_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."events" ADD CONSTRAINT "events_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."flow_attempts" ADD CONSTRAINT "flow_attempts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."flow_attempts" ADD CONSTRAINT "flow_attempts_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."flow_attempts" ADD CONSTRAINT "flow_attempts_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."flow_attempts" ADD CONSTRAINT "flow_attempts_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hook_call_counts" ADD CONSTRAINT "hook_call_counts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hook_call_counts" ADD CONSTRAINT "hook_call_counts_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hook_call_counts" ADD CONSTRAINT "hook_call_counts_hook_fk" FOREIGN KEY ("environment_id","hook_id") REFERENCES "auth"."hooks"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hook_call_counts" ADD CONSTRAINT "hook_call_counts_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hooks" ADD CONSTRAINT "hooks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hooks" ADD CONSTRAINT "hooks_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."hooks" ADD CONSTRAINT "hooks_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."native_apps" ADD CONSTRAINT "native_apps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."native_apps" ADD CONSTRAINT "native_apps_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."native_apps" ADD CONSTRAINT "native_apps_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."oauth_providers" ADD CONSTRAINT "oauth_providers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."oauth_providers" ADD CONSTRAINT "oauth_providers_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."oauth_providers" ADD CONSTRAINT "oauth_providers_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkey_challenges" ADD CONSTRAINT "passkey_challenges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkey_challenges" ADD CONSTRAINT "passkey_challenges_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkey_challenges" ADD CONSTRAINT "passkey_challenges_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkey_challenges" ADD CONSTRAINT "passkey_challenges_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkeys" ADD CONSTRAINT "passkeys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkeys" ADD CONSTRAINT "passkeys_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkeys" ADD CONSTRAINT "passkeys_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."passkeys" ADD CONSTRAINT "passkeys_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."password_history" ADD CONSTRAINT "password_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."password_history" ADD CONSTRAINT "password_history_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."password_history" ADD CONSTRAINT "password_history_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."password_history" ADD CONSTRAINT "password_history_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "auth"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."proposals" ADD CONSTRAINT "proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."proposals" ADD CONSTRAINT "proposals_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."proposals" ADD CONSTRAINT "proposals_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_fk" FOREIGN KEY ("environment_id","session_id") REFERENCES "auth"."sessions"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_parent_fk" FOREIGN KEY ("environment_id","parent_id") REFERENCES "auth"."refresh_tokens"("environment_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_fk" FOREIGN KEY ("environment_id","replaced_by_id") REFERENCES "auth"."refresh_tokens"("environment_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."signing_keys" ADD CONSTRAINT "signing_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."signing_keys" ADD CONSTRAINT "signing_keys_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."signing_keys" ADD CONSTRAINT "signing_keys_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sms_code_counts" ADD CONSTRAINT "sms_code_counts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sms_code_counts" ADD CONSTRAINT "sms_code_counts_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sms_code_counts" ADD CONSTRAINT "sms_code_counts_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_factors" ADD CONSTRAINT "user_factors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_factors" ADD CONSTRAINT "user_factors_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_factors" ADD CONSTRAINT "user_factors_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_factors" ADD CONSTRAINT "user_factors_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" ADD CONSTRAINT "verification_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" ADD CONSTRAINT "verification_tokens_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" ADD CONSTRAINT "verification_tokens_user_fk" FOREIGN KEY ("environment_id","user_id") REFERENCES "auth"."users"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" ADD CONSTRAINT "verification_tokens_flow_attempt_fk" FOREIGN KEY ("environment_id","flow_attempt_id") REFERENCES "auth"."flow_attempts"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" ADD CONSTRAINT "verification_tokens_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_fk" FOREIGN KEY ("environment_id","endpoint_id") REFERENCES "auth"."webhook_endpoints"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_delivery_fk" FOREIGN KEY ("environment_id","delivery_id") REFERENCES "auth"."webhook_deliveries"("environment_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "auth"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "auth"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_environment_project_fk" FOREIGN KEY ("environment_id","project_id") REFERENCES "auth"."environments"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_environment_id_idx" ON "auth"."api_keys" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "audit_logs_environment_occurred_idx" ON "auth"."audit_logs" USING btree ("environment_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_environment_target_idx" ON "auth"."audit_logs" USING btree ("environment_id","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_environment_actor_idx" ON "auth"."audit_logs" USING btree ("environment_id","actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_environment_id_idx" ON "auth"."audit_logs" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "backup_codes_user_id_idx" ON "auth"."backup_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "backup_codes_environment_id_idx" ON "auth"."backup_codes" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "credentials_environment_id_idx" ON "auth"."credentials" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "environment_settings_environment_id_idx" ON "auth"."environment_settings" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "environments_project_id_idx" ON "auth"."environments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "events_environment_undelivered_idx" ON "auth"."events" USING btree ("environment_id","occurred_at","id") WHERE delivered_at is null;--> statement-breakpoint
CREATE INDEX "events_environment_delivered_idx" ON "auth"."events" USING btree ("environment_id","delivered_at") WHERE delivered_at is not null;--> statement-breakpoint
CREATE INDEX "events_environment_id_idx" ON "auth"."events" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "flow_attempts_environment_id_idx" ON "auth"."flow_attempts" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "hook_call_counts_environment_id_idx" ON "auth"."hook_call_counts" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "hooks_environment_id_idx" ON "auth"."hooks" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identities_environment_id_idx" ON "auth"."identities" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "instance_audit_logs_occurred_idx" ON "auth"."instance_audit_logs" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "native_apps_environment_id_idx" ON "auth"."native_apps" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "oauth_providers_environment_id_idx" ON "auth"."oauth_providers" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "passkey_challenges_expires_at_idx" ON "auth"."passkey_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "passkey_challenges_environment_id_idx" ON "auth"."passkey_challenges" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "passkeys_user_id_idx" ON "auth"."passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkeys_environment_id_idx" ON "auth"."passkeys" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "password_history_environment_position_idx" ON "auth"."password_history" USING btree ("environment_id","position");--> statement-breakpoint
CREATE INDEX "password_history_environment_id_idx" ON "auth"."password_history" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "auth"."projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "proposals_environment_created_idx" ON "auth"."proposals" USING btree ("environment_id","created_at");--> statement-breakpoint
CREATE INDEX "proposals_environment_id_idx" ON "auth"."proposals" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_session_id_idx" ON "auth"."refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_environment_id_idx" ON "auth"."refresh_tokens" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_environment_id_idx" ON "auth"."sessions" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "signing_keys_environment_status_idx" ON "auth"."signing_keys" USING btree ("environment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "signing_keys_one_active_per_environment" ON "auth"."signing_keys" USING btree ("environment_id") WHERE "auth"."signing_keys"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "signing_keys_one_next_per_environment" ON "auth"."signing_keys" USING btree ("environment_id") WHERE "auth"."signing_keys"."status" = 'next';--> statement-breakpoint
CREATE INDEX "signing_keys_environment_id_idx" ON "auth"."signing_keys" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "sms_code_counts_environment_id_idx" ON "auth"."sms_code_counts" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "user_factors_expires_at_idx" ON "auth"."user_factors" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_factors_environment_id_idx" ON "auth"."user_factors" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "users_environment_phone_number_idx" ON "auth"."users" USING btree ("environment_id","phone_number") WHERE "auth"."users"."phone_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "users_environment_id_idx" ON "auth"."users" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "verification_tokens_flow_attempt_id_idx" ON "auth"."verification_tokens" USING btree ("flow_attempt_id");--> statement-breakpoint
CREATE INDEX "verification_tokens_environment_id_idx" ON "auth"."verification_tokens" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_event_idx" ON "auth"."webhook_deliveries" USING btree ("environment_id","event_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due_idx" ON "auth"."webhook_deliveries" USING btree ("environment_id","endpoint_id","next_attempt_at") WHERE state = 'pending';--> statement-breakpoint
CREATE INDEX "webhook_deliveries_pending_age_idx" ON "auth"."webhook_deliveries" USING btree ("environment_id","created_at") WHERE state = 'pending';--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpoint_log_idx" ON "auth"."webhook_deliveries" USING btree ("environment_id","endpoint_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_environment_created_idx" ON "auth"."webhook_deliveries" USING btree ("environment_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_environment_id_idx" ON "auth"."webhook_deliveries" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_attempts_environment_id_idx" ON "auth"."webhook_delivery_attempts" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_environment_id_idx" ON "auth"."webhook_endpoints" USING btree ("environment_id");--> statement-breakpoint
CREATE POLICY "audit_logs_tenant_isolation" ON "auth"."audit_logs" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "audit_logs_retention_floor" ON "auth"."audit_logs" AS RESTRICTIVE FOR DELETE TO public USING (occurred_at < now() - interval '1 day');--> statement-breakpoint
CREATE POLICY "backup_codes_tenant_isolation" ON "auth"."backup_codes" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "credentials_tenant_isolation" ON "auth"."credentials" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "environment_settings_tenant_isolation" ON "auth"."environment_settings" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "events_tenant_isolation" ON "auth"."events" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "events_retention_floor" ON "auth"."events" AS RESTRICTIVE FOR DELETE TO public USING (delivered_at is not null and occurred_at < now() - interval '1 day');--> statement-breakpoint
CREATE POLICY "flow_attempts_tenant_isolation" ON "auth"."flow_attempts" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "hook_call_counts_tenant_isolation" ON "auth"."hook_call_counts" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "hooks_tenant_isolation" ON "auth"."hooks" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "identities_tenant_isolation" ON "auth"."identities" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "native_apps_tenant_isolation" ON "auth"."native_apps" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "oauth_providers_tenant_isolation" ON "auth"."oauth_providers" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "passkey_challenges_tenant_isolation" ON "auth"."passkey_challenges" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "passkeys_tenant_isolation" ON "auth"."passkeys" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "password_history_tenant_isolation" ON "auth"."password_history" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "proposals_tenant_isolation" ON "auth"."proposals" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "refresh_tokens_tenant_isolation" ON "auth"."refresh_tokens" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "sessions_tenant_isolation" ON "auth"."sessions" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "signing_keys_tenant_isolation" ON "auth"."signing_keys" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "sms_code_counts_tenant_isolation" ON "auth"."sms_code_counts" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "sms_code_counts_retention_floor" ON "auth"."sms_code_counts" AS RESTRICTIVE FOR DELETE TO public USING (day < (now() at time zone 'utc')::date - 7);--> statement-breakpoint
CREATE POLICY "user_factors_tenant_isolation" ON "auth"."user_factors" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "users_tenant_isolation" ON "auth"."users" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "verification_tokens_tenant_isolation" ON "auth"."verification_tokens" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "webhook_deliveries_tenant_isolation" ON "auth"."webhook_deliveries" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "webhook_deliveries_retention_floor" ON "auth"."webhook_deliveries" AS RESTRICTIVE FOR DELETE TO public USING (state <> 'pending' and created_at < now() - interval '7 days');--> statement-breakpoint
CREATE POLICY "webhook_delivery_attempts_tenant_isolation" ON "auth"."webhook_delivery_attempts" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "webhook_endpoints_tenant_isolation" ON "auth"."webhook_endpoints" AS PERMISSIVE FOR ALL TO public USING (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid) WITH CHECK (environment_id = nullif(current_setting('tula.environment_id', true), '')::uuid);
--> statement-breakpoint
-- Everything below is written by hand: drizzle-kit cannot declare any of it. It is the end state
-- of what tula-auth's migrations 0001 to 0034 added by hand, with `tula` renamed `auth` and its
-- runtime role `tula_app` renamed `closeline_auth` (ADR 0005). Order is not significant except
-- that FORCE comes after the tables and the grants after the REVOKE.
--
-- FORCE ROW LEVEL SECURITY binds the table owner too, so a connection as `closeline_owner` still
-- cannot read across environments. Every table with `environment_id` is listed except `api_keys`,
-- which is deliberately outside row-level security (resolving a key is what determines the
-- environment). No auth table has `organization_id`: users are global within a Region.
ALTER TABLE "auth"."audit_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."credentials" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."environment_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."flow_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."hook_call_counts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."hooks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."identities" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."native_apps" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."oauth_providers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."passkey_challenges" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."passkeys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."password_history" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."proposals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."signing_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."sms_code_counts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."user_factors" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."users" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."verification_tokens" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."webhook_deliveries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."webhook_delivery_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth"."webhook_endpoints" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- A user has one password-history row at a position. A constraint, and DEFERRABLE, on purpose: a
-- password change moves every row of a user one place back in one statement
-- (`position = position + 1`), which a plain unique index (checked row by row) would refuse.
-- INITIALLY IMMEDIATE keeps the check at the statement's end, not the transaction's.
ALTER TABLE "auth"."password_history" ADD CONSTRAINT "password_history_user_position_unique" UNIQUE ("user_id", "position") DEFERRABLE INITIALLY IMMEDIATE;
--> statement-breakpoint
-- Device binding: `sessions.device_thumbprint` is written when a session is created and never
-- again. The runtime role holds UPDATE on the whole table and a column cannot be taken out of a
-- table-level grant, so the rule is a trigger that refuses every UPDATE changing the column.
CREATE FUNCTION "auth"."sessions_device_thumbprint_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."device_thumbprint" IS DISTINCT FROM OLD."device_thumbprint" THEN
    RAISE EXCEPTION 'sessions.device_thumbprint is fixed when the session is created'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sessions_device_thumbprint_immutable"
  BEFORE UPDATE OF "device_thumbprint" ON "auth"."sessions"
  FOR EACH ROW EXECUTE FUNCTION "auth"."sessions_device_thumbprint_immutable"();
--> statement-breakpoint
-- `GET /v1/instance/diagnostics` answers "is this database migrated to what this image ships?".
-- The service role has no access to the `drizzle` schema and keeps none: this function, owned by
-- the owner role, answers the one thing the service needs (when each applied migration was
-- generated) and nothing else from that schema. A fixed search path, because a SECURITY DEFINER
-- function must not resolve names through the caller's. The history is the whole database's, not
-- the auth schema's: the caller must compare only the migrations that are its own.
CREATE FUNCTION "auth"."applied_migrations"() RETURNS TABLE (created_at bigint)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog
  AS $$ SELECT m.created_at FROM drizzle.__drizzle_migrations m ORDER BY m.created_at $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "auth"."applied_migrations"() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "auth"."applied_migrations"() TO closeline_auth;
--> statement-breakpoint
-- Least privilege for the service role (tula-auth migration 0003 and every grant after it).
--
-- Migration 0000's default privileges gave `closeline_auth` SELECT, INSERT, UPDATE and DELETE on
-- every table created here. Take them back, then grant each table exactly what the code path
-- that uses it needs. Why this matters: foreign-key cascades run as the table owner, so row-level
-- security cannot stop a runtime `DELETE FROM auth.workspaces` from wiping every environment's
-- data. Destructive control-plane operations belong to admin tooling running as the owner.
REVOKE ALL ON ALL TABLES IN SCHEMA "auth" FROM closeline_auth;
--> statement-breakpoint
-- Control plane: read, create, update. API keys are revoked via revoked_at, not deleted, and an
-- environment's settings are replaced, never removed (the row goes with its environment).
GRANT SELECT, INSERT, UPDATE ON "auth"."workspaces", "auth"."projects", "auth"."environments", "auth"."api_keys", "auth"."environment_settings" TO closeline_auth;
--> statement-breakpoint
-- Tenant data: full CRUD, always scoped by row-level security to one environment.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "auth"."users", "auth"."identities", "auth"."credentials", "auth"."sessions",
  "auth"."refresh_tokens", "auth"."signing_keys", "auth"."flow_attempts",
  "auth"."verification_tokens", "auth"."user_factors", "auth"."backup_codes",
  "auth"."oauth_providers", "auth"."passkeys", "auth"."passkey_challenges",
  "auth"."webhook_endpoints"
TO closeline_auth;
--> statement-breakpoint
-- Audit logs are append-only plus the retention job's delete. No UPDATE, so an entry cannot be
-- changed or backdated past `audit_logs_retention_floor` (no entry younger than one day goes).
-- `instance_audit_logs` has no row-level security: it records the operator's actions outside any
-- one environment.
GRANT SELECT, INSERT, DELETE ON "auth"."audit_logs", "auth"."instance_audit_logs" TO closeline_auth;
--> statement-breakpoint
-- Outbox: append, mark delivered (the one column it may update), and the retention job's delete,
-- which `events_retention_floor` bounds to settled events older than a day.
GRANT SELECT, INSERT, DELETE ON "auth"."events" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("delivered_at") ON "auth"."events" TO closeline_auth;
--> statement-breakpoint
-- Webhook deliveries move (pending, then delivered or given up), so UPDATE is by column: where a
-- delivery stands and nothing else. DELETE is bounded by `webhook_deliveries_retention_floor`.
GRANT SELECT, INSERT, DELETE ON "auth"."webhook_deliveries" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("state", "attempts", "next_attempt_at", "last_attempt_at", "status_code", "failure_reason", "completed_at", "updated_at") ON "auth"."webhook_deliveries" TO closeline_auth;
--> statement-breakpoint
-- The log of what was tried cannot be rewritten: no UPDATE, no DELETE. A row goes only with its
-- delivery, by cascade.
GRANT SELECT, INSERT ON "auth"."webhook_delivery_attempts" TO closeline_auth;
--> statement-breakpoint
-- Hooks: an administrator registers and removes one. UPDATE is by column, exactly what the API
-- changes; the sealed `secret`, `point` and the tenant columns cannot be rewritten.
GRANT SELECT, INSERT, DELETE ON "auth"."hooks" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("url", "enabled", "deadline_ms", "failure_mode", "last_failed_at", "last_failure_reason", "updated_at") ON "auth"."hooks" TO closeline_auth;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "auth"."hook_call_counts" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("calls", "last_at", "updated_at") ON "auth"."hook_call_counts" TO closeline_auth;
--> statement-breakpoint
-- Texted-code counts: the two counters and `updated_at` only, so a row cannot be moved to another
-- day (past `sms_code_counts_retention_floor`), prefix or environment.
GRANT SELECT, INSERT, DELETE ON "auth"."sms_code_counts" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("sent", "used", "updated_at") ON "auth"."sms_code_counts" TO closeline_auth;
--> statement-breakpoint
-- Previous password hashes: a change moves each row one place back, and that is all it changes.
-- A hash, its user or its environment cannot be rewritten.
GRANT SELECT, INSERT, DELETE ON "auth"."password_history" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("position", "updated_at") ON "auth"."password_history" TO closeline_auth;
--> statement-breakpoint
-- Native apps: what the API changes (a team, fingerprints, link paths), never what the app is
-- (`platform`, `identifier`).
GRANT SELECT, INSERT, DELETE ON "auth"."native_apps" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("team_id", "sha256_cert_fingerprints", "app_link_paths", "updated_at") ON "auth"."native_apps" TO closeline_auth;
--> statement-breakpoint
-- Proposals: only the columns that record the decision and its outcome, so what a human approves
-- is what was proposed. Never widen this to the operation, target, proposer or expiry.
GRANT SELECT, INSERT, DELETE ON "auth"."proposals" TO closeline_auth;
--> statement-breakpoint
GRANT UPDATE ("status", "approved_by_type", "approved_by_id", "approved_at", "failure_reason", "updated_at") ON "auth"."proposals" TO closeline_auth;
