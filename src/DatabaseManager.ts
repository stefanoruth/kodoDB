import { DatabaseConfig, Configuration, config } from './config'
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
	protected config: Configuration
	protected factory: ConnectionFactory

	constructor() {
		this.config = config
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
		const localConfig = this.configuration(name)

		// Extensions?

		return this.factory.make(localConfig, name)
	}

	getDefaultConnection() {
		return this.config.default
	}

	setDefaultConnection(name: string) {
		this.config.default = name
	}

	configuration(name?: string): DatabaseConfig {
		name = name || this.getDefaultConnection()

		const connections = this.config.connections

		if (connections[name]) {
			return connections[name]
		}

		throw new Error(`Database [${name}] not configured.`)
	}
}
