import { QueryBuilder } from '../QueryBuilder'

export class QueryProcessor {
	/**
	 * Process the results of a "select" query.
	 */
	processSelect(query: QueryBuilder, results: any[]): any[] {
		return results
	}

	/**
	 * Process an  "insert get ID" query.
	 */
	processInsertGetId(query: QueryBuilder, sql: string, values: any[], sequence?: string): number {
		// $query -> getConnection() -> insert($sql, $values);
		// $id = $query -> getConnection() -> getPdo() -> lastInsertId($sequence);
		// return is_numeric($id) ? (int) $id: $id
		return 0
	}

	/**
	 * Process the results of a column listing query.
	 */
	processColumnListing(results: any[]): any[] {
		return results
	}
}
