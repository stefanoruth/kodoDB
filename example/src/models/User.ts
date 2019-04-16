import { Model } from 'kododb'

export interface UserProps {
	id: number
	email: string
}

export class User extends Model<UserProps> {
	get id() {
		return this.attributes.id
	}

	get email() {
		return this.attributes.email
	}
}
