import { Expression } from './Query/Expression'
import { Collection } from './Utils'

export class BaseGrammar {
	/**
	 * The grammar table prefix.
	 */
	protected tablePrefix: string = ''

	/**
	 * Wrap an array of values.
	 */
	wrapArray(values: any[]): any[] {
		return values.map(value => this.wrap(value))
	}

	/**
	 * Wrap a table in keyword identifiers.
	 */
	wrapTable(table: string | Expression): string | number {
		if (!(table instanceof Expression)) {
			return this.wrap(this.tablePrefix + table, true)
		}

		return this.getValue(table)
	}

	/**
	 * Wrap a value in keyword identifiers.
	 */
	wrap = (value: string | string[] | Expression | Expression[], prefixAlias: boolean = false): string | number => {
		if (this.isExpression(value)) {
			return this.getValue(value)
		}

		if (
			value
				.toString()
				.toLowerCase()
				.indexOf(' as ') > -1
		) {
			return this.wrapAliasedValue(value.toString(), prefixAlias)
		}

		return this.wrapSegments(value.toString().split('.'))
	}

	/**
	 * Wrap a value that has an alias.
	 */
	protected wrapAliasedValue(value: string, prefixAlias: boolean = false): string {
		const segments = value.split(/\s+as\s+/i)
		// If we are wrapping a table we need to prefix the alias with the table prefix
		// as well in order to generate proper syntax. If this is a column of course
		// no prefix is necessary. The condition will be true when from wrapTable.
		if (prefixAlias) {
			segments[1] = this.tablePrefix + segments[1]
		}

		return this.wrap(segments[0]) + ' AS ' + this.wrapValue(segments[1])
	}

	/**
	 * Wrap the given value segments.
	 */
	protected wrapSegments(segments: any[]): string {
		return new Collection(segments)
			.map((segment: any, key: number) => {
				return key === 0 && segments.length > 1 ? this.wrapTable(segment) : this.wrapValue(segment)
			})
			.join('.')
	}

	/**
	 * Wrap a single string in keyword identifiers.
	 */
	protected wrapValue(value: string): string {
		if (value !== '*') {
			return `"${value.replace('"', '""')}"`
		}

		return value
	}

	/**
	 * Convert an array of column names into a delimited string.
	 */
	columnize(columns: Array<string | Expression>): string {
		return columns.map((column: any) => this.wrap(column)).join(', ')
	}

	/**
	 * Create query parameter place-holders for an array.
	 */
	parameterize(values: any[]): string {
		return values.map(value => this.parameter(value)).join(', ')
	}

	/**
	 * Get the appropriate query parameter place-holder for a value.
	 */
	parameter(value: any): string | number {
		if (value instanceof Expression) {
			return this.getValue(value)
		}

		return '?'
	}

	/**
	 * Quote the given string literal.
	 */
	quoteString(value: string | string[] | undefined): string {
		if (value === undefined) {
			return ''
		}

		if (value instanceof Array) {
			// Todo
			return ''
		}
		return `'${value}'`
	}

	/**
	 * Determine if the given value is a raw expression.
	 */
	isExpression(value: any): value is Expression {
		return value instanceof Expression
	}

	/**
	 * Get the value of a raw expression.
	 */
	getValue(expression: Expression): string | number {
		return expression.getValue()
	}

	/**
	 * Get the format for database stored dates.
	 */
	getDateFormat(): string {
		return 'Y-m-d H:i:s'
	}

	/**
	 * Get the grammar's table prefix.
	 */
	getTablePrefix(): string {
		return this.tablePrefix
	}

	/**
	 * Set the grammar's table prefix.
	 */
	setTablePrefix(prefix: string): this {
		this.tablePrefix = prefix

		return this
	}
}
