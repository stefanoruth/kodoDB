import { BaseGrammar } from '../../BaseGrammar'
import { Blueprint } from '../Blueprint'
import { Expression } from '../../Query/Expression'
import { ColumnDefinition } from '../ColumnDefinition'
import { ucfirst } from '../../Utils'

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

	// Get the SQL for the column data type.
	protected getType(column: ColumnDefinition): string {
		return (this as any)['type' + ucfirst((column as any).type)](column)
	}

	// Add the column modifiers to the definition.
	protected addModifiers(sql: string, blueprint: Blueprint, column: ColumnDefinition): string {
		this.modifiers.forEach(modifier => {
			const method = 'modify' + modifier

			if ((this as any)[method]) {
				sql += (this as any)[method](blueprint, column)
			}
		})

		return sql
	}
}
