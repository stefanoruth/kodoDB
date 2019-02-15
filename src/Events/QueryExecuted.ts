import { Connection } from '../Connections/Connection'

export class QueryExecuted {
	/**
	 * The SQL query that was executed.
	 */
	sql: string

	/**
	 * The array of query bindings.
	 */
	bindings: any[]

	/**
	 * The number of milliseconds it took to execute the query.
	 */
	time: number

	/**
	 * The database connection instance.
	 */
	connection: Connection

	/**
	 * The database connection name.
	 */
	connectionName: string

	/**
	 * Create a new event instance.
	 */
	constructor(sql: string, bindings: any[], time: number, connection: Connection) {
		this.sql = sql
		this.time = time
		this.bindings = bindings
		this.connection = connection
		this.connectionName = connection.getName()
	}
}
