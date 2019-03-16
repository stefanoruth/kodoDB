import {
	ConnectionEvent,
	QueryExecuted,
	StatementPrepared,
	TransactionBeginning,
	TransactionCommitted,
	TransactionRolledBack,
} from '../src/Events'
import { Mock } from 'ts-mockery'
import { Connection } from '../src/Connections/Connection'
import { DatabaseStatement } from '../src/Drivers/DatabaseDriver'

describe('Events', () => {
	test('StatementPrepared', () => {
		const connection = Mock.of<Connection>()
		const statement = Mock.of<DatabaseStatement>()

		const event = new StatementPrepared(connection, statement)

		expect(event).toBeInstanceOf(StatementPrepared)
		expect(event.connection).toBe(connection)
		expect(event.statement).toBe(statement)
	})

	test('ConnectionEvent', () => {
		class Connected extends ConnectionEvent {}

		const connection = Mock.of<Connection>({ getName: jest.fn() })

		const event = new Connected(connection)

		expect(event).toBeInstanceOf(ConnectionEvent)
	})

	test('QueryExecuted', () => {
		const connection = Mock.of<Connection>({ getName: jest.fn() })
		const sql = 'SELECT * FROM users'
		const bindings = ['foo']

		const event = new QueryExecuted(sql, bindings, 123, connection)

		expect(event).toBeInstanceOf(QueryExecuted)
	})
})
