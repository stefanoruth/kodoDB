import { QueryBuilder, JoinClause } from '../QueryBuilder'
import { Expression } from '../Expression'
import { BaseGrammar } from '../../BaseGrammar'
import { Str, Collection } from '../../Utils'
import { Bindings } from '../Bindings'
import { WhereClause } from '../WhereClause'
import { QueryGroup } from '../QueryComponents'

export class QueryGrammar extends BaseGrammar {
	/**
	 * The grammar specific operators.
	 */
	protected operators = []

	/**
	 * The components that make up a select clause.
	 */
	protected selectComponents = [
		'aggregate',
		'columns',
		'fromTable',
		'joins',
		'wheres',
		'groups',
		'havings',
		'orders',
		'limitRecords',
		'offsetRecords',
		'unions',
		'lock',
	]

	/**
	 * Compile a select query into SQL.
	 */
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

	/**
	 * Compile the components necessary for a select clause.
	 */
	protected compileComponents(query: QueryBuilder): any[] {
		const sql: any = {}

		this.selectComponents.forEach((component: string) => {
			// To compile the query, we'll spin through each component of the query and
			// see if that component exists. If it does we'll just call the compiler
			// function for the component which is responsible for making the SQL.
			const method = 'compile' + Str.ucfirst(component)
			const comp = (query as any)[component]
			const isArray = comp instanceof Array

			console.log(method, comp)

			if ((isArray && comp.length > 0) || (!isArray && comp)) {
				if (typeof (this as any)[method] === 'function') {
					sql[component] = (this as any)[method](query, (query as any)[component])
				} else {
					console.log(`QueryGrammar: ${method}`)
				}
			}
		})

		return sql
	}

	/**
	 * Compile an aggregated select clause.
	 */
	compileAggregate(query: QueryBuilder, aggregate: any): string {
		let column = this.columnize(aggregate.columns)
		// If the query has a "distinct" constraint and we're not asking for all columns
		// we need to prepend "distinct" onto the column name so that the query takes
		// it into account when it performs the aggregating operations on the data.
		if (query.distinct && column !== '*') {
			column = 'DISTINCT ' + column
		}

		return `SELECT ${aggregate.function}(${column}) AS AGGREGATE`
	}

	/**
	 * Compile the "select *" portion of the query.
	 */
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

	/**
	 * Compile the "from" portion of the query.
	 */
	protected compileFromTable(query: QueryBuilder, table: string): string {
		return 'FROM ' + this.wrapTable(table)
	}

	/**
	 * Compile the "join" portions of the query.
	 */
	protected compileJoins(query: QueryBuilder, joins: JoinClause[]): string {
		return new Collection(joins)
			.map((join: JoinClause) => {
				const table = this.wrapTable(join.table)
				const nestedJoins = join.joins.length > 0 ? ' ' + this.compileJoins(query, join.joins) : ' '
				const tableAndNestedJoins = join.joins.length > 0 ? `${table}.${nestedJoins}` : table
				return `${join.type} JOIN ${tableAndNestedJoins} ${this.compileWheres(join)}`.trim()
			})
			.join(' ')
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
				const method = 'where' + Str.ucfirst(where.type)

				if (typeof (this as any)[method] !== 'function') {
					throw new Error(`Method is missing: ${method}`)
				}

				return where.bool + ' ' + (this as any)[method](query, where)
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

	/**
	 * Compile a where not in sub-select clause.
	 */
	protected whereNotInSub(query: QueryBuilder, where: WhereClause): string {
		return `${this.wrap(where.column!)} NOT IN (${this.compileSelect(where.query)})`
	}

	/**
	 * Compile a "where in raw" clause.
	 *
	 * For safety, whereIntegerInRaw ensures this method is only used with integer values.
	 */
	protected whereInRaw(query: QueryBuilder, where: WhereClause): string {
		if (where.values instanceof Array && where.values.length > 0) {
			return `${this.wrap(where.column!)} IN (${where.values.join(', ')})`
		}
		return '0 = 1'
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

	/**
	 * Compile a "between" where clause.
	 */
	protected whereBetween(query: QueryBuilder, where: WhereClause): string {
		const between = where.not ? 'NOT BETWEEN' : 'BETWEEN'
		const min = this.parameter(where.values[0])
		const max = this.parameter(where.values[where.values.length - 1])

		return `${this.wrap(where.column!)} ${between} ${min} AND ${max}`
	}

	/**
	 * Compile a where clause comparing two columns..
	 */
	protected whereColumn(query: QueryBuilder, where: WhereClause): string {
		return `${this.wrap(where.first)} ${where.operator} ${this.wrap(where.second)}`
	}

	/**
	 * Compile a nested where clause.
	 */
	protected whereNested(query: QueryBuilder, where: WhereClause): string {
		// Here we will calculate what portion of the string we need to remove. If this
		// is a join clause query, we need to remove the "on" portion of the SQL and
		// if it is a normal query we need to take the leading "where" of queries.
		const offset = query instanceof JoinClause ? 3 : 6

		return `(${this.compileWheres(where.query).substr(offset)})`
	}

	/**
	 * Compile the "group by" portions of the query.
	 */
	protected compileGroups(query: QueryBuilder, groups: QueryGroup[]): string {
		return 'GROUP BY ' + this.columnize(groups)
	}

	// /**
	//  * Compile the "having" portions of the query.
	//  */
	// protected compileHavings(query: QueryBuilder, havings: any[]): string {
	// 	// const sql = implode(' ', array_map([$this, 'compileHaving'], havings));
	// 	// return 'having '+this.removeLeadingBoolean(sql);
	// 	return ''
	// }

	// /**
	//  * Compile a single having clause.
	//  */
	// protected compileHaving(having: any): string {
	// 	// If the having clause is "raw", we can just return the clause straight away
	// 	// without doing any more processing on it. Otherwise, we will compile the
	// 	// clause into SQL based on the components that make it up from builder.
	// 	// if ($having['type'] === 'Raw') {
	// 	//     return $having['boolean'].' '.$having['sql'];
	// 	// } elseif($having['type'] === 'between') {
	// 	//     return $this -> compileHavingBetween($having);
	// 	// }
	// 	// return $this -> compileBasicHaving($having);
	// 	return ''
	// }

	// /**
	//  * Compile a basic having clause.
	//  */
	// protected compileBasicHaving(having: any): string {
	// 	// $column = $this -> wrap($having['column']);
	// 	// $parameter = $this -> parameter($having['value']);
	// 	// return $having['boolean'].' '.$column.' '.$having['operator'].' '.$parameter;
	// 	return ''
	// }

	// /**
	//  * Compile a "between" having clause.
	//  */
	// protected compileHavingBetween(having: any): string {
	// 	// $between = $having['not'] ? 'not between' : 'between';
	// 	// $column = $this -> wrap($having['column']);
	// 	// $min = $this -> parameter(head($having['values']));
	// 	// $max = $this -> parameter(last($having['values']));
	// 	// return $having['boolean'].' '.$column.' '.$between.' '.$min.' and '.$max;
	// 	return ''
	// }

	/**
	 * Compile the "order by" portions of the query.
	 */
	protected compileOrders(query: QueryBuilder, orders: any[]): string {
		if (orders.length > 0) {
			return 'ORDER BY ' + this.compileOrdersToArray(query, orders).join(', ')
		}
		return ''
	}

	/**
	 * Compile the query orders to an array.
	 */
	protected compileOrdersToArray(query: QueryBuilder, orders: any[]): any[] {
		return orders.map(order => {
			if (order.sql) {
				return order.sql
			}

			return `${this.wrap(order.column)} ${order.direction}`
		})
	}

	/**
	 * Compile the random statement into SQL.
	 */
	compileRandom(seed: string): string {
		return 'RANDOM()'
	}

	/**
	 * Compile the "limit" portions of the query.
	 */
	protected compileLimitRecords(query: QueryBuilder, limit: number): string {
		return 'LIMIT ' + limit
	}

	/**
	 * Compile the "offset" portions of the query.
	 */
	protected compileOffset(query: QueryBuilder, offset: number): string {
		return 'OFFSET ' + offset
	}

	/**
	 * Compile the "union" queries attached to the main query.
	 */
	protected compileUnions(query: QueryBuilder): string {
		const sql: string[] = []
		query.unions.forEach(union => {
			sql.push(this.compileUnion(union))
		})
		if (query.unionOrders) {
			sql.push(this.compileOrders(query, query.unionOrders))
		}
		if (query.unionLimit) {
			sql.push(this.compileLimitRecords(query, query.unionLimit))
		}
		if (query.unionOffset) {
			sql.push(this.compileOffset(query, query.unionOffset))
		}
		return sql
			.map((path: string) => path.trimLeft())
			.filter((path: string) => path.length > 0)
			.join(' ')
			.trimLeft()
	}

	/**
	 * Compile a single union statement.
	 */
	protected compileUnion(union: any): string {
		const conjunction = union.all ? ' UNION ALL ' : ' UNION '

		return conjunction + union.query.toSql()
	}

	/**
	 * Compile a union aggregate query into SQL.
	 */
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
	wrap = (value: string | string[] | Expression | Expression[], prefixAlias: boolean = false): string | number => {
		if (this.isExpression(value)) {
			return this.getValue(value)
		}

		if (
			value
				.toString()
				.toLowerCase()
				.indexOf(' as ') !== -1
		) {
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

	/**
	 * Concatenate an array of segments, removing empties.
	 */
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
