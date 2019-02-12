import { BaseGrammar } from '../../BaseGrammar'
import { Blueprint } from '../Blueprint'
import { Expression } from '../../Query/Expression'
import { ColumnDefinition } from '../ColumnDefinition'
import { ucfirst } from '../../Utils'
import { ChangeColumn } from './ChangeColumn'
import { Connection } from '../../Connections/Connection'
import { RenameColumn } from './RenameColumn'

export class SchemaGrammar extends BaseGrammar {
	// If this Grammar supports schema changes wrapped in a transaction.
	protected $transactions = false

	// The commands to be executed outside of create or alter command.
	protected fluentCommands: [] = []

	// The possible column modifiers.
	protected modifiers: string[] = []

	// The possible column serials.
	protected serials: string[] = []

	getFluentCommands(): [] {
		return this.fluentCommands
	}

	// Wrap a table in keyword identifiers.
	wrapTable(table: string | Expression | Blueprint) {
		return super.wrapTable(table instanceof Blueprint ? table.getTable() : table)
	}

	// Wrap a table in keyword identifiers.
	prefixArray(prefix: string, values: string[]): string[] {
		return values.map(value => {
			return `${prefix} ${value}`
		})
	}

	// Compile the blueprint's column definitions.
	protected getColumns(blueprint: Blueprint): any[] {
		const columns: any[] = []

		blueprint.getAddedColumns().forEach(column => {
			// Each of the column types have their own compiler functions which are tasked
			// with turning the column definition into its SQL format for this platform
			// used by the connection. The column's modifiers are compiled and added.

			columns.push(this.addModifiers(`${this.wrap(column)} ${this.getType(column)}`, blueprint, column))
		})

		return columns
	}

	// Wrap a value in keyword identifiers.
	wrap(value: string | Expression | ColumnDefinition, prefixAlias: boolean = false) {
		return super.wrap(value instanceof ColumnDefinition ? (value as any).name : value, prefixAlias)
	}

	/**
	 * Format a value so that it can be used in "default" clauses.
	 */
	protected getDefaultValue(value: any) {
		if (value instanceof Expression) {
			return value
		}

		return typeof value === 'boolean' ? `'${Number(value)}'` : `'${value.toString()}'`
	}

	// Get the SQL for the column data type.
	protected getType(column: ColumnDefinition): string {
		return (this as any)['type' + ucfirst((column as any).type)](column)
	}

	// Add the column modifiers to the definition.
	protected addModifiers(sql: string, blueprint: Blueprint, column: ColumnDefinition): string {
		this.modifiers.forEach(modifier => {
			const method = 'modify' + modifier

			if (typeof (this as any)[method] === 'function') {
				sql += (this as any)[method](blueprint, column)
			}
		})

		return sql
	}

	// Compile a rename column command.
	compileRenameColumn(blueprint: Blueprint, command: any, connection: Connection): string[] {
		return RenameColumn.compile(this, blueprint, command, connection)
	}

	// Compile a change column command into a series of SQL statements.
	compileChange(blueprint: Blueprint, command: any, connection: Connection): string[] {
		return ChangeColumn.compile(this, blueprint, command, connection)
	}

	// Compile a foreign key command.
	compileForeign(blueprint: Blueprint, command: any): string {
		// We need to prepare several of the elements of the foreign key definition
		// before we can create the SQL, such as wrapping the tables and convert
		// an array of columns to comma-delimited strings for the SQL queries.
		let sql = `alter table ${this.wrapTable(blueprint)} add constraint ${this.wrap(command.index)} `

		// Once we have the initial portion of the SQL statement we will add on the
		// key name, table name, and referenced columns. These will complete the
		// main portion of the SQL statement and this SQL will almost be done.
		sql += `foreign key (${this.columnize(command.columns)}) references ${this.wrapTable(command.on)} (${this.columnize(
			command.references
		)})`

		// Once we have the basic foreign key creation statement constructed we can
		// build out the syntax for what should happen on an update or delete of
		// the affected columns, which will get something like "cascade", etc.
		if (command.onDelete) {
			sql += ` on delete ${command.onDelete}`
		}
		if (command.onUpdate) {
			sql += ` on update ${command.onUpdate}`
		}
		return sql
	}
}
