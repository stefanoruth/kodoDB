import { Expression } from './Expression'
import { QueryObj } from './QueryObj'

// Column
export type Column = string | Expression | Array<string | Expression>

// SQL Order By
export interface Order {
	column?: string
	direction?: string
	type?: string
	sql?: string
}

export type OrderDirection = 'asc' | 'desc' | 'ASC' | 'DESC'

// SQL Aggregate
export interface Aggregate {
	functionName: string
	columns: string[]
}

// SQL Union Order
export interface UnionOrder {
	column?: string
	direction?: string
	type?: string
	sql?: string
}

// SQL Group
export type Group = string | Expression

// SQL Where
export type WhereBoolean = 'AND' | 'OR' | 'and' | 'or'

export interface WhereClause {
	type: string
	column?: Column
	operator?: string
	values?: string | number | null | [] | any
	bool: WhereBoolean
	sql?: string
	query?: QueryObj
	first?: any
	second?: any
	not?: boolean
}

// Bindings
export interface Bindings {
	select: string[]
	from: string[]
	join: string[]
	where: string[]
	having: string[]
	order: string[]
	union: string[]
}

export const BindingKeys = ['select', 'from', 'join', 'where', 'having', 'order', 'union']
export type BindingType = 'select' | 'from' | 'join' | 'where' | 'having' | 'order' | 'union'

// SQL Having
export interface Having {
	type: string
	column?: Column
	operator?: string
	values?: any
	bool: WhereBoolean
	sql?: string
	not?: boolean
}

// SQL Union
export interface Union {
	all?: boolean
	query?: QueryObj
}
