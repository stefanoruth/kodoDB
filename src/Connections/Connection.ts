import { QueryBuilder } from '../Query/QueryBuilder'
import { ConnectionConfig } from '../config'
import { SchemaBuilder } from '../Schema/SchemaBuilder'
import { SchemaGrammar } from '../Schema/Grammars/SchemaGrammar'
import { QueryGrammar } from '../Query/Grammars/QueryGrammar'
import { QueryProcessor } from '../Query/Processors/QueryProcessor'
import { QueryException } from '../Exceptions/QueryException'
import { detectsLostConnections } from '../Utils'
import { Expression } from '../Query/Expression'

interface ConnnectionInterface {
	table(table: string): QueryBuilder
	raw(value: any): Expression
	selectOne(query: string, bindings: any[], useReadPdo: boolean): any
	select(query: string, bindings: any[], useReadPdo: boolean): []
	cursor(query: string, bindings: any[], useReadPdo: boolean): Generator
	insert(query: string, bindings: any[]): boolean
	update(query: string, bindings: any[]): number
	delete(query: string, bindings: any[]): number
	statement(query: string, bindings: any[]): boolean
	affectingStatement(query: string, bindings: any[]): number
	unprepared(query: string): boolean
	prepareBindings(bindings: any[]): []
	transaction(callback: () => void, attempts: number): any
	beginTransaction(): void
	commit(): void
	rollBack(): void
	transactionLevel(): number
	pretend(callback: () => void): []
}

interface Local {
	getSchemaBuilder: () => SchemaBuilder
	getDefaultSchemaGrammar: () => SchemaGrammar
}

export abstract class Connection implements Partial<ConnnectionInterface>, Local {
	protected config: any
	protected schemaGrammar: SchemaGrammar
	protected queryGrammar: QueryGrammar
	protected postProcessor: QueryProcessor
	protected transactions = 0
	protected reconnector?: () => any
	protected pretending = false
	protected pdo?: any

	constructor(config: ConnectionConfig) {
		this.config = config

		this.schemaGrammar = this.getDefaultSchemaGrammar()
		this.queryGrammar = this.getDefaultQueryGrammar()
		this.postProcessor = this.getDefaultPostProcessor()
	}

	getSchemaGrammar() {
		return this.schemaGrammar
	}

	table(table: string) {
		return this.query().from(table)
	}

	query() {
		return new QueryBuilder(this, this.getQueryGrammar(), this.getPostProcessor())
	}

	getQueryGrammar() {
		return this.queryGrammar
	}

	getPostProcessor() {
		return this.postProcessor
	}

	select(query: string, bindings: any) {
		return this.run(query, bindings, () => {
			if (this.pretending) {
				return []
			}

			const statement = this.prepared(this.getPdoForSelect().prepare(query))

			this.bindValues(statement, this.prepareBindings(bindings))

			statement.execute()

			return statement.fetchAll()
		})
	}

	run(query: string, bindings: [], callback: () => any) {
		this.reconnectIfMissingConnection()

		const start = +new Date()
		let result

		try {
			result = this.runQueryCallback(query, bindings, callback)
		} catch (error) {
			result = this.handleQueryException(error, query, bindings, callback)
		}

		this.logQuery(query, bindings, this.getElapsedTime(start))

		return result
	}

	logQuery(query: string, bindings: [], time?: number) {
		// Todo
	}

	reconnectIfMissingConnection() {
		// Todo
	}

	prepareBindings(bindings: []) {
		// Todo

		return bindings
	}

	bindValues(statement: any, bindings: []) {
		// Todo
	}

	reconnect() {
		if (this.reconnector) {
			// Todo reconnect
		}

		throw new Error('Lost connection and no reconnector available.')
	}

	statement(query: string, bindings: any[] = []): boolean {
		// Todo
		return false
	}

	getPdo() {
		return this.pdo
	}

	protected getPdoForSelect() {
		return this.getPdo()
	}

	protected prepared(statement: any) {
		// Todo

		return statement
	}

	protected handleQueryException(error: Error, query: string, bindings: [], callback: () => any) {
		if (this.transactions >= 1) {
			throw error
		}

		return this.tryAgainIfCausedByLostConnection(error, query, bindings, callback)
	}

	protected tryAgainIfCausedByLostConnection(error: Error, query: string, bindings: [], callback: () => any) {
		if (detectsLostConnections(error)) {
			this.reconnect()

			return this.runQueryCallback(query, bindings, callback)
		}

		throw error
	}

	protected runQueryCallback(query: string, bindings: [], callback: () => any) {
		try {
			return callback()
		} catch (error) {
			throw new QueryException(query, this.prepareBindings(bindings), error)
		}
	}

	protected getElapsedTime(start: number) {
		return +new Date() - start
	}

	abstract getSchemaBuilder(): SchemaBuilder

	abstract getDefaultSchemaGrammar(): SchemaGrammar

	abstract getDefaultQueryGrammar(): QueryGrammar

	abstract getDefaultPostProcessor(): QueryProcessor
}
