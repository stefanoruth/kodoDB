export class Expression {
	protected value: string

	constructor(value: string | Expression) {
		if (value instanceof Expression) {
			this.value = value.getValue()
		} else {
			this.value = value
		}
	}

	getValue() {
		return this.value
	}

	toString() {
		return this.value
	}
}
