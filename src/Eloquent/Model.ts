import { ClassMixin } from '../Utils/ClassMixin'
import { HasAttributes } from './Concerns/HasAttributes'
import { HasTimestamps } from './Concerns/HasTimestamps'

export class Model<Attributes> extends ClassMixin(HasAttributes) {
	constructor(attributes: Partial<Attributes>) {
		super()
		this
		this.fill(attributes)
	}
}

interface UserAttributes {
	id: number
	name: string
}

class User extends Model<UserAttributes> {
	get id() {
		return this.attributes
	}
}

const u1 = new User({ id: 1, name: 'Foo' })

// u1.
// u1.id
