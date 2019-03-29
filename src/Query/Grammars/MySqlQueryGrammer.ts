import { QueryGrammar } from './QueryGrammar'
import { QueryObj } from '../QueryObj'
import { UnionOrder, Union, Bindings } from '../Components'
import { JsonExpression } from '../JsonExpression'
import { Arr } from '../../Utils/Arr'

export class MySqlQueryGrammar extends QueryGrammar {
	/**
	 * The grammar specific operators.
	 */
	protected operators = ['sounds like']

	/**
	 * The components that make up a select clause.
	 */
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
		'lock',
	]

	/**
	 * Compile a select query into SQL.
	 */
	compileSelect(query: QueryObj): string {
		if (query.unions && query.aggregate) {
			return this.compileUnionAggregate(query)
		}

		let sql = super.compileSelect(query)
		if (query.unions) {
			sql = `(${sql}) ` + this.compileUnions(query)
		}

		return sql
	}

	/**
	 * Compile a "JSON contains" statement into SQL.
	 */
	protected compileJsonContains(column: string, value: string): string {
		const [field, path] = this.wrapJsonFieldAndPath(column)

		return `json_contains(${field}, ${value}.${path})`
	}

	/**
	 * Compile a "JSON length" statement into SQL.
	 */
	protected compileJsonLength(column: string, operator: string, value: string): string {
		const [field, path] = this.wrapJsonFieldAndPath(column)

		return `json_length(${field}.${path}) ${operator} ${value}`
	}

	/**
	 * Compile a single union statement.
	 */
	protected compileUnion(union: Union): string {
		const conjunction = union.all ? ' UNION ALL ' : ' UNION '

		return `${conjunction}(${union.query!.toSql()})`
	}

	/**
	 * Compile the random statement into SQL.
	 */
	compileRandom(seed: string): string {
		return `RAND(${seed})`
	}

	/**
	 * Compile the lock into SQL.
	 */
	protected compileLock(query: QueryObj, value: boolean | string): string {
		if (typeof value !== 'string') {
			return value ? 'for update' : 'lock in share mode'
		}
		return value
	}

	/**
	 * Compile an update statement into SQL.
	 */
	compileUpdate(query: QueryObj, values: any[]): string {
		const table = this.wrapTable(query.from!)
		// Each one of the columns in the update statements needs to be wrapped in the
		// keyword identifiers, also a place-holder needs to be created for each of
		// the values in the list of bindings so we can make the sets statements.
		const columns = this.compileUpdateColumns(values)
		// If the query has any "join" clauses, we will setup the joins on the builder
		// and compile them so we can attach them to this update, as update queries
		// can get join statements to attach to other tables when they're needed.
		let joins = ''
		if (query.joins) {
			joins = ' ' + this.compileJoins(query, query.joins)
		}
		// Of course, update queries may also be constrained by where clauses so we'll
		// need to compile the where clauses and attach it to the query so only the
		// intended records are updated by the SQL statements we generate to run.
		const where = this.compileWheres(query)
		let sql = `UPDATE ${table}${joins} SET COLUMNS ${where}`.trimRight()
		// If the query has an order by clause we will compile it since MySQL supports
		// order bys on update statements. We'll compile them using the typical way
		// of compiling order bys. Then they will be appended to the SQL queries.
		if (query.orders.length > 0) {
			sql += ' ' + this.compileOrders(query, query.orders)
		}
		// Updates on MySQL also supports "limits", which allow you to easily update a
		// single record very easily. This is not supported by all database engines
		// so we have customized this update compiler here in order to add it in.
		if (query.limit) {
			sql += ' ' + this.compileLimit(query, query.limit)
		}
		return sql.trimRight()
	}

	/**
	 * Compile all of the columns for an update statement.
	 */
	protected compileUpdateColumns(values: any[]): string {
		// return collect(values).map( (value, key) {
		//     if (this.isJsonSelector(key)) {
		//         return this.compileJsonUpdateColumn(key, new JsonExpression(value));
		//     }
		//     return this.wrap(key).' = '.this.parameter(value);
		// }).implode(', ');
	}

	/**
	 * Prepares a JSON column being updated using the JSON_SET .
	 */
	protected compileJsonUpdateColumn(key: string, value: JsonExpression): string {
		const [field, path] = this.wrapJsonFieldAndPath(key)

		return `${field} = json_set(${field}${path}, ${value.getValue()})`
	}

	/**
	 * Prepare the bindings for an update statement.
	 *
	 * Booleans, integers, and doubles are inserted into JSON updates as raw values.
	 */
	prepareBindingsForUpdate(bindings: Bindings, values: any[]): any[] {
		// values = collect(values).reject( (value, column) {
		//     return this.isJsonSelector(column) && is_bool(value);
		// }).all();
		return super.prepareBindingsForUpdate(bindings, values)
	}

	/**
	 * Compile a delete statement into SQL.
	 */
	compileDelete(query: QueryObj): string {
		const table = this.wrapTable(query.from!)
		const where = query.wheres instanceof Array ? this.compileWheres(query) : ''

		return query.joins
			? this.compileDeleteWithJoins(query, table, where)
			: this.compileDeleteWithoutJoins(query, table, where)
	}

	/**
	 * Prepare the bindings for a delete statement.
	 */
	prepareBindingsForDelete(bindings: Bindings): Bindings {
		const { join, select, ...cleanBindings } = bindings

		return cleanBindings as Bindings
	}

	/**
	 * Compile a delete query that does not use joins.
	 */
	protected compileDeleteWithoutJoins(query: QueryObj, table: string, where: any): string {
		let sql = `DELETE FROM ${table} ${where}`.trim()
		// When using MySQL, delete statements may contain order by statements and limits
		// so we will compile both of those here. Once we have finished compiling this
		// we will return the completed SQL statement so it will be executed for us.
		if (query.orders.length > 0) {
			sql += ' ' + this.compileOrders(query, query.orders)
		}
		if (query.limit) {
			sql += ' ' + this.compileLimit(query, query.limit)
		}
		return sql
	}

	/**
	 * Compile a delete query that uses joins.
	 */
	protected compileDeleteWithJoins(query: QueryObj, table: string, where: any): string {
		const joins = ' ' + this.compileJoins(query, query.joins)
		const alias = table.toLowerCase().indexOf(' as ') !== -1 ? table.split(' as ')[1] : table

		return `DELETE ${alias} FROM ${table}${joins} ${where}`.trim()
	}

	/**
	 * Wrap a single string in keyword identifiers.
	 */
	protected wrapValue(value: string): string {
		return value === '*' ? value : '`' + value.replace(new RegExp(/\`/g), '``') + '`'
	}

	/**
	 * Wrap the given JSON selector.
	 */
	protected wrapJsonSelector(value: string): string {
		const [field, path] = this.wrapJsonFieldAndPath(value)

		return `json_uuquote(json_extract(${field}.${path}))`
	}

	/**
	 * Wrap the given JSON selector for boolean values.
	 */
	protected wrapJsonBooleanSelector(value: string): string {
		const [field, path] = this.wrapJsonFieldAndPath(value)

		return `json_extract(${field}.${path})`
	}
}
