export interface MigrationRepositoryInterface {
	/**
	 * Get the completed migrations.
	 */
	getRan(): any[]

	/**
	 * Get list of migrations.
	 */
	getMigrations(steps: number): any[]

	/**
	 * Get the last migration batch.
	 */
	getLast(): any[]

	/**
	 * Get the completed migrations with their batch numbers.
	 */
	getMigrationBatches(): any[]

	/**
	 * Log that a migration was run.
	 */
	log(file: string, batch: number): void

	/**
	 * Remove a migration from the log.
	 */
	delete(migration: object): void

	/**
	 * Get the next migration batch number.
	 */
	getNextBatchNumber(): number

	/**
	 * Create the migration repository data store.
	 */
	createRepository(): void

	/**
	 * Determine if the migration repository exists.
	 */
	repositoryExists(): boolean

	/**
	 * Set the information source to gather data.
	 */
	setSource(name?: string): void
}
