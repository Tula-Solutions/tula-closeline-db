import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { dropStaleTestObjects, integrationEnv, migrateUp } from './integration-support'

// Needs Postgres with docker/postgres/init.sql applied; run with `bun run test:integration`.
const env = integrationEnv()
const SETTING = 'app.organization_id'
const FUNCTION = 'core.inquiry_embed_for_key_hash(text)'
const newId = (prefix: string): string => `${prefix}_${randomBytes(16).toString('hex')}`
const newHash = (): string => createHash('sha256').update(randomBytes(32)).digest('hex')
const newKey = (): string => randomBytes(32).toString('base64url')

describe('core.inquiry_embeds and core.inquiry_embed_for_key_hash', () => {
  let owner: Pool
  let core: Pool
  let voice: Pool
  const orgs: string[] = []

  /** Run `fn` in one transaction, as `pool`'s role, scoped to `orgId` when given. */
  async function scoped<T>(
    pool: Pool,
    orgId: string | null,
    fn: (c: PoolClient) => Promise<T>
  ): Promise<T> {
    const c = await pool.connect()
    try {
      await c.query('begin')
      if (orgId) {
        await c.query('select set_config($1, $2, true)', [SETTING, orgId])
      }
      const result = await fn(c)
      await c.query('commit')
      return result
    } catch (error) {
      await c.query('rollback').catch(() => undefined)
      throw error
    } finally {
      c.release()
    }
  }

  /** An Organization with an embed; returns its id and key hash. */
  async function seed(origins = ['https://a.example.test'], version = 1, withWording = true) {
    const orgId = newId('org')
    const hash = newHash()
    const wordingId = newId('cwd')
    orgs.push(orgId)
    await scoped(core, orgId, async (c) => {
      await c.query(
        'insert into core.organizations (organization_id, name, region) values ($1, $2, $3)',
        [orgId, 'Org', 'us']
      )
      await c.query(
        "insert into core.memberships (id, organization_id, user_id, role, email) values ($1, $2, $3, 'owner', 'o@example.test')",
        [newId('mem'), orgId, newId('usr')]
      )
      await c.query(
        "insert into core.consent_wording (id, organization_id, version, text, channels, created_by_user_id) values ($1, $2, 1, 'Wording', array['phone'], $3)",
        [wordingId, orgId, newId('usr')]
      )
      await c.query(
        `insert into core.inquiry_embeds (organization_id, publishable_key, publishable_key_hash,
           allowed_origins, consent_wording_id, consent_wording_version, consent_wording_text)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orgId,
          newKey(),
          hash,
          origins,
          withWording ? wordingId : null,
          withWording ? version : null,
          withWording ? `Wording ${version}` : null,
        ]
      )
    })
    return { orgId, hash, wordingId }
  }

  const lookup = async (hash: unknown) =>
    (await core.query('select * from core.inquiry_embed_for_key_hash($1)', [hash])).rows

  beforeAll(async () => {
    await migrateUp(env.owner)
    owner = new Pool({ connectionString: env.owner, max: 2 })
    core = new Pool({ connectionString: env.core, max: 4 })
    voice = new Pool({ connectionString: env.voice, max: 1 })
  })

  afterAll(async () => {
    for (const orgId of orgs) {
      await scoped(owner, orgId, (c) =>
        c.query('delete from core.organizations where organization_id = $1', [orgId])
      ).catch(() => undefined)
    }
    await dropStaleTestObjects(owner, env.owner)
    await Promise.all([owner.end(), core.end(), voice.end()])
  })

  test('a second Organization cannot read, change or take over an embed', async () => {
    const a = await seed()
    const b = await seed(['https://b.example.test'])
    const none = await scoped(core, null, (c) => c.query('select * from core.inquiry_embeds'))
    expect(none.rows).toEqual([])
    const seen = await scoped(core, b.orgId, async (c) =>
      (await c.query('select organization_id from core.inquiry_embeds')).rows.map(
        (r) => r.organization_id
      )
    )
    expect(seen).toEqual([b.orgId])
    const updated = await scoped(core, b.orgId, (c) =>
      c.query(
        "update core.inquiry_embeds set consent_wording_text = 'x' where organization_id = $1",
        [a.orgId]
      )
    )
    expect(updated.rowCount).toBe(0)
    await expect(
      scoped(core, b.orgId, (c) =>
        c.query(
          `insert into core.inquiry_embeds (organization_id, publishable_key, publishable_key_hash,
             allowed_origins) values ($1, $2, $3, '{}')`,
          [a.orgId, newKey(), newHash()]
        )
      )
    ).rejects.toThrow('row-level security')
    await expect(
      scoped(voice, a.orgId, (c) => c.query('select * from core.inquiry_embeds'))
    ).rejects.toThrow('permission denied')
  })

  test('the lookup finds one embed by hash with no Organization set, and only four columns', async () => {
    const a = await seed(['https://a.example.test', 'https://www.a.example.test'], 3)
    const b = await seed()
    const r = await core.query('select * from core.inquiry_embed_for_key_hash($1)', [a.hash])
    expect(r.fields.map((f) => f.name)).toEqual([
      'organization_id',
      'allowed_origins',
      'consent_wording_version',
      'consent_wording_text',
    ])
    expect(r.rows).toEqual([
      {
        organization_id: a.orgId,
        allowed_origins: ['https://a.example.test', 'https://www.a.example.test'],
        consent_wording_version: 3,
        consent_wording_text: 'Wording 3',
      },
    ])
    expect((await lookup(b.hash)).map((x) => x.organization_id)).toEqual([b.orgId])
    const fromOther = await scoped(
      core,
      b.orgId,
      async (c) =>
        (await c.query('select * from core.inquiry_embed_for_key_hash($1)', [a.hash])).rows
    )
    expect(fromOther).toHaveLength(1)
  })

  test('unknown, malformed and null hashes give no row', async () => {
    const a = await seed()
    expect(await lookup(newHash())).toEqual([])
    expect(await lookup('nope')).toEqual([])
    expect(await lookup(a.hash.toUpperCase())).toEqual([])
    expect(await lookup(null)).toEqual([])
    expect(await lookup(a.hash)).toHaveLength(1)
  })

  test('an embed with no origin or no wording yet is not live: the lookup gives no row', async () => {
    const noWording = await seed(['https://a.example.test'], 1, false)
    const noOrigin = await seed([])
    expect(await lookup(noWording.hash)).toEqual([])
    expect(await lookup(noOrigin.hash)).toEqual([])
    await expect(
      scoped(owner, noWording.orgId, (c) =>
        c.query(
          "update core.inquiry_embeds set consent_wording_text = 'x' where organization_id = $1",
          [noWording.orgId]
        )
      )
    ).rejects.toThrow('inquiry_embeds_wording_all_or_none')
  })

  test('the key hash is unique and the origins are bounded', async () => {
    const a = await seed()
    const b = await seed()
    await expect(
      scoped(owner, b.orgId, (c) =>
        c.query(
          'update core.inquiry_embeds set publishable_key_hash = $1 where organization_id = $2',
          [a.hash, b.orgId]
        )
      )
    ).rejects.toThrow('inquiry_embeds_key_hash_key')
    await expect(
      scoped(owner, a.orgId, (c) =>
        c.query(
          `update core.inquiry_embeds set allowed_origins = array_fill('https://x.test'::text, array[21])
            where organization_id = $1`,
          [a.orgId]
        )
      )
    ).rejects.toThrow('inquiry_embeds_origins_bounds')
  })

  test('is a pinned definer owned by the key-lookup role, executable by core alone', async () => {
    const fn = await owner.query(
      `select p.proowner::regrole::text as owner, p.prosecdef, p.provolatile, p.proconfig
         from pg_proc p where p.oid = to_regprocedure('${FUNCTION}')`
    )
    expect(fn.rows).toEqual([
      {
        owner: 'closeline_core_key_lookup',
        prosecdef: true,
        provolatile: 's',
        proconfig: ['search_path=pg_catalog, pg_temp'],
      },
    ])
    const execute = await owner.query(
      `select r.rolname from pg_roles r
        where r.rolname like 'closeline\\_%'
          and has_function_privilege(r.oid, to_regprocedure('${FUNCTION}'), 'EXECUTE')`
    )
    expect(
      execute.rows
        .map((r) => r.rolname)
        .filter((r) => !['closeline_owner', 'closeline_core_key_lookup'].includes(r))
    ).toEqual(['closeline_core'])
  })
})
