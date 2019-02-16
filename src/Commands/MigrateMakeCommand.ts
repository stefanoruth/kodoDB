import { CommandModule, Argv, Arguments } from 'yargs'
import { MigrationCreator } from '../Migrations/MigrationCreator'
import * as fs from 'fs'
import _ from 'lodash'

export class MigrateMakeCommand implements CommandModule<{}, {}> {
	command = 'make:migration'
	describe = 'Make migration'

	protected creator: MigrationCreator

	constructor() {
		this.creator = new MigrationCreator(fs)
	}

	builder(args: Argv) {
		return args
			.option('name', {
				describe: 'The name of the migration.',
				demand: true,
            })
            .option('create', {
                describe: 'The table to be created',
            })
            .option('table', {
                describe: 'The table to migrate',
            })
            .option('path', {
                describe: 'The location where the migration file should be created',
            })
            .option('realpath', {
                describe: 'Indicate any provided migration file paths are pre-resolved',
            })
    }

    /**
     * Execute the console command.
     */
	async handler(args: Arguments) {
		console.log('Make migration', args)

        // It's possible for the developer to specify the tables to modify in this
        // schema operation. The developer may also specify if this table needs
        // to be freshly created so we can create the appropriate migrations.
        const name = _.snakeCase(args.name.trim());
        const table = this.input.getOption('table');
        const create = this.input.getOption('create') ?: false;
        // If no table was given as an option but a create option is given then we
        // will use the "create" option as the table name. This allows the devs
        // to pass a table name into this option as a short-cut for creating.
        if (! table && is_string(create)) {
            table = create;
            create = true;
        }
        // Next, we will attempt to guess the table name if this the migration has
        // "create" in the name. This will allow us to provide a convenient way
        // of creating migrations that create new tables for the application.
        if (! table) {
            [table, create] = TableGuesser::guess(name);
        }
        // Now we are ready to write the migration out to disk. Once we've written
        // the migration out, we will dump-autoload for the entire framework to
        // make sure that the migrations are registered by the class loaders.
        this.writeMigration(name, table, create);
    }

    /**
     * Write the migration file to disk.
     */
    protected writeMigration(name:string, table:string, create:boolean):string
    {
        const file = pathinfo(this.creator.create(
            name, this.getMigrationPath(), table, create
        ), PATHINFO_FILENAME);
        this.line("<info>Created Migration:</info> {file}");
    }
    /**
     * Get migration path (either specified by '--path' option or default location).
     */
    protected getMigrationPath():string
    {
        if (! is_null(targetPath = this.input.getOption('path'))) {
            return ! this.usingRealPath()
                            ? this.laravel.basePath().'/'.targetPath
                            : targetPath;
        }
        return parent::getMigrationPath();
    }

    /**
     * Determine if the given path(s) are pre-resolved "real" paths.
     */
    protected usingRealPath():boolean
    {
        return this.input.hasOption('realpath') && this.option('realpath');
    }
}
