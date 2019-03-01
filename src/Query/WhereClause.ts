export type WhereBoolean = 'and' | 'or'

export interface WhereClause {
	type: string
	column: string
	operator: string
	values: string | number | null | []
	bool: WhereBoolean
	sql?: string
	query?: any
}
