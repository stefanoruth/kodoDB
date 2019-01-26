import { Builder } from './Builder'
import { ConnectionFactory } from './Connectors/ConnectionFactory'
import { DatabaseManager } from './DatabaseManager'
import { Config, ConnectionConfig } from './config'

export class Capsule {
	public static instance: Capsule
	protected manager: DatabaseManager

	constructor() {
		this.manager = new DatabaseManager()
	}

	static connection(connection?: string) {
		return Capsule.instance!.getConnection(connection)
	}

	static table(table: string, connection?: string) {
		// return Capsule.connection(connection).table(table)
	}

	static schema(connection?: string) {
		return Capsule.connection(connection).getSchemaBuilder()
	}

	getConnection(name?: string) {
		return this.manager.connection(name)
	}

	addConnection(connection: ConnectionConfig, name: string = 'default') {
		Config.addConnection(name, connection)

		return this
	}

	getDatabaseManager() {
		return this.manager
	}

	setAsGlobal() {
		Capsule.instance = this

		return this
	}
}
