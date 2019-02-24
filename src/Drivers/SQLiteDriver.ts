import { DatabaseDriver } from './DatabaseDriver'
import { DatabaseConfig } from '../config'
import { Database } from 'sqlite3'

export class SQLiteDriver implements DatabaseDriver {
	/**
	 * Holder of the actual database connection
	 */
	protected connection: Database

	constructor(config: DatabaseConfig) {
		this.connection = new Database(':memory:')
	}

	/**
	 * Converts the DatabaseConfig into a connection specefic config.
	 */
	mapConfig(config: DatabaseConfig): any {
		return {}
	}

	/**
	 * Run a query againt the database
	 */
	query(sql: string, values: any[] = []): Promise<any> {
		return new Promise((resolve, reject) => {
			this.connection.serialize(() => {
				this.connection.run(sql, (data: any, err: Error) => {
					if (err) {
						return reject(err)
					}
					return resolve(data)
				})
			})
		})
	}

	/**
	 * Connect to the database
	 */
	async connect(): Promise<void> {
		//
	}

	/**
	 * Disconnect from the database
	 */
	async disconnect(): Promise<void> {
		//
	}

	/**
	 * Start a transaction.
	 */
	async beginTransaction(): Promise<void> {
		//
	}

	/**
	 * Add transaction point.
	 */
	async commit(): Promise<void> {
		//
	}

	/**
	 * Rollback all transactional changes.
	 */
	async rollback(): Promise<void> {
		//
	}

	async exec(query: string) {
		console.log('EXEC', query)
	}

	async prepare(query: string) {
		console.log('PREPARE', query)
	}
}
