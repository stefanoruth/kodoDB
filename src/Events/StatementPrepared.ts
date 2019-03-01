import { Connection } from '../Connections/Connection'
import { DatabaseStatement } from '../Drivers/DatabaseDriver'

export class StatementPrepared {
	/**
	 * The database connection instance.
	 */
	connection: Connection

	/**
	 * The Query statement.
	 */
	statement: DatabaseStatement

	/**
	 * Create a new event instance.
	 */
	constructor(connection: Connection, statement: DatabaseStatement) {
		this.statement = statement
		this.connection = connection
	}
}
