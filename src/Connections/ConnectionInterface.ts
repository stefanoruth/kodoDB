import { QueryBuilder } from '../Query/QueryBuilder'
import { Expression } from '../Query/Expression'

export type QueryLog = { query: string; bindings?: any[]; time?: number }

export interface ConnectionInterface {
	table(table: string): QueryBuilder
	raw(value: any): Expression
	selectOne(query: string, bindings: any[]): any
	select(query: string, bindings: any[]): []
	cursor(query: string, bindings: any[]): Generator
	insert(query: string, bindings: any[]): boolean
	update(query: string, bindings: any[]): number
	delete(query: string, bindings: any[]): number
	statement(query: string, bindings: any[]): boolean
	affectingStatement(query: string, bindings: any[]): number
	unprepared(query: string): boolean
	prepareBindings(bindings: any[]): any[]
	transaction(callback: () => void, attempts: number): any
	beginTransaction(): void
	commit(): void
	rollback(): void
	transactionLevel(): number
	pretend(callback: () => void): QueryLog[]
}
