import { ulid } from 'ulid'

/**
 * Every entity id in Beacon is a ULID: lexicographically sortable by creation
 * time, URL-safe, and collision-resistant without a central sequence.
 */
export function newId(): string {
  return ulid()
}
