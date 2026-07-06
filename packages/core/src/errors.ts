/** Thrown when an id doesn't resolve. The server maps this to HTTP 404. */
export class NotFoundError extends Error {
  constructor(
    public readonly entity: string,
    public readonly id: string,
  ) {
    super(`${entity} not found: ${id}`)
    this.name = 'NotFoundError'
  }
}
