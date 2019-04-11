import { ConnectionResolverInterface } from '../Connections/ConnectionResolverInterface'
import { MassAssignmentException } from '../Exceptions'
import { GuardsAttributes } from './Concerns/GuardsAttributes'

class ModelComponent<Attributes = {}> implements GuardsAttributes {
	/**
	 * The connection name for the model.
	 */
	protected connection?: string

	/**
	 * The table associated with the model.
	 */
	protected table?: string

	/**
	 * The primary key for the model.
	 */
	protected primaryKey: string = 'id'

	/**
	 * The "type" of the auto-incrementing ID.
	 */
	protected keyType: string = 'int'

	/**
	 * Indicates if the IDs are auto-incrementing.
	 */
	incrementing: boolean = true

	/**
	 * The relations to eager load on every query.
	 */
	protected with: string[] = []

	/**
	 * The relationship counts that should be eager loaded on every query.
	 */
	protected withCount: string[] = []

	/**
	 * The number of models to return for pagination.
	 */
	protected perPage: number = 15

	/**
	 * Indicates if the model exists.
	 */
	exists: boolean = false

	/**
	 * Indicates if the model was inserted during the current request lifecycle.
	 */
	wasRecentlyCreated: boolean = false

	/**
	 * The connection resolver instance.
	 */
	protected static resolver: ConnectionResolverInterface

	/**
	 * The event dispatcher instance.
	 */
	protected static dispatcher: any // \Illuminate\Contracts\Events\Dispatcher

	/**
	 * The array of booted models.
	 */
	protected static booted: any[] = []

	/**
	 * The array of trait initializers that will be called on each new instance.
	 */
	protected static traitInitializers: any[] = []

	/**
	 * The array of global scopes on the model.
	 */
	protected static globalScopes: any[] = []

	/**
	 * The list of models classes that should not be affected with touch.
	 */
	protected static ignoreOnTouch: any[] = []

	/**
	 * The name of the "created at" column.
	 */
	static readonly CREATED_AT: string = 'created_at'

	/**
	 * The name of the "updated at" column.
	 */
	static readonly UPDATED_AT: string = 'updated_at'

	/**
	 * Create a new Eloquent model instance.
	 */
	constructor(attributes: Attributes = {} as Attributes) {
		// this.bootIfNotBooted()
		// this.initializeTraits()
		// this.syncOriginal()
		this.fill(attributes)
	}

	/**
	 * Fill the model with an array of attributes.
	 */
	fill(attributes: {}): this {
		// const totallyGuarded = this.totallyGuarded()

		// $totallyGuarded = $this -> totallyGuarded();
		// foreach($this -> fillableFromArray($attributes) as $key => $value) {
		//     $key = $this -> removeTableFromKey($key);
		//     // The developers may choose to place some attributes in the "fillable" array
		//     // which means only those attributes may be set through mass assignment to
		//     // the model, and all others will just get ignored for security reasons.
		//     if ($this -> isFillable($key)) {
		//         $this -> setAttribute($key, $value);
		//     } elseif($totallyGuarded) {
		//         throw new MassAssignmentException(sprintf(
		//             'Add [%s] to fillable property to allow mass assignment on [%s].',
		//             $key, get_class($this)
		//         ));
		//     }
		// }
		return this
	}
}

export const BaseModel = [ModelComponent, GuardsAttributes].reduce((c: any, a: any) => {
	c.prototype = { ...c.prototype, ...a.prototype }
	return c
}, class {})

export class Model<Attributes = {}> extends BaseModel implements GuardsAttributes {}
