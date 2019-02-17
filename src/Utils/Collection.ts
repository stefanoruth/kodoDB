type ArrayFn = (value: any, index: number, items: any[]) => any
type SortFn = (value: any, index: number) => any

export class Collection<T = any> {
	/**
	 * The items contained in the collection.
	 */
	protected items: T[] = []

	/**
	 * Create a new collection.
	 */
	constructor(items: T[] = []) {
		this.items = this.getArrayableItems(items)
	}

	/**
	 * Get the first item from the collection.
	 */
	first() {
		return this.items[0]
	}

	/**
	 * Run a map over each of the items.
	 */
	map(callback: ArrayFn): Collection<T> {
		return new Collection<T>(this.items.map(callback))
	}

	/**
	 * Join with the given lists, returning all possible permutations.
	 */
	join(separator?: string | undefined): Collection<T> {
		return new Collection<T>(this.items.join(separator))
	}

	/**
	 * Create a new collection instance if the value isn't one already.
	 */
	static make(items: any = []): Collection {
		return new Collection(items)
	}

	/**
	 * Get all of the items in the collection.
	 */
	all(): T[] {
		return this.items
	}

	/**
	 * Map a collection and flatten the result by a single level.
	 */
	flatMap(callback: ArrayFn): Collection<T> {
		return this.map(callback).collapse()
	}

	/**
	 * Collapse an array of arrays into a single array.
	 */
	collapse(): Collection<T> {
		const results: any[] = []

		this.items.forEach((values: any) => {
			if (values instanceof Array) {
				return
			}
			results.concat(values)
		})

		return new Collection<T>(results)
	}

	/**
	 * Results array of items from Collection or Arrayable.
	 */
	getArrayableItems(items: any): T[] {
		if (items instanceof Array) {
			return items
		}

		return [items]
	}

	/**
	 * Run a filter over each of the items.
	 */
	filter(callback?: ArrayFn): Collection<T> {
		if (callback) {
			return new Collection<T>(this.items.filter(callback))
		}

		return new Collection<T>(
			this.items.filter(item => {
				return item
			})
		)
	}

	/**
	 * Reset the keys on the underlying array.
	 */
	values(): Collection<T> {
		// Todo Remove
		return new Collection<T>(this.items)
	}

	/**
	 * Sort the collection using the given callback.
	 */
	sortBy(callbackFn?: SortFn, descending: boolean = false): Collection<T> {
		const results: any[] = []
		let callback: SortFn

		if (typeof callbackFn === 'undefined') {
			callback = (value: any) => value
		} else {
			callback = callbackFn
		}

		// First we will loop through the items and get the comparator from a callback
		// function which we were given. Then, we will sort the returned values and
		// and grab the corresponding values for the sorted keys from this array.
		this.items.forEach((value: any, key: number) => {
			results[key] = callback(value, key)
		})

		results.sort((a: any, b: any) => {
			if (a < b) {
				return -1
			}
			if (a > b) {
				return 1
			}
			return 0
		})

		if (descending) {
			results.reverse()
		}

		// Once we have sorted all of the keys in the array, we will loop through them
		// and grab the corresponding model so we can set the underlying items list
		// to the sorted version. Then we'll just return the collection instance.
		return new Collection<T>(results)

		// foreach(array_keys($results) as $key) {
		//     $results[$key] = $this -> items[$key];
		// }
		// return new static($results);
	}

	/**
	 * Return only unique items from the collection array.
	 */
	unique(): Collection<T> {
		return new Collection<T>(this.items.filter((v, i, a) => a.indexOf(v) === i))
	}

	/**
	 * Merge the collection with the given items.
	 */
	merge(items: any[]): Collection<T> {
		return new Collection<T>(this.items.concat(this.getArrayableItems(items)))
	}

	/**
	 * Create a collection of all elements that do not pass a given truth test.
	 */
	reject(callback: ArrayFn | string | number | boolean): Collection<T> {
		// return new Collection<T>(this.items.rej)

		if (typeof callback === 'function') {
			return this.filter((value: T, key: number, items: T[]) => {
				return !callback(value, key, items)
			})
		}

		return this.filter((item: any) => {
			return item !== callback
		})
	}

	/**
	 * Get a value retrieving callback.
	 */
	protected valueRetriever(value: any): (value: any) => any {
		if (typeof value === 'function') {
			return value
		}

		return (item: any) => {
			return item[value] // data_get(item, value);
		}
	}
}
