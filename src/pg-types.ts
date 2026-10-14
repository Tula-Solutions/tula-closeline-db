import { types } from 'pg'

/** The Postgres type id of `date`. */
const DATE_OID = 1082

/**
 * node-postgres type parsers for a pool: a `date` stays the text Postgres sends (`YYYY-MM-DD`)
 * instead of becoming a JavaScript `Date` at local midnight, which shifts a calendar date by a day
 * in a process whose time zone is behind UTC. Every other type keeps the driver's own parser.
 * `createDb` passes it; a pool made by hand for these statements should too (`new Pool({ types })`).
 */
export const DB_TYPES = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
    oid === DATE_OID
      ? (value: string) => value
      : types.getTypeParser(oid, format as 'text')) as typeof types.getTypeParser,
}
