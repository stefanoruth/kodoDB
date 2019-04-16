import { Model, SoftDeleteModel } from 'kododb'

export interface UserProps {
	id: number
	email: string
}

export class User extends SoftDeleteModel<UserProps> {
	get id() {
		return this.attributes.id
	}

	get email() {
		return this.attributes.email
	}

	set email(value) {
		this.attributes.email = value
	}
}
