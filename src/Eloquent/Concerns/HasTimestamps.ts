import { HasRelationships } from './HasRelationships'

export abstract class HasTimestamps<T> extends HasRelationships<T> {
	/**
	 * Indicates if the model should be timestamped.
	 */
	timestamps: boolean = true
}
