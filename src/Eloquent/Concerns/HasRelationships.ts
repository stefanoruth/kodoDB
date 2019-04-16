import { ClassMixin } from '../../Utils/ClassMixin'
import { HasGlobalScopes } from './HasGlobalScopes'

export class HasRelationships extends ClassMixin(HasGlobalScopes) {
	/**
	 * The loaded relationships for the model.
	 */
	protected relations = []
}
