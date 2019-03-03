import { QueryBuilder } from '../QueryBuilder'
import { Expression } from '../Expression'
import { BaseGrammar } from '../../BaseGrammar'
import { ucfirst, Collection } from '../../Utils'
import { Bindings } from '../Bindings'
import { JoinClause } from '../JoinClause'
import { WhereClause } from '../WhereClause'

export class QueryGrammar extends BaseGrammar {
	protected operators = []

	protected selectComponents = [
		'aggregate',
		'columns',
		'fromTable',
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
		if (query.columns.length === 0) {
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
		// If the query is actually performing an aggregating select, we will let that
		// compiler handle the building of the select clauses, as it will need some
		// more syntax that is best handled by that function to keep things neat.
		if (query.aggregate) {
			return
		}

		const select = query.distinctSelect ? 'SELECT DISTINCT ' : 'SELECT '

		return select + this.columnize(columns)
	}

	protected compileFromTable(query: QueryBuilder, table: string): string {
		// return ''
		return 'FROM ' + this.wrapTable(table)
	}

	protected compileJoins(query: QueryBuilder, joins: any[]): string {
		return ''
	}

	/**
	 * Compile the "where" portions of the query.
	 */
	protected compileWheres(query: QueryBuilder): string {
		// Each type of where clauses has its own compiler function which is responsible
		// for actually creating the where clauses SQL. This helps keep the code nice
		// and maintainable since each clause has a very small method that it uses.
		if (!query.wheres) {
			return ''
		}

		// If we actually have some where clauses, we will strip off the first boolean
		// operator, which is added by the query builders for convenience so we can
		// avoid checking for the first clauses in each of the compilers methods.
		const sql = this.compileWheresToArray(query)
		if (sql.length > 0) {
			return this.concatenateWhereClauses(query, sql)
		}

		return ''
	}

	/**
	 * Get an array of all the where clauses for the query.
	 */
	protected compileWheresToArray(query: QueryBuilder): any[] {
		return new Collection(query.wheres)
			.map(where => {
				return where.bool + ' ' + (this as any)['where' + where.type](query, where)
			})
			.all()
	}

	/**
	 * Format the where clause statements into one string.
	 */
	protected concatenateWhereClauses(query: QueryBuilder, sql: string[]): string {
		const conjunction = query instanceof JoinClause ? 'ON' : 'WHERE'

		// $conjunction = $query instanceof JoinClause ? 'on' : 'where';
		// return $conjunction.' '.$this -> removeLeadingBoolean(implode(' ', $sql));
		return conjunction + ' ' + this.removeLeadingBoolean(sql.join(' '))
	}

	/**
	 * Compile a raw where clause.
	 */
	protected whereRaw(query: QueryBuilder, where: WhereClause): string {
		return String(where.sql)
	}

	/**
	 * Compile a basic where clause.
	 */
	protected whereBasic(query: QueryBuilder, where: WhereClause): string {
		const value = this.parameter(where.values)

		return `${this.wrap(where.column!)} ${where.operator} ${value}`
	}

	/**
	 * Compile a "where in" clause.
	 */
	protected whereIn(query: QueryBuilder, where: WhereClause): string {
		if (where.values instanceof Array && where.values.length > 0) {
			return `${this.wrap(where.column!)} IN (${this.parameterize(where.values)})`
		}

		return '0 = 1'
	}

	/**
	 * Compile a "where not in" clause.
	 */
	protected whereNotIn(query: QueryBuilder, where: WhereClause): string {
		if (where.values instanceof Array && where.values.length > 0) {
			return `${this.wrap(where.column!)} NOT IN (${this.parameterize(where.values)})`
		}

		return '1 = 1'
	}

	/**
	 * Compile a "where not in raw" clause.
	 *
	 * For safety, whereIntegerInRaw ensures this method is only used with integer values.
	 */
	protected whereNotInRaw(query: QueryBuilder, where: WhereClause): string {
		if (where.values instanceof Array && where.values.length > 0) {
			return `${this.wrap(where.column!)} NOT IN (${where.values.join(', ')})`
		}

		return '1 = 1'
	}

	/**
	 * Compile a where in sub-select clause.
	 */
	protected whereInSub(query: QueryBuilder, where: WhereClause): string {
		return `${this.wrap(where.column!)} IN (${this.compileSelect(where.query)})`
	}

	protected whereNotInSub(query: QueryBuilder, where: WhereClause): string {
		return ''
	}

	protected whereInRaw(query: QueryBuilder, where: WhereClause): string {
		return ''
	}

	/**
	 * Compile a "where null" clause.
	 */
	protected whereNull(query: QueryBuilder, where: WhereClause): string {
		return this.wrap(where.column!) + ' IS NULL'
	}

	/**
	 * Compile a "where not null" clause.
	 */
	protected whereNotNull(query: QueryBuilder, where: WhereClause): string {
		return this.wrap(where.column!) + ' IS NOT NULL'
	}

	// Compile a union aggregate query into SQL.
	protected compileUnionAggregate(query: QueryBuilder): string {
		const sql = this.compileAggregate(query, query.aggregate)

		query.aggregate = undefined

		return `${sql} FROM (${this.compileSelect(query)}) AS ${this.wrapTable('temp_table')}`
	}

	/**
	 * Compile an insert statement into SQL.
	 */
	compileInsert(query: QueryBuilder, values: any[]): string {
		// Essentially we will force every insert to be treated as a batch insert which
		// simply makes creating the SQL easier for us since we can utilize the same
		// basic routine regardless of an amount of records given to us to insert.
		const table = this.wrapTable(query.fromTable)
		if (values[0] && !(values instanceof Array)) {
			values = [values]
		}

		const columns = this.columnize(values[0])
		// We need to build a list of parameter place-holders of values that are bound
		// to the query. Each insert should have the exact same amount of parameter
		// bindings so we will loop through the record and parameterize them all.
		const parameters = new Collection(values)
			.map(record => {
				return '(' + this.parameterize(record) + ')'
			})
			.join(', ')

		return `INSERT INTO ${table} (${columns}) VALUES ${parameters}`
	}

	/**
	 * Prepare the bindings for an update statement.
	 */
	prepareBindingsForUpdate(bindings: Bindings, values: any[]): any[] {
		const cleanBindings = new Collection(bindings)
			.except(['join', 'select'])
			.flatten()
			.all()

		return [...bindings.join, ...values, ...cleanBindings]
	}

	/**
	 * Compile a delete statement into SQL.
	 */
	compileDelete(query: QueryBuilder): string {
		const wheres = query.wheres instanceof Array ? this.compileWheres(query) : ''

		return `DELETE FROM ${this.wrapTable(query.fromTable)} ${wheres}`.trim()
	}

	/**
	 * Prepare the bindings for a delete statement.
	 */
	prepareBindingsForDelete(bindings: Bindings): any[] {
		return new Collection(bindings).all()
	}

	/**
	 * Determine if the grammar supports savepoints.
	 */
	supportsSavepoints(): boolean {
		return true
	}

	/**
	 * Compile the SQL statement to define a savepoint.
	 */
	compileSavepoint(name: string): string {
		return 'SAVEPOINT ' + name
	}

	/**
	 * Compile the SQL statement to execute a savepoint rollback.
	 */
	compileSavepointRollBack(name: string): string {
		return 'ROLLBACK TO SAVEPOINT ' + name
	}

	/**
	 * Wrap a value in keyword identifiers.
	 */
	wrap(value: string | string[] | Expression, prefixAlias: boolean = false): string {
		if (value instanceof Expression) {
			return this.getValue(value)
		}

		if (value.toString().indexOf(' as ') !== -1) {
			return this.wrapAliasedValue(value.toString(), prefixAlias)
		}

		if (this.isJsonSelector(value.toString())) {
			return this.wrapJsonSelector(value.toString())
		}

		return this.wrapSegments(value.toString().split('.'))
	}

	/**
	 * Wrap the given JSON selector.
	 */
	protected wrapJsonSelector(value: string): string {
		throw new Error('This database engine does not support JSON operations.')
	}

	/**
	 * Determine if the given string is a JSON selector.
	 */
	protected isJsonSelector(value: string): boolean {
		return value.indexOf('->') > -1
	}

	// Concatenate an array of segments, removing empties.
	protected concatenate(segments: any): string {
		let result = ''

		for (const key in segments) {
			if (segments.hasOwnProperty(key)) {
				const element = segments[key]

				if (element !== '') {
					result += element + ' '
				}
			}
		}

		return result.trim()
	}

	/**
	 * Remove the leading boolean from a statement.
	 */
	protected removeLeadingBoolean(value: string): string {
		return value.replace(/and |or /i, '')
	}

	/**
	 * Get the grammar specific operators.
	 */
	public getOperators(): string[] {
		return this.operators
	}
}
