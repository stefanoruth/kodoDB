import { Builder } from './Builder'
// import { Model } from './Model'

export interface Scope {
	/**
	 * Apply the scope to a given Eloquent query builder.
	 */
	apply(builder: Builder, model: any): void
}
