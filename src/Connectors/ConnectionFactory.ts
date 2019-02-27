import { DatabaseConfig } from '../config'
import { MySqlConnector } from './MySqlConnector'
import { MySqlConnection } from '../Connections/MySqlConnection'
import { MySqlDriver } from '../Drivers/MySqlDriver'
import { DatabaseDriver } from '../Drivers/DatabaseDriver'
import { Connector } from './Connector'

export class ConnectionFactory {
	make(config: DatabaseConfig, name: string) {
		// TODO if read connection?

		return this.createConnection(config)
	}

	createConnector(config: DatabaseConfig): Connector {
		switch (config.driver) {
			case 'mysql':
				return new MySqlConnector()
		}

		throw new Error(`Unsupported driver [${config.driver}]`)
	}

	createConnection(config: DatabaseConfig) {
		switch (config.driver) {
			case 'mysql':
				return new MySqlConnection(new MySqlDriver(config), config.database, config.prefix, config)
		}

		throw new Error(`Unsupported driver [${config.driver}]`)
	}

	createDriver(config: DatabaseConfig): DatabaseDriver {
		switch (config.driver) {
			case 'mysql':
				return new MySqlDriver(config)
		}

		throw new Error(`Unsupported driver [${config.driver}]`)
	}
}
