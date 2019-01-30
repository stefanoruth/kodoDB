#!/usr/bin/env node
import * as yargs from 'yargs'
import {
	ModelMakeCommand,
	MigrateMakeCommand,
	MigrateCommand,
	FreshCommand,
	InstallCommand,
	StatusCommand,
	SeedCommand,
} from './Commands'

const cli = yargs
	.usage('Usage: $0 <command> [options]')
	.scriptName('kododb')
	.command(new FreshCommand())
	.command(new InstallCommand())
	.command(new MigrateMakeCommand())
	.command(new MigrateCommand())
	.command(new ModelMakeCommand())
	.command(new SeedCommand())
	.command(new StatusCommand())
	.recommendCommands()
	.demandCommand()
	.strict()
	.help()
	.alias('v', 'version')
	.alias('h', 'help')
	.version().argv
