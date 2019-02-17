import { MigrationRepositoryInterface } from './DatabaseMigrationRepository'
import * as fs from 'fs'
import { ConnectionResolverInterface } from '../Connections/ConnectionResolver'
import { SchemaGrammar } from '../Schema/Grammars/SchemaGrammar'
import { Connection, QueryLog } from '../Connections/Connection'
import { Migration } from './Migration'
import { Collection } from '../Utils'
import { basename } from 'path'

interface MigratorOptions {
	step?: number
}

export class Migrator {
	/**
	 * The migration repository implementation.
	 */
	protected repository: MigrationRepositoryInterface

	/**
	 * The filesystem instance.
	 */
	protected files: typeof fs

	/**
	 * The connection resolver instance.
	 */
	protected resolver: ConnectionResolverInterface

	/**
	 * The name of the default connection.
	 */
	protected connection?: string

	/**
	 * The paths to all of the migration files.
	 */
	protected paths: string[] = []

	/**
	 * Notes
	 */
	protected notes: string[] = []

	/**
	 * Create a new migrator instance.
	 */
	constructor(repository: MigrationRepositoryInterface, resolver: ConnectionResolverInterface, files: typeof fs) {
		this.files = files
		this.resolver = resolver
		this.repository = repository
	}

	/**
	 * Run the pending migrations at a given path.
	 */
	run(paths: string[] = [], options = {}): string[] {
		this.notes = []

		// Once we grab all of the migration files for the path, we will compare them
		// against the migrations that have already been run for this package then
		// run each of the outstanding migrations against a database connection.
		const files = this.getMigrationFiles(paths)

		const migrations = this.pendingMigrations(files, this.repository.getRan())

		this.requireFiles(migrations)

		// Once we have all these migrations that are outstanding we are ready to run
		// we will go ahead and run them "up". This will execute each migration as
		// an operation against a database. Then we'll return this list of them.
		this.runPending(migrations, options)

		return migrations
	}

	/**
	 * Get the migration files that have not yet run.
	 */
	protected pendingMigrations(files: string[], ran: string[]): string[] {
		return new Collection<string>(files)
			.reject(file => {
				return ran.indexOf(this.getMigrationName(file)) > -1
			})
			.all()
	}

	/**
	 * Run an array of migrations.
	 */
	runPending(migrations: string[], options: { pretend?: boolean; step?: number | boolean } = {}): void {
		// First we will just make sure that there are any migrations to run. If there
		// aren't, we will just make a note of it to the developer so they're aware
		// that all of the migrations have been run against this database system.
		if (migrations.length === 0) {
			this.note('<info>Nothing to migrate.</info>')

			return
		}

		// Next, we will get the next batch number for the migrations so we can insert
		// correct batch number in the database migrations repository when we store
		// each migration's execution. We will also extract a few of the options.
		let batch: number = this.repository.getNextBatchNumber()

		const pretend: boolean = options.pretend ? options.pretend : false

		const step = options.step ? options.step : false

		// Once we have the array of migrations, we will spin through them and run the
		// migrations "up" so the changes are made to the databases. We'll then log
		// that the migration was run so we don't repeat it next time we execute.
		migrations.forEach(file => {
			this.runUp(file, batch, pretend)

			if (step) {
				batch++
			}
		})
	}

	/**
	 * Run "up" a migration instance.
	 */
	protected runUp(file: string, batch: number, pretend: boolean): void {
		// First we will resolve a "real" instance of the migration class from this
		// migration file name. Once we have the instances we can run the actual
		// command such as "up" or "down", or we can just simulate the action.
		const name = this.getMigrationName(file)
		const migration = this.resolve(name)

		if (pretend) {
			return this.pretendToRun(migration)
		}

		this.note('<comment>Migrating:</comment> {name}')

		this.runMigration(migration)

		// Once we have run a migrations class, we will log that it was run in this
		// repository so that we don't try to run it next time we do a migration
		// in the application. A migration repository keeps the migrate order.
		this.repository.log(name, batch)

		this.note('<info>Migrated:</info>  {name}')
	}

	/**
	 * Run a migration inside a transaction if the database supports it.
	 */
	protected runMigration(migration: Migration): void {
		const connection = this.resolveConnection(migration.getConnection())

		const callback = () => {
			migration.run()
		}

		this.getSchemaGrammar(connection).supportsSchemaTransactions() && migration.withinTransaction
			? connection.transaction(callback)
			: callback()
	}

	/**
	 * Pretend to run the migrations.
	 */
	protected pretendToRun(migration: Migration): void {
		this.getQueries(migration).forEach((query: QueryLog) => {
			this.note(`<info>${migration.constructor.name}:</info> ${query.query}`)
		})
	}

	/**
	 * Get all of the queries that would be run for a migration.
	 */
	protected getQueries(migration: Migration): QueryLog[] {
		// Now that we have the connections we can resolve it and pretend to run the
		// queries against the database returning the array of raw SQL statements
		// that would get fired against the database system for this migration.
		const db = this.resolveConnection(migration.getConnection())

		return db.pretend(() => {
			migration.run()
		})
	}

	/**
	 * Resolve a migration instance from a file.
	 */
	resolve(file: string): Migration {
		const className = require(file).default

		return new className()
	}

	/**
	 * Get all of the migration files in a given path.
	 */
	getMigrationFiles(paths: string | string[]): string[] {
		return Collection.make(paths)
			.flatMap((path: string) => {
				// return Str:: endsWith(path, '.php') ? [path] : this.files.glob(path.'/*_*.php');
				return path.endsWith('.ts') ? [path] : []
			})
			.filter()
			.sortBy(file => {
				return this.getMigrationName(file)
			})
			.all()
	}

	/**
	 * Require in all the migration files in a given path.
	 *
	 * @param  array   files
	 * @return void
	 */
	requireFiles(files: string[]) {
		files.forEach(file => {
			// this.files.requireOnce(file)
		})
	}

	/**
	 * Get the name of the migration.
	 */
	getMigrationName(path: string): string {
		return basename(path).replace('.ts', '')
	}

	/**
	 * Register a custom migration path.
	 */
	path(path: string): void {
		this.paths = new Collection<string>(this.paths)
			.merge([path])
			.unique()
			.all()
	}

	/**
	 * Get all of the custom migration paths.
	 */
	getPaths(): string[] {
		return this.paths
	}

	/**
	 * Get the default connection name.
	 *
	 * @return string
	 */
	getConnection() {
		return this.connection
	}

	/**
	 * Set the default connection name.
	 */
	setConnection(name?: string): void {
		if (name) {
			this.resolver.setDefaultConnection(name)
		}
		this.repository.setSource(name)
		this.connection = name
	}

	/**
	 * Resolve the database connection instance.
	 */
	resolveConnection(connection: string): Connection {
		return this.resolver.connection(connection ? connection : this.connection)
	}

	/**
	 * Get the schema grammar out of a migration connection.
	 */
	protected getSchemaGrammar(connection: Connection): SchemaGrammar {
		let grammar = connection.getSchemaGrammar()

		if (!grammar) {
			connection.useDefaultSchemaGrammar()
			grammar = connection.getSchemaGrammar()
		}

		return grammar
	}

	/**
	 * Get the migration repository instance.
	 */
	getRepository(): MigrationRepositoryInterface {
		return this.repository
	}

	/**
	 * Determine if the migration repository exists.
	 */
	repositoryExists(): boolean {
		return this.repository.repositoryExists()
	}

	/**
	 * Get the file system instance.
	 */
	getFilesystem(): typeof fs {
		return this.files
	}

	/**
	 * Write a note to the conosle's output.
	 */
	protected note(message: string): void {
		console.log(message)
	}
}
