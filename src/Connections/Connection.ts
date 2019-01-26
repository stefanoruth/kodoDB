import { Builder as QueryBuilder } from '../Query/Builder'
import { ConnectionConfig } from '../config'
import { Builder } from '../Schema/Builder'
import { Grammar } from '../Schema/Grammars/Grammar'

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

interface ConnectionInterfacePart1 {
	getSchemaBuilder: () => Builder
	getDefaultSchemaGrammar: () => Grammar
}

export abstract class Connection implements ConnectionInterfacePart1 {
	protected config: any
	protected schemaGrammar: Grammar

	constructor(config: ConnectionConfig) {
		this.config = config

		// this.useDefaultSchemaGrammar()
		this.schemaGrammar = this.getDefaultSchemaGrammar()
	}

	useDefaultSchemaGrammar() {
		this.schemaGrammar = this.getDefaultSchemaGrammar()
	}

	getSchemaGrammar() {
		return this.schemaGrammar
	}

	abstract getSchemaBuilder(): Builder

	abstract getDefaultSchemaGrammar(): Grammar
}
