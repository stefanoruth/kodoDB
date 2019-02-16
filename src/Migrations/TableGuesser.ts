export class TableGuesser {
	static createPatterns = [/^create_(\w+)_table$/, /^create_(\w+)$/]
	static changePatterns = [/_(to|from|in)_(\w+)_table$/, /_(to|from|in)_(\w+)$/]

	/**
	 * Attempt to guess the table name and "creation" status of the given migration.
	 */
	static guess(migration: string): { table: string; create: boolean } {
		for (const pattern of this.createPatterns) {
			const matches = new RegExp(pattern).exec(migration)
			if (matches) {
				return {
					table: matches[1],
					create: true,
				}
			}
		}

		for (const pattern of this.changePatterns) {
			const matches = new RegExp(pattern).exec(migration)
			if (matches) {
				return {
					table: matches[2],
					create: false,
				}
			}
		}

		throw new Error('Unable to guess table name: ' + migration)
	}
}
