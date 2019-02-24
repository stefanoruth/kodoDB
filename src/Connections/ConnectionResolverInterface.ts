import { Connection } from './Connection'

export interface ConnectionResolverInterface {
	/**
	 * Get a database connection instance.
	 */
	connection(name?: string): Connection

	/**
	 * Get the default connection name.
	 */
	getDefaultConnection(): string

	/**
	 * Set the default connection name.
	 */
	setDefaultConnection(name: string): void
}
