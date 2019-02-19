import { ConnectionConfig } from '../config'
import { MySqlConnector } from './MySqlConnector'
import { MySqlConnection } from '../Connections/MySqlConnection'

export class ConnectionFactory {
	make(config: ConnectionConfig, name: string) {
		// TODO if read connection?

		return this.createConnection(config)
	}

	createConnector(config: ConnectionConfig) {
		switch (config.driver) {
			case 'mysql':
				return new MySqlConnector()
		}

		throw new Error(`Unsupported driver [${config.driver}]`)
	}

	createConnection(config: ConnectionConfig) {
		switch (config.driver) {
			case 'mysql':
				return new MySqlConnection(() => null, config.database, config.prefix, config)
		}

		throw new Error(`Unsupported driver [${config.driver}]`)
	}
}
