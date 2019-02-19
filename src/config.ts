export type DatabaseDrivers = 'mysql' | 'sqlite' | 'pgsql' | 'sqlsrv'

export interface ConnectionConfig {
	driver: DatabaseDrivers | string
	host?: string
	port?: string
	database?: string
	username?: string
	password?: string
	unix_socket?: string
	charset?: string
	collation?: string
	prefix?: string
	prefix_indexes?: string | boolean
	foreign_key_constraints?: string | boolean
	strict?: string | boolean
	engine?: string | null
	schema?: string
	sslmode?: string
	modes?: string
}

export interface DatabaseConfig {
	default: string
	connections: { [key: string]: ConnectionConfig }
	migrations: {
		path: string[]
		table: string
	}
}

export const config: DatabaseConfig = {
	default: process.env.DB_CONNECTION || 'mysql',

	connections: {
		sqlite: {
			driver: 'sqlite',
			database: process.env.DB_DATABASE || 'database.sqlite',
			prefix: '',
			foreign_key_constraints: process.env.DB_FOREIGN_KEYS || true,
		},

		mysql: {
			driver: 'mysql',
			host: process.env.DB_HOST || '127.0.0.1',
			port: process.env.DB_PORT || '3606',
			database: process.env.DB_DATABASE || '',
			username: process.env.DB_USERNAME || '',
			password: process.env.DB_PASSWORD || '',
			unix_socket: process.env.DB_SOCKET || '',
			charset: 'utf8mb4',
			collation: 'utf8mb4_unicode_ci',
			prefix: '',
			prefix_indexes: true,
			strict: true,
			engine: null,
		},

		pgsql: {
			driver: 'pgsql',
			host: process.env.DB_HOST || '127.0.0.1',
			port: process.env.DB_PORT || '5432',
			database: process.env.DB_DATABASE || '',
			username: process.env.DB_USERNAME || '',
			password: process.env.DB_PASSWORD || '',
			charset: 'utf8',
			prefix: '',
			prefix_indexes: true,
			schema: 'public',
			sslmode: 'prefer',
		},

		sqlsrv: {
			driver: 'sqlsrv',
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || '1433',
			database: process.env.DB_DATABASE || '',
			username: process.env.DB_USERNAME || '',
			password: process.env.DB_PASSWORD || '',
			charset: 'utf8',
			prefix: '',
			prefix_indexes: true,
		},
	},

	migrations: {
		path: ['example/migrations'],
		table: 'migrations',
	},
}
