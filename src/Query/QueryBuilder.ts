import { Connection } from '../Connections/Connection'
import { QueryGrammar } from './Grammars/QueryGrammar'
import { QueryProcessor } from './Processors/QueryProcessor'
import { Collection, tap } from '../Utils'
import { Expression } from './Expression'
import { Arr } from '../Utils/Arr'
import { Operators, OperatorType } from './Operators'
import { QueryObj } from './QueryObj'
import { WhereBoolean, Bindings, BindingKeys, BindingType, OrderDirection, WhereClause } from './Components'

type QueryFn<T> = (sub: T) => any
// type JoinFn = (join: JoinClause) => void

export type Column = string | Expression | Array<string | Expression>

export class QueryBuilder {
	/**
	 * The database connection instance.
	 */
	connection: Connection

	/**
	 * The database query grammar instance.
	 */
	grammar: QueryGrammar

	/**
	 * The database query post processor instance.
	 */
	processor: QueryProcessor

	/**
	 * An aggregate function and column to be run.
	 */
	queryObj: QueryObj = new QueryObj()

	/**
	 * All of the available clause operators.
	 */
	operators: string[] = Operators

	/**
	 * Create a new query builder instance.
	 */
	constructor(connection: Connection, grammar?: QueryGrammar, processor?: QueryProcessor) {
		this.connection = connection
		this.grammar = grammar || connection.getQueryGrammar()
		this.processor = processor || connection.getPostProcessor()
	}

	/**
	 * Set the columns to be selected.
	 */
	select(column: Column = ['*'], ...columns: string[]): this {
		this.queryObj.columns = column instanceof Array ? column : [column, ...columns]

		return this
	}

	/**
	 * Add a subselect expression to the query.
	 */
	selectSub(query: QueryBuilder | string, as: string) {
		const [subQuery, bindings] = this.createSub(query)

		return this.selectRaw(`(${subQuery}) as ${this.grammar.wrap(as)}`, bindings)
	}

	/**
	 * Add a new "raw" select expression to the query.
	 */
	selectRaw(expression: string, bindings: any[] = []): this {
		this.addSelect(new Expression(expression))
		if (bindings) {
			this.addBinding(bindings, 'select')
		}
		return this
	}

	/**
	 * Makes "from" fetch from a subquery.n
	 */
	fromSub(query: QueryBuilder | string, as: string): this {
		const [subQuery, bindings] = this.createSub(query)
		return this.fromRaw(`(${subQuery}) as ${this.grammar.wrap(as)}`, bindings)
	}

	/**
	 * Add a raw from clause to the query.
	 */
	fromRaw(expression: string, bindings: any[] = []): this {
		this.queryObj.from = new Expression(expression).toString().toString()
		this.addBinding(bindings, 'from')
		return this
	}

	/**
	 * Creates a subquery and parse it.
	 */
	protected createSub(query: QueryBuilder | string | QueryFn<this>): [string, any[]] {
		// If the given query is a Closure, we will execute it while passing in a new
		// query instance to the Closure. This will give the developer a chance to
		// format and work with the query before we cast it to a raw SQL string.
		if (typeof query === 'function') {
			const callback = query
			query = this.forSubQuery()
			callback(query as any)
		}

		return this.parseSub(query)
	}

	/**
	 * Parse the subquery into SQL and bindings.
	 *
	 * @param  mixed  query
	 * @return array
	 */
	protected parseSub(query: QueryBuilder | string): [string, any[]] {
		if (query instanceof QueryBuilder) {
			return [query.toSql(), query.getBindings()]
		} else if (typeof query === 'string') {
			return [query, []]
		} else {
			throw new Error('InvalidArgumentException')
		}
	}

	/**
	 * Add a new select column to the query.
	 */
	addSelect(column: Column, ...columns: string[]): this {
		column = column instanceof Array ? column : [column, ...columns]

		this.queryObj.columns = this.queryObj.columns.concat(column)

		return this
	}

	/**
	 * Force the query to only return distinct results.
	 */
	distinct(): this {
		this.queryObj.distinct = true

		return this
	}

	/**
	 * Set the table which the query is targeting.
	 */
	from(table: string): this {
		this.queryObj.from = table

		return this
	}

	/**
	 * Add a join clause to the query.
	 */
	join(
		table: string | Expression,
		first: string | QueryFn<JoinClause>,
		operator?: string,
		second?: string,
		type: string = 'INNER',
		where: boolean = false
	): this {
		const join: JoinClause = this.newJoinClause(this, type.toUpperCase(), table.toString().toString())
		// If the first "column" of the join is really a Closure instance the developer
		// is trying to build a join with a complex "on" clause containing more than
		// one condition, so we'll add the join and call a Closure with the query.
		if (typeof first === 'function') {
			first(join)
			this.queryObj.joins.push(join.queryObj)
			this.addBinding(join.getBindings(), 'join')
		}
		// If the column is simply a string, we can assume the join simply has a basic
		// "on" clause with a single condition. So we will just build the join with
		// this simple join clauses attached to it. There is not a join callback.
		else {
			const method = where ? 'where' : 'on'
			const joinObj: JoinClause = (join as any)[method](first, operator, second)
			this.queryObj.joins.push(joinObj.queryObj)
			this.addBinding(join.getBindings(), 'join')
		}
		return this
	}

	/**
	 * Add a "join where" clause to the query.
	 */
	joinWhere(
		table: string,
		first: QueryFn<JoinClause> | string,
		operator: OperatorType,
		second: string,
		type = 'INNER'
	): this {
		return this.join(table, first, operator, second, type, true)
	}

	/**
	 * Add a subquery join clause to the query.
	 */
	joinSub(
		query: QueryBuilder | string,
		as: string,
		first: QueryFn<JoinClause> | string,
		operator?: OperatorType,
		second?: string,
		type = 'INNER', // TODO type interface for Join types
		where: boolean = false
	): this {
		const [subQuery, bindings] = this.createSub(query)
		const expression = `(${subQuery}) AS ${this.grammar.wrap(as)}`
		console.log(expression)
		this.addBinding(bindings, 'join')
		console.log(new Expression(expression))
		return this.join(new Expression(expression), first, operator, second, type, where)
	}

	/**
	 * Add a left join to the query.
	 */
	leftJoin(table: string, first: QueryFn<JoinClause> | string, operator?: OperatorType, second?: string): this {
		return this.join(table, first, operator, second, 'LEFT')
	}

	/**
	 * Add a "join where" clause to the query.
	 */
	leftJoinWhere(table: string, first: QueryFn<JoinClause> | string, operator: OperatorType, second: string): this {
		return this.joinWhere(table, first, operator, second, 'LEFT')
	}

	/**
	 * Add a subquery left join to the query.
	 */
	leftJoinSub(
		query: QueryBuilder | string,
		as: string,
		first: QueryFn<JoinClause> | string,
		operator?: OperatorType,
		second?: string
	): this {
		return this.joinSub(query, as, first, operator, second, 'LEFT')
	}

	/**
	 * Add a right join to the query.
	 */
	rightJoin(table: string, first: QueryFn<JoinClause> | string, operator?: OperatorType, second?: string): this {
		return this.join(table, first, operator, second, 'RIGHT')
	}

	/**
	 * Add a "right join where" clause to the query.
	 */
	rightJoinWhere(table: string, first: QueryFn<JoinClause> | string, operator: OperatorType, second: string): this {
		return this.joinWhere(table, first, operator, second, 'RIGHT')
	}

	/**
	 * Add a subquery right join to the query.
	 */
	rightJoinSub(
		query: QueryBuilder | string,
		as: string,
		first: QueryFn<JoinClause> | string,
		operator?: OperatorType,
		second?: string
	): this {
		return this.joinSub(query, as, first, operator, second, 'RIGHT')
	}

	/**
	 * Add a "cross join" clause to the query.
	 */
	crossJoin(table: string, first?: QueryFn<JoinClause> | string, operator?: OperatorType, second?: string): this {
		if (first) {
			return this.join(table, first, operator, second, 'CROSS')
		}
		this.queryObj.joins.push(this.newJoinClause(this, 'CROSS', table).queryObj)
		return this
	}

	/**
	 * Get a new join clause.
	 */
	protected newJoinClause(parentQuery: QueryBuilder, type: string, table: string): JoinClause {
		return new JoinClause(parentQuery, type, table)
	}

	/**
	 * Add a basic where clause to the query.
	 */
	where(column: Column | QueryFn<this> | any[], operator?: any, value?: any, bool: WhereBoolean = 'AND'): this {
		// If the column is an array, we will assume it is an array of key-value pairs
		// and can add them each as a where clause. We will maintain the boolean we
		// received when the method was called and pass it into the nested where.
		if (column instanceof Array) {
			return this.addArrayOfWheres(column, bool)
		}

		// Here we will make some assumptions about the operator. If only 2 values are
		// passed to the method, we will assume that the operator is an equals sign
		// and keep going. Otherwise, we'll require the operator to be passed in.
		;[value, operator] = this.prepareValueAndOperator(value, operator, typeof value === 'undefined')

		// If the columns is actually a Closure instance, we will assume the developer
		// wants to begin a nested where statement which is wrapped in parenthesis.
		// We'll add that Closure to the query then return back out immediately.
		if (typeof column === 'function') {
			return this.whereNested(column, bool)
		}

		// If the given operator is not found in the list of valid operators we will
		// assume that the developer is just short-cutting the '=' operators and
		// we will set the operators to '=' and set the values appropriately.
		if (this.invalidOperator(operator)) {
			;[value, operator] = [operator, '=']
		}

		// If the value is a Closure, it means the developer is performing an entire
		// sub-select within the query and we will need to compile the sub-select
		// within the where clause to get the appropriate query record results.
		if (typeof value === 'function') {
			return this.whereSub(column, operator, value, bool)
		}

		// If the value is "null", we will just assume the developer wants to add a
		// where null clause to the query. So, we will allow a short-cut here to
		// that method for convenience so the developer doesn't have to check.
		if (value === null) {
			return this.whereNull(column, bool, operator !== '=')
		}

		// If the column is making a JSON reference we'll check to see if the value
		// is a boolean. If it is, we'll add the raw boolean string as an actual
		// value to the query to ensure this is properly handled by the query.
		if (
			column
				.toString()
				.toString()
				.indexOf('->') > -1 &&
			typeof value === 'boolean'
		) {
			value = new Expression(value ? 'true' : 'false')
		}

		// Now that we are working with just a simple query we can put the elements
		// in our array and add the query binding to our array of bindings that
		// will be bound to each SQL statements when it is finally executed.
		const type = 'Basic'
		this.queryObj.wheres.push({ type, column, operator, values: value, bool })

		if (!(value instanceof Expression)) {
			this.addBinding(value, 'where')
		}

		return this
	}

	/**
	 * Add an array of where clauses to the query.
	 */
	protected addArrayOfWheres(columns: any[], bool: WhereBoolean, method: string = 'where'): this {
		return this.whereNested((query: QueryBuilder | JoinClause) => {
			columns.forEach((value, key) => {
				if (value instanceof Array) {
					;(query as any)[method](...value)
				} else {
					;(query as any)[method](key, '=', value, bool)
				}
			})
		}, bool)
	}

	/**
	 * Prepare the value and operator for a where clause.
	 */
	prepareValueAndOperator(value: any, operator: string, useDefault: boolean = false): any[] {
		if (useDefault) {
			return [operator, '=']
		} else if (this.invalidOperatorAndValue(operator, value)) {
			throw new Error('Illegal operator and value combination.')
		}
		return [value, operator]
	}

	/**
	 * Determine if the given operator and value combination is legal.
	 *
	 * Prevents using Null values with invalid operators.
	 */
	protected invalidOperatorAndValue(operator: string, value: any): boolean {
		return value === undefined && this.operators.indexOf(operator) > -1 && ['=', '<>', '!='].indexOf(operator) !== -1
	}

	/**
	 * Determine if the given operator is supported.
	 */
	protected invalidOperator(operator: string): boolean {
		operator = operator.toLowerCase()

		return this.operators.indexOf(operator) === -1 && this.grammar.getOperators().indexOf(operator) === -1
	}

	/**
	 * Add an "or where" clause to the query.
	 */
	orWhere(column: Column | QueryFn<this>, operator?: any, value?: any): this {
		;[value, operator] = this.prepareValueAndOperator(value, operator, typeof value === 'undefined')

		return this.where(column, operator, value, 'OR')
	}

	/**
	 * Add a "where" clause comparing two columns to the query.
	 */
	whereColumn(first: string | string[] | string[][], operator?: any, second?: any, bool: WhereBoolean = 'AND'): this {
		// If the column is an array, we will assume it is an array of key-value pairs
		// and can add them each as a where clause. We will maintain the boolean we
		// received when the method was called and pass it into the nested where.
		if (first instanceof Array) {
			return this.addArrayOfWheres(first, bool, 'whereColumn')
		}
		// If the given operator is not found in the list of valid operators we will
		// assume that the developer is just short-cutting the '=' operators and
		// we will set the operators to '=' and set the values appropriately.
		if (this.invalidOperator(operator)) {
			;[second, operator] = [operator, '=']
		}
		// Finally, we will add this where clause into this array of clauses that we
		// are building for the query. All of them will be compiled via a grammar
		// once the query is about to be executed and run against the database.
		const type = 'Column'

		this.queryObj.wheres.push({ type, first, operator, second, bool })

		return this
	}

	/**
	 * Add an "or where" clause comparing two columns to the query.
	 */
	orWhereColumn(first: string | string[] | string[][], operator?: any, second?: any): this {
		return this.whereColumn(first, operator, second, 'OR')
	}

	/**
	 * Add a raw where clause to the query.
	 */
	whereRaw(sql: string, bindings: any[] = [], bool: WhereBoolean = 'AND'): this {
		this.queryObj.wheres.push({ type: 'Raw', sql, bool })
		this.addBinding(bindings, 'where')

		return this
	}

	/**
	 * Add a raw or where clause to the query.
	 */
	orWhereRaw(sql: string, bindings: any[]): this {
		return this.whereRaw(sql, bindings, 'OR')
	}

	/**
	 * Add a "where in" clause to the query.
	 */
	whereIn(column: Column, values: any, bool: WhereBoolean = 'AND', not: boolean = false): this {
		const type = not ? 'NotIn' : 'In'

		// If the value is a query builder instance we will assume the developer wants to
		// look for any values that exists within this given query. So we will add the
		// query accordingly so that this query is properly executed when it is run.
		if (values instanceof QueryBuilder || typeof values === 'function') {
			const [query, bindings] = this.createSub(values)
			values = [new Expression(query)]
			this.addBinding(bindings, 'where')
		}

		// Next, if the value is Arrayable we need to cast it to its raw array form so we
		// have the underlying array value instead of an Arrayable object which is not
		// able to be added as a binding, etc. We will then add to the wheres array.
		if (values instanceof Collection) {
			values = values.toArray()
		}

		this.queryObj.wheres.push({ type, column, values, bool })

		// Finally we'll add a binding for each values unless that value is an expression
		// in which case we will just skip over it since it will be the query as a raw
		// string and not as a parameterized place-holder to be replaced by the PDO.
		this.addBinding(this.cleanBindings(values), 'where')

		return this
	}

	/**
	 * Add an "or where in" clause to the query.
	 */
	orWhereIn(column: Column, values: any): this {
		return this.whereIn(column, values, 'OR')
	}

	/**
	 * Add a "where not in" clause to the query.
	 */
	whereNotIn(column: Column, values: any, bool: WhereBoolean = 'AND'): this {
		return this.whereIn(column, values, bool, true)
	}
	/**
	 * Add an "or where not in" clause to the query.
	 */
	orWhereNotIn(column: Column, values: any): this {
		return this.whereNotIn(column, values, 'OR')
	}

	/**
	 * Add a where in with a sub-select to the query.
	 */
	protected whereInSub(column: Column, callback: QueryFn<this>, bool: WhereBoolean, not: boolean): this {
		const type = not ? 'NotInSub' : 'InSub'
		// To create the exists sub-select, we will actually create a query and call the
		// provided callback with the query so the developer may set any of the query
		// conditions they want for the in clause, then we'll put it in this array.
		const query = this.forSubQuery()
		callback(query as any)

		this.queryObj.wheres.push({ type, column, query: query.queryObj, bool })
		this.addBinding(query.getBindings, 'where')

		return this
	}

	/**
	 * Add an external sub-select to the query.
	 */
	protected whereInExistingQuery(column: Column, query: QueryBuilder, bool: WhereBoolean, not: boolean): this {
		const type = not ? 'NotInSub' : 'InSub'

		this.queryObj.wheres.push({ type, column, query: query.queryObj, bool })
		this.addBinding(query.getBindings(), 'where')

		return this
	}

	/**
	 * Add a "where in raw" clause for integer values to the query.
	 */
	whereIntegerInRaw(column: Column, values: any[], bool: WhereBoolean = 'AND', not: boolean = false): this {
		const type = not ? 'NotInRaw' : 'InRaw'

		values = values.map(value => {
			return parseInt(value, 10)
		})

		this.queryObj.wheres.push({ type, column, values, bool })

		return this
	}

	/**
	 * Add a "where not in raw" clause for integer values to the query.
	 */
	whereIntegerNotInRaw(column: Column, values: any, bool: WhereBoolean = 'AND'): this {
		return this.whereIntegerInRaw(column, values, bool, true)
	}

	/**
	 * Add a "where null" clause to the query.
	 */
	whereNull(column: Column, bool: WhereBoolean = 'AND', not: boolean = false): this {
		const type = not ? 'NotNull' : 'Null'
		this.queryObj.wheres.push({ type, column, bool })

		return this
	}
	/**
	 * Add an "or where null" clause to the query.
	 */
	orWhereNull(column: Column): this {
		return this.whereNull(column, 'OR')
	}

	/**
	 * Add a "where not null" clause to the query.
	 */
	whereNotNull(column: Column, bool: WhereBoolean = 'AND'): this {
		return this.whereNull(column, bool, true)
	}

	/**
	 * Add a "where date" statement to the query.
	 */
	whereDate(column: Column, operator: any, value?: any, bool: WhereBoolean = 'AND'): this {
		;[value, operator] = this.prepareValueAndOperator(value, operator, typeof value === 'undefined')

		if (value instanceof Date) {
			value = value.toDateString()
		}

		return this.addDateBasedWhere('Date', column, operator, value, bool)
	}

	/**
	 * Add a date based (year, month, day, time) statement to the query.
	 */
	protected addDateBasedWhere(
		type: string,
		column: Column,
		operator: string,
		value?: any,
		bool: WhereBoolean = 'AND'
	): this {
		this.queryObj.wheres.push({ column, type, bool, operator, values: value })

		if (!(value instanceof Expression)) {
			this.addBinding(value, 'where')
		}

		return this
	}

	/**
	 * Add a where between statement to the query.
	 */
	whereBetween(column: Column, values: any[], bool: WhereBoolean = 'AND', not: boolean = false): this {
		const type = 'Between'

		this.queryObj.wheres.push({ type, column, values, bool, not })
		this.addBinding(this.cleanBindings(values), 'where')

		return this
	}

	/**
	 * Add an or where between statement to the query.
	 */
	orWhereBetween(column: Column, values: any[]): this {
		return this.whereBetween(column, values, 'OR')
	}

	/**
	 * Add a where not between statement to the query.
	 */
	whereNotBetween(column: Column, values: any[], bool: WhereBoolean = 'AND'): this {
		return this.whereBetween(column, values, bool, true)
	}

	/**
	 * Add an or where not between statement to the query.
	 */
	orWhereNotBetween(column: Column, values: any[]): this {
		return this.whereNotBetween(column, values, 'OR')
	}

	/**
	 * Add an "or where not null" clause to the query.
	 */
	orWhereNotNull(column: Column): this {
		return this.whereNotNull(column, 'OR')
	}

	/**
	 * Add a nested where statement to the query.
	 */
	whereNested(callback: QueryFn<this>, bool: WhereBoolean = 'AND'): this {
		const query = this.forNestedWhere()

		callback(query as any)

		return this.addNestedWhereQuery(query, bool)
	}

	/**
	 * Create a new query instance for nested where condition.
	 */
	forNestedWhere(): QueryBuilder {
		return this.newQuery().from(this.queryObj.from)
	}

	/**
	 * Add another query builder as a nested where to the query builder.
	 */
	addNestedWhereQuery(query: QueryBuilder, bool: WhereBoolean = 'AND'): this {
		if (query.queryObj.wheres.length) {
			const type = 'Nested'
			this.queryObj.wheres.push({ type, query: query.queryObj, bool })
			this.addBinding(query.getRawBindings().where, 'where')
		}

		return this
	}

	/**
	 * Add a full sub-select to the query.
	 */
	protected whereSub(column: Column, operator: string, callback: QueryFn<this>, bool: WhereBoolean): this {
		const type = 'Sub'
		// Once we have the query instance we can simply execute it so it can add all
		// of the sub-select's conditions to itself, and then we can cache it off
		// in the array of where clauses for the "main" parent query instance.
		const query = this.forSubQuery()

		callback(query as any)

		this.queryObj.wheres.push({ type, column, operator, query: query.queryObj, bool })
		this.addBinding(query.getBindings(), 'where')

		return this
	}

	/**
	 * Add an exists clause to the query.
	 */
	whereExists(callback: QueryFn<this>, bool: WhereBoolean = 'AND', not: boolean = false): this {
		const query = this.forSubQuery()
		// Similar to the sub-select clause, we will create a new query instance so
		// the developer may cleanly specify the entire exists query and we will
		// compile the whole thing in the grammar and insert it into the SQL.
		callback(query as any)

		return this.addWhereExistsQuery(query, bool, not)
	}

	/**
	 * Add an or exists clause to the query.
	 */
	orWhereExists(callback: QueryFn<this>, not: boolean = false): this {
		return this.whereExists(callback, 'OR', not)
	}

	/**
	 * Add a where not exists clause to the query.
	 */
	whereNotExists(callback: QueryFn<this>, bool: WhereBoolean = 'AND') {
		return this.whereExists(callback, bool, true)
	}

	/**
	 * Add a where not exists clause to the query.
	 */
	orWhereNotExists(callback: QueryFn<this>): this {
		return this.orWhereExists(callback, true)
	}

	/**
	 * Add an exists clause to the query.
	 */
	addWhereExistsQuery(query: QueryBuilder, bool: WhereBoolean = 'AND', not: boolean = false): this {
		const type = not ? 'NotExists' : 'Exists'
		this.queryObj.wheres.push({ type, query: query.queryObj, bool })
		this.addBinding(query.getBindings(), 'where')

		return this
	}

	/**
	 * Add a "group by" clause to the query.
	 */
	groupBy(...groups: any[]): this {
		if (groups.length === 1 && groups[0] instanceof Array) {
			groups = groups[0]
		}

		groups.forEach(group => {
			this.queryObj.groups.push(group)
		})

		return this
	}

	/**
	 * Add a "having" clause to the query.
	 */
	having(column: Column, operator: any, value?: any, bool: WhereBoolean = 'AND'): this {
		const type = 'Basic'
			// Here we will make some assumptions about the operator. If only 2 values are
			// passed to the method, we will assume that the operator is an equals sign
			// and keep going. Otherwise, we'll require the operator to be passed in.
		;[value, operator] = this.prepareValueAndOperator(value, operator, typeof value === 'undefined')

		// If the given operator is not found in the list of valid operators we will
		// assume that the developer is just short-cutting the '=' operators and
		// we will set the operators to '=' and set the values appropriately.
		if (this.invalidOperator(operator)) {
			;[value, operator] = [operator, '=']
		}

		this.queryObj.havings.push({ type, column, operator, values: value, bool })

		if (!(value instanceof Expression)) {
			this.addBinding(value, 'having')
		}
		return this
	}

	/**
	 * Add a "or having" clause to the query.
	 */
	orHaving(column: Column, operator: any, value?: any): this {
		;[value, operator] = this.prepareValueAndOperator(value, operator, typeof value === 'undefined')
		return this.having(column, operator, value, 'OR')
	}

	/**
	 * Add a "having between " clause to the query.
	 */
	havingBetween(column: Column, values: any, bool: WhereBoolean = 'AND', not: boolean = false): this {
		const type = 'between'
		this.queryObj.havings.push({ type, column, values, bool, not })
		this.addBinding(this.cleanBindings(values), 'having')
		return this
	}

	/**
	 * Add a raw having clause to the query.
	 */
	havingRaw(sql: string, bindings: any[] = [], bool: WhereBoolean = 'AND'): this {
		const type = 'Raw'
		this.queryObj.havings.push({ type, sql, bool })
		this.addBinding(bindings, 'having')
		return this
	}

	/**
	 * Add a raw or having clause to the query.
	 */
	orHavingRaw(sql: string, bindings: any[] = []): this {
		return this.havingRaw(sql, bindings, 'OR')
	}

	/**
	 * Add an "order by" clause to the query.
	 */
	orderBy(column: string, direction: OrderDirection = 'asc'): this {
		const order = {
			column,
			direction: direction.toUpperCase(),
		}

		if (this.queryObj.unions.length > 0) {
			this.queryObj.unionOrders.push(order)
		} else {
			this.queryObj.orders.push(order)
		}

		return this
	}

	/**
	 * Add a descending "order by" clause to the query.
	 */
	orderByDesc(column: string): this {
		return this.orderBy(column, 'desc')
	}

	/**
	 * Add an "order by" clause for a timestamp to the query.
	 */
	latest(column: string = 'created_at'): this {
		return this.orderBy(column, 'desc')
	}

	/**
	 * Add an "order by" clause for a timestamp to the query.
	 */
	oldest(column: string = 'created_at'): this {
		return this.orderBy(column, 'asc')
	}

	/**
	 * Put the query's results in random order.
	 */
	inRandomOrder(seed: string = ''): this {
		return this.orderByRaw(this.grammar.compileRandom(seed))
	}
	/**
	 * Add a raw "order by" clause to the query.
	 */
	orderByRaw(sql: string, bindings: any[] = []): this {
		const type = 'Raw'

		if (this.queryObj.unions.length > 0) {
			this.queryObj.unionOrders.push({ type, sql })
		} else {
			this.queryObj.orders.push({ type, sql })
		}

		this.addBinding(bindings, 'order')
		return this
	}

	/**
	 * Alias to set the "offset" value of the query.
	 */
	skip(value: number): this {
		return this.offset(value)
	}

	/**
	 * Set the "offset" value of the query.
	 */
	offset(value: number): this {
		if (this.queryObj.unions.length > 0) {
			this.queryObj.unionOffset = Math.max(0, value)
		} else {
			this.queryObj.offset = Math.max(0, value)
		}

		return this
	}

	/**
	 * Alias to set the "limit" value of the query.
	 */
	take(value: number): this {
		return this.limit(value)
	}

	/**
	 * Set the "limit" value of the query.
	 */
	limit(value: number): this {
		if (value < 0) {
			return this
		}

		if (this.queryObj.unions.length > 0) {
			this.queryObj.unionLimit = value
		} else {
			this.queryObj.limit = value
		}

		return this
	}

	/**
	 * Set the limit and offset for a given page.
	 */
	forPage(page: number, perPage: number = 15): this {
		return this.skip((page - 1) * perPage).take(perPage)
	}

	/**
	 * Constrain the query to the next "page" of results after a given ID.
	 */
	forPageAfterId(perPage: number = 15, lastId: undefined | number = 0, column: string = 'id'): this {
		this.queryObj.orders = this.removeExistingOrdersFor(column)
		if (typeof lastId !== 'undefined') {
			this.where(column, '>', lastId)
		}
		return this.orderBy(column, 'asc').take(perPage)
	}

	/**
	 * Get an array with all orders with a given column removed.
	 */
	protected removeExistingOrdersFor(column: string): any[] {
		return new Collection(this.queryObj.orders)
			.reject(order => {
				if (order.column) {
					return order.column === column
				}

				return false
			})
			.values()
			.all()
	}

	/**
	 * Add a union statement to the query.
	 */
	union(query: QueryBuilder, all: boolean = false): this {
		if (typeof query === 'function') {
			const subQuery: (query: QueryBuilder) => void = query
			query = this.newQuery()

			subQuery(query)
		}

		this.queryObj.unions.push({ query: query.queryObj, all })
		this.addBinding(query.getBindings(), 'union')

		return this
	}

	/**
	 * Add a union all statement to the query.
	 */
	unionAll(query: QueryBuilder): this {
		return this.union(query, true)
	}

	/**
	 * Get the SQL representation of the query.
	 */
	toSql(): string {
		return this.grammar.compileSelect(this.queryObj)
	}

	/**
	 * Execute the query as a "select" statement.
	 */
	get(columns: string | string[] = ['*']): Collection {
		return new Collection(
			this.onceWithColumns(Arr.wrap(columns), () => {
				return this.processor.processSelect(this, this.runSelect())
			})
		)
	}

	/**
	 * Run the query as a "select" statement against the connection.
	 */
	protected runSelect() {
		return this.connection.select(this.toSql(), this.getBindings())
	}

	/**
	 * Get an array with the values of a given column.
	 */
	pluck(column: string, key?: string): Collection {
		// First, we will need to select the results of the query accounting for the
		// given columns / key. Once we have the results, we will be able to take
		// the results and get the exact data that was requested for the query.
		const queryResult = this.onceWithColumns(key ? [column, key] : [column], () => {
			return this.processor.processSelect(this, this.runSelect())
		})

		if (queryResult.length === 0) {
			return new Collection()
		}

		// If the columns are qualified with a table or have an alias, we cannot use
		// those directly in the "pluck" operations since the results from the DB
		// are only keyed by the column itself. We'll strip the table out here.
		column = this.stripTableForPluck(column)!
		key = this.stripTableForPluck(key)

		return queryResult[0] instanceof Array
			? this.pluckFromArrayColumn(queryResult, column, key)
			: this.pluckFromObjectColumn(queryResult, column, key)
	}

	/**
	 * Strip off the table name or alias from a column identifier.
	 */
	protected stripTableForPluck(column?: string): string | undefined {
		if (column === undefined) {
			return
		}

		const spliited = column.split(/\.| /)

		return spliited[spliited.length - 1]
	}

	/**
	 * Retrieve column values from rows represented as objects.
	 */
	protected pluckFromObjectColumn(queryResult: [], column: string, key?: string): Collection {
		const results: any[] = []

		if (!key) {
			queryResult.forEach(row => {
				results.push(row[column])
			})
		} else {
			queryResult.forEach(row => {
				results[row[key]] = row[column]
			})
		}

		return new Collection(results)
	}

	/**
	 * Retrieve column values from rows represented as arrays.
	 */
	protected pluckFromArrayColumn(queryResult: [], column: string, key?: string): Collection {
		const results: any[] = []

		if (!key) {
			queryResult.forEach(row => {
				results.push(row[column])
			})
		} else {
			queryResult.forEach(row => {
				results[row[key]] = row[column]
			})
		}

		return new Collection(results)
	}

	/**
	 * Retrieve the maximum value of a given column.
	 */
	max(column: string): number {
		return this.getAggregate('max', [column])
	}

	/**
	 * Execute an aggregate function on the database.
	 */
	getAggregate(functionName: string, columns: string[] = ['*']): any {
		const results = this.cloneWithout(this.queryObj.unions ? [] : ['columns'])
			.cloneWithoutBindings(this.queryObj.unions ? [] : ['select'])
			.setAggregate(functionName, columns)
			.get(columns)

		if (!results.isEmpty()) {
			return results.first().aggregate
		}
	}

	/**
	 * Set the aggregate property without running the query.
	 */
	protected setAggregate(functionName: string, columns: string[]): this {
		this.queryObj.aggregate = { functionName, columns }

		if (this.queryObj.groups.length === 0) {
			this.queryObj.orders = []
			this.queryObj.bindings.order = []
		}

		return this
	}

	/**
	 * Execute the given callback while selecting the given columns.
	 *
	 * After running the callback, the columns are reset to the original value.
	 */
	protected onceWithColumns(columns: string[], callback: () => any): any {
		const original = this.queryObj.columns.slice()

		if (!original) {
			this.queryObj.columns = columns
		}

		const result = callback()
		this.queryObj.columns = original
		return result
	}

	/**
	 * Insert a new record into the database.
	 */
	insert(values: any[]): boolean {
		// Since every insert gets treated like a batch insert, we will make sure the
		// bindings are structured in a way that is convenient when building these
		// inserts statements by verifying these elements are actually an array.
		if (values.length === 0) {
			return true
		}

		if (values[0] && !(values instanceof Array)) {
			values = [values]
		}
		// Finally, we will run this query against the database connection and return
		// the results. We will need to also flatten these bindings before running
		// the query so they are all in one huge, flattened array for execution.
		return this.connection.insert(
			this.grammar.compileInsert(this.queryObj, values),
			this.cleanBindings(new Collection(values).flatten(1).all())
		)
	}

	/**
	 * Delete a record from the database.
	 */
	delete(id?: string | number): number {
		// If an ID is passed to the method, we will set the where clause to check the
		// ID to let developers to simply and quickly remove a single row from this
		// database without manually specifying the "where" clauses on the query.
		if (!id) {
			this.where(this.queryObj.from + '.id', '=', id)
		}

		return this.connection.delete(
			this.grammar.compileDelete(this.queryObj),
			this.cleanBindings(this.grammar.prepareBindingsForDelete(this.queryObj.bindings))
		)
	}

	/**
	 * Get a new instance of the query builder.
	 */
	newQuery(): QueryBuilder {
		return new QueryBuilder(this.connection, this.grammar, this.processor)
	}

	/**
	 * Create a new query instance for a sub-query.
	 */
	protected forSubQuery(): QueryBuilder {
		return this.newQuery()
	}

	/**
	 * Get the current query value bindings in a flattened array.
	 */
	getBindings(): any[] {
		return new Collection(this.queryObj.bindings).flatten().all()
	}

	/**
	 * Get the raw array of bindings.
	 */
	getRawBindings(): Bindings {
		return this.queryObj.bindings
	}

	/**
	 * Add a binding to the query.
	 */
	addBinding(value: any, type: BindingType = 'where'): this {
		if (BindingKeys.indexOf(type) === -1) {
			throw new Error(`Invalid binding type: {type}.`)
		}

		if (value instanceof Array) {
			this.queryObj.bindings[type] = this.queryObj.bindings[type].concat(value)
		} else {
			this.queryObj.bindings[type].push(value)
		}

		return this
	}

	/**
	 * Remove all of the expressions from a list of bindings.
	 *
	 * @param  array  bindings
	 * @return array
	 */
	protected cleanBindings(bindings: any[]): any[] {
		return bindings.filter(binding => {
			return !(binding instanceof Expression)
		})
	}

	/**
	 * Get the database connection instance.
	 */
	getConnection(): Connection {
		return this.connection
	}
	/**
	 * Get the database query processor instance.
	 */
	getProcessor(): QueryProcessor {
		return this.processor
	}
	/**
	 * Get the query grammar instance.
	 */
	getGrammar(): QueryGrammar {
		return this.grammar
	}

	/**
	 * Clone the query without the given properties.
	 *
	 * @param  array  properties
	 * @return static
	 */
	cloneWithout(properties: string[]): this {
		return tap({ ...this }, (clone: any) => {
			properties.forEach(property => {
				clone[property] = null
			})
		})
	}

	/**
	 * Clone the query without the given bindings.
	 *
	 * @param  array  except
	 * @return static
	 */
	cloneWithoutBindings(except: string[]): this {
		return tap({ ...this }, (clone: any) => {
			except.forEach(type => {
				clone.bindings[type] = []
			})
		})
	}

	/**
	 * Apply the callback's query changes if the given "value" is true.
	 */
	when<T>(
		value: T,
		callback: (query: QueryBuilder, condition: T) => QueryBuilder | void,
		defaultValue?: (query: QueryBuilder, condition: T) => QueryBuilder | void
	): QueryBuilder {
		if (value) {
			return callback(this, value) || this
		} else if (defaultValue) {
			return defaultValue(this, value) || this
		}
		return this
	}

	/**
	 * Pass the query to a given callback.
	 */
	tap(callback: (query: QueryBuilder, condition: boolean) => QueryBuilder) {
		return this.when(true, callback)
	}

	/**
	 * Apply the callback's query changes if the given "value" is false.
	 */
	unless<T>(
		value: T,
		callback: (query: QueryBuilder, condition: T) => QueryBuilder | void,
		defaultValue?: (query: QueryBuilder, condition: T) => QueryBuilder | void
	): QueryBuilder {
		if (!value) {
			return callback(this, value) || this
		} else if (defaultValue) {
			return defaultValue(this, value) || this
		}
		return this
	}
}

export class JoinClause extends QueryBuilder {
	/**
	 * The parent query builder instance.
	 */
	protected parentQuery: QueryBuilder

	/**
	 * Create a new join clause instance.
	 */
	constructor(parentQuery: QueryBuilder, type: string, table: string) {
		super(parentQuery.getConnection(), parentQuery.getGrammar(), parentQuery.getProcessor())

		this.queryObj.joinType = type
		this.queryObj.joinTable = table
		this.parentQuery = parentQuery
	}

	/**
	 * Add an "on" clause to the join.
	 *
	 * On clauses can be chained, e.g.
	 *
	 *  join->on('contacts.user_id', '=', 'users.id')
	 *       ->on('contacts.info_id', '=', 'info.id')
	 *
	 * will produce the following SQL:
	 *
	 * on `contacts`.`user_id` = `users`.`id` and `contacts`.`info_id` = `info`.`id`
	 */
	on(first: QueryFn<this> | string, operator?: string, second?: string, bool: WhereBoolean = 'AND'): this {
		if (typeof first === 'function') {
			return this.whereNested(first, bool)
		}
		return this.whereColumn(first, operator, second, bool)
	}

	/**
	 * Add an "or on" clause to the join.
	 */
	orOn(first: QueryFn<this> | string, operator?: string, second?: string): this {
		return this.on(first, operator, second, 'OR')
	}

	/**
	 * Get a new instance of the join clause builder.
	 */
	newQuery(): JoinClause {
		return new JoinClause(this.parentQuery, this.queryObj.joinType!, this.queryObj.joinTable!)
	}

	/**
	 * Create a new query instance for sub-query.
	 */
	protected forSubQuery(): QueryBuilder {
		return this.parentQuery.newQuery()
	}

	/**
	 * Create a new query instance for nested where condition.
	 */
	forNestedWhere(): JoinClause {
		return this.newQuery().from(this.queryObj.from)
	}
}
