import { CommandModule, Argv, Arguments } from 'yargs'
import { MigrationCreator } from '../Migrations/MigrationCreator'
import * as fs from 'fs'
import { Migrator } from '../Migrations/Migrator'
import { ConnectionResolver } from '../Connections/ConnectionResolver'
import { DatabaseMigrationRepository } from '../Migrations/DatabaseMigrationRepository'
import { config } from '../config'

interface Args {
	database?: string
	force: boolean
	path?: string
	realpath?: string
	pretend: boolean
	seed: boolean
	step: boolean
}

export class MigrateCommand implements CommandModule<{}, Args> {
	command = 'migrate'
	describe = 'Run the database migrations'

	protected migrator?: Migrator

	builder(args: Argv) {
		return args
			.option('database', {
				describe: 'The database connection to use',
				type: 'string',
			})
			.option('force', {
				describe: 'Force the operation to run when in production',
				type: 'boolean',
				default: false,
			})
			.option('path', {
				describe: 'The path to the migrations files to be executed',
				type: 'string',
			})
			.option('realpath', {
				describe: 'Indicate any provided migration file paths are pre-resolved absolute paths',
				type: 'string',
			})
			.option('pretend', {
				describe: 'Dump the SQL queries that would be run',
				type: 'boolean',
				default: false,
			})
			.option('seed', {
				describe: 'Indicates if the seed task should be re-run',
				type: 'boolean',
				default: false,
			})
			.option('step', {
				describe: 'Force the migrations to be run so they can be rolled back individually',
				type: 'boolean',
				default: false,
			})
	}

	/**
	 * Execute the console command.
	 */
	async handler(args: Arguments<Args>) {
		const resolver = new ConnectionResolver()
		const dmRepo = new DatabaseMigrationRepository(resolver, config.migrations.table)

		this.migrator = new Migrator(dmRepo, resolver, fs)
		// Todo
		console.log('Migrate', args)
		// if (!this.confirmToProceed()) {
		// 	return
		// }

		// Prepare the migration database for running.
		this.migrator.setConnection(args.database)
		if (!this.migrator.repositoryExists()) {
			// this.call('migrate:install', array_filter([
			//     '--database' => args.database
			// ]));
		}
		// // Next, we will check to see if a path option has been defined. If it has
		// // we will use the path relative to the root of this installation folder
		// // so that migrations may be run for any path within the applications.
		// this.migrator.run(this.getMigrationPaths(), {
		// 	pretend: args.pretend,
		// 	step: args.step,
		// })

		// // Finally, if the "seed" option has been given, we will re-run the database
		// // seed task to re-populate the database, which is convenient when adding
		// // a migration and a seed at the same time, as it is only this command.
		// if (args.seed && !args.pretend) {
		// 	this.call('db:seed', {
		// 		'--force': true,
		// 	})
		// }
	}
}
