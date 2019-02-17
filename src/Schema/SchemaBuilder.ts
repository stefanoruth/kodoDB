import { Connection } from '../Connections/Connection'
import { SchemaGrammar } from './Grammars/SchemaGrammar'
import { Blueprint } from './Blueprint'
import { tap } from '../Utils'

type BlueprintResolver = (table: string, callback?: (blueprint: Blueprint) => void, prefix?: string) => Blueprint

export class SchemaBuilder {
	/**
	 * The database connection instance.
	 */
	protected connection: Connection

	/**
	 * The schema grammar instance.
	 */
	protected grammar: SchemaGrammar

	/**
	 * The Blueprint resolver callback.
	 */
	protected resolver?: BlueprintResolver

	/**
	 * The default string length for migrations.
	 */
	static defaultStringLength: number = 255

	/**
	 * Create a new database Schema manager.
	 */
	constructor(connection: Connection) {
		this.connection = connection
		this.grammar = connection.getSchemaGrammar()
	}

	/**
	 * Set the default string length for migrations.
	 */
	static setDefaultStringLength(length: number): void {
		this.defaultStringLength = length
	}

	/**
	 * Determine if the given table exists.
	 */
	hasTable(table: string): boolean {
		return (
			this.connection.selectFromWriteConnection(this.grammar.compileTableExists(), [
				this.connection.getTablePrefix() + table,
			]).length > 0
		)
	}

	/**
	 * Determine if the given table has a given column.
	 */
	hasColumn(table: string, column: string): boolean {
		return (
			this.getColumnListing(table)
				.map(item => item.toLowerCase())
				.indexOf(column.toLowerCase()) > -1
		)
	}

	/**
	 * Determine if the given table has given columns.
	 */
	hasColumns(table: string, columns: string[]): boolean {
		const tableColumns: string[] = this.getColumnListing(table).map(column => column.toLowerCase())

		columns.forEach(column => {
			if (tableColumns.indexOf(column.toLowerCase()) === -1) {
				return false
			}
		})

		return true
	}

	/**
	 * Get the data type for the given column name.
	 */
	getColumnType(table: string, column: string): string {
		return this.connection
			.getDoctrineColumn(this.connection.getTablePrefix() + table, column)
			.getType()
			.getName()
	}

	/**
	 * Get the column listing for a given table.
	 */
	getColumnListing(table: string): string[] {
		return this.connection
			.getPostProcessor()
			.processColumnListing(
				this.connection.selectFromWriteConnection(
					this.grammar.compileColumnListing(this.connection.getTablePrefix() + table)
				)
			)
	}

	/**
	 * Modify a table on the schema.
	 */
	table(table: string, callback: (blueprint: Blueprint) => void): void {
		this.build(this.createBlueprint(table, callback))
	}

	/**
	 * Create a new table on the schema.
	 */
	create(table: string, callback: (blueprint: Blueprint) => void): void {
		this.build(
			tap(this.createBlueprint(table), (blueprint: Blueprint) => {
				blueprint.create()
				callback(blueprint)
			})
		)
	}

	/**
	 * Drop a table from the schema.
	 */
	drop(table: string): void {
		this.build(
			tap(this.createBlueprint(table), (blueprint: Blueprint) => {
				blueprint.drop()
			})
		)
	}
	/**
	 * Drop a table from the schema if it exists.
	 */
	dropIfExists(table: string): void {
		this.build(
			tap(this.createBlueprint(table), (blueprint: Blueprint) => {
				blueprint.dropIfExists()
			})
		)
	}

	/**
	 * Drop all tables from the database.
	 */
	dropAllTables(): void {
		throw new Error('This database driver does not support dropping all tables.')
	}

	/**
	 * Drop all views from the database.
	 */
	dropAllViews(): void {
		throw new Error('This database driver does not support dropping all views.')
	}

	/**
	 * Rename a table on the schema.
	 */
	rename(from: string, to: string): void {
		this.build(
			tap(this.createBlueprint(from), (blueprint: Blueprint) => {
				blueprint.rename(to)
			})
		)
	}
	/**
	 * Enable foreign key constraints.
	 *
	 * @return bool
	 */
	enableForeignKeyConstraints() {
		return this.connection.statement(this.grammar.compileEnableForeignKeyConstraints())
	}
	/**
	 * Disable foreign key constraints.
	 *
	 * @return bool
	 */
	disableForeignKeyConstraints() {
		return this.connection.statement(this.grammar.compileDisableForeignKeyConstraints())
	}
	/**
	 * Execute the blueprint to build / modify the table.
	 */
	protected build(blueprint: Blueprint): void {
		blueprint.build(this.connection, this.grammar)
	}

	/**
	 * Create a new command set with a Closure.
	 */
	protected createBlueprint(table: string, callback?: (blueprint: Blueprint) => void): Blueprint {
		const prefix = this.connection.getConfig('prefix_indexes') ? this.connection.getConfig('prefix') : ''

		if (this.resolver) {
			return this.resolver(table, callback, prefix)
		}
		return new Blueprint(table, callback, prefix)
	}

	/**
	 * Get the database connection instance.
	 */
	getConnection(): Connection {
		return this.connection
	}

	/**
	 * Set the database connection instance.
	 */
	setConnection(connection: Connection): this {
		this.connection = connection
		return this
	}

	/**
	 * Set the Schema Blueprint resolver callback.
	 */
	blueprintResolver(resolver: BlueprintResolver): void {
		this.resolver = resolver
	}
}
