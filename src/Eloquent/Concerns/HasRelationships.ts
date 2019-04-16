import { HasGlobalScopes } from './HasGlobalScopes'

export abstract class HasRelationships<T> extends HasGlobalScopes<T> {
	/**
	 * The loaded relationships for the model.
	 */
	protected relations = []
}
