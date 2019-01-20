import { DatabaseConfig, ConnectionConfig } from './config'
import { ConnectionFactory } from './Connectors/ConnectionFactory'
import { Connection } from './Connections/Connection'

type DataBaseConnections = { [key: string]: Connection }

export class DatabaseManager {
	protected connections: DataBaseConnections = {}
	protected config: DatabaseConfig
	protected factory: ConnectionFactory

	constructor(config: DatabaseConfig, factory: ConnectionFactory) {
		this.config = config
		this.factory = factory
	}

	connection(name?: string) {
		const database = name || this.getDefaultConnection()
		const type = null

		if (!this.connections[database]) {
			this.connections[database] = this.configure(
				this.makeConnection(database),
				type
			)
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

	configuration(name?: string): ConnectionConfig {
		name = name || this.getDefaultConnection()

		const connections = this.config.connections

		if (connections[name]) {
			return connections[name]
		}

		throw new Error(`Database [${name}] not configured.`)
	}
}
