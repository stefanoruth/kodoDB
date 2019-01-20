import { Builder as QueryBuilder } from '../Query/Builder'

export interface ConnectionInterface {
	table(table: string): QueryBuilder
	raw(value: any): any
	selectOne(query: string, bindings: [], useReadPdo: boolean): any
	select(query: string, bindings: [], useReadPdo: boolean): any
	cursor(query: string, bindings: [], useReadPdo: boolean): any
	insert(query: string, bindings: []): any
	update(query: string, bindings: []): any
	delete(query: string, bindings: []): any
	statement(query: string, bindings: []): any
	affectingStatement(query: string, bindings: []): any
	unprepared(query: string): any
	prepareBindings(bindings: []): any
	transaction(callback: () => {}, attempts: number): any
	beginTransaction(): void
	commit(): void
	rollBack(): void
	transactionLevel(): number
	pretend(callback: () => {}): []
}

export class Connection {
	protected connection: any
	protected database?: string
	protected tablePrefix?: string
	protected config: any

	constructor(
		connection: any,
		database?: string,
		tablePrefix?: string,
		config: any = {}
	) {
		this.connection = connection
		this.database = database
		this.tablePrefix = tablePrefix
		this.config = config
	}
}
