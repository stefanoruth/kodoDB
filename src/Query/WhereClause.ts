export type WhereBoolean = 'AND' | 'OR'

export interface WhereClause {
	type: string
	column?: string | string[]
	operator?: string
	values?: string | number | null | [] | any
	bool: WhereBoolean
	sql?: string
	query?: any
	first?: any
	second?: any
	not?: boolean
}
