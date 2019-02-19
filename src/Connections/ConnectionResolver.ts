import { Connection } from './Connection'

export interface ConnectionResolverInterface {
	/**
	 * Get a database connection instance.
	 */
	connection(name?: string): Connection

	/**
	 * Get the default connection name.
	 */
	getDefaultConnection(): string

	/**
	 * Set the default connection name.
	 */
	setDefaultConnection(name: string): void
}

export class ConnectionResolver implements ConnectionResolverInterface {
	/**
	 * All of the registered connections.
	 */
	protected connections: { [key: string]: Connection } = {}

	/**
	 * The default connection name.
	 */
	protected default: string = 'default'

	/**
	 * Create a new connection resolver instance.
	 */
	constructor(connections: Connection[] = []) {
		connections.forEach(connection => {
			this.addConnection(connection.getName(), connection)
		})
	}

	/**
	 * Get a database connection instance.
	 */
	connection(name?: string): Connection {
		if (!name) {
			name = this.getDefaultConnection()
		}
		return this.connections[name]
	}

	/**
	 * Add a connection to the resolver.
	 */
	addConnection(name: string, connection: Connection): void {
		this.connections[name] = connection
	}

	/**
	 * Check if a connection has been registered.
	 */
	hasConnection(name: string): boolean {
		return !!this.connections[name]
	}

	/**
	 * Get the default connection name.
	 */
	getDefaultConnection(): string {
		return this.default
	}

	/**
	 * Set the default connection name.
	 */
	setDefaultConnection(name: string): void {
		this.default = name
	}
}
