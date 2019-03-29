import { Bindings, Aggregate, WhereClause, Group, Order, UnionOrder, Having } from './Components'
import { Expression } from './Expression'

export class QueryObj {
	/**
	 * The current query value bindings.
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
	aggregate?: Aggregate

	/**
	 * The columns that should be returned.
	 */
	columns: Array<string | Expression> = []

	/**
	 * Indicates if the query returns distinct results.
	 */
	distinct: boolean = false

	/**
	 * The table which the query is targeting.
	 */
	from?: string | Expression

	/**
	 * The table joins for the query.
	 */
	joins: QueryObj[] = []

	/**
	 * The where constraints for the query.
	 */
	wheres: WhereClause[] = []

	/**
	 * The groupings for the query.
	 */
	groups: Group[] = []

	/**
	 * The having constraints for the query.
	 */
	havings: Having[] = []

	/**
	 * The orderings for the query.
	 */
	orders: Order[] = []

	/**
	 * The maximum number of records to return.
	 */
	limit?: number

	/**
	 * The number of records to skip.
	 */
	offset?: number

	/**
	 * The query union statements.
	 */
	unions: Array<{ query: QueryObj; all: boolean }> = []

	/**
	 * The maximum number of union records to return.
	 */
	unionLimit?: number

	/**
	 * The number of union records to skip.
	 */
	unionOffset?: number

	/**
	 * The orderings for the union query.
	 */
	unionOrders: UnionOrder[] = []

	/**
	 * Indicates whether row locking is being used.
	 */
	lock: boolean | string = false

	/**
	 * The type of join being performed.
	 */
	joinType?: string

	/**
	 * The table the join clause is joining to.
	 */
	joinTable?: string | Expression
}
