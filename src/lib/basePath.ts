/**
 * Base path configuration for the application
 * This ensures all routes work correctly when deployed to a subdirectory
 */
export const BASE_PATH = '/nanoaicanvas'

/**
 * Get the full path by prepending the base path
 * @param path - The path to prepend base path to (e.g., '/admin' → '/nanoaicanvas/admin')
 */
export function getFullPath(path: string): string {
  if (path.startsWith(BASE_PATH)) return path
  if (path.startsWith('/')) return `${BASE_PATH}${path}`
  return `${BASE_PATH}/${path}`
}
