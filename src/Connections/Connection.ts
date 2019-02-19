import { QueryBuilder } from '../Query/QueryBuilder'
import { SchemaBuilder } from '../Schema/SchemaBuilder'
import { SchemaGrammar } from '../Schema/Grammars/SchemaGrammar'
import { QueryGrammar } from '../Query/Grammars/QueryGrammar'
import { QueryProcessor } from '../Query/Processors/QueryProcessor'
import { QueryException } from '../Exceptions/QueryException'
import { detectsLostConnections, tap, detectsDeadlocks } from '../Utils'
import { Expression } from '../Query/Expression'
import { BaseGrammar } from '../BaseGrammar'
import {
	TransactionBeginning,
	TransactionCommitted,
	TransactionRolledBack,
	QueryExecuted,
	StatementPrepared,
} from '../Events'
import { DatabaseConfig, ConnectionConfig } from '../config'

export interface ConnectionInterface {
	table(table: string): QueryBuilder
	raw(value: any): Expression
	selectOne(query: string, bindings: any[], useReadPdo: boolean): any
	select(query: string, bindings: any[], useReadPdo: boolean): []
	cursor(query: string, bindings: any[], useReadPdo: boolean): Generator
	insert(query: string, bindings: any[]): boolean
	update(query: string, bindings: any[]): number
	delete(query: string, bindings: any[]): number
	statement(query: string, bindings: any[]): boolean
	affectingStatement(query: string, bindings: any[]): number
	unprepared(query: string): boolean
	prepareBindings(bindings: any[]): any[]
	transaction(callback: () => void, attempts: number): any
	beginTransaction(): void
	commit(): void
	rollBack(): void
	transactionLevel(): number
	pretend(callback: () => void): QueryLog[]
}

export type QueryLog = { query: string; bindings?: any[]; time?: number }

export abstract class Connection implements ConnectionInterface {
	/**
	 * The active PDO connection.
	 */
	protected abstract pdo: () => any

	/**
	 * The active PDO connection used for reads.
	 */
	protected readPdo?: () => void // PDO?

	/**
	 * The name of the connected database.
	 */
	protected database: string

	/**
	 * The table prefix for the connection.
	 */
	protected tablePrefix: string = ''

	/**
	 * The database connection configuration options.
	 */
	protected config: ConnectionConfig

	/**
	 * The reconnector instance for the connection.
	 */
	protected reconnector?: (connection: this) => void

	/**
	 * The query grammar implementation.
	 */
	protected queryGrammar: QueryGrammar

	/**
	 * The schema grammar implementation.
	 */
	protected schemaGrammar?: SchemaGrammar

	/**
	 * The query post processor implementation.
	 */
	protected postProcessor: QueryProcessor

	/**
	 * The event dispatcher instance.
	 */
	protected events: any // Illuminate\Contracts\Events\Dispatcher

	/**
	 * The default fetch mode of the connection.
	 */
	protected fetchMode?: number

	/**
	 * The number of active transactions.
	 */
	protected transactions: number = 0

	/**
	 * Indicates if changes have been made to the database.
	 */
	protected recordsModified: number | boolean = false

	/**
	 * All of the queries run against the connection.
	 */
	protected queryLog: QueryLog[] = []

	/**
	 * Indicates whether queries are being logged.
	 */
	protected loggingQueries: boolean = false

	/**
	 * Indicates if the connection is in a "dry run".
	 */
	protected pretending: boolean = false

	/**
	 * The instance of Doctrine connection.
	 */
	protected doctrineConnection: any // Doctrine\DBAL\Connection

	/**
	 * The connection resolvers.
	 */
	protected static resolvers: { [key: string]: any } = {}

	/**
	 * Create a new database connection instance.
	 */
	constructor(pdo: () => void, database: string = '', tablePrefix: string = '', config: ConnectionConfig) {
		// First we will setup the default properties. We keep track of the DB
		// name we are connected to since it is needed when some reflective
		// type commands are run such as checking whether a table exists.
		this.database = database
		this.tablePrefix = tablePrefix
		this.config = config

		// We need to initialize a query grammar and the query post processors
		// which are both very important parts of the database abstractions
		// so we initialize these to their default values while starting.
		this.queryGrammar = this.getDefaultQueryGrammar()
		this.postProcessor = this.getDefaultPostProcessor()
	}

	/**
	 * Set the query grammar to the default implementation.
	 */
	useDefaultQueryGrammar(): void {
		this.queryGrammar = this.getDefaultQueryGrammar()
	}

	/**
	 * Get the default query grammar instance.
	 *
	 * @return \Illuminate\Database\Query\Grammars\Grammar
	 */
	protected getDefaultQueryGrammar(): QueryGrammar {
		return new QueryGrammar()
	}

	/**
	 * Set the schema grammar to the default implementation.
	 */
	useDefaultSchemaGrammar(): void {
		this.schemaGrammar = this.getDefaultSchemaGrammar()
	}
	/**
	 * Get the default schema grammar instance.
	 *
	 * @return \Illuminate\Database\Schema\Grammars\Grammar
	 */
	protected abstract getDefaultSchemaGrammar(): SchemaGrammar

	/**
	 * Set the query post processor to the default implementation.
	 */
	useDefaultPostProcessor() {
		this.postProcessor = this.getDefaultPostProcessor()
	}

	/**
	 * Get the default post processor instance.
	 */
	protected getDefaultPostProcessor(): QueryProcessor {
		return new QueryProcessor()
	}

	/**
	 * Get a schema builder instance for the connection.
	 */
	getSchemaBuilder(): SchemaBuilder {
		if (!this.schemaGrammar) {
			this.useDefaultSchemaGrammar()
		}
		return new SchemaBuilder(this)
	}

	/**
	 * Begin a fluent query against a database table.
	 */
	table(table: string): QueryBuilder {
		return this.query().from(table)
	}

	/**
	 * Get a new query builder instance.
	 */
	query(): QueryBuilder {
		return new QueryBuilder(this, this.getQueryGrammar(), this.getPostProcessor())
	}

	/**
	 * Run a select statement and return a single result.
	 */
	selectOne(query: string, bindings: any[] = [], useReadPdo: boolean = true): any {
		const records = this.select(query, bindings, useReadPdo)
		return records.shift()
	}

	/**
	 * Run a select statement against the database.
	 */
	selectFromWriteConnection(query: string, bindings: any[] = []): [] {
		return this.select(query, bindings, false)
	}

	/**
	 * Run a select statement against the database.
	 */
	select(query: string, bindings: any[] = [], useReadPdo: boolean = true): [] {
		return this.run(query, bindings, () => {
			if (this.isPretending()) {
				return []
			}
			// For select statements, we'll simply execute the query and return an array
			// of the database result set. Each element in the array will be a single
			// row from the database table, and will either be an array or objects.
			const statement = this.prepared(this.getPdoForSelect(useReadPdo).prepare(query))
			this.bindValues(statement, this.prepareBindings(bindings))
			statement.execute()
			return statement.fetchAll()
		})
	}

	/**
	 * Run a select statement against the database and returns a generator.
	 */
	*cursor(query: string, bindings: any[] = [], useReadPdo = true): Generator {
		const finalStatement = this.run(query, bindings, () => {
			if (this.isPretending()) {
				return []
			}
			// First we will create a statement for the query. Then, we will set the fetch
			// mode and prepare the bindings for the query. Once that's done we will be
			// ready to execute the query against the database and return the cursor.
			const statement = this.prepared(this.getPdoForSelect(useReadPdo).prepare(query))

			this.bindValues(statement, this.prepareBindings(bindings))
			// Next, we'll execute the query against the database and return the statement
			// so we can return the cursor. The cursor will use a PHP generator to give
			// back one row at a time without using a bunch of memory to render them.
			statement.execute()
			return statement
		})

		let record
		do {
			record = finalStatement.fetch()
			if (record) {
				yield record
			}
		} while (record)
	}

	/**
	 * Configure the PDO prepared statement.
	 */
	protected prepared(statement: any): any {
		// PDOStatement
		statement.setFetchMode(this.fetchMode)
		this.event(new StatementPrepared(this, statement))
		return statement
	}

	/**
	 * Get the PDO connection to use for a select query.
	 *
	 * @param  bool  useReadPdo
	 * @return \PDO
	 */
	protected getPdoForSelect(useReadPdo = true) {
		return useReadPdo ? this.getReadPdo() : this.getPdo()
	}

	/**
	 * Run an insert statement against the database.
	 */
	insert(query: string, bindings: any[] = []): boolean {
		return this.statement(query, bindings)
	}

	/**
	 * Run an update statement against the database.
	 */
	update(query: string, bindings: any[] = []): number {
		return this.affectingStatement(query, bindings)
	}

	/**
	 * Run a delete statement against the database.
	 */
	delete(query: string, bindings: any[] = []): number {
		return this.affectingStatement(query, bindings)
	}

	/**
	 * Execute an SQL statement and return the boolean result.
	 */
	statement(query: string, bindings: any[] = []): boolean {
		return this.run(query, bindings, () => {
			if (this.isPretending()) {
				return true
			}
			const statement = this.getPdo().prepare(query)
			this.bindValues(statement, this.prepareBindings(bindings))
			this.recordsHaveBeenModified()
			return statement.execute()
		})
	}

	/**
	 * Run an SQL statement and get the number of rows affected.
	 */
	affectingStatement(query: string, bindings: any[] = []): number {
		return this.run(query, bindings, () => {
			if (this.isPretending()) {
				return 0
			}
			// For update or delete statements, we want to get the number of rows affected
			// by the statement and return that back to the developer. We'll first need
			// to execute the statement and then we'll use PDO to fetch the affected.
			const statement = this.getPdo().prepare(query)
			this.bindValues(statement, this.prepareBindings(bindings))
			statement.execute()
			const count = statement.rowCount()
			this.recordsHaveBeenModified(count > 0)
			return count
		})
	}

	/**
	 * Run a raw, unprepared query against the PDO connection.
	 */
	unprepared(query: string): boolean {
		return this.run(query, [], (runQuery: string) => {
			if (this.isPretending()) {
				return true
			}
			const change = this.getPdo().exec(runQuery) !== false
			this.recordsHaveBeenModified(change)
			return change
		})
	}

	/**
	 * Execute the given callback in "dry run" mode.
	 */
	pretend(callback: (connection: Connection) => any): QueryLog[] {
		return this.withFreshQueryLog(() => {
			this.pretending = true
			// Basically to make the database connection "pretend", we will just return
			// the default values for all the query methods, then we will return an
			// array of queries that were "executed" within the Closure callback.
			callback(this)
			this.pretending = false
			return this.queryLog
		})
	}

	/**
	 * Execute the given callback in "dry run" mode.
	 */
	protected withFreshQueryLog(callback: () => any): [] {
		const loggingQueries = this.loggingQueries
		// First we will back up the value of the logging queries property and then
		// we'll be ready to run callbacks. This query log will also get cleared
		// so we will have a new log of all the queries that are executed now.
		this.enableQueryLog()
		this.queryLog = []
		// Now we'll execute this callback and capture the result. Once it has been
		// executed we will restore the value of query logging and give back the
		// value of the callback so the original callers can have the results.
		const result = callback()
		this.loggingQueries = loggingQueries
		return result
	}

	/**
	 * Bind values to their parameters in the given statement.
	 */
	bindValues(statement: string, bindings: any[] = []): void {
		// PDOStatement
		bindings.forEach((value: any, key: number) => {
			// statement.bindValue(
			//     is_string(key) ? key : key + 1, value,
			//     is_int(value) ? PDO :: PARAM_INT : PDO:: PARAM_STR
			// )
		})
	}

	/**
	 * Prepare the query bindings for execution.
	 */
	prepareBindings(bindings: any[] = []): any[] {
		// const grammar = this.getQueryGrammar();

		bindings.forEach((value: any, key: number) => {
			// We need to transform all instances of DateTimeInterface into the actual
			// date string. Each query grammar maintains its own date string format
			// so we'll just ask the grammar for the format to get from the date.
			// if (value instanceof DateTimeInterface) {
			//     bindings[key] = value.format(grammar.getDateFormat());
			// }
			if (typeof value === 'boolean') {
				bindings[key] = Number(value)
			}
		})

		return bindings
	}

	/**
	 * Run a SQL statement and log its execution context.
	 */
	protected run(query: string, bindings: any[] = [], callback: (query: string, bindings: any[]) => any): any {
		this.reconnectIfMissingConnection()
		const start = new Date().getTime()
		// Here we will run this query. If an exception occurs we'll determine if it was
		// caused by a connection that has been lost. If that is the cause, we'll try
		// to re-establish connection and re-run the query with a fresh connection.
		let result
		try {
			result = this.runQueryCallback(query, bindings, callback)
		} catch (err) {
			if (err instanceof QueryException) {
				result = this.handleQueryException(err, query, bindings, callback)
			} else {
				throw err
			}
		}
		// Once we have run the query we will calculate the time that it took to run and
		// then log the query, bindings, and execution time so we will report them on
		// the event that the developer needs them. We'll log time in milliseconds.
		this.logQuery(query, bindings, this.getElapsedTime(start))
		return result
	}

	/**
	 * Run a SQL statement.
	 */
	protected runQueryCallback(
		query: string,
		bindings: any[] = [],
		callback: (query: string, bindings: any[]) => any
	): any {
		// To execute the statement, we'll simply call the callback, which will actually
		// run the SQL against the PDO connection. Then we can calculate the time it
		// took to execute and log the query SQL, bindings and time in our memory.
		try {
			return callback(query, bindings)
		} catch (err) {
			// If an exception occurs when attempting to run a query, we'll format the error
			// message to include the bindings with SQL, which will make this exception a
			// lot more helpful to the developer instead of just the database's errors.
			throw new QueryException(query, this.prepareBindings(bindings), err)
		}
	}

	/**
	 * Log a query in the connection's query log.
	 */
	logQuery(query: string, bindings: any[] = [], time: number): void {
		this.event(new QueryExecuted(query, bindings, time, this))
		if (this.loggingQueries) {
			this.queryLog.push({ query, bindings, time })
		}
	}

	/**
	 * Get the elapsed time since a given starting point.
	 */
	protected getElapsedTime(start: number): number {
		return Math.round((new Date().getTime() - start) * 1000)
	}

	/**
	 * Handle a query exception.
	 */
	protected handleQueryException(
		e: QueryException,
		query: string,
		bindings: any[],
		callback: (query: string, bindings: any[]) => any
	) {
		if (this.transactions >= 1) {
			throw e
		}
		return this.tryAgainIfCausedByLostConnection(e, query, bindings, callback)
	}

	/**
	 * Handle a query exception that occurred during query execution.
	 */
	protected tryAgainIfCausedByLostConnection(
		e: QueryException,
		query: string,
		bindings: any[],
		callback: (query: string, bindings: any[]) => any
	) {
		if (detectsLostConnections(e)) {
			this.reconnect()
			return this.runQueryCallback(query, bindings, callback)
		}
		throw e
	}

	/**
	 * Reconnect to the database.
	 */
	reconnect(): void {
		if (this.reconnector) {
			this.doctrineConnection = null
			return this.reconnector(this)
		}
		throw new Error('Lost connection and no reconnector available.')
	}

	/**
	 * Reconnect to the database if a PDO connection is missing.
	 */
	protected reconnectIfMissingConnection(): void {
		if (!this.pdo) {
			this.reconnect()
		}
	}
	/**
	 * Disconnect from the underlying PDO connection.
	 */
	disconnect(): void {
		// this.setPdo(null).setReadPdo(null)
	}

	/**
	 * Register a database query listener with the connection.
	 */
	listen(callback: () => any): void {
		if (this.events) {
			this.events.listen(QueryExecuted, callback)
		}
	}

	/**
	 * Fire an event for this connection.
	 */
	protected fireConnectionEvent(event: string): [] | undefined {
		if (!this.events) {
			return
		}
		switch (event) {
			case 'beganTransaction':
				return this.events.dispatch(new TransactionBeginning(this))
			case 'committed':
				return this.events.dispatch(new TransactionCommitted(this))
			case 'rollingBack':
				return this.events.dispatch(new TransactionRolledBack(this))
		}
	}
	/**
	 * Fire the given event if possible.
	 */
	protected event(event: any): void {
		if (this.events) {
			this.events.dispatch(event)
		}
	}

	/**
	 * Get a new raw query expression.
	 */
	raw(value: any): Expression {
		return new Expression(value)
	}
	/**
	 * Indicate if any records have been modified.
	 *
	 * @param  bool  value
	 * @return void
	 */
	recordsHaveBeenModified(value = true) {
		if (!this.recordsModified) {
			this.recordsModified = value
		}
	}
	/**
	 * Is Doctrine available?
	 */
	isDoctrineAvailable(): boolean {
		// return class_exists('Doctrine\DBAL\Connection');
		return false
	}

	/**
	 * Get a Doctrine Schema Column instance.
	 */
	getDoctrineColumn(table: string, column: string) {
		// \Doctrine\DBAL\Schema\Column
		// const schema = this.getDoctrineSchemaManager();
		// return schema.listTableDetails(table).getColumn(column);
	}

	/**
	 * Get the Doctrine DBAL schema manager for the connection.
	 */
	getDoctrineSchemaManager() {
		// \Doctrine\DBAL\Schema\AbstractSchemaManager
		// return this.getDoctrineDriver().getSchemaManager(this.getDoctrineConnection());
	}

	/**
	 * Get the Doctrine DBAL database connection instance.
	 */
	getDoctrineConnection() {
		// \Doctrine\DBAL\Connection
		// if (!this.doctrineConnection) {
		//     const driver = this.getDoctrineDriver();

		//     this.doctrineConnection = new DoctrineConnection({
		//         pdo: this.getPdo(),
		//         dbname: this.getConfig('database'),
		//         driver: driver.getName(),
		//     }, driver);
		// }
		return this.doctrineConnection
	}

	/**
	 * Get the current PDO connection.
	 */
	getPdo() {
		if (typeof this.pdo === 'function') {
			return (this.pdo = this.pdo())
		}
		return this.pdo
	}

	/**
	 * Get the current PDO connection used for reading.
	 */
	getReadPdo() {
		if (this.transactions > 0) {
			return this.getPdo()
		}
		if (this.recordsModified && this.getConfig('sticky')) {
			return this.getPdo()
		}
		if (typeof this.readPdo === 'function') {
			// return this.readPdo = this.readPdo()
		}
		return this.readPdo ? this.readPdo : this.getPdo()
	}

	/**
	 * Set the PDO connection.
	 */
	setPdo(pdo?: () => void): this {
		// PDO?
		this.transactions = 0
		// this.pdo = pdo
		return this
	}

	/**
	 * Set the PDO connection used for reading.
	 */
	setReadPdo(pdo?: () => void): this {
		// PDO?
		this.readPdo = pdo
		return this
	}

	/**
	 * Set the reconnect instance on the connection.
	 */
	setReconnector(reconnector: (connection: Connection) => void): this {
		this.reconnector = reconnector
		return this
	}

	/**
	 * Get the database connection name.
	 */
	getName(): string {
		return this.getConfig('name')
	}

	/**
	 * Get an option from the configuration options.
	 */
	getConfig(option?: string): string {
		// return Arr.get(this.config, option)
		return ''
	}

	/**
	 * Get the PDO driver name.
	 */
	getDriverName(): string {
		return this.getConfig('driver')
	}

	/**
	 * Get the query grammar used by the connection.
	 */
	getQueryGrammar(): QueryGrammar {
		return this.queryGrammar
	}

	/**
	 * Set the query grammar used by the connection.
	 */
	setQueryGrammar(grammar: QueryGrammar): this {
		this.queryGrammar = grammar
		return this
	}

	/**
	 * Get the schema grammar used by the connection.
	 */
	getSchemaGrammar(): SchemaGrammar {
		if (this.schemaGrammar) {
			return this.schemaGrammar
		}
		return new SchemaGrammar()
	}

	/**
	 * Set the schema grammar used by the connection.
	 */
	setSchemaGrammar(grammar: SchemaGrammar): this {
		this.schemaGrammar = grammar
		return this
	}

	/**
	 * Get the query post processor used by the connection.
	 */
	getPostProcessor(): QueryProcessor {
		return this.postProcessor
	}

	/**
	 * Set the query post processor used by the connection.
	 */
	setPostProcessor(processor: QueryProcessor): this {
		this.postProcessor = processor
		return this
	}

	/**
	 * Get the event dispatcher used by the connection.
	 */
	getEventDispatcher(): any {
		return this.events
	}

	/**
	 * Set the event dispatcher instance on the connection.
	 */
	setEventDispatcher(events: any): this {
		this.events = events
		return this
	}

	/**
	 * Unset the event dispatcher for this connection.
	 */
	unsetEventDispatcher(): void {
		this.events = null
	}

	/**
	 * Determine if the connection in a "dry run".
	 */
	isPretending(): boolean {
		return this.pretending === true
	}

	/**
	 * Get the connection query log.
	 */
	getQueryLog(): QueryLog[] {
		return this.queryLog
	}

	/**
	 * Clear the query log.
	 */
	flushQueryLog(): void {
		this.queryLog = []
	}

	/**
	 * Enable the query log on the connection.
	 */
	enableQueryLog(): void {
		this.loggingQueries = true
	}

	/**
	 * Disable the query log on the connection.
	 */
	disableQueryLog(): void {
		this.loggingQueries = false
	}

	/**
	 * Determine whether we're logging queries.
	 */
	logging(): boolean {
		return this.loggingQueries
	}

	/**
	 * Get the name of the connected database.
	 */
	getDatabaseName(): string {
		return this.database
	}

	/**
	 * Set the name of the connected database.
	 */
	setDatabaseName(database: string): this {
		this.database = database
		return this
	}

	/**
	 * Get the table prefix for the connection.
	 */
	getTablePrefix(): string {
		return this.tablePrefix
	}

	/**
	 * Set the table prefix in use by the connection.
	 */
	setTablePrefix(prefix: string): this {
		this.tablePrefix = prefix
		this.getQueryGrammar().setTablePrefix(prefix)
		return this
	}

	/**
	 * Set the table prefix and return the grammar.
	 */
	withTablePrefix(grammar: BaseGrammar): BaseGrammar {
		grammar.setTablePrefix(this.tablePrefix)
		return grammar
	}

	/**
	 * Register a connection resolver.
	 */
	static resolverFor(driver: string, callback: () => void): void {
		this.resolvers[driver] = callback
	}

	/**
	 * Get the connection resolver for the given driver.
	 */
	static getResolver(driver: string): any {
		return this.resolvers[driver]
	}

	/**
	 * Execute a Closure within a transaction.
	 */
	transaction(callback: (connection: Connection) => void, attempts: number = 1): any {
		for (let currentAttempt = 1; currentAttempt <= attempts; currentAttempt++) {
			this.beginTransaction()
			// We'll simply execute the given callback within a try / catch block and if we
			// catch any exception we can rollback this transaction so that none of this
			// gets actually persisted to a database or stored in a permanent fashion.
			try {
				return tap(callback(this), () => {
					this.commit()
				})
			} catch (err) {
				// If we catch an exception we'll rollback this transaction and try again if we
				// are not out of attempts. If we are out of attempts we will just throw the
				// exception back out and let the developer handle an uncaught exceptions.
				try {
					this.handleTransactionException(err, currentAttempt, attempts)
				} catch (subErr) {
					this.rollBack()
					throw subErr
				}
			}
		}
	}

	/**
	 * Handle an exception encountered when running a transacted statement.
	 */
	protected handleTransactionException(err: Error, currentAttempt: number, maxAttempts: number): void {
		// On a deadlock, MySQL rolls back the entire transaction so we can't just
		// retry the query. We have to throw this exception all the way out and
		// let the developer handle it in another way. We will decrement too.
		if (detectsDeadlocks(err) && this.transactions > 1) {
			this.transactions--
			throw err
		}

		// If there was an exception we will rollback this transaction and then we
		// can check if we have exceeded the maximum attempt count for this and
		// if we haven't we will return and try this query again in our loop.
		this.rollBack()
		if (detectsDeadlocks(err) && currentAttempt < maxAttempts) {
			return
		}
		throw err
	}

	/**
	 * Start a new database transaction.
	 */
	beginTransaction(): void {
		this.createTransaction()
		this.transactions++
		this.fireConnectionEvent('beganTransaction')
	}

	/**
	 * Create a transaction within the database.
	 */
	protected createTransaction(): void {
		if (this.transactions === 0) {
			try {
				this.getPdo().beginTransaction()
			} catch (e) {
				this.handleBeginTransactionException(e)
			}
		} else if (this.transactions >= 1 && this.queryGrammar.supportsSavepoints()) {
			this.createSavepoint()
		}
	}

	/**
	 * Create a save point within the database.
	 */
	protected createSavepoint(): void {
		this.getPdo().exec(this.queryGrammar.compileSavepoint('trans' + (this.transactions + 1)))
	}

	/**
	 * Handle an exception from a transaction beginning.
	 */
	protected handleBeginTransactionException(err: Error): void {
		if (detectsLostConnections(err)) {
			this.reconnect()
			// this.pdo.beginTransaction()
		} else {
			throw err
		}
	}

	/**
	 * Commit the active database transaction.
	 */
	commit(): void {
		if (this.transactions === 1) {
			this.getPdo().commit()
		}
		this.transactions = Math.max(0, this.transactions - 1)
		this.fireConnectionEvent('committed')
	}

	/**
	 * Rollback the active database transaction.
	 */
	rollBack(toLevel?: number): void {
		// We allow developers to rollback to a certain transaction level. We will verify
		// that this given transaction level is valid before attempting to rollback to
		// that level. If it's not we will just return out and not attempt anything.
		toLevel = typeof toLevel === 'undefined' ? this.transactions - 1 : toLevel

		if (toLevel < 0 || toLevel >= this.transactions) {
			return
		}
		// Next, we will actually perform this rollback within this database and fire the
		// rollback event. We will also set the current transaction level to the given
		// level that was passed into this method so it will be right from here out.
		try {
			this.performRollBack(toLevel)
		} catch (err) {
			this.handleRollBackException(err)
		}
		this.transactions = toLevel
		this.fireConnectionEvent('rollingBack')
	}

	/**
	 * Perform a rollback within the database.
	 */
	protected performRollBack(toLevel: number): void {
		if (toLevel === 0) {
			this.getPdo().rollBack()
		} else if (this.queryGrammar.supportsSavepoints()) {
			this.getPdo().exec(this.queryGrammar.compileSavepointRollBack('trans' + (toLevel + 1)))
		}
	}

	/**
	 * Handle an exception from a rollback.
	 */
	protected handleRollBackException(err: Error) {
		if (detectsDeadlocks(err)) {
			this.transactions = 0
		}
		throw err
	}

	/**
	 * Get the number of active transactions.
	 */
	transactionLevel(): number {
		return this.transactions
	}
}
