class Model<Attributes = {}> {
	constructor(protected attributes?: Attributes) {
		for (const key in attributes) {
			if (attributes.hasOwnProperty(key)) {
				;(this as any)[key] = attributes[key]
			}
		}
	}
}

interface UserAttributes {
	id: number
	name: string
}

export class User extends Model<UserAttributes> {
	id?: number
	name: string
}

const user = new User()

user.id
