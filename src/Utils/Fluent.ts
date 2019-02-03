interface LooseObject {
	[key: string]: any
}

export function Fluent(data: any = {}) {
	return new Proxy(new FluentObject(data), FluentObject.proxyHandler())
}

class FluentObject implements LooseObject {
	attributes: any = {}

	constructor(attributes: any = {}) {
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

	hasAttribute(key: string): boolean {
		return !!this.attributes[key]
	}

	getAttribute(key: string) {
		if (this.attributes[key]) {
			console.log('exists', key)
			return this.attributes[key]
		}

		console.log('not there')
		return null
	}

	toJson(): string {
		return JSON.stringify(this.attributes)
	}

	static proxyHandler() {
		return {
			get: (target: any, name: string, receiver: any): any => {
				console.log(target, name)
				if (typeof target[name] === 'function') {
					console.log('method', name)
					return target[name]
				} else if (target.hasAttribute(name)) {
					return target.getAttribute(name)
				} else if (target[name]) {
					return target[name]
				}

				return (...args: any) => {
					target.setSelf(name)
				}
			},
			set: (target: any, name: string, value: any): any => {
				console.log(target, name, value)
				target.setAttribute(name, value)
				return true
			},
		}
	}
}
