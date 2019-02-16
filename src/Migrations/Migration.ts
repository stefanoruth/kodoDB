export abstract class Migration {
	/**
	 * The name of the database connection to use.
	 */
	protected connection?: string

	/**
	 * Enables, if supported, wrapping the migration within a transaction.
	 */
	withinTransaction: boolean = true

	/**
	 * Get the migration connection name.
	 */
	getConnection(): string {
		if (this.connection) {
			return this.connection
		}
		return ''
	}
}
