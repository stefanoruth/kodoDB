import { Str, dateFormat } from '../Utils'
import * as fs from 'fs'

type tableEvent = (table: string) => any

export class MigrationCreator {
	protected files: typeof fs

	protected postCreate: tableEvent[] = []

	constructor(fileSystem: typeof fs) {
		this.files = fileSystem
	}

	create(name: string, path: string, table: string, create: boolean = false): string {
		console.log(name, path, table, create)
		this.ensureMigrationDoesntAlreadyExist(name)

		// First we will get the stub file for the migration, which serves as a type
		// of template for the migration. Once we have those we will populate the
		// various place-holders, save the file, and run the post create event.
		const stub = this.getStub(table, create)

		console.log(stub)

		path = this.getPath(name, path)
		const content = this.populateStub(name, stub, table)

		this.files.writeFileSync(path, content, {})

		// Next, we will fire any hooks that are supposed to fire after a migration is
		// created. Once that is done we'll be ready to return the full path to the
		// migration file so it can be used however it's needed by the developer.
		this.firePostCreateHooks(table)

		return path
	}

	protected ensureMigrationDoesntAlreadyExist(name: string): void {
		const className = this.getClassName(name)

		// Todo
		// if (class_exists(className)) {
		// 	throw new Error(`A ${className} class already exists.`)
		// }
	}

	protected getStub(table?: string, create?: boolean): string {
		if (!table) {
			return this.files.readFileSync(this.stubPath() + '/blank.stub').toString()
		}
		// We also have stubs for creating new tables and modifying existing tables
		// to save the developer some typing when they are creating a new tables
		// or modifying existing tables. We'll grab the appropriate stub here.
		const stub = create ? 'create.stub' : 'update.stub'

		return this.files.readFileSync(`${this.stubPath()}/${stub}`).toString()
	}

	protected populateStub(name: string, stub: string, table?: string): string {
		stub = stub.replace('DummyClass', this.getClassName(name))

		// Here we will replace the table place-holders with the table specified by
		// the developer, which is useful for quickly creating a tables creation
		// or update migration from the console instead of typing it manually.
		if (table) {
			stub = stub.replace('DummyTable', table)
		}

		return stub
	}

	protected getClassName(name: string): string {
		return Str.studly(name)
	}

	protected getPath(name: string, path: string): string {
		return `${path}/${this.getDatePrefix()}_${name}.ts`
	}

	protected firePostCreateHooks(table: string): void {
		this.postCreate.forEach(callback => {
			callback(table)
		})
	}

	afterCreate(callback: tableEvent): void {
		this.postCreate.push(callback)
	}

	protected getDatePrefix(): string {
		return dateFormat(new Date())
	}

	stubPath(): string {
		return __dirname + '/stubs'
	}

	getFilesystem(): typeof fs {
		return this.files
	}
}
