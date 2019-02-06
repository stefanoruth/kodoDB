import { Connection } from '../Connections/Connection'
import { QueryGrammar } from './Grammars/QueryGrammar'
import { QueryProcessor } from './Processors/QueryProcessor'
import { Collection } from '../Utils/Collection'
import { Expression } from './Expression'

interface Bindings {
	select: string[]
	from: string[]
	join: string[]
	where: string[]
	having: string[]
	order: string[]
	union: string[]
}

export interface QueryBuilderType {
	connection: Connection
	grammar: QueryGrammar
	processor: QueryProcessor
	fromTable?: string
	aggregate?: []
	columns?: any[]
	bindings: Bindings
	distinct: boolean
	joins?: []
	wheres?: []
	groups?: []
	havings?: []
	orders?: []
	selectLimit?: number
	offset?: number
	unions?: []
	unionLimit?: number
	unionOffset?: number
	unionOrders?: []
	lock?: string | boolean
	operators: string[]
	[key: string]: any
}

export class QueryBuilder implements QueryBuilderType {
	connection: Connection
	grammar: QueryGrammar
	processor: QueryProcessor

	fromTable?: string

	aggregate?: []
	columns?: any[]
	bindings: Bindings = {
		select: [],
		from: [],
		join: [],
		where: [],
		having: [],
		order: [],
		union: [],
	}
	distinct = false
	joins?: []
	wheres?: []
	groups?: []
	havings?: []
	orders?: []
	selectLimit?: number
	offset?: number
	unions?: []
	unionLimit?: number
	unionOffset?: number
	unionOrders?: []
	lock?: string | boolean

	operators: string[] = [
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

	constructor(connection: Connection, grammar: QueryGrammar, processor: QueryProcessor) {
		this.connection = connection
		this.grammar = grammar
		this.processor = processor
	}

	from(table: string) {
		this.fromTable = table

		return this
	}

	where(column: string, operator: any = null, value: any = null, booleanType: string = 'and') {
		return this
	}

	take(value: number) {
		return this.limit(value)
	}

	limit(value: number) {
		const property = this.unions ? 'unionLimit' : 'selectLimit'

		if (value >= 0) {
			this[property] = value
		}

		return this
	}

	get(columns = ['*']) {
		return new Collection(
			this.onceWithColumns(columns, () => {
				return this.processor.processSelect(this, this.runSelect())
			})
		)
	}

	first(columns = ['*']) {
		return this.take(1)
			.get(columns)
			.first()
	}

	toSql() {
		return this.grammar.compileSelect(this)
	}

	getBindings() {
		return this.bindings
	}

	protected onceWithColumns(columns: any[], callback: () => any) {
		const original = this.columns

		if (!original) {
			this.columns = columns
		}

		const result = callback()

		this.columns = original

		return result
	}

	protected runSelect() {
		return this.connection.select(this.toSql(), this.getBindings())
	}

	select(columns: string[] = ['*']) {
		this.columns = columns

		return this
	}

	selectRaw(expression: string, bindings = []) {
		// this.addSelect(new Expression(expression))

		if (bindings) {
			// this.addBinding(bindings, 'select')
		}
		return this
	}
}
