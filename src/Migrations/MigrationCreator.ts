export class MigrationCreator {
	create(name: string, path: string, table: string, create: boolean = false) {
		// Todo
	}

	protected ensureMigrationDoesntAlreadyExist(name: string) {
		// Todo
	}

	protected getStub(table: string, create: boolean) {
		// Todo
	}

	protected populateStub(name: string, stub: string, table: string) {
		// Todo
	}

	protected getClassName(name: string) {
		return name
	}

	protected getPath(name: string, path: string) {
		// Todo
	}

	protected getDatePrefix() {
		return new Date()
	}

	stubPath() {
		return './path/to/stub'
	}
}
