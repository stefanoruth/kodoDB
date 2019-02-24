import { DatabaseDriver } from './DatabaseDriver'
import { Connection, createConnection } from 'mysql'

interface MySqlConfig {
	host: string
	port: number
	database: string
	user: string
	password: string
	charset: string
}

export class MySqlDriver implements DatabaseDriver {
	/**
	 * Holder of the actual database connection
	 */
	protected connection: Connection

	constructor(config: MySqlConfig) {
		this.connection = createConnection(config)
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

	async exec() {
		//
	}

	async prepare() {
		//
	}
}
