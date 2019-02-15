import { Connection } from '../Connections/Connection'

export abstract class ConnectionEvent {
	/**
	 * The name of the connection.
	 */
	connectionName: string

	/**
	 * The database connection instance.
	 */
	connection: Connection

	/**
	 * Create a new event instance.
	 */
	constructor(connection: Connection) {
		this.connection = connection
		this.connectionName = connection.getName()
	}
}
