import { Connection } from '../Connections/Connection'
import { QueryGrammar } from './Grammars/QueryGrammar'
import { QueryProcessor } from './Processors/QueryProcessor'
import { Collection } from '../Collection'

export class QueryBuilder {
	connection: Connection
	grammar: QueryGrammar
	processor: QueryProcessor

	fromTable?: string
	selectLimit?: number
	unionLimit?: number
	unions?: any
	columns?: any[]
	bindings: {
		select: string[]
		from: string[]
		join: string[]
		where: string[]
		having: string[]
		order: string[]
		union: string[]
	} = {
		select: [],
		from: [],
		join: [],
		where: [],
		having: [],
		order: [],
		union: [],
	}

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
}
