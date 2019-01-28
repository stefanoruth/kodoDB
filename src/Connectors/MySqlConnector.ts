import { Connector } from './Connector'
import { createConnection, ConnectionConfig as MysqlConfig, Connection } from 'mysql'
import { ConnectionConfig } from '../config'

export class MySqlConnector implements Connector {
	connect(config: ConnectionConfig): Connection {
		const mysql: MysqlConfig = {
			host: config.host,
			port: config.port ? parseInt(config.port, 10) : 3606,
			database: config.database,
			user: config.username,
			password: config.password,
			charset: config.charset,
		}

		const connection = createConnection(mysql)

		connection.connect((error: Error) => {
			if (error) {
				console.log(error)
			}
		})

		return connection
	}
}
