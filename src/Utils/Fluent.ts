export interface LooseObject {
	[key: string]: any
}

export function buildFluent(attributes: any) {
	return new Proxy(new Fluent(attributes), {
		get: (target: Fluent, name, receiver): any => {
			if (typeof name === 'symbol' || name === 'inspect') {
				return undefined
			}
			console.log(target)
			console.log(name, receiver)

			if (!(name in target)) {
				console.log('Getting non-existant property ', name)
				return undefined
			}
			return target.getAttribute(name as string)
		},
		set: (target: Fluent, name, value): any => {
			if (!(name in target)) {
				console.log(`Setting non-existant property, initial value: ${value}`, name)
			}
			return target.setAttribute(name as string, value)
		},
	})
}

export class Fluent implements LooseObject {
	protected attributes = {}

	constructor(attributes: any) {
		this.value = true
	}

	getAttributes() {
		return this.attributes
	}

	setAttribute(key: string, value: any) {
		this.attributes[key] = value
	}

	getAttribute(key: string) {
		return this.attributes[key]
	}
}
