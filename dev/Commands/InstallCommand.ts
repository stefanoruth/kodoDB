import { CommandModule } from 'yargs'

export class InstallCommand implements CommandModule<{}, {}> {
	command = 'install'
	describe = 'Create migration table'

	async handler() {
		// Todo
		console.log('Install migrations')
	}
}
