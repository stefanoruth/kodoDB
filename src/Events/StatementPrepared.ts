import { Connection } from '../Connections/Connection'

export class StatementPrepared {
	/**
	 * The database connection instance.
	 */
	connection: Connection

	/**
	 * The Query statement.
	 */
	statement: string

	/**
	 * Create a new event instance.
	 */
	constructor(connection: Connection, statement: string) {
		this.statement = statement
		this.connection = connection
	}
}
