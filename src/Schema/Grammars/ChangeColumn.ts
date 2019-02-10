import { SchemaGrammar } from "./SchemaGrammar";
import { Blueprint } from "../Blueprint";
import { Connection } from "../../Connections/Connection";

export class ChangeColumn {
    // Compile a change column command into a series of SQL statements.
    static compile(grammar: SchemaGrammar, blueprint: Blueprint, command: any, connection: Connection) {
        if (!connection.isDoctrineAvailable()) {
            throw new RuntimeException(sprintf(
                'Changing columns for table "%s" requires Doctrine DBAL; install "doctrine/dbal".',
                blueprint.getTable()
            ));
        }
        tableDiff = ChangeColumn.getChangedDiff(
            grammar, blueprint, schema = connection.getDoctrineSchemaManager()
        );
        if (tableDiff !== false) {
            return (array) schema.getDatabasePlatform().getAlterTableSQL(tableDiff);
        }
        return [];
    }
    /**
     * Get the Doctrine table difference for the given changes.
     *
     * @param  \Illuminate\Database\Schema\Grammars\Grammar  grammar
     * @param  \Illuminate\Database\Schema\Blueprint  blueprint
     * @param  \Doctrine\DBAL\Schema\AbstractSchemaManager  schema
     * @return \Doctrine\DBAL\Schema\TableDiff|bool
     */
    static getChangedDiff(grammar: SchemaGrammar, blueprint: Blueprint, schema: any) {
        current = schema.listTableDetails(grammar.getTablePrefix().blueprint.getTable());
        return (new Comparator).diffTable(
            current, ChangeColumn.getTableWithColumnChanges(blueprint, current)
        );
    }
    /**
     * Get a copy of the given Doctrine table after making the column changes.
     *
     * @param  \Illuminate\Database\Schema\Blueprint  blueprint
     * @param  \Doctrine\DBAL\Schema\Table  table
     * @return \Doctrine\DBAL\Schema\Table
     */
    static getTableWithColumnChanges(Blueprint blueprint, Table table) {
        table = clone table;
        foreach(blueprint.getChangedColumns() as fluent) {
            column = ChangeColumn.getDoctrineColumn(table, fluent);
            // Here we will spin through each fluent column definition and map it to the proper
            // Doctrine column definitions - which is necessary because Laravel and Doctrine
            // use some different terminology for various column attributes on the tables.
            foreach(fluent.getAttributes() as key => value) {
                if (!is_null(option = ChangeColumn.mapFluentOptionToDoctrine(key))) {
                    if (method_exists(column, method = 'set'.ucfirst(option))) {
                        column.{ method }(ChangeColumn.mapFluentValueToDoctrine(option, value));
                    }
                }
            }
        }
        return table;
    }
    /**
     * Get the Doctrine column instance for a column change.
     *
     * @param  \Doctrine\DBAL\Schema\Table  table
     * @param  \Illuminate\Support\Fluent  fluent
     * @return \Doctrine\DBAL\Schema\Column
     */
    static getDoctrineColumn(Table table, Fluent fluent) {
        return table.changeColumn(
            fluent['name'], ChangeColumn.getDoctrineColumnChangeOptions(fluent)
        ).getColumn(fluent['name']);
    }
    /**
     * Get the Doctrine column change options.
     *
     * @param  \Illuminate\Support\Fluent  fluent
     * @return array
     */
    static getDoctrineColumnChangeOptions(Fluent fluent) {
        options = ['type' => ChangeColumn.getDoctrineColumnType(fluent['type'])];
        if (in_array(fluent['type'], ['text', 'mediumText', 'longText'])) {
            options['length'] = ChangeColumn.calculateDoctrineTextLength(fluent['type']);
        }
        if (fluent['type'] === 'json') {
            options['customSchemaOptions'] = [
                'collation' => '',
            ];
        }
        return options;
    }

    // Get the doctrine column type.
    static getDoctrineColumnType(type:string) {
        type = type.toLowerCase();
        switch (type) {
            case 'biginteger':
                type = 'bigint';
                break;
            case 'smallinteger':
                type = 'smallint';
                break;
            case 'mediumtext':
            case 'longtext':
                type = 'text';
                break;
            case 'binary':
                type = 'blob';
                break;
        }
        // return Type:: getType(type);
        // Todo
    }

    // Calculate the proper column length to force the Doctrine text type.
    static calculateDoctrineTextLength(type:string): number {
        switch (type) {
            case 'mediumText':
                return 65535 + 1;
            case 'longText':
                return 16777215 + 1;
            default:
                return 255 + 1;
        }
    }
    // Get the matching Doctrine option for a given Fluent attribute name.
    static mapFluentOptionToDoctrine(attribute?:string):string | undefined {
        switch (attribute) {
            case 'type':
            case 'name':
                return;
            case 'nullable':
                return 'notnull';
            case 'total':
                return 'precision';
            case 'places':
                return 'scale';
            default:
                return attribute;
        }
    }

    // Get the matching Doctrine value for a given Fluent attribute.
    static mapFluentValueToDoctrine(option:string, value:any): any {
        return option === 'notnull' ? !value : value;
    }
}
