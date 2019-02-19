import { SchemaBuilder } from './SchemaBuilder'
import { MySqlConnection } from '../Connections/MySqlConnection'
import { Connection } from '../Connections/Connection'

export class MySqlBuilder extends SchemaBuilder {
	/**
	 * Create a new database Schema manager.
	 */
	constructor(connection: MySqlConnection) {
		super(connection as Connection)
	}

	/**
	 * Determine if the given table exists.
	 */
	hasTable(table: string): boolean {
		table = this.connection.getTablePrefix() + table

		return (
			this.connection.select(this.grammar.compileTableExists(), [this.connection.getDatabaseName(), table]).length > 0
		)
	}

	/**
	 * Get the column listing for a given table.
	 */
	getColumnListing(table: string): string[] {
		table = this.connection.getTablePrefix() + table

		const results = this.connection.select(this.grammar.compileColumnListing(), [
			this.connection.getDatabaseName(),
			table,
		])

		return this.connection.getPostProcessor().processColumnListing(results)
	}

	/**
	 * Drop all tables from the database.
	 */
	dropAllTables(): void {
		const tables: string[] = []
		this.getAllTables().forEach(row => {
			// row = (array) row;
			// tables[] = reset(row);
			tables.push(row)
		})

		if (tables.length === 0) {
			return
		}
		this.disableForeignKeyConstraints()
		this.connection.statement(this.grammar.compileDropAllTables(tables))
		this.enableForeignKeyConstraints()
	}

	/**
	 * Drop all views from the database.
	 */
	dropAllViews(): void {
		const views: string[] = []
		this.getAllViews().forEach(row => {
			// row = (array) row;
			// tables[] = reset(row);
			views.push(row)
		})

		if (views.length === 0) {
			return
		}
		this.connection.statement(this.grammar.compileDropAllViews(views))
	}

	/**
	 * Get all of the table names for the database.
	 */
	protected getAllTables(): string[] {
		return this.connection.select(this.grammar.compileGetAllTables())
	}

	/**
	 * Get all of the view names for the database.
	 */
	protected getAllViews(): string[] {
		return this.connection.select(this.grammar.compileGetAllViews())
	}
}
