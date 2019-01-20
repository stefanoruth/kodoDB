#!/usr/bin/env node
import * as yargs from 'yargs'
import {
	FreshCommand,
	InstallCommand,
	MakeCommand,
	MigrateCommand,
	SeedCommand,
	StatusCommand,
} from './Commands'

const cli = yargs
	.usage('Usage: $0 <command> [options]')
	.command(new FreshCommand())
	.command(new InstallCommand())
	.command(new MakeCommand())
	.command(new MigrateCommand())
	.command(new SeedCommand())
	.command(new StatusCommand())
	.recommendCommands()
	.demandCommand()
	.strict()
	.help()
	.alias('v', 'version')
	.alias('h', 'help')
	.version().argv
