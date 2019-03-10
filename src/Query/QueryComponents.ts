export interface QueryOrder {
	column?: string
	direction?: string
	type?: string
	sql?: string
}

export interface QueryAggregate {
	functionName: string
	columns: string[]
}

export interface QueryUnionOrder {
	column?: string
	direction?: string
	type?: string
	sql?: string
}
