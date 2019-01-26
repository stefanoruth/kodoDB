import { ConnectionConfig } from '../config'

export interface Connector {
	connect: (config: ConnectionConfig) => any
}
