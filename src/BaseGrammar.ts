import { Expression } from './Query/Expression'
import { Collection } from './Utils'

export class BaseGrammar {
	protected tablePrefix: string = ''

	wrapArray(values: any[]): any[] {
		return values.map(this.wrap)
	}

	wrapTable(table: string | Expression): string {
		if (!this.isExpression(table)) {
			return this.wrap(this.tablePrefix + table, true)
		}
		return this.getValue(table)
	}

	wrap(value: string | Expression, prefixAlias: boolean = false): string {
		if (this.isExpression(value)) {
			return this.getValue(value)
		}

		if (stripos(value, ' as ') !== false) {
			return this.wrapAliasedValue(value, prefixAlias)
		}
		return this.wrapSegments(value.toString().split('.'))
	}

	wrapAliasedValue(value: string, prefixAlias: boolean = false): string {
		const segments = preg_split('/s+ass+/i', value)
		// If we are wrapping a table we need to prefix the alias with the table prefix
		// as well in order to generate proper syntax. If this is a column of course
		// no prefix is necessary. The condition will be true when from wrapTable.
		if (prefixAlias) {
			segments[1] = this.tablePrefix + segments[1]
		}

		return this.wrap(segments[0]) + ' as ' + this.wrapValue(segments[1])
	}

	wrapSegments(segments: any[]): string {
		return new Collection(segments)
			.map((segment, key) => {
				return key === 0 && segments.length > 1 ? this.wrapTable(segment) : this.wrapValue(segment)
			})
			.join('.')
	}

	wrapValue(value: string): string {
		if (value !== '*') {
			return `"${value.replace('"', '""')}"`
		}
		return value
	}

	columnize(columns: string[]): string {
		return columns.map(this.wrap).join(', ')
	}

	parameterize(values: any[]): string {
		return values.map(this.parameter).join(', ')
	}

	parameter(value: any): string {
		return this.isExpression(value) ? this.getValue(value) : '?'
	}

	quoteString(value: string | string[]): string {
		if (value instanceof Array) {
			// Todo
			return ''
		}
		return `'${value}'`
	}

	isExpression(value: string | Expression): boolean {
		return value instanceof Expression
	}

	getValue(expression: Expression): string {
		return expression.getValue()
	}

	getDateFormat() {
		return 'Y-m-d H:i:s'
	}

	getTablePrefix() {
		return this.tablePrefix
	}

	setTablePrefix(prefix: string) {
		this.tablePrefix = prefix

		return this
	}
}
