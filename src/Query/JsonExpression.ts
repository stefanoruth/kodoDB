import { Expression } from './Expression'

function getJsonBindingParameter(value: any): string {
	if (value instanceof Expression) {
		return value.getValue()
	}

	const type = typeof value

	switch (type) {
		case 'boolean':
			return value ? 'true' : 'false'
		case 'NULL':
		case 'integer':
		case 'double':
		case 'string':
			return '?'
		case 'object':
		case 'array':
			return '?'
	}

	throw new Error(`JSON value is of illegal type: ${type}`)
}

export class JsonExpression extends Expression {
	constructor(value: any) {
		super(getJsonBindingParameter(value))
	}
}
