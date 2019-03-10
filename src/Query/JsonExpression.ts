import { Expression } from './Expression'

function getJsonBindingParameter(value: any): string | number {
	if (value instanceof Expression) {
		return value.getValue()
	}

	const type = typeof value

	switch (type) {
		case 'boolean':
			return value ? 'true' : 'false'
		case 'number':
		case 'string':
			return '?'
		case 'object':
		case 'bigint':
			return '?'
	}

	throw new Error(`JSON value is of illegal type: ${type}`)
}

export class JsonExpression extends Expression {
	constructor(value: any) {
		super(getJsonBindingParameter(value))
	}
}
