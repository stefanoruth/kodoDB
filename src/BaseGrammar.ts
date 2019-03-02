import { Expression } from './Query/Expression'
import { Collection } from './Utils'

export class BaseGrammar {
	protected tablePrefix: string = ''

	wrapArray(values: any[]): any[] {
		return values.map(value => this.wrap(value))
	}

	wrapTable(table: string | Expression): string {
		if (!(table instanceof Expression)) {
			return this.wrap(this.tablePrefix + table, true)
		}

		return this.getValue(table)
	}

	wrap(value: string | string[] | Expression, prefixAlias: boolean = false): string {
		if (value instanceof Expression) {
			return this.getValue(value)
		}

		if (value.toString().indexOf(' as ') > -1) {
			return this.wrapAliasedValue(value.toString(), prefixAlias)
		}

		return this.wrapSegments(value.toString().split('.'))
	}

	wrapAliasedValue(value: string, prefixAlias: boolean = false): string {
		const segments = value.split(/\s+as\s+/i)
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
			.map((segment: any, key: number) => {
				return key === 0 && segments.length > 1 ? this.wrapTable(segment) : this.wrapValue(segment)
			})
			.join('.')
	}

	protected wrapValue(value: string): string {
		if (value !== '*') {
			return `"${value.replace('"', '""')}"`
		}

		return value
	}

	columnize(columns: string[]): string {
		return columns.map(column => this.wrap(column)).join(', ')
	}

	parameterize(values: any[]): string {
		return values.map(this.parameter).join(', ')
	}

	parameter(value: any): string {
		return value instanceof Expression ? this.getValue(value) : '?'
	}

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
