/**
 * Return the default value of the given value.
 */
export function value(data: any): any {
	return typeof data === 'function' ? data() : value
}
