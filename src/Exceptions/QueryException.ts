export class QueryException extends Error {
	protected sql: string
	protected bindings: any[]

	constructor(sql: string, bindings: any[], previous: Error) {
		super('')
		this.stack = previous.stack
		this.name = this.constructor.name
		this.sql = sql
		this.bindings = bindings
		this.message = `${previous.message} (SQL: ${sql})` // Todo insert bindings
	}

	getSql = () => {
		return this.sql
	}

	getBindings = () => {
		return this.bindings
	}
}
