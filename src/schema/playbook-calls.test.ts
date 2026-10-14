import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { CALL_ROW_FIELDS, CALL_STATEMENTS } from '../playbook-call-statements'
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
  CALL_MEDIA_TYPES,
  CALL_PURGE_MAX_ATTEMPTS,
  CALL_REP_BY,
  CALL_SPEAKER_LABEL_MAX_BYTES,
  CALL_SPEAKER_LABEL_MAX_LENGTH,
  CALL_STATES,
  callJobs,
  callReuploadRequeues,
  calls,
  repChangeAllowed,
} from './playbook-calls'
import { WORK_KINDS } from './playbook-work-hints'

const migration = readFileSync(
  new URL('../../migrations/0016_playbook_calls.sql', import.meta.url),
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
