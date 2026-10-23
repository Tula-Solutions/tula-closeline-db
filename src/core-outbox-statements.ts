/**
 * Write an event to the outbox, in the same transaction as the change it reports and in that
 * Organization's scope (`withOrganization`): `$1` the row id (`obx_` and 32 hex characters),
 * `$2` the Organization, `$3` the topic, `$4` the payload (a JSON object text, at most 16384
 * bytes; ids and facts, never a secret or a message body), `$5` the dedupe key (1 to 200
 * characters). A replay with the same Organization and dedupe key adds no second row and returns no
 * row; a new write returns the row's `id`. The columns not named take their defaults: due now,
 * unpublished, no attempts.
 */
export const OUTBOX_ENQUEUE = `insert into core.outbox (id, organization_id, topic, payload, dedupe_key)
values ($1, $2, $3, $4::jsonb, $5)
on conflict (organization_id, dedupe_key) do nothing
returning id`

/** One row of {@link OUTBOX_CLAIM}: an event to publish. */
export interface OutboxClaimRow extends Record<string, unknown> {
  /** The Organization the event belongs to (`org_` and 32 hex characters). */
  organization_id: string
  /** The outbox row (`obx_` and 32 hex characters). */
  id: string
  /** The event's topic. */
  topic: string
  /** The event's payload, a JSON object. */
  payload: Record<string, unknown>
  /** How many times the row has been claimed, this claim included (1 to 50). */
  attempts: number
}

/**
 * Claim due events for the drain, across every Organization: `$1` how many (1 to 100; fewer or null
 * gives none), `$2` the lease in milliseconds (raised to 1000, cut to 3600000). It calls
 * `core.outbox_claim`, a `SECURITY DEFINER` function, and takes unpublished rows whose
 * `available_at` has passed, oldest first, `for update skip locked`, so concurrent workers never
 * take the same row and never wait for each other. The claim counts the attempt and pushes
 * `available_at` out by the lease, so no transaction stays open while the worker publishes: a
 * worker that dies leaves its rows to be claimed again when the lease ends. A row claimed 50 times
 * is no longer returned and stays unpublished for an operator. Publishing is at-least-once. Run it
 * on the pooled handle, not inside `withOrganization`. Rows come back in no particular order.
 */
export const OUTBOX_CLAIM =
  'select organization_id, id, topic, payload, attempts from core.outbox_claim($1::integer, $2::integer)'

/**
 * Mark claimed events published: `$1` the Organization ids and `$2` the row ids, equal-length text
 * arrays of 1 to 100 pairs (anything else raises). Returns `published`, the number of rows
 * changed; a row already published or gone is skipped, so a repeat is harmless. Run it on the
 * pooled handle, after the queue accepted the events.
 */
export const OUTBOX_COMPLETE = 'select core.outbox_complete($1::text[], $2::text[]) as published'

/**
 * Record a failed publish of one claimed event: `$1` Organization, `$2` row id, `$3` an error code
 * (`[a-z][a-z0-9_.]*`, at most 64 characters; a code, never the error message), `$4` the delay
 * before the next claim in milliseconds (0 to 86400000; the caller adds its backoff and jitter).
 * Returns `recorded`: false when the row is already published or gone. A malformed argument raises.
 */
export const OUTBOX_FAIL =
  'select core.outbox_fail($1::text, $2::text, $3::text, $4::integer) as recorded'
