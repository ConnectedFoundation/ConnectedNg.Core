/**
 * Route pattern builder for navigation and URL generation.
 *
 * @example
 * const editRoute = routePattern("edit/:id");
 * editRoute.pattern // "edit/:id"
 * editRoute.build({ id: 1005 }) // "edit/1005"
 * editRoute.build({ id: 1005, mode: 'view' }) // "edit/1005" (extra params ignored)
 *
 * @example
 * const nestedRoute = routePattern("users/:userId/posts/:postId");
 * nestedRoute.build({ userId: 42, postId: 123 }) // "users/42/posts/123"
 */
export interface RoutePattern {
    /** The original pattern string with parameter placeholders */
    readonly pattern: string;

    /** Build a concrete path by replacing parameters with actual values */
    build(params: Record<string, string | number>): string;

    /** Return the pattern string (for use as navigation key) */
    toString(): string;
}

/**
 * Create a route pattern that can generate concrete paths from parameters.
 * Parameters in the pattern are denoted with :paramName syntax.
 *
 * @param pattern - Route pattern string with :paramName placeholders
 * @returns RoutePattern object with build() method
 *
 * @throws Error if required parameters are missing when build() is called
 */
export function routePattern(pattern: string): RoutePattern {
    return {
        pattern,

        build(params: Record<string, string | number>): string {
            return pattern.replace(/:(\w+)/g, (match, key) => {
                const value = params[key];
                if (value === undefined || value === null) {
                    throw new Error(`Missing required parameter for route pattern "${pattern}": ${key}`);
                }
                return String(value);
            });
        },

        toString(): string {
            return pattern;
        }
    };
}
