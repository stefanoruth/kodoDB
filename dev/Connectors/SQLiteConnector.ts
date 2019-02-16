import { Connector } from './Connector'
import { ConnectionConfig } from '../config'
import { Database } from 'sqlite3'

export class SQLiteConnector implements Connector {
	connect(config: ConnectionConfig): Database {
		const db = new Database(':memory:')

		return db
	}
}
