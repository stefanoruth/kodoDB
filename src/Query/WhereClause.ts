export type WhereBoolean = 'AND' | 'OR'

export interface WhereClause {
	type: string
	column: string | string[]
	operator?: string
	values: string | number | null | []
	bool: WhereBoolean
	sql?: string
	query?: any
}
