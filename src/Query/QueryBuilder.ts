import { Connection } from '../Connections/Connection'
import { QueryGrammar } from './Grammars/QueryGrammar'
import { QueryProcessor } from './Processors/QueryProcessor'
import { Collection, tap } from '../Utils'
import { Bindings, BindingKeys, BindingType } from './Bindings'
import { Expression } from './Expression'

interface WhereClause {
	type: string
	column: string
	operator: string
	value: string | number | null
	bool: WhereBoolean
}

export type WhereBoolean = 'and' | 'or'

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
	 * The current query value bindings.
	 *
	 * @var array
	 */
	bindings: Bindings = {
		select: [],
		from: [],
		join: [],
		where: [],
		having: [],
		order: [],
		union: [],
	}

	/**
	 * An aggregate function and column to be run.
	 */
	aggregate?: { functionName: string; columns: string[] }

	/**
	 * The columns that should be returned.
	 */
	columns: string[] = ['*']

	/**
	 * The table which the query is targeting.
	 */
	fromTable: string = ''

	/**
	 * The where constraints for the query.
	 */
	wheres: WhereClause[] = []

	/**
	 * The groupings for the query.
	 */
	groups: any[] = []

	/**
	 * The orderings for the query.
	 */
	orders: Array<{ column: string; direction: string }> = []

	/**
	 * The query union statements.
	 */
	unions: string[] = []

	/**
	 * The orderings for the union query.
	 */
	unionOrders: Array<{ column: string; direction: string }> = []

	/**
	 * All of the available clause operators.
	 */
	operators = [
		'=',
		'<',
		'>',
		'<=',
		'>=',
		'<>',
		'!=',
		'<=>',
		'like',
		'like binary',
		'not like',
		'ilike',
		'&',
		'|',
		'^',
		'<<',
		'>>',
		'rlike',
		'regexp',
		'not regexp',
		'~',
		'~*',
		'!~',
		'!~*',
		'similar to',
		'not similar to',
		'not ilike',
		'~~*',
		'!~~*',
	]

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
	select(columns: string[] | string = ['*']): QueryBuilder {
		this.columns = columns instanceof Array ? columns : [columns]

		return this
	}

	/**
	 * Set the table which the query is targeting.
	 */
	from(table: string): QueryBuilder {
		this.fromTable = table

		return this
	}

	/**
	 * Add a basic where clause to the query.
	 */
	where(column: string | string[], operator: string | any, value?: any, bool: WhereBoolean = 'and'): QueryBuilder {
		// If the column is an array, we will assume it is an array of key-value pairs
		// and can add them each as a where clause. We will maintain the boolean we
		// received when the method was called and pass it into the nested where.
		if (column instanceof Array) {
			// return this.addArrayOfWheres(column, bool);
			return this
		}

		// Here we will make some assumptions about the operator. If only 2 values are
		// passed to the method, we will assume that the operator is an equals sign
		// and keep going. Otherwise, we'll require the operator to be passed in.
		;[value, operator] = this.prepareValueAndOperator(value, operator, typeof value === 'undefined')

		// If the columns is actually a Closure instance, we will assume the developer
		// wants to begin a nested where statement which is wrapped in parenthesis.
		// We'll add that Closure to the query then return back out immediately.
		if (typeof column === 'function') {
			// return this.whereNested(column, bool);
			return this
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
			// return this.whereSub(column, operator, value, boolean);
			return this
		}

		// If the value is "null", we will just assume the developer wants to add a
		// where null clause to the query. So, we will allow a short-cut here to
		// that method for convenience so the developer doesn't have to check.
		if (value === null) {
			// return this.whereNull(column, boolean, operator !== '=');
			return this
		}

		// If the column is making a JSON reference we'll check to see if the value
		// is a boolean. If it is, we'll add the raw boolean string as an actual
		// value to the query to ensure this is properly handled by the query.
		if (column.indexOf('->') > -1 && typeof value === 'boolean') {
			value = new Expression(value ? 'true' : 'false')
		}

		// Now that we are working with just a simple query we can put the elements
		// in our array and add the query binding to our array of bindings that
		// will be bound to each SQL statements when it is finally executed.
		const type = 'Basic'
		this.wheres.push({ type, column, operator, value, bool })

		if (!(value instanceof Expression)) {
			this.addBinding(value, 'where')
		}

		return this
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
		return value && this.operators.indexOf(operator) > -1 && ['=', '<>', '!='].indexOf(operator) !== -1
	}

	/**
	 * Determine if the given operator is supported.
	 */
	protected invalidOperator(operator: string): boolean {
		return (
			this.operators.indexOf(operator.toLowerCase()) !== -1 &&
			this.grammar.getOperators().indexOf(operator.toLowerCase()) !== -1
		)
	}

	/**
	 * Add an "order by" clause to the query.
	 */
	orderBy(column: string, direction: string = 'asc'): QueryBuilder {
		const order = {
			column,
			direction: direction.toLowerCase() === 'asc' ? 'asc' : 'desc',
		}

		if (this.unions) {
			this.unionOrders.push(order)
		} else {
			this.orders.push(order)
		}

		return this
	}

	/**
	 * Alias to set the "limit" value of the query.
	 */
	take(value: number): QueryBuilder {
		return this.limit(value)
	}
	/**
	 * Set the "limit" value of the query.
	 */
	limit(value: number): QueryBuilder {
		const property = this.unions ? 'unionLimit' : 'limit'
		if (value >= 0) {
			;(this as any)[property] = value
		}
		return this
	}

	/**
	 * Get the SQL representation of the query.
	 */
	toSql(): string {
		return this.grammar.compileSelect(this)
	}

	/**
	 * Execute the query as a "select" statement.
	 */
	get(columns: string[] = ['*']): Collection {
		return new Collection(
			this.onceWithColumns(columns, () => {
				return this.processor.processSelect(this, this.runSelect())
			})
		)
	}

	/**
	 * Run the query as a "select" statement against the connection.
	 */
	protected runSelect(): any[] {
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
		const results = this.cloneWithout(this.unions ? [] : ['columns'])
			.cloneWithoutBindings(this.unions ? [] : ['select'])
			.setAggregate(functionName, columns)
			.get(columns)

		if (!results.isEmpty()) {
			return results.first().aggregate
		}
	}

	/**
	 * Set the aggregate property without running the query.
	 */
	protected setAggregate(functionName: string, columns: string[]): QueryBuilder {
		this.aggregate = { functionName, columns }

		if (this.groups.length === 0) {
			this.orders = []
			this.bindings.order = []
		}

		return this
	}

	/**
	 * Execute the given callback while selecting the given columns.
	 *
	 * After running the callback, the columns are reset to the original value.
	 */
	protected onceWithColumns(columns: string[], callback: () => any): any {
		const original = this.columns

		if (!original) {
			this.columns = columns
		}
		const result = callback()
		this.columns = original
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
			this.grammar.compileInsert(this, values),
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
			this.where(this.fromTable + '.id', '=', id)
		}

		return this.connection.delete(
			this.grammar.compileDelete(this),
			this.cleanBindings(this.grammar.prepareBindingsForDelete(this.bindings))
		)
	}

	/**
	 * Get the current query value bindings in a flattened array.
	 */
	getBindings(): any[] {
		return new Collection(this.bindings).flatten().all()
	}

	/**
	 * Add a binding to the query.
	 */
	addBinding(value: any, type: BindingType = 'where'): QueryBuilder {
		if (BindingKeys.indexOf(type) === -1) {
			throw new Error('Invalid binding type: {$type}.')
		}

		if (value instanceof Array) {
			this.bindings[type].concat(value)
		} else {
			this.bindings[type].push(value)
		}
		return this
	}

	/**
	 * Remove all of the expressions from a list of bindings.
	 *
	 * @param  array  $bindings
	 * @return array
	 */
	protected cleanBindings(bindings: any[]): any[] {
		return bindings.filter(binding => {
			return !(binding instanceof Expression)
		})
	}

	/**
	 * Clone the query without the given properties.
	 *
	 * @param  array  $properties
	 * @return static
	 */
	cloneWithout(properties: string[]): QueryBuilder {
		return tap({ ...this }, (clone: any) => {
			properties.forEach(property => {
				clone[property] = null
			})
		})
	}

	/**
	 * Clone the query without the given bindings.
	 *
	 * @param  array  $except
	 * @return static
	 */
	cloneWithoutBindings(except: string[]): QueryBuilder {
		return tap({ ...this }, (clone: any) => {
			except.forEach(type => {
				clone.bindings[type] = []
			})
		})
	}
}
