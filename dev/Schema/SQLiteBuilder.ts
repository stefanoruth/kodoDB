import { SchemaBuilder } from './SchemaBuilder'
import { SQLiteGrammar } from './Grammars/SQLiteGrammar'
import { SQLiteConnection } from '../Connections/SQLiteConnection'

export class SQLiteBuilder extends SchemaBuilder {
	protected grammar: SQLiteGrammar

	/**
	 * Create a new database Schema manager.
	 */
	constructor(connection: SQLiteConnection) {
		super(connection)
		// this.grammar = connection.getSchemaGrammar()
	}

	/**
	 * Drop all tables from the database.
	 */
	dropAllTables(): void {
		if (this.connection.getDatabaseName() !== ':memory:') {
			return this.refreshDatabaseFile()
		}
		this.connection.select(this.grammar.compileEnableWriteableSchema())
		this.connection.select(this.grammar.compileDropAllTables())
		this.connection.select(this.grammar.compileDisableWriteableSchema())
		this.connection.select(this.grammar.compileRebuild())
	}
	/**
	 * Drop all views from the database.
	 */
	dropAllViews() {
		this.connection.select(this.grammar.compileEnableWriteableSchema())
		this.connection.select(this.grammar.compileDropAllViews())
		this.connection.select(this.grammar.compileDisableWriteableSchema())
		this.connection.select(this.grammar.compileRebuild())
	}
	/**
	 * Empty the database file.
	 */
	refreshDatabaseFile(): void {
		// file_put_contents(this.connection.getDatabaseName(), '')
	}
}
