import { Connection } from '../Connections/Connection'
import { Grammar } from './Grammars/Grammar'

export class Builder {
	connection: Connection
	grammer: Grammar
	static $defaultStringLength = 255

	constructor(connection: Connection) {
		this.connection = connection
		this.grammer = connection.getSchemaGrammar()
	}
}
