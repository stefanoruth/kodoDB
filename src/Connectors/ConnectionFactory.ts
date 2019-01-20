import { ConnectionConfig } from '../config'
import { MySqlConnection } from '../Drivers/MySql'

interface Config extends ConnectionConfig {
	name?: string
}

export class ConnectionFactory {
	make(config: Config, name: string) {
		config.name = name

		return this.createSingleConnection(config)
	}

	createSingleConnection(config: Config) {
		// $pdo = $this -> createPdoResolver($config);
		const pdo = ''

		return this.createConnection(
			config.driver,
			pdo,
			config.database,
			config.prefix,
			config
		)
	}

	createConnection(
		driver: string,
		connection: string,
		database: string = '',
		prefix: string = '',
		config?: Config
	) {
		switch (driver) {
			case 'mysql':
				return new MySqlConnection(connection, database, prefix, config)
		}

		throw new Error(`Unsupported driver [${driver}]`)
	}
}
