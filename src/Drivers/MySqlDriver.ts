import { DatabaseDriver } from './DatabaseDriver'
import { Connection, createConnection, ConnectionConfig } from 'mysql'
import { DatabaseConfig } from '../config'

export class MySqlDriver implements DatabaseDriver {
	/**
	 * Holder of the actual database connection
	 */
	protected connection: Connection

	constructor(config: DatabaseConfig) {
		this.connection = createConnection(this.mapConfig(config))
	}

	/**
	 * Converts the DatabaseConfig into a connection specefic config.
	 */
	mapConfig(config: DatabaseConfig): ConnectionConfig {
		return {
			// host: config.host,
			// port: parseInt(config.port, 10) || 3306,
			// localAddress: string;
			// socketPath: string;
			// timezone: string;
			// connectTimeout: 10,
			// stringifyObjects: false,
			// insecureAuth: false
			// supportBigNumbers?: boolean;
			// bigNumberStrings?: boolean;
			// dateStrings?: boolean | Array<'TIMESTAMP' | 'DATETIME' | 'DATE'>
			// debug?: boolean | string[] | Types[];
			// ssl?: string | (tls.SecureContextOptions & { rejectUnauthorized?: boolean });
		}
	}

	/**
	 * Connect to the database
	 */
	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.connection.connect((err: Error) => {
				if (err) {
					return reject(err)
				}
				return resolve()
			})
		})
	}

	/**
	 * Disconnect from the database
	 */
	disconnect(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.connection.end((err: Error) => {
				if (err) {
					return reject(err)
				}
				return resolve()
			})
		})
	}

	/**
	 * Run a query againt the database
	 */
	query(sql: string, values: any[] = []): Promise<any> {
		return new Promise((resolve, reject) => {
			this.connection.query(sql, values, (err, data) => {
				if (err) {
					return reject(err)
				}
				return resolve(data)
			})
		})
	}

	/**
	 * Start a transaction.
	 */
	beginTransaction(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.connection.beginTransaction(err => {
				if (err) {
					return reject(err)
				}
				return resolve()
			})
		})
	}

	/**
	 * Add transaction point.
	 */
	commit(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.connection.commit(err => {
				if (err) {
					return reject(err)
				}
				return resolve()
			})
		})
	}

	/**
	 * Rollback all transactional changes.
	 */
	rollback(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.connection.rollback(err => {
				if (err) {
					return reject(err)
				}
				return resolve()
			})
		})
	}

	async exec(query: string) {
		console.log('EXEC', query)
	}

	async prepare(query: string) {
		console.log('PREPARE', query)
	}
}
