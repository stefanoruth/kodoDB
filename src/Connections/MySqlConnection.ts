import { Connection } from './Connection'
import { MySqlBuilder } from '../Schema/MySqlBuilder'
import { MySqlSchemaGrammar } from '../Schema/Grammars/MySqlGrammar'

export class MySqlConnection extends Connection {
	protected pdo: () => any = () => ({})

	getSchemaBuilder(): MySqlBuilder {
		return new MySqlBuilder(this)
	}

	getDefaultSchemaGrammar(): MySqlSchemaGrammar {
		return new MySqlSchemaGrammar()
	}
}
