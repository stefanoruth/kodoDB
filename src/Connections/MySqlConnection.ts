import { Connection } from './Connection'
import { MySqlBuilder } from '../Schema/MySqlBuilder'
import { MySqlSchemaGrammar } from '../Schema/Grammars/MySqlGrammar'
import { MySqlProcessor } from '../Query/Processors/MySqlProcessor'
import { MySqlQueryGrammar } from '../Query/Grammars/MySqlQueryGrammer'

export class MySqlConnection extends Connection {
	getSchemaBuilder(): MySqlBuilder {
		return new MySqlBuilder(this)
	}

	getDefaultSchemaGrammar(): MySqlSchemaGrammar {
		return new MySqlSchemaGrammar()
	}

	getDefaultPostProcessor(): MySqlProcessor {
		return new MySqlProcessor()
	}

	getDefaultQueryGrammar(): MySqlQueryGrammar {
		return new MySqlQueryGrammar()
	}
}
