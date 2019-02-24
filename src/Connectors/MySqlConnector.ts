import { Connector } from './Connector'
import { createConnection, ConnectionConfig, Connection } from 'mysql'
import { DatabaseConfig } from '../config'

export class MySqlConnector extends Connector {
	connect(config: DatabaseConfig): Connection {
		const mysql: ConnectionConfig = {
			host: config.host,
			port: config.port ? parseInt(config.port, 10) : 3606,
			database: config.database,
			user: config.username,
			password: config.password,
			charset: config.charset,
		}

		const connection = createConnection(mysql)

		return connection
	}
}
