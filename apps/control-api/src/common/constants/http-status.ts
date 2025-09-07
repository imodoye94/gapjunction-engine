/**
 * HTTP Status Code Constants
 * Used to avoid magic numbers in the codebase
 */

export const HTTP_STATUS = {
  // Success
  ok: 200,
  created: 201,
  accepted: 202,
  noContent: 204,

  // Client Errors
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  conflict: 409,
  unprocessableEntity: 422,

  // Server Errors
  internalServerError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504,
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];