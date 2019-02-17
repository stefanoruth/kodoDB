import { QueryBuilder, QueryBuilderType } from '../../../dev/Query/QueryBuilder'
import { Expression } from '../Expression'
import { BaseGrammar } from '../../BaseGrammar'
import { ucfirst } from '../../Utils'

export class QueryGrammar extends BaseGrammar {
	protected operators = []

	protected selectComponents = [
		'aggregate',
		'columns',
		'from',
		'joins',
		'wheres',
		'groups',
		'havings',
		'orders',
		'limit',
		'offset',
		'unions',
		'lock',
	]

	// Compile a select query into SQL.
	compileSelect(query: QueryBuilder): string {
		if (query.unions && query.aggregate) {
			return this.compileUnionAggregate(query)
		}

		// If the query does not have any columns set, we'll set the columns to the
		// * character to just get all of the columns from the database. Then we
		// can build the query and concatenate all the pieces together as one.
		const original = query.columns
		if (query.columns === undefined) {
			query.columns = ['*']
		}
		// To compile the query, we'll spin through each component of the query and
		// see if that component exists. If it does we'll just call the compiler
		// function for the component which is responsible for making the SQL.
		const sql = this.concatenate(this.compileComponents(query)).trim()
		query.columns = original
		return sql
	}

	// Compile the components necessary for a select clause.
	protected compileComponents(query: QueryBuilder): any[] {
		const sql: any = {}

		this.selectComponents.forEach((component: string) => {
			// To compile the query, we'll spin through each component of the query and
			// see if that component exists. If it does we'll just call the compiler
			// function for the component which is responsible for making the SQL.
			if ((query as any)[component]) {
				const method = 'compile' + ucfirst(component)
				if (typeof (this as any)[method] === 'function') {
					sql[component] = (this as any)[method](query, (query as any)[component])
				}
			}
		})

		return sql
	}

	compileAggregate(query: QueryBuilder, aggregate: any): string {
		return ''
	}

	protected compileColumns(query: QueryBuilder, columns: any[]): string | void {
		return ''
	}

	protected compileFrom(query: QueryBuilder, table: string): string {
		return ''
	}

	protected compileJoins(query: QueryBuilder, joins: any[]): string {
		return ''
	}

	protected compileWheres(query: QueryBuilder): string {
		return ''
	}

	protected compileWheresToArray(query: QueryBuilder): [] {
		return []
	}

	protected concatenateWhereClauses(query: QueryBuilder, sql: string): string {
		return ''
	}

	protected whereRaw(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereBasic(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereIn(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereNotIn(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereNotInRaw(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereInSub(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereNotInSub(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereInRaw(query: QueryBuilder, where: any[]): string {
		return ''
	}

	protected whereNull(query: QueryBuilder, where: any): string {
		return this.wrap(where.column) + ' is null'
	}

	// Compile a union aggregate query into SQL.
	protected compileUnionAggregate(query: QueryBuilder): string {
		const sql = this.compileAggregate(query, query.aggregate)

		query.aggregate = undefined

		return `${sql} from (${this.compileSelect(query)}) as ${this.wrapTable('temp_table')}`
	}

	wrap(value: string | Expression, prefixAlias: boolean = false): string {
		if (value instanceof Expression) {
			return this.getValue(value)
		}

		if (value.toString().indexOf(' as ') !== -1) {
			return this.wrapAliasedValue(value, prefixAlias)
		}

		if (this.isJsonSelector(value)) {
			return this.wrapJsonSelector(value)
		}

		return this.wrapSegments(value.toString().split('.'))
	}

	protected isJsonSelector(value: string): boolean {
		return value.indexOf('->') > -1
	}

	protected wrapJsonSelector(value: string): string {
		throw new Error('This database engine does not support JSON operations.')
	}

	// Concatenate an array of segments, removing empties.
	protected concatenate(segments: any[]): string {
		return segments
			.filter(value => {
				return value !== ''
			})
			.join(' ')
	}
}
