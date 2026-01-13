/**
 * Utility function to safely extract route parameters
 * Express req.params can be string | string[], this ensures we get a string
 */
export function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract and parse an ID parameter as an integer
 */
export function getIdParam(value: string | string[]): number {
  return parseInt(getParam(value), 10);
}
