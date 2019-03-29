import { QueryGrammar } from './QueryGrammar'
import { QueryObj } from '../QueryObj'
import { UnionOrder, Union } from '../Components'

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

	// /**
	//  * Compile an update statement into SQL.
	//  *
	//  * @param  \Illuminate\Database\Query\Builder  query
	//  * @param  array  values
	//  * @return string
	//  */
	// public  compileUpdate(Builder query, values) {
	//     table = this.wrapTable(query.from);
	//     // Each one of the columns in the update statements needs to be wrapped in the
	//     // keyword identifiers, also a place-holder needs to be created for each of
	//     // the values in the list of bindings so we can make the sets statements.
	//     columns = this.compileUpdateColumns(values);
	//     // If the query has any "join" clauses, we will setup the joins on the builder
	//     // and compile them so we can attach them to this update, as update queries
	//     // can get join statements to attach to other tables when they're needed.
	//     joins = '';
	//     if (isset(query.joins)) {
	//         joins = ' '.this.compileJoins(query, query.joins);
	//     }
	//     // Of course, update queries may also be constrained by where clauses so we'll
	//     // need to compile the where clauses and attach it to the query so only the
	//     // intended records are updated by the SQL statements we generate to run.
	//     where = this.compileWheres(query);
	//     sql = rtrim("update {table}{joins} set columns where");
	//     // If the query has an order by clause we will compile it since MySQL supports
	//     // order bys on update statements. We'll compile them using the typical way
	//     // of compiling order bys. Then they will be appended to the SQL queries.
	//     if (!empty(query.orders)) {
	//         sql.= ' '.this.compileOrders(query, query.orders);
	//     }
	//     // Updates on MySQL also supports "limits", which allow you to easily update a
	//     // single record very easily. This is not supported by all database engines
	//     // so we have customized this update compiler here in order to add it in.
	//     if (isset(query.limit)) {
	//         sql.= ' '.this.compileLimit(query, query.limit);
	//     }
	//     return rtrim(sql);
	// }
	// /**
	//  * Compile all of the columns for an update statement.
	//  *
	//  * @param  array  values
	//  * @return string
	//  */
	// protected  compileUpdateColumns(values) {
	//     return collect(values).map( (value, key) {
	//         if (this.isJsonSelector(key)) {
	//             return this.compileJsonUpdateColumn(key, new JsonExpression(value));
	//         }
	//         return this.wrap(key).' = '.this.parameter(value);
	//     }).implode(', ');
	// }
	// /**
	//  * Prepares a JSON column being updated using the JSON_SET .
	//  *
	//  * @param  string  key
	//  * @param  \Illuminate\Database\Query\JsonExpression  value
	//  * @return string
	//  */
	// protected  compileJsonUpdateColumn(key, JsonExpression value) {
	//     [field, path] = this.wrapJsonFieldAndPath(key);
	//     return "{field} = json_set({field}{path}, {value->getValue()})";
	// }
	// /**
	//  * Prepare the bindings for an update statement.
	//  *
	//  * Booleans, integers, and doubles are inserted into JSON updates as raw values.
	//  *
	//  * @param  array  bindings
	//  * @param  array  values
	//  * @return array
	//  */
	// public  prepareBindingsForUpdate(array bindings, array values) {
	//     values = collect(values).reject( (value, column) {
	//         return this.isJsonSelector(column) && is_bool(value);
	//     }).all();
	//     return parent:: prepareBindingsForUpdate(bindings, values);
	// }
	// /**
	//  * Compile a delete statement into SQL.
	//  *
	//  * @param  \Illuminate\Database\Query\Builder  query
	//  * @return string
	//  */
	// public  compileDelete(Builder query) {
	//     table = this.wrapTable(query.from);
	//     where = is_array(query.wheres) ? this.compileWheres(query) : '';
	//     return isset(query.joins)
	//         ? this.compileDeleteWithJoins(query, table, where)
	//         : this.compileDeleteWithoutJoins(query, table, where);
	// }
	// /**
	//  * Prepare the bindings for a delete statement.
	//  *
	//  * @param  array  bindings
	//  * @return array
	//  */
	// public  prepareBindingsForDelete(array bindings) {
	//     cleanBindings = Arr:: except(bindings, ['join', 'select']);
	//     return array_values(
	//         array_merge(bindings['join'], Arr:: flatten(cleanBindings))
	//     );
	// }
	// /**
	//  * Compile a delete query that does not use joins.
	//  *
	//  * @param  \Illuminate\Database\Query\Builder  query
	//  * @param  string  table
	//  * @param  array  where
	//  * @return string
	//  */
	// protected  compileDeleteWithoutJoins(query, table, where) {
	//     sql = trim("delete from {table} {where}");
	//     // When using MySQL, delete statements may contain order by statements and limits
	//     // so we will compile both of those here. Once we have finished compiling this
	//     // we will return the completed SQL statement so it will be executed for us.
	//     if (!empty(query.orders)) {
	//         sql.= ' '.this.compileOrders(query, query.orders);
	//     }
	//     if (isset(query.limit)) {
	//         sql.= ' '.this.compileLimit(query, query.limit);
	//     }
	//     return sql;
	// }

	/**
	 * Compile a delete query that uses joins.
	 */
	protected compileDeleteWithJoins(query: QueryObj, table: string, where: any): string {
		const joins = ' ' + this.compileJoins(query, query.joins)
		const alias = stripos(table, ' as ') !== false ? explode(' as ', table)[1] : table
		return trim('delete {alias} from {table}{joins} {where}')
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
