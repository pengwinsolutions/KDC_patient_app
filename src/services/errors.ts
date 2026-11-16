/**
 * A failed service call. `message` is safe to show the patient (the server's own words
 * when it gave them); `field` names the form field the server pinned the problem to.
 */
export type ServiceErrorCode =
  | 'invalid'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'too_large'
  | 'unsupported'
  | 'rate_limited'
  | 'unavailable'
  | 'session_ended'
  | 'cancelled'

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public field?: string,
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

/** The message to show for anything a service call threw. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return e instanceof ServiceError ? e.message : fallback
}
