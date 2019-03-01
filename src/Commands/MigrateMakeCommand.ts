import { CommandModule, Argv, Arguments, PositionalOptionsType } from 'yargs'
import { MigrationCreator } from '../Migrations/MigrationCreator'
import * as fs from 'fs'
import _ from 'lodash'
import { TableGuesser } from '../Migrations/TableGuesser'
import { config } from '../config'

interface Args {
	create?: string | boolean
	table?: string
	path?: string
	name?: string
}

export class MigrateMakeCommand implements CommandModule<{}, Args> {
	command = 'make:migration <name>'
	describe = 'Make migration'

	protected creator?: MigrationCreator

	builder(args: Argv) {
		return args
			.option('create', {
				describe: 'The table to be created',
				type: 'string',
				default: false,
			})
			.option('table', {
				describe: 'The table to migrate',
				type: 'string',
			})
			.option('path', {
				describe: 'The location where the migration file should be created',
				type: 'string',
			})
			.option('realpath', {
				describe: 'Indicate any provided migration file paths are pre-resolved',
				type: 'string',
			})
	}

	/**
	 * Execute the console command.
	 */
	handler(args: Arguments<Args>) {
		this.creator = new MigrationCreator(fs)

		// It's possible for the developer to specify the tables to modify in this
		// schema operation. The developer may also specify if this table needs
		// to be freshly created so we can create the appropriate migrations.
		const name = _.snakeCase(args.name && args.name.trim())
		let table = args.table
		let create = args.create ? args.create : false

		// If no table was given as an option but a create option is given then we
		// will use the "create" option as the table name. This allows the devs
		// to pass a table name into this option as a short-cut for creating.
		if (!table && typeof create === 'string') {
			table = create
			create = true
		}

		// Next, we will attempt to guess the table name if this the migration has
		// "create" in the name. This will allow us to provide a convenient way
		// of creating migrations that create new tables for the application.
		if (!table) {
			const result = TableGuesser.guess(name)
			table = result.table
			create = result.create
		}

		// Now we are ready to write the migration out to disk. Once we've written
		// the migration out, we will dump-autoload for the entire framework to
		// make sure that the migrations are registered by the class loaders.
		const path = config.migrations.path[0]

		const file = this.creator.create(name, path, table, Boolean(create))
		console.log(`<info>Created Migration:</info> ${file}`)
	}
}
