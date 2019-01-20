export abstract class Migration {
	protected connection: any
	withinTransaction: boolean = true

	getConnection() {
		return this.connection
	}
}
