import { GuardsAttributes } from './Concerns/GuardsAttributes'
import { Builder } from './Builder'
import { Connection } from '../Connections/Connection'

function f() {
	console.log('f(): evaluated')
	return (target, propertyKey: string, descriptor: PropertyDescriptor) => {
		console.log('f(): called')
	}
}

export class Model<Attributes = {}> extends GuardsAttributes<Attributes> {
	protected table?: string

	@f()
	created_at: string

	constructor(attributes: Partial<Attributes>) {
		super()
		this.fill(attributes)
	}

	toDTO(): Partial<Attributes> {
		return this.attributes
	}

	toJson(): string {
		// this or attributes
		// how about computed attributes?
		return JSON.stringify(this.attributes)
	}

	// Magic trick to copy entire entity
	clone(): this {
		return new (this.constructor as typeof Model)(this.attributes) as this
	}

	query(): Builder {
		return new Builder().setModel(this)
	}

	/**
	 * Get the table associated with the model.
	 */
	getTable(): string {
		if (this.table) {
			return this.table
		}

		return 'Str::snake(Str::pluralStudly(class_basename($this)))'
	}
}
