import { DatabaseConfig } from '../config'

export interface ConnectorInterface {
	connect: (config: DatabaseConfig) => any
}
