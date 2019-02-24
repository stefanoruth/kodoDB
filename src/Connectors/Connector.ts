import { ConnectorInterface } from './ConnectorInterface'
import { DatabaseConfig } from '../config'

export abstract class Connector implements ConnectorInterface {
	abstract connect(config: DatabaseConfig): any
}
