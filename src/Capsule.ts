import { DatabaseManager } from './DatabaseManager'
import { config, DatabaseConfig } from './config'

export class Capsule {
	public static instance?: Capsule
	protected manager: DatabaseManager

	constructor() {
		this.manager = new DatabaseManager()
	}

	static connection(connection?: string) {
		if (!Capsule.instance) {
			throw new Error('Capsule is not yet global')
		}

		return Capsule.instance.getConnection(connection)
	}

	static table(table: string, connection?: string) {
		return Capsule.connection(connection).table(table)
	}

	static schema(connection?: string) {
		return Capsule.connection(connection).getSchemaBuilder()
	}

	getConnection(name?: string) {
		return this.manager.connection(name)
	}

	addConnection(connection: DatabaseConfig, name: string = 'default') {
		config.connections[name] = connection

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
