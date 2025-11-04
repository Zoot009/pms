/**
 * Feature flags configuration
 * Control feature availability across the application
 */

export const featureFlags = {
  /**
   * Enable/disable public user signup
   * Set to 'true' to allow users to register themselves
   * Set to 'false' to restrict user creation to admin-only
   */
  enablePublicSignup: process.env.NEXT_PUBLIC_ENABLE_SIGNUP === 'true',
} as const

export type FeatureFlags = typeof featureFlags
