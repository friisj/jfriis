/**
 * WebAuthn Relying Party Configuration
 *
 * The RP ID must match the domain the browser sees.
 * Origin must include the scheme and port.
 */

export const rpName = 'Jon Friis'

export const rpID =
  process.env.NODE_ENV === 'production' ? 'jonfriis.com' : 'localhost'

export const origin =
  process.env.NODE_ENV === 'production'
    ? 'https://jonfriis.com'
    : 'http://localhost:3000'
