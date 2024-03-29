import { ConnectionResolver } from '../Connections/ConnectionResolver'
import { QueryBuilder } from '../Query/QueryBuilder'
import { Connection } from '../Connections/Connection'
import { Migration } from './Migration'
import { MigrationRepositoryInterface } from './MigrationRepositoryInterface'

export class DatabaseMigrationRepository implements MigrationRepositoryInterface {
	/**
	 * The database connection resolver instance.
	 */
	protected resolver: ConnectionResolver

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
	constructor(resolver: ConnectionResolver, table: string) {
		this.tableName = table
		this.resolver = resolver
	}

	/**
	 * Get the completed migrations.
	 */
	getRan(): any[] {
		return this.table()
			.orderBy('batch', 'asc')
			.orderBy('migration', 'asc')
			.pluck('migration')
			.all()
	}

	/**
	 * Get list of migrations.
	 */
	getMigrations(steps: number): any[] {
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
	getLast(): any[] {
		return this.table()
			.where('batch', this.getLastBatchNumber())
			.orderBy('migration', 'desc')
			.get()
			.all()
	}

	/**
	 * Get the completed migrations with their batch numbers.
	 */
	getMigrationBatches(): any[] {
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
		this.table().insert([
			{
				migration: file,
				batch,
			},
		])
	}

	/**
	 * Remove a migration from the log.
	 */
	delete(migration: Migration): void {
		this.table()
			.where('migration', migration.fileName)
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
		return this.getConnection().table(this.tableName)
	}
	/**
	 * Get the connection resolver instance.
	 *
	 */
	getConnectionResolver(): ConnectionResolver {
		return this.resolver
	}

	/**
	 * Resolve the database connection instance.
	 */
	getConnection(): Connection {
		return this.resolver.connection(this.connection)
	}

	/**
	 * Set the information source to gather data.
	 */
	setSource(name?: string): void {
		this.connection = name
	}
}
