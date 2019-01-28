import { Connection } from '../Connections/Connection'
import { SchemaGrammar } from './Grammars/SchemaGrammar'

export class SchemaBuilder {
	connection: Connection
	grammer: SchemaGrammar
	static defaultStringLength = 255

	constructor(connection: Connection) {
		this.connection = connection
		this.grammer = connection.getSchemaGrammar()
	}
}
