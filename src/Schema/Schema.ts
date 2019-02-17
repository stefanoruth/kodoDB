import { Blueprint } from './Blueprint'
import { SchemaBuilder } from './SchemaBuilder'
import { Connection } from '../Connections/Connection'
import { Collection } from '../Utils'
import { DatabaseManager } from '../DatabaseManager'

// let connection: Collection = new DatabaseManager().connection()

export class Schema {
	/**
	 * Modify a table on the schema.
	 */
	static table(table: string, callback: (blueprint: Blueprint) => void): void {
		new SchemaBuilder(connection).table(table, callback)
	}

	/**
	 * Create a new table on the schema.
	 */
	static create(table: string, callback: (blueprint: Blueprint) => void): void {
		new SchemaBuilder(connection).create(table, callback)
	}

	/**
	 * Drop a table from the schema.
	 */
	static drop(table: string): void {
		new SchemaBuilder(connection).drop(table)
	}
}
