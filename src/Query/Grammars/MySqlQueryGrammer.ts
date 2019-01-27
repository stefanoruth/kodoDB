import { QueryGrammar } from './QueryGrammar'
import { QueryBuilder } from '../QueryBuilder'

export class MySqlQueryGrammar extends QueryGrammar {
	compileSelect(query: QueryBuilder) {
		// Todo

		return super.compileSelect(query)
	}
}
