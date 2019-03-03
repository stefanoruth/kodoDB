import { QueryBuilder } from './QueryBuilder'
import { WhereBoolean } from './WhereClause'

export class JoinClause extends QueryBuilder {
	/**
	 * The type of join being performed.
	 */
	type: string

	/**
	 * The table the join clause is joining to.
	 */
	table: string

	/**
	 * The parent query builder instance.
	 */
	protected parentQuery: QueryBuilder

	/**
	 * Create a new join clause instance.
	 */
	constructor(parentQuery: QueryBuilder, type: string, table: string) {
		super(parentQuery.getConnection(), parentQuery.getGrammar(), parentQuery.getProcessor())

		this.type = type
		this.table = table
		this.parentQuery = parentQuery
	}

	/**
	 * Add an "on" clause to the join.
	 *
	 * On clauses can be chained, e.g.
	 *
	 *  $join->on('contacts.user_id', '=', 'users.id')
	 *       ->on('contacts.info_id', '=', 'info.id')
	 *
	 * will produce the following SQL:
	 *
	 * on `contacts`.`user_id` = `users`.`id` and `contacts`.`info_id` = `info`.`id`
	 */
	on(first: string, operator?: string, second?: string, bool: WhereBoolean = 'AND') {
		if (typeof first === 'function') {
			return this.whereNested(first, bool)
		}
		return this.whereColumn(first, operator, second, bool)
	}

	/**
	 * Add an "or on" clause to the join.
	 */
	orOn(first: string, operator?: string, second?: string) {
		return this.on(first, operator, second, 'OR')
	}

	/**
	 * Get a new instance of the join clause builder.
	 */
	newQuery(): JoinClause {
		return new JoinClause(this.parentQuery, this.type, this.table)
	}

	/**
	 * Create a new query instance for sub-query.
	 */
	protected forSubQuery(): QueryBuilder {
		return this.parentQuery.newQuery()
	}
}
