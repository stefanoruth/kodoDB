export class Arr {
	static wrap(value: any): any[] {
		if (value === null || value === undefined) {
			return []
		}

		return value instanceof Array ? value : [value]
	}
}
