import { Mock } from 'ts-mockery'
import { MigrationCreator } from '../src/Migrations/MigrationCreator'
import { MigrateMakeCommand } from '../src/Commands'
import { CommandModule } from 'yargs'

function runCommand(command: CommandModule, input = {}) {
	// return command.run(new ArrayInput($input), new NullOutput())
}

describe('MigrationMakeCommand', () => {
	test('basicCreateDumpsAutoload', () => {
		const creator = Mock.of<MigrationCreator>()
		const command = new MigrateMakeCommand(creator)

		// const app = new Application;
		// app->useDatabasePath(__DIR__);
		// command->setLaravel($app);
		// creator->shouldReceive('create')->once()->with('create_foo', __DIR__.DIRECTORY_SEPARATOR.'migrations', 'foo', true);

		// expect(creator).tohave

		runCommand(command, { name: 'create_foo' })
	})
})
