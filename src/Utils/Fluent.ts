export interface LooseObject {
	[key: string]: any
}

export class ArrayProxy<T> extends Array<T> {
	constructor(protected array: T[]) {
		super()
		this.customFunction()
		return new Proxy(this, this)
	}

	public get(target: any, prop: string) {
		return this.hasOwnProperty(prop) ? this[prop as any] : this.array[prop as any]
	}

	public customFunction() {
		return 'foobar'
	}

	// More functions below
}

const arrayProxy = new ArrayProxy([])

export function buildFluent(attributes: any) {
	const handler = {
		get: (target: any, name: any, receiver: any): any => {
			if (name === 'getAttributes') {
				return () => {
					return target.getAttributes()
				}
			}

			return () => {
				target.setSelf(name)
			}
		},
		set: (target: any, name: any, value: any): any => {
			return target.setAttribute(name, value)
		},
	}

	return new Proxy(new Fluent(attributes), handler)

	// return new Proxy(new Fluent(attributes), {
	// 	get: (target: Fluent, name, receiver): any => {
	// 		if (typeof name === 'symbol' || name === 'inspect') {
	// 			return undefined
	// 		}
	// 		console.log(target)
	// 		console.log(name, receiver)

	// 		if (!(name in target)) {
	// 			console.log('Getting non-existant property ', name)
	// 			return undefined
	// 		}
	// 		return target.getAttribute(name as string)
	// 	},
	// 	set: (target: Fluent, name, value): any => {
	// 		if (!(name in target)) {
	// 			console.log(`Setting non-existant property, initial value: ${value}`, name)
	// 		}
	// 		return target.setAttribute(name as string, value)
	// 	},
	// })
}

export class Fluent implements LooseObject {
	protected attributes: any = {}

	constructor(attributes: any) {
		this.attributes = attributes
	}

	getAttributes() {
		return this.attributes
	}

	setAttribute(key: string, value: any) {
		this.attributes[key] = value
	}

	setSelf(key: string) {
		this.attributes[key] = true
	}

	getAttribute(key: string) {
		return this.attributes[key]
	}
}
