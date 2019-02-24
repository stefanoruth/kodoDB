export interface DatabaseDriver {
	/**
	 * Connect to the database.
	 */
	connect(): Promise<void>

	/**
	 * Disconnect from the database.
	 */
	disconnect(): Promise<void>

	/**
	 * Run a query againt the database.
	 */
	query(sql: string, values: any[]): Promise<any>

	/**
	 * Start a transaction.
	 */
	beginTransaction(): Promise<void>

	/**
	 * Add transaction point.
	 */
	commit(): Promise<void>

	/**
	 * Rollback all transactional changes.
	 */
	rollback(): Promise<void>

	exec(query: string): any
	prepare(query: string): any
}
