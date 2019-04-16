/**
 * Magic..
 */
export const ClassMixin = function factory<T, A>(X: new () => T): new () => T {
	const base: new () => {} = X
	const C = class extends base {}
	return C as any
}
