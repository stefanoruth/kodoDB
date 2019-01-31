export class Collection {
	protected items: any[] = []

	constructor(items: any = []) {
		this.items = this.getArrayableItems(items)
	}

	getArrayableItems(items: any) {
		if (items instanceof Array) {
			return items
		}

		return [items]
	}

	first() {
		return this.items[0]
	}

	map(callbackfn: (value: any, index: number, array: any[]) => any, thisArg?: any): Collection {
		return new Collection(this.items.map(callbackfn))
	}

	join(separator?: string | undefined) {
		return this.items.join(separator)
	}

	static make(items: any = []) {
		return new Collection(items)
	}
}
