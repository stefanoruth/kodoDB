import { Connection } from '../Connections/Connection'

export class StatementPrepared {
	/**
	 * The database connection instance.
	 */
	connection: Connection

	/**
	 * The PDO statement.
	 */
	statement: string // PDOStatement

	/**
	 * Create a new event instance.
	 */
	constructor(connection: Connection, statement: string) {
		this.statement = statement
		this.connection = connection
	}
}
