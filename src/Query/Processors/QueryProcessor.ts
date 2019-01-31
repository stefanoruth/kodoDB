import { QueryBuilder } from '../QueryBuilder'

export class QueryProcessor {
	processSelect(query: QueryBuilder, results: any[]) {
		return results
	}

	processInsertGetId(query: QueryBuilder, sql: string, values: any[], sequence?: string) {
		query.getConnection().insert(sql, values)

		return query
			.getConnection()
			.getPdo()
			.lastInsertId(sequence)
	}

	processColumnListing(results: any[]): any[] {
		return results
	}
}
