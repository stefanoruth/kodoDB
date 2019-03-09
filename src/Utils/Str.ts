import _ from 'lodash'

export class Str {
	static ucfirst(value: string | undefined): string {
		if (value === undefined) {
			return ''
		}
		return value.charAt(0).toUpperCase() + value.slice(1)
	}

	static lcfirst(value: string): string {
		if (value === undefined) {
			return ''
		}
		return value.charAt(0).toLowerCase() + value.slice(1)
	}

	static studly(value: string): string {
		return _.startCase(value).replace(new RegExp(/\s/gi), '')
	}
}
