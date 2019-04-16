import { ClassMixin } from '../../Utils/ClassMixin'
import { HasRelationships } from './HasRelationships'

export class HasTimestamps extends ClassMixin(HasRelationships) {
	/**
	 * Indicates if the model should be timestamped.
	 */
	timestamps: boolean = true
}
