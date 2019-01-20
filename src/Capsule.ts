import { Builder } from './Builder'
import { Connection } from './Connectors/Connection'

export class Capsule {
	protected static instance: Capsule
	// protected mananger

	// manager

	// addConnection(connection: Connection, name: string = 'default') {
	// 	this.connections[name] = connection

	// 	return this
	// }

	// getConnection(name: string = 'default') {
	// 	return this.connections[name]
	// }

	// table(name?: string) {
	// 	return Capsule.connection().table(name)
	// }

	public static connection(name?: string) {
		// Capsule.instance.getConnection(name)
	}

	setAsGlobal() {
		Capsule.instance = this
	}
}
