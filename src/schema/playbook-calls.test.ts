import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import {
  CALL_ROW_FIELDS,
  CALL_STATEMENTS,
  type CallJobClaimRow,
  claimedCallJobs,
} from '../playbook-call-statements'
import {
  CALL_CHANNELS,
  CALL_FAILURE_REASONS,
  CALL_JOB_KINDS,
  CALL_JOB_MAX_ATTEMPTS,
  CALL_JOB_STATES,
  CALL_KINDS,
  CALL_MAX_RECORDING_BYTES,
  CALL_MAX_RECORDING_SECONDS,
  CALL_MAX_SEQ,
  CALL_MAX_SPEAKERS,
  CALL_MAX_TRANSCRIPT_BYTES,
  CALL_MAX_VENDOR_SENDS,
  CALL_MEDIA_TYPES,
  CALL_PURGE_MAX_ATTEMPTS,
  CALL_REP_BY,
  CALL_SPEAKER_LABEL_MAX_BYTES,
  CALL_SPEAKER_LABEL_MAX_LENGTH,
  CALL_STATES,
  CALL_VENDOR_ID_PATTERN,
  callJobs,
  callReuploadRequeues,
  calls,
  callVendorSends,
  repChangeAllowed,
} from './playbook-calls'
import { WORK_KINDS } from './playbook-work-hints'

const migration = readFileSync(
  new URL('../../migrations/0016_playbook_calls.sql', import.meta.url),
  'utf8'
)

const vendorMigration = readFileSync(
  new URL('../../migrations/0018_call_vendor_sends.sql', import.meta.url),
  'utf8'
)

describe('the Call values mirror the contract at v0.8.0', () => {
  test('states, reasons, kinds, media types, channels and the Rep discriminator', () => {
    expect(CALL_STATES).toEqual([
      'uploaded',
      'transcribing',
      'awaiting_rep',
      'processing',
      'ready',
      'failed',
      'deleted',
    ])
    expect(CALL_FAILURE_REASONS).toEqual([
      'no_turns',
      'too_few_speakers',
      'too_many_speakers',
      'rep_label_not_found',
      'not_per_side',
      'too_long',
      'transcription_failed',
      'transcription_timed_out',
      'unreadable',
      'processing_failed',
    ])
    expect(CALL_KINDS).toEqual(['transcript', 'recording'])
    expect(CALL_MEDIA_TYPES).toEqual([
      'text/plain',
      'text/vtt',
      'application/x-subrip',
      'application/json',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/flac',
    ])
    expect(CALL_CHANNELS).toEqual(['left', 'right'])
    expect(CALL_REP_BY).toEqual(['speaker', 'channel'])
  })

  test('the numbers', () => {
    expect(CALL_MAX_TRANSCRIPT_BYTES).toBe(5 * 1024 * 1024)
    expect(CALL_MAX_RECORDING_BYTES).toBe(500 * 1024 * 1024)
    expect(CALL_MAX_RECORDING_SECONDS).toBe(10_800)
    expect(CALL_MAX_SPEAKERS).toBe(20)
    expect(CALL_SPEAKER_LABEL_MAX_LENGTH).toBe(64)
    expect(CALL_SPEAKER_LABEL_MAX_BYTES).toBe(64 * 4)
    expect(CALL_MAX_SEQ).toBe(2_147_483_647)
    expect(CALL_PURGE_MAX_ATTEMPTS).toBe(20)
    expect(CALL_JOB_MAX_ATTEMPTS).toBe(20)
  })

  test('repChangeAllowed is the contract’s rule for every state and reason', () => {
    for (const state of CALL_STATES) {
      for (const reason of [null, ...CALL_FAILURE_REASONS]) {
        const expected =
          state === 'ready' ||
          state === 'awaiting_rep' ||
          (state === 'failed' && (reason === 'rep_label_not_found' || reason === 'not_per_side'))
        expect(repChangeAllowed(state, reason)).toBe(expected)
      }
    }
  })

  test('callReuploadRequeues is the contract’s rule: only the three transient reasons', () => {
    expect(callReuploadRequeues(null)).toBe(false)
    for (const reason of CALL_FAILURE_REASONS) {
      expect(callReuploadRequeues(reason)).toBe(
        ['transcription_failed', 'transcription_timed_out', 'processing_failed'].includes(reason)
      )
    }
  })

  test('the SQL applies the same two rules as the functions', () => {
    const rep = CALL_STATEMENTS.CALL_SET_REP
    expect(rep).toContain("cur.state in ('ready', 'awaiting_rep')")
    expect(rep).toContain(
      "cur.state = 'failed' and cur.failure_reason in ('rep_label_not_found', 'not_per_side')"
    )
    expect(CALL_STATEMENTS.CALL_REQUEUE).toContain(
      "failure_reason in ('transcription_failed', 'transcription_timed_out', 'processing_failed')"
    )
  })
})

describe('the Call tables', () => {
  test('the table checks carry the contract’s invariants', () => {
    const names = getTableConfig(calls).checks.map((c) => c.name)
    for (const name of [
      'calls_failed_has_reason',
      'calls_awaiting_rep_has_none',
      'calls_ready_has_rep',
      'calls_ready_label_listed',
      'calls_transcript_has_rep',
      'calls_vendor_send_seq_matches',
      'calls_transcript_states',
      'calls_kind_matches_media_type',
      'calls_speaker_labels_valid',
      'calls_too_many_speakers_lists_none',
      'calls_deleted_has_times',
      'calls_duration_bounds',
      'calls_size_bounds',
    ]) {
      expect(names).toContain(name)
    }
  })

  test('the speaker label function enforces the cap, uniqueness and size in the migration', () => {
    expect(migration).toContain('cardinality(p_labels) <= 20')
    expect(migration).toContain('count(DISTINCT l)')
    expect(migration).toContain('octet_length(l) > 256')
  })

  test('the role deletes only a Call whose purge has started, and a null Rep choice is invalid', () => {
    expect(migration).toContain(
      `CREATE POLICY "calls_deleted_only" ON "playbook"."calls" AS RESTRICTIVE FOR DELETE TO PUBLIC USING ("state" = 'deleted' AND "purge_started_at" IS NOT NULL)`
    )
    expect(CALL_STATEMENTS.CALL_SET_REP).toContain(
      "when $3::text is null or $3::text not in ('speaker', 'channel') then 'invalid'"
    )
  })

  test('every send to the vendor needs its own confirmation', () => {
    const sent = CALL_STATEMENTS.CALL_SENT_TO_VENDOR
    expect(sent).toContain('vendor_send_seq = c.vendor_send_seq + 1')
    expect(sent).toContain('vendor_removed_at = null')
    expect(sent).not.toContain('coalesce')
    expect(CALL_STATEMENTS.CALL_VENDOR_REMOVED).toContain('vendor_send_seq = $3::int')
  })

  test('a cancelled job with a live lease holds back the vendor confirmation and the purge', () => {
    const live = "j.state in ('cancelled', 'running') and j.next_attempt_at > clock_timestamp()"
    expect(CALL_STATEMENTS.CALL_VENDOR_REMOVED).toContain(live)
    expect(CALL_STATEMENTS.CALL_PURGE_COMPLETE).toContain(
      "jl.state in ('running', 'cancelled') and jl.next_attempt_at > clock_timestamp()"
    )
  })

  test('a Deal’s Calls in one state have an index with the Deal before the state', () => {
    expect(getTableConfig(calls).indexes.map((i) => i.config.name)).toContain(
      'calls_deal_state_list_idx'
    )
  })

  test('a completion locks the Deal row for no key update and reads the sequence from it', () => {
    const text = CALL_STATEMENTS.CALL_JOB_COMPLETE
    expect(text).toMatch(/^with dk as \(\n[\s\S]*for no key update\),\nj as/)
    expect(text).toContain('least($4::int, dk.outcome_seq)')
    expect(text).toContain('c.tagged_outcome_seq < dk.outcome_seq')
    expect(CALL_STATEMENTS.DEAL_RETAG_LOCK).toContain('for no key update')
  })

  test('the vendor sends: a bounded table keyed by Call and sequence, with one unique Organization-scoped index on the id', () => {
    const config = getTableConfig(callVendorSends)
    expect(CALL_MAX_VENDOR_SENDS).toBe(20)
    expect(config.indexes.map((i) => i.config.name)).toEqual([
      'call_vendor_sends_org_vendor_id_key',
    ])
    const index = config.indexes[0]?.config
    expect(index?.unique).toBe(true)
    expect(index?.columns.map((c) => ('name' in c ? c.name : ''))).toEqual([
      'organization_id',
      'vendor_id',
    ])
    expect(index?.where).toBeDefined()
    expect(config.primaryKeys[0]?.columns.map((c) => c.name)).toEqual([
      'organization_id',
      'call_id',
      'seq',
    ])
    expect(config.checks.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'call_vendor_sends_organization_not_global',
        'call_vendor_sends_seq_bounds',
        'call_vendor_sends_vendor_id_shape',
      ])
    )
    expect(vendorMigration).toContain('REVOKE UPDATE, DELETE ON "playbook"."call_vendor_sends"')
    expect(vendorMigration).toContain('GRANT UPDATE ("vendor_id", "recorded_at")')
    expect(vendorMigration).toContain("CONSTRAINT = 'call_vendor_sends_identity'")
    expect(vendorMigration).toContain('FORCE ROW LEVEL SECURITY')
    // The migration refuses on a Call past 20 sends, before anything else, and never caps silently.
    expect(vendorMigration.indexOf('RAISE EXCEPTION')).toBeGreaterThan(-1)
    expect(vendorMigration.indexOf('RAISE EXCEPTION')).toBeLessThan(
      vendorMigration.indexOf('CREATE TABLE')
    )
    expect(vendorMigration).toContain('"vendor_send_seq" > 20')
    expect(vendorMigration.indexOf('"calls" NO FORCE ROW LEVEL SECURITY')).toBeLessThan(
      vendorMigration.indexOf('RAISE EXCEPTION')
    )
    expect(vendorMigration.lastIndexOf('"calls" FORCE ROW LEVEL SECURITY')).toBeGreaterThan(
      vendorMigration.indexOf('INSERT INTO "playbook"."call_vendor_sends"')
    )
    expect(CALL_STATEMENTS.CALL_REQUEUE).toContain(`vendor_send_seq < ${CALL_MAX_VENDOR_SENDS}`)
    expect(vendorMigration).not.toMatch(/LEAST|UPDATE "playbook"\."calls"/)
  })

  test('the id statement refuses to overwrite and validates the shape inside the statement', () => {
    const text = CALL_STATEMENTS.CALL_VENDOR_ID_RECORD
    expect(text).toContain('cur.vendor_id is null')
    expect(text).toContain(`~ '${CALL_VENDOR_ID_PATTERN}'`)
    expect(text).toContain("'conflict'")
    expect(text).toContain('not exists (select 1 from taken)')
    expect(text).not.toContain('returning vendor_id')
    expect(CALL_STATEMENTS.CALL_SENT_TO_VENDOR).toContain('insert into playbook.call_vendor_sends')
    for (const name of [
      'CALL_PURGE_CLAIM',
      'CALL_ERASE_BATCH',
      'CALL_LIST_SPENT_PURGES',
    ] as const) {
      expect(CALL_STATEMENTS[name]).toContain('vendor_sends')
    }
  })

  test('the claim returns the job’s created_at and the Call’s content hash, and the signal row has them null', () => {
    const text = CALL_STATEMENTS.CALL_JOB_CLAIM
    expect(text).toContain('cl.job_created_at')
    expect(text).toContain('m.content_hash')
    expect(text).toContain('null::timestamptz')
    expect(text).toContain('null::bytea')
    const row: CallJobClaimRow = {
      id: 'cjob_1',
      call_id: 'call_1',
      job_kind: 'transcribe',
      epoch: 0,
      rep_seq: 0,
      attempts: 1,
      claim_token: 't',
      call_kind: 'recording',
      media_type: 'audio/mpeg',
      size_bytes: '1',
      object_key: 'k',
      transcript_key: null,
      rep_by: null,
      rep_label: null,
      rep_channel: null,
      speaker_labels: [],
      sent_to_vendor_at: null,
      job_created_at: new Date(0),
      content_hash: Buffer.alloc(32),
      cancelled: 0,
      lost: 0,
    }
    expect(claimedCallJobs([row]).jobs[0]?.content_hash?.length).toBe(32)
  })

  test('one active job per Call, and the job kinds and states', () => {
    expect(CALL_JOB_KINDS).toEqual(['transcribe', 'process', 'rebuild'])
    expect(CALL_JOB_STATES).toEqual(['queued', 'running', 'succeeded', 'failed', 'cancelled'])
    expect(getTableConfig(callJobs).indexes.map((i) => i.config.name)).toContain(
      'call_jobs_active_call_key'
    )
  })

  test('the Call work kinds are registered, each with a trigger and a discovery branch', () => {
    for (const kind of [
      'call_jobs',
      'call_purge',
      'call_cleanup',
      'call_purge_spent',
      'outcome_retag',
    ] as const) {
      expect(WORK_KINDS).toContain(kind)
      expect(migration).toContain(`p_kind = '${kind}'`)
      expect(migration).toContain(`'${kind}'`)
    }
    expect(migration).toContain('CREATE TRIGGER "calls_note_work"')
    expect(migration).toContain('CREATE TRIGGER "call_jobs_note_work_insert"')
    expect(migration).toContain('CREATE TRIGGER "deals_note_retag"')
    expect(migration).toContain('CREATE TRIGGER "calls_require_lock"')
  })

  test('the row fields are exactly the columns of CALL_GET, in order', () => {
    const text = CALL_STATEMENTS.CALL_GET
    const list = text.slice('select '.length, text.indexOf('\nfrom playbook.calls'))
    const parts: string[] = []
    let depth = 0
    let current = ''
    for (const ch of list) {
      if (ch === '(') {
        depth++
      }
      if (ch === ')') {
        depth--
      }
      if (ch === ',' && depth === 0) {
        parts.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    parts.push(current)
    const names = parts.map((p) => {
      const t = p.trim().replace(/\s+/g, ' ')
      const asMatch = / as (\w+)$/.exec(t)
      return asMatch ? asMatch[1] : (t.split('.').pop() as string)
    })
    expect(names).toEqual([...CALL_ROW_FIELDS])
  })
})
