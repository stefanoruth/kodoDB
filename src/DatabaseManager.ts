import { DatabaseConfig, ConnectionConfig, config as Configuration } from './config'
import { ConnectionFactory } from './Connectors/ConnectionFactory'
import { Connection } from './Connections/Connection'

type DataBaseConnections = { [key: string]: Connection }

export interface ConnectionResolver {
	connection: (name?: string) => Connection
	getDefaultConnection: () => string
	setDefaultConnection: (name: string) => void
}

export class DatabaseManager implements ConnectionResolver {
	protected connections: DataBaseConnections = {}
	protected config: DatabaseConfig
	protected factory: ConnectionFactory

	constructor() {
		this.config = Configuration
		this.factory = new ConnectionFactory()
	}

	connection(name?: string): Connection {
		const database = name || this.getDefaultConnection()
		const type = null

		if (!this.connections[database]) {
			this.connections[database] = this.configure(this.makeConnection(database) as Connection, type)
		}

		return this.connections[database]
	}

	configure(connection: Connection, type?: string | null) {
		// Todo set reac/write type
		// Todo set reconnector

		return connection
	}

	makeConnection(name: string) {
		const config = this.configuration(name)

		// Extensions?

		return this.factory.make(config, name)
	}

	getDefaultConnection() {
		return this.config.default
	}

	setDefaultConnection(name: string) {
		this.config.default = name
	}

	configuration(name?: string): ConnectionConfig {
		name = name || this.getDefaultConnection()

		const connections = this.config.connections

		if (connections[name]) {
			return connections[name]
		}

		throw new Error(`Database [${name}] not configured.`)
	}
}
