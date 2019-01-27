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

	static make(items: any = []) {
		return new Collection(items)
	}
}
