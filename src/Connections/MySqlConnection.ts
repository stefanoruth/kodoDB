import { Connection } from './Connection'
import { MySqlBuilder } from '../Schema/MySqlBuilder'
import { MySqlGrammar } from '../Schema/Grammars/MySqlGrammar'

export class MySqlConnection extends Connection {
	getSchemaBuilder() {
		return new MySqlBuilder(this)
	}

	getDefaultSchemaGrammar() {
		return new MySqlGrammar()
	}
}
