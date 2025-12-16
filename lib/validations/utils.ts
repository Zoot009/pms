import { z } from 'zod'

/**
 * Utility function to validate request body against a schema
 * Returns validated data or throws an error
 */
export async function validateRequest<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      )
    }
    throw error
  }
}

/**
 * Utility to validate search params
 */
export function validateSearchParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}

/**
 * Safe parse with custom error handling
 */
export function safeValidate<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const errorMessages = result.error.issues
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ')
  
  return { success: false, error: errorMessages }
}
