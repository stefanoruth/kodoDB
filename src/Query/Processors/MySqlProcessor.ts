import { QueryProcessor } from './QueryProcessor'

export class MySqlProcessor extends QueryProcessor {
	processColumnListing(results: any[]) {
		return results.map((item: any) => {
			return item.column_name
		})
	}
}
