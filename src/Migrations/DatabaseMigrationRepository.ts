import { ConnectionResolverInterface } from '../Connections/ConnectionResolver'
import { QueryBuilder } from '../Query/QueryBuilder'
import { Connection, ConnectionInterface } from '../Connections/Connection'

export interface MigrationRepositoryInterface {
	/**
	 * Get the completed migrations.
	 */
	getRan(): []

	/**
	 * Get list of migrations.
	 */
	getMigrations(steps: number): []

	/**
	 * Get the last migration batch.
	 */
	getLast(): []

	/**
	 * Get the completed migrations with their batch numbers.
	 */
	getMigrationBatches(): []

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
	setSource(name: string): void
}

export class DatabaseMigrationRepository implements MigrationRepositoryInterface {
	/**
	 * The database connection resolver instance.
	 */
	protected resolver: ConnectionResolverInterface

	/**
	 * The name of the migration table.
	 */
	protected tableName: string

	/**
	 * The name of the database connection to use.
	 */
	protected connection?: string

	/**
	 * Create a new database migration repository instance.
	 */
	constructor(resolver: ConnectionResolverInterface, table: string) {
		this.tableName = table
		this.resolver = resolver
	}

	/**
	 * Get the completed migrations.
	 */
	getRan(): [] {
		return this.table()
			.orderBy('batch', 'asc')
			.orderBy('migration', 'asc')
			.pluck('migration')
			.all()
	}

	/**
	 * Get list of migrations.
	 */
	getMigrations(steps: number): [] {
		return this.table()
			.where('batch', '>=', '1')
			.orderBy('batch', 'desc')
			.orderBy('migration', 'desc')
			.take(steps)
			.get()
			.all()
	}

	/**
	 * Get the last migration batch.
	 */
	getLast(): [] {
		return this.table()
			.where('batch', this.getLastBatchNumber())
			.orderBy('migration', 'desc')
			.get()
			.all()
	}

	/**
	 * Get the completed migrations with their batch numbers.
	 */
	getMigrationBatches(): [] {
		return this.table()
			.orderBy('batch', 'asc')
			.orderBy('migration', 'asc')
			.pluck('batch', 'migration')
			.all()
	}

	/**
	 * Log that a migration was run.
	 */
	log(file: string, batch: number): void {
		this.table().insert({
			migration: file,
			batch,
		})
	}

	/**
	 * Remove a migration from the log.
	 */
	delete(migration: object): void {
		this.table()
			.where('migration', migration.migration)
			.delete()
	}

	/**
	 * Get the next migration batch number.
	 */
	getNextBatchNumber(): number {
		return this.getLastBatchNumber() + 1
	}

	/**
	 * Get the last migration batch number.
	 */
	getLastBatchNumber(): number {
		return this.table().max('batch')
	}

	/**
	 * Create the migration repository data store.
	 */
	createRepository(): void {
		const schema = this.getConnection().getSchemaBuilder()
		schema.create(this.tableName, table => {
			// The migrations table is responsible for keeping track of which of the
			// migrations have actually run for the application. We'll create the
			// table to hold the migration file's path as well as the batch ID.
			table.increments('id')
			table.string('migration')
			table.integer('batch')
		})
	}
	/**
	 * Determine if the migration repository exists.
	 */
	repositoryExists(): boolean {
		return this.getConnection()
			.getSchemaBuilder()
			.hasTable(this.tableName)
	}

	/**
	 * Get a query builder for the migration table.
	 */
	table(): QueryBuilder {
		return this.getConnection()
			.table(this.tableName)
			.useWritePdo()
	}
	/**
	 * Get the connection resolver instance.
	 *
	 */
	getConnectionResolver(): ConnectionResolverInterface {
		return this.resolver
	}

	/**
	 * Resolve the database connection instance.
	 */
	getConnection(): ConnectionInterface {
		return this.resolver.connection(this.connection)
	}

	/**
	 * Set the information source to gather data.
	 */
	setSource(name: string): void {
		this.connection = name
	}
}
