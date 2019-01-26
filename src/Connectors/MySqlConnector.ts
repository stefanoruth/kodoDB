import { Connector } from './Connector'
import { createConnection, ConnectionConfig as MysqlConfig, Connection } from 'mysql'
import { ConnectionConfig } from '../config'

export class MySqlConnector implements Connector {
	connect(config: ConnectionConfig): Connection {
		const connection = createConnection(this.formatConfig(config))

		return connection
	}

	formatConfig(config: ConnectionConfig): MysqlConfig {
		const mysql: MysqlConfig = {
			host: config.host,
			port: config.port ? parseInt(config.port, 10) : 3606,
			database: config.database,
			user: config.username,
			password: config.password,
			charset: config.charset,
		}

		return mysql
	}
}
