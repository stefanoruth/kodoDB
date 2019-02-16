import { Connection, ConnectionInterface } from '../Connections/Connection'
import { QueryGrammar } from './Grammars/QueryGrammar'
import { QueryProcessor } from './Processors/QueryProcessor'
import { Collection } from '../Utils/Collection'
import { Expression } from './Expression'
import { Bindings } from './Bindings'

export class QueryBuilder {
    /**
     * The database connection instance.
     */
    connection: ConnectionInterface

    /**
     * The database query grammar instance.
     */
    grammar: QueryGrammar

    /**
     * The database query post processor instance.
     */
    processor: QueryProcessor

    /**
     * The current query value bindings.
     */
    bindings: Bindings = {
        select: [],
        from: [],
        join: [],
        where: [],
        having: [],
        order: [],
        union: [],
    }

    /**
     * An aggregate and column to be run.
     */
    aggregate:string[] = []

    /**
     * The columns that should be returned.
     */
    columns: string[] = []

    /**
     * Indicates if the query returns distinct results.
     */
    distinct:boolean = false;

    /**
     * The table which the query is targeting.
     */
    from?: string

    /**
     * The table joins for the query.
     *
     * @var array
     */
    joins: string[] = []

    /**
     * The where constraints for the query.
     */
    wheres:string[] = [];
    /**
     * The groupings for the query.
     *
     * @var array
     */
    $groups;
    /**
     * The having constraints for the query.
     *
     * @var array
     */
    $havings;
    /**
     * The orderings for the query.
     *
     * @var array
     */
    $orders;
    /**
     * The maximum number of records to return.
     *
     * @var int
     */
    $limit;
    /**
     * The number of records to skip.
     *
     * @var int
     */
    $offset;
    /**
     * The query union statements.
     *
     * @var array
     */
    $unions;
    /**
     * The maximum number of union records to return.
     *
     * @var int
     */
    $unionLimit;
    /**
     * The number of union records to skip.
     *
     * @var int
     */
    $unionOffset;
    /**
     * The orderings for the union query.
     *
     * @var array
     */
    $unionOrders;
    /**
     * Indicates whether row locking is being used.
     *
     * @var string|bool
     */
    $lock;
    /**
     * All of the available clause operators.
     *
     * @var array
     */
    $operators = [
        '=', '<', '>', '<=', '>=', '<>', '!=', '<=>',
        'like', 'like binary', 'not like', 'ilike',
        '&', '|', '^', '<<', '>>',
        'rlike', 'regexp', 'not regexp',
        '~', '~*', '!~', '!~*', 'similar to',
        'not similar to', 'not ilike', '~~*', '!~~*',
    ];
    /**
     * Whether use write pdo for select.
     *
     * @var bool
     */
    $useWritePdo = false;
    /**
     * Create a new query builder instance.
     *
     * @param  \Illuminate\Database\ConnectionInterface  $connection
     * @param  \Illuminate\Database\Query\Grammars\Grammar  $grammar
     * @param  \Illuminate\Database\Query\Processors\Processor  $processor
     * @return void
     */
    __construct(ConnectionInterface $connection,
                                Grammar $grammar = null,
                                Processor $processor = null)
    {
        this.connection = $connection;
        this.grammar = $grammar ?: $connection.getQueryGrammar();
        this.processor = $processor ?: $connection.getPostProcessor();
    }
    /**
     * Set the columns to be selected.
     *
     * @param  array|mixed  $columns
     * @return this
     */
    select($columns = ['*'])
    {
        this.columns = is_array($columns) ? $columns : func_get_args();
        return this;
    }
    /**
     * Add a subselect expression to the query.
     *
     * @param  \Closure|\Illuminate\Database\Query\Builder|string $query
     * @param  string  $as
     * @return \Illuminate\Database\Query\Builder|static
     *
     * @throws \InvalidArgumentException
     */
    selectSub($query, $as)
    {
        [$query, $bindings] = this.createSub($query);
        return this.selectRaw(
            '('.$query.') as '.this.grammar.wrap($as), $bindings
        );
    }
    /**
     * Add a new "raw" select expression to the query.
     *
     * @param  string  $expression
     * @param  array   $bindings
     * @return \Illuminate\Database\Query\Builder|static
     */
    selectRaw($expression, array $bindings = [])
    {
        this.addSelect(new Expression($expression));
        if ($bindings) {
            this.addBinding($bindings, 'select');
        }
        return this;
    }
    /**
     * Makes "from" fetch from a subquery.
     *
     * @param  \Closure|\Illuminate\Database\Query\Builder|string $query
     * @param  string  $as
     * @return \Illuminate\Database\Query\Builder|static
     *
     * @throws \InvalidArgumentException
     */
    fromSub($query, $as)
    {
        [$query, $bindings] = this.createSub($query);
        return this.fromRaw('('.$query.') as '.this.grammar.wrap($as), $bindings);
    }
    /**
     * Add a raw from clause to the query.
     *
     * @param  string  $expression
     * @param  mixed   $bindings
     * @return \Illuminate\Database\Query\Builder|static
     */
    fromRaw($expression, $bindings = [])
    {
        this.from = new Expression($expression);
        this.addBinding($bindings, 'from');
        return this;
    }
    /**
     * Creates a subquery and parse it.
     *
     * @param  \Closure|\Illuminate\Database\Query\Builder|string $query
     * @return array
     */
    protected createSub($query)
    {
        // If the given query is a Closure, we will execute it while passing in a new
        // query instance to the Closure. This will give the developer a chance to
        // format and work with the query before we cast it to a raw SQL string.
        if ($query instanceof Closure) {
            $callback = $query;
            $callback($query = this.forSubQuery());
        }
        return this.parseSub($query);
    }
    /**
     * Parse the subquery into SQL and bindings.
     *
     * @param  mixed  $query
     * @return array
     */
    protected parseSub($query)
    {
        if ($query instanceof self || $query instanceof EloquentBuilder) {
            return [$query.toSql(), $query.getBindings()];
        } elseif (is_string($query)) {
            return [$query, []];
        } else {
            throw new InvalidArgumentException;
        }
    }
    /**
     * Add a new select column to the query.
     *
     * @param  array|mixed  $column
     * @return this
     */
    addSelect($column)
    {
        $column = is_array($column) ? $column : func_get_args();
        this.columns = array_merge((array) this.columns, $column);
        return this;
    }
    /**
     * Force the query to only return distinct results.
     *
     * @return this
     */
    distinct()
    {
        this.distinct = true;
        return this;
    }
    /**
     * Set the table which the query is targeting.
     *
     * @param  string  $table
     * @return this
     */
    from($table)
    {
        this.from = $table;
        return this;
    }
    /**
     * Add a join clause to the query.
     *
     * @param  string  $table
     * @param  \Closure|string  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @param  string  $type
     * @param  bool    $where
     * @return this
     */
    join($table, $first, $operator = null, $second = null, $type = 'inner', $where = false)
    {
        $join = this.newJoinClause(this, $type, $table);
        // If the first "column" of the join is really a Closure instance the developer
        // is trying to build a join with a complex "on" clause containing more than
        // one condition, so we'll add the join and call a Closure with the query.
        if ($first instanceof Closure) {
            call_user_func($first, $join);
            this.joins[] = $join;
            this.addBinding($join.getBindings(), 'join');
        }
        // If the column is simply a string, we can assume the join simply has a basic
        // "on" clause with a single condition. So we will just build the join with
        // this simple join clauses attached to it. There is not a join callback.
        else {
            $method = $where ? 'where' : 'on';
            this.joins[] = $join.$method($first, $operator, $second);
            this.addBinding($join.getBindings(), 'join');
        }
        return this;
    }
    /**
     * Add a "join where" clause to the query.
     *
     * @param  string  $table
     * @param  \Closure|string  $first
     * @param  string  $operator
     * @param  string  $second
     * @param  string  $type
     * @return \Illuminate\Database\Query\Builder|static
     */
    joinWhere($table, $first, $operator, $second, $type = 'inner')
    {
        return this.join($table, $first, $operator, $second, $type, true);
    }
    /**
     * Add a subquery join clause to the query.
     *
     * @param  \Closure|\Illuminate\Database\Query\Builder|string $query
     * @param  string  $as
     * @param  \Closure|string  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @param  string  $type
     * @param  bool    $where
     * @return \Illuminate\Database\Query\Builder|static
     *
     * @throws \InvalidArgumentException
     */
    joinSub($query, $as, $first, $operator = null, $second = null, $type = 'inner', $where = false)
    {
        [$query, $bindings] = this.createSub($query);
        $expression = '('.$query.') as '.this.grammar.wrap($as);
        this.addBinding($bindings, 'join');
        return this.join(new Expression($expression), $first, $operator, $second, $type, $where);
    }
    /**
     * Add a left join to the query.
     *
     * @param  string  $table
     * @param  \Closure|string  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    leftJoin($table, $first, $operator = null, $second = null)
    {
        return this.join($table, $first, $operator, $second, 'left');
    }
    /**
     * Add a "join where" clause to the query.
     *
     * @param  string  $table
     * @param  \Closure|string  $first
     * @param  string  $operator
     * @param  string  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    leftJoinWhere($table, $first, $operator, $second)
    {
        return this.joinWhere($table, $first, $operator, $second, 'left');
    }
    /**
     * Add a subquery left join to the query.
     *
     * @param  \Closure|\Illuminate\Database\Query\Builder|string $query
     * @param  string  $as
     * @param  \Closure|string  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    leftJoinSub($query, $as, $first, $operator = null, $second = null)
    {
        return this.joinSub($query, $as, $first, $operator, $second, 'left');
    }
    /**
     * Add a right join to the query.
     *
     * @param  string  $table
     * @param  \Closure|string  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    rightJoin($table, $first, $operator = null, $second = null)
    {
        return this.join($table, $first, $operator, $second, 'right');
    }
    /**
     * Add a "right join where" clause to the query.
     *
     * @param  string  $table
     * @param  \Closure|string  $first
     * @param  string  $operator
     * @param  string  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    rightJoinWhere($table, $first, $operator, $second)
    {
        return this.joinWhere($table, $first, $operator, $second, 'right');
    }
    /**
     * Add a subquery right join to the query.
     *
     * @param  \Closure|\Illuminate\Database\Query\Builder|string $query
     * @param  string  $as
     * @param  \Closure|string  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    rightJoinSub($query, $as, $first, $operator = null, $second = null)
    {
        return this.joinSub($query, $as, $first, $operator, $second, 'right');
    }
    /**
     * Add a "cross join" clause to the query.
     *
     * @param  string  $table
     * @param  \Closure|string|null  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    crossJoin($table, $first = null, $operator = null, $second = null)
    {
        if ($first) {
            return this.join($table, $first, $operator, $second, 'cross');
        }
        this.joins[] = this.newJoinClause(this, 'cross', $table);
        return this;
    }
    /**
     * Get a new join clause.
     *
     * @param  \Illuminate\Database\Query\Builder $parentQuery
     * @param  string  $type
     * @param  string  $table
     * @return \Illuminate\Database\Query\JoinClause
     */
    protected newJoinClause(self $parentQuery, $type, $table)
    {
        return new JoinClause($parentQuery, $type, $table);
    }
    /**
     * Merge an array of where clauses and bindings.
     *
     * @param  array  $wheres
     * @param  array  $bindings
     * @return void
     */
    mergeWheres($wheres, $bindings)
    {
        this.wheres = array_merge(this.wheres, (array) $wheres);
        this.bindings['where'] = array_values(
            array_merge(this.bindings['where'], (array) $bindings)
        );
    }
    /**
     * Add a basic where clause to the query.
     *
     * @param  string|array|\Closure  $column
     * @param  mixed   $operator
     * @param  mixed   $value
     * @param  string  $boolean
     * @return this
     */
    where($column, $operator = null, $value = null, $boolean = 'and')
    {
        // If the column is an array, we will assume it is an array of key-value pairs
        // and can add them each as a where clause. We will maintain the boolean we
        // received when the method was called and pass it into the nested where.
        if (is_array($column)) {
            return this.addArrayOfWheres($column, $boolean);
        }
        // Here we will make some assumptions about the operator. If only 2 values are
        // passed to the method, we will assume that the operator is an equals sign
        // and keep going. Otherwise, we'll require the operator to be passed in.
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        // If the columns is actually a Closure instance, we will assume the developer
        // wants to begin a nested where statement which is wrapped in parenthesis.
        // We'll add that Closure to the query then return back out immediately.
        if ($column instanceof Closure) {
            return this.whereNested($column, $boolean);
        }
        // If the given operator is not found in the list of valid operators we will
        // assume that the developer is just short-cutting the '=' operators and
        // we will set the operators to '=' and set the values appropriately.
        if (this.invalidOperator($operator)) {
            [$value, $operator] = [$operator, '='];
        }
        // If the value is a Closure, it means the developer is performing an entire
        // sub-select within the query and we will need to compile the sub-select
        // within the where clause to get the appropriate query record results.
        if ($value instanceof Closure) {
            return this.whereSub($column, $operator, $value, $boolean);
        }
        // If the value is "null", we will just assume the developer wants to add a
        // where null clause to the query. So, we will allow a short-cut here to
        // that method for convenience so the developer doesn't have to check.
        if (is_null($value)) {
            return this.whereNull($column, $boolean, $operator !== '=');
        }
        // If the column is making a JSON reference we'll check to see if the value
        // is a boolean. If it is, we'll add the raw boolean string as an actual
        // value to the query to ensure this is properly handled by the query.
        if (Str::contains($column, '.') && is_bool($value)) {
            $value = new Expression($value ? 'true' : 'false');
        }
        // Now that we are working with just a simple query we can put the elements
        // in our array and add the query binding to our array of bindings that
        // will be bound to each SQL statements when it is finally executed.
        $type = 'Basic';
        this.wheres[] = compact(
            'type', 'column', 'operator', 'value', 'boolean'
        );
        if (! $value instanceof Expression) {
            this.addBinding($value, 'where');
        }
        return this;
    }
    /**
     * Add an array of where clauses to the query.
     *
     * @param  array  $column
     * @param  string  $boolean
     * @param  string  $method
     * @return this
     */
    protected addArrayOfWheres($column, $boolean, $method = 'where')
    {
        return this.whereNested(($query) use ($column, $method, $boolean) {
            foreach ($column as $key => $value) {
                if (is_numeric($key) && is_array($value)) {
                    $query.{$method}(...array_values($value));
                } else {
                    $query.$method($key, '=', $value, $boolean);
                }
            }
        }, $boolean);
    }
    /**
     * Prepare the value and operator for a where clause.
     *
     * @param  string  $value
     * @param  string  $operator
     * @param  bool  $useDefault
     * @return array
     *
     * @throws \InvalidArgumentException
     */
    prepareValueAndOperator($value, $operator, $useDefault = false)
    {
        if ($useDefault) {
            return [$operator, '='];
        } elseif (this.invalidOperatorAndValue($operator, $value)) {
            throw new InvalidArgumentException('Illegal operator and value combination.');
        }
        return [$value, $operator];
    }
    /**
     * Determine if the given operator and value combination is legal.
     *
     * Prevents using Null values with invalid operators.
     *
     * @param  string  $operator
     * @param  mixed  $value
     * @return bool
     */
    protected invalidOperatorAndValue($operator, $value)
    {
        return is_null($value) && in_array($operator, this.operators) &&
             ! in_array($operator, ['=', '<>', '!=']);
    }
    /**
     * Determine if the given operator is supported.
     *
     * @param  string  $operator
     * @return bool
     */
    protected invalidOperator($operator)
    {
        return ! in_array(strtolower($operator), this.operators, true) &&
               ! in_array(strtolower($operator), this.grammar.getOperators(), true);
    }
    /**
     * Add an "or where" clause to the query.
     *
     * @param  string|array|\Closure  $column
     * @param  mixed  $operator
     * @param  mixed  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhere($column, $operator = null, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.where($column, $operator, $value, 'or');
    }
    /**
     * Add a "where" clause comparing two columns to the query.
     *
     * @param  string|array  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @param  string|null  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereColumn($first, $operator = null, $second = null, $boolean = 'and')
    {
        // If the column is an array, we will assume it is an array of key-value pairs
        // and can add them each as a where clause. We will maintain the boolean we
        // received when the method was called and pass it into the nested where.
        if (is_array($first)) {
            return this.addArrayOfWheres($first, $boolean, 'whereColumn');
        }
        // If the given operator is not found in the list of valid operators we will
        // assume that the developer is just short-cutting the '=' operators and
        // we will set the operators to '=' and set the values appropriately.
        if (this.invalidOperator($operator)) {
            [$second, $operator] = [$operator, '='];
        }
        // Finally, we will add this where clause into this array of clauses that we
        // are building for the query. All of them will be compiled via a grammar
        // once the query is about to be executed and run against the database.
        $type = 'Column';
        this.wheres[] = compact(
            'type', 'first', 'operator', 'second', 'boolean'
        );
        return this;
    }
    /**
     * Add an "or where" clause comparing two columns to the query.
     *
     * @param  string|array  $first
     * @param  string|null  $operator
     * @param  string|null  $second
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereColumn($first, $operator = null, $second = null)
    {
        return this.whereColumn($first, $operator, $second, 'or');
    }
    /**
     * Add a raw where clause to the query.
     *
     * @param  string  $sql
     * @param  mixed   $bindings
     * @param  string  $boolean
     * @return this
     */
    whereRaw($sql, $bindings = [], $boolean = 'and')
    {
        this.wheres[] = ['type' => 'raw', 'sql' => $sql, 'boolean' => $boolean];
        this.addBinding((array) $bindings, 'where');
        return this;
    }
    /**
     * Add a raw or where clause to the query.
     *
     * @param  string  $sql
     * @param  mixed   $bindings
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereRaw($sql, $bindings = [])
    {
        return this.whereRaw($sql, $bindings, 'or');
    }
    /**
     * Add a "where in" clause to the query.
     *
     * @param  string  $column
     * @param  mixed   $values
     * @param  string  $boolean
     * @param  bool    $not
     * @return this
     */
    whereIn($column, $values, $boolean = 'and', $not = false)
    {
        $type = $not ? 'NotIn' : 'In';
        if ($values instanceof EloquentBuilder) {
            $values = $values.getQuery();
        }
        // If the value is a query builder instance we will assume the developer wants to
        // look for any values that exists within this given query. So we will add the
        // query accordingly so that this query is properly executed when it is run.
        if ($values instanceof self) {
            return this.whereInExistingQuery(
                $column, $values, $boolean, $not
            );
        }
        // If the value of the where in clause is actually a Closure, we will assume that
        // the developer is using a full sub-select for this "in" statement, and will
        // execute those Closures, then we can re-construct the entire sub-selects.
        if ($values instanceof Closure) {
            return this.whereInSub($column, $values, $boolean, $not);
        }
        // Next, if the value is Arrayable we need to cast it to its raw array form so we
        // have the underlying array value instead of an Arrayable object which is not
        // able to be added as a binding, etc. We will then add to the wheres array.
        if ($values instanceof Arrayable) {
            $values = $values.toArray();
        }
        this.wheres[] = compact('type', 'column', 'values', 'boolean');
        // Finally we'll add a binding for each values unless that value is an expression
        // in which case we will just skip over it since it will be the query as a raw
        // string and not as a parameterized place-holder to be replaced by the PDO.
        this.addBinding(this.cleanBindings($values), 'where');
        return this;
    }
    /**
     * Add an "or where in" clause to the query.
     *
     * @param  string  $column
     * @param  mixed   $values
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereIn($column, $values)
    {
        return this.whereIn($column, $values, 'or');
    }
    /**
     * Add a "where not in" clause to the query.
     *
     * @param  string  $column
     * @param  mixed   $values
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereNotIn($column, $values, $boolean = 'and')
    {
        return this.whereIn($column, $values, $boolean, true);
    }
    /**
     * Add an "or where not in" clause to the query.
     *
     * @param  string  $column
     * @param  mixed   $values
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereNotIn($column, $values)
    {
        return this.whereNotIn($column, $values, 'or');
    }
    /**
     * Add a where in with a sub-select to the query.
     *
     * @param  string   $column
     * @param  \Closure $callback
     * @param  string   $boolean
     * @param  bool     $not
     * @return this
     */
    protected whereInSub($column, Closure $callback, $boolean, $not)
    {
        $type = $not ? 'NotInSub' : 'InSub';
        // To create the exists sub-select, we will actually create a query and call the
        // provided callback with the query so the developer may set any of the query
        // conditions they want for the in clause, then we'll put it in this array.
        call_user_func($callback, $query = this.forSubQuery());
        this.wheres[] = compact('type', 'column', 'query', 'boolean');
        this.addBinding($query.getBindings(), 'where');
        return this;
    }
    /**
     * Add an external sub-select to the query.
     *
     * @param  string   $column
     * @param  \Illuminate\Database\Query\Builder|static  $query
     * @param  string   $boolean
     * @param  bool     $not
     * @return this
     */
    protected whereInExistingQuery($column, $query, $boolean, $not)
    {
        $type = $not ? 'NotInSub' : 'InSub';
        this.wheres[] = compact('type', 'column', 'query', 'boolean');
        this.addBinding($query.getBindings(), 'where');
        return this;
    }
    /**
     * Add a "where in raw" clause for integer values to the query.
     *
     * @param  string  $column
     * @param  \Illuminate\Contracts\Support\Arrayable|array  $values
     * @param  string  $boolean
     * @param  bool  $not
     * @return this
     */
    whereIntegerInRaw($column, $values, $boolean = 'and', $not = false)
    {
        $type = $not ? 'NotInRaw' : 'InRaw';
        if ($values instanceof Arrayable) {
            $values = $values.toArray();
        }
        foreach ($values as &$value) {
            $value = (int) $value;
        }
        this.wheres[] = compact('type', 'column', 'values', 'boolean');
        return this;
    }
    /**
     * Add a "where not in raw" clause for integer values to the query.
     *
     * @param  string  $column
     * @param  \Illuminate\Contracts\Support\Arrayable|array  $values
     * @param  string  $boolean
     * @return this
     */
    whereIntegerNotInRaw($column, $values, $boolean = 'and')
    {
        return this.whereIntegerInRaw($column, $values, $boolean, true);
    }
    /**
     * Add a "where null" clause to the query.
     *
     * @param  string  $column
     * @param  string  $boolean
     * @param  bool    $not
     * @return this
     */
    whereNull($column, $boolean = 'and', $not = false)
    {
        $type = $not ? 'NotNull' : 'Null';
        this.wheres[] = compact('type', 'column', 'boolean');
        return this;
    }
    /**
     * Add an "or where null" clause to the query.
     *
     * @param  string  $column
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereNull($column)
    {
        return this.whereNull($column, 'or');
    }
    /**
     * Add a "where not null" clause to the query.
     *
     * @param  string  $column
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereNotNull($column, $boolean = 'and')
    {
        return this.whereNull($column, $boolean, true);
    }
    /**
     * Add a where between statement to the query.
     *
     * @param  string  $column
     * @param  array   $values
     * @param  string  $boolean
     * @param  bool  $not
     * @return this
     */
    whereBetween($column, array $values, $boolean = 'and', $not = false)
    {
        $type = 'between';
        this.wheres[] = compact('type', 'column', 'values', 'boolean', 'not');
        this.addBinding(this.cleanBindings($values), 'where');
        return this;
    }
    /**
     * Add an or where between statement to the query.
     *
     * @param  string  $column
     * @param  array   $values
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereBetween($column, array $values)
    {
        return this.whereBetween($column, $values, 'or');
    }
    /**
     * Add a where not between statement to the query.
     *
     * @param  string  $column
     * @param  array   $values
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereNotBetween($column, array $values, $boolean = 'and')
    {
        return this.whereBetween($column, $values, $boolean, true);
    }
    /**
     * Add an or where not between statement to the query.
     *
     * @param  string  $column
     * @param  array   $values
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereNotBetween($column, array $values)
    {
        return this.whereNotBetween($column, $values, 'or');
    }
    /**
     * Add an "or where not null" clause to the query.
     *
     * @param  string  $column
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereNotNull($column)
    {
        return this.whereNotNull($column, 'or');
    }
    /**
     * Add a "where date" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string  $value
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereDate($column, $operator, $value = null, $boolean = 'and')
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        if ($value instanceof DateTimeInterface) {
            $value = $value.format('Y-m-d');
        }
        return this.addDateBasedWhere('Date', $column, $operator, $value, $boolean);
    }
    /**
     * Add an "or where date" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereDate($column, $operator, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.whereDate($column, $operator, $value, 'or');
    }
    /**
     * Add a "where time" statement to the query.
     *
     * @param  string  $column
     * @param  string   $operator
     * @param  \DateTimeInterface|string  $value
     * @param  string   $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereTime($column, $operator, $value = null, $boolean = 'and')
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        if ($value instanceof DateTimeInterface) {
            $value = $value.format('H:i:s');
        }
        return this.addDateBasedWhere('Time', $column, $operator, $value, $boolean);
    }
    /**
     * Add an "or where time" statement to the query.
     *
     * @param  string  $column
     * @param  string   $operator
     * @param  \DateTimeInterface|string  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereTime($column, $operator, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.whereTime($column, $operator, $value, 'or');
    }
    /**
     * Add a "where day" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string  $value
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereDay($column, $operator, $value = null, $boolean = 'and')
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        if ($value instanceof DateTimeInterface) {
            $value = $value.format('d');
        }
        return this.addDateBasedWhere('Day', $column, $operator, $value, $boolean);
    }
    /**
     * Add an "or where day" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereDay($column, $operator, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.addDateBasedWhere('Day', $column, $operator, $value, 'or');
    }
    /**
     * Add a "where month" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string  $value
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereMonth($column, $operator, $value = null, $boolean = 'and')
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        if ($value instanceof DateTimeInterface) {
            $value = $value.format('m');
        }
        return this.addDateBasedWhere('Month', $column, $operator, $value, $boolean);
    }
    /**
     * Add an "or where month" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereMonth($column, $operator, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.addDateBasedWhere('Month', $column, $operator, $value, 'or');
    }
    /**
     * Add a "where year" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string|int  $value
     * @param  string  $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereYear($column, $operator, $value = null, $boolean = 'and')
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        if ($value instanceof DateTimeInterface) {
            $value = $value.format('Y');
        }
        return this.addDateBasedWhere('Year', $column, $operator, $value, $boolean);
    }
    /**
     * Add an "or where year" statement to the query.
     *
     * @param  string  $column
     * @param  string  $operator
     * @param  \DateTimeInterface|string|int  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereYear($column, $operator, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.addDateBasedWhere('Year', $column, $operator, $value, 'or');
    }
    /**
     * Add a date based (year, month, day, time) statement to the query.
     *
     * @param  string  $type
     * @param  string  $column
     * @param  string  $operator
     * @param  mixed  $value
     * @param  string  $boolean
     * @return this
     */
    protected addDateBasedWhere($type, $column, $operator, $value, $boolean = 'and')
    {
        this.wheres[] = compact('column', 'type', 'boolean', 'operator', 'value');
        if (! $value instanceof Expression) {
            this.addBinding($value, 'where');
        }
        return this;
    }
    /**
     * Add a nested where statement to the query.
     *
     * @param  \Closure $callback
     * @param  string   $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereNested(Closure $callback, $boolean = 'and')
    {
        call_user_func($callback, $query = this.forNestedWhere());
        return this.addNestedWhereQuery($query, $boolean);
    }
    /**
     * Create a new query instance for nested where condition.
     *
     * @return \Illuminate\Database\Query\Builder
     */
    forNestedWhere()
    {
        return this.newQuery().from(this.from);
    }
    /**
     * Add another query builder as a nested where to the query builder.
     *
     * @param  \Illuminate\Database\Query\Builder|static $query
     * @param  string  $boolean
     * @return this
     */
    addNestedWhereQuery($query, $boolean = 'and')
    {
        if (count($query.wheres)) {
            $type = 'Nested';
            this.wheres[] = compact('type', 'query', 'boolean');
            this.addBinding($query.getRawBindings()['where'], 'where');
        }
        return this;
    }
    /**
     * Add a full sub-select to the query.
     *
     * @param  string   $column
     * @param  string   $operator
     * @param  \Closure $callback
     * @param  string   $boolean
     * @return this
     */
    protected whereSub($column, $operator, Closure $callback, $boolean)
    {
        $type = 'Sub';
        // Once we have the query instance we can simply execute it so it can add all
        // of the sub-select's conditions to itself, and then we can cache it off
        // in the array of where clauses for the "main" parent query instance.
        call_user_func($callback, $query = this.forSubQuery());
        this.wheres[] = compact(
            'type', 'column', 'operator', 'query', 'boolean'
        );
        this.addBinding($query.getBindings(), 'where');
        return this;
    }
    /**
     * Add an exists clause to the query.
     *
     * @param  \Closure $callback
     * @param  string   $boolean
     * @param  bool     $not
     * @return this
     */
    whereExists(Closure $callback, $boolean = 'and', $not = false)
    {
        $query = this.forSubQuery();
        // Similar to the sub-select clause, we will create a new query instance so
        // the developer may cleanly specify the entire exists query and we will
        // compile the whole thing in the grammar and insert it into the SQL.
        call_user_func($callback, $query);
        return this.addWhereExistsQuery($query, $boolean, $not);
    }
    /**
     * Add an or exists clause to the query.
     *
     * @param  \Closure $callback
     * @param  bool     $not
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereExists(Closure $callback, $not = false)
    {
        return this.whereExists($callback, 'or', $not);
    }
    /**
     * Add a where not exists clause to the query.
     *
     * @param  \Closure $callback
     * @param  string   $boolean
     * @return \Illuminate\Database\Query\Builder|static
     */
    whereNotExists(Closure $callback, $boolean = 'and')
    {
        return this.whereExists($callback, $boolean, true);
    }
    /**
     * Add a where not exists clause to the query.
     *
     * @param  \Closure  $callback
     * @return \Illuminate\Database\Query\Builder|static
     */
    orWhereNotExists(Closure $callback)
    {
        return this.orWhereExists($callback, true);
    }
    /**
     * Add an exists clause to the query.
     *
     * @param  \Illuminate\Database\Query\Builder $query
     * @param  string  $boolean
     * @param  bool  $not
     * @return this
     */
    addWhereExistsQuery(self $query, $boolean = 'and', $not = false)
    {
        $type = $not ? 'NotExists' : 'Exists';
        this.wheres[] = compact('type', 'query', 'boolean');
        this.addBinding($query.getBindings(), 'where');
        return this;
    }
    /**
     * Adds a where condition using row values.
     *
     * @param  array   $columns
     * @param  string  $operator
     * @param  array   $values
     * @param  string  $boolean
     * @return this
     */
    whereRowValues($columns, $operator, $values, $boolean = 'and')
    {
        if (count($columns) !== count($values)) {
            throw new InvalidArgumentException('The number of columns must match the number of values');
        }
        $type = 'RowValues';
        this.wheres[] = compact('type', 'columns', 'operator', 'values', 'boolean');
        this.addBinding(this.cleanBindings($values));
        return this;
    }
    /**
     * Adds a or where condition using row values.
     *
     * @param  array   $columns
     * @param  string  $operator
     * @param  array   $values
     * @return this
     */
    orWhereRowValues($columns, $operator, $values)
    {
        return this.whereRowValues($columns, $operator, $values, 'or');
    }
    /**
     * Add a "where JSON contains" clause to the query.
     *
     * @param  string  $column
     * @param  mixed  $value
     * @param  string  $boolean
     * @param  bool  $not
     * @return this
     */
    whereJsonContains($column, $value, $boolean = 'and', $not = false)
    {
        $type = 'JsonContains';
        this.wheres[] = compact('type', 'column', 'value', 'boolean', 'not');
        if (! $value instanceof Expression) {
            this.addBinding(this.grammar.prepareBindingForJsonContains($value));
        }
        return this;
    }
    /**
     * Add a "or where JSON contains" clause to the query.
     *
     * @param  string  $column
     * @param  mixed  $value
     * @return this
     */
    orWhereJsonContains($column, $value)
    {
        return this.whereJsonContains($column, $value, 'or');
    }
    /**
     * Add a "where JSON not contains" clause to the query.
     *
     * @param  string  $column
     * @param  mixed  $value
     * @param  string  $boolean
     * @return this
     */
    whereJsonDoesntContain($column, $value, $boolean = 'and')
    {
        return this.whereJsonContains($column, $value, $boolean, true);
    }
    /**
     * Add a "or where JSON not contains" clause to the query.
     *
     * @param  string  $column
     * @param  mixed  $value
     * @return this
     */
    orWhereJsonDoesntContain($column, $value)
    {
        return this.whereJsonDoesntContain($column, $value, 'or');
    }
    /**
     * Add a "where JSON length" clause to the query.
     *
     * @param  string  $column
     * @param  mixed  $operator
     * @param  mixed  $value
     * @param  string  $boolean
     * @return this
     */
    whereJsonLength($column, $operator, $value = null, $boolean = 'and')
    {
        $type = 'JsonLength';
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        this.wheres[] = compact('type', 'column', 'operator', 'value', 'boolean');
        if (! $value instanceof Expression) {
            this.addBinding($value);
        }
        return this;
    }
    /**
     * Add a "or where JSON length" clause to the query.
     *
     * @param  string  $column
     * @param  mixed  $operator
     * @param  mixed  $value
     * @return this
     */
    orWhereJsonLength($column, $operator, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.whereJsonLength($column, $operator, $value, 'or');
    }
    /**
     * Handles dynamic "where" clauses to the query.
     *
     * @param  string  $method
     * @param  string  $parameters
     * @return this
     */
    dynamicWhere($method, $parameters)
    {
        $finder = substr($method, 5);
        $segments = preg_split(
            '/(And|Or)(?=[A-Z])/', $finder, -1, PREG_SPLIT_DELIM_CAPTURE
        );
        // The connector variable will determine which connector will be used for the
        // query condition. We will change it as we come across new boolean values
        // in the dynamic method strings, which could contain a number of these.
        $connector = 'and';
        $index = 0;
        foreach ($segments as $segment) {
            // If the segment is not a boolean connector, we can assume it is a column's name
            // and we will add it to the query as a new constraint as a where clause, then
            // we can keep iterating through the dynamic method string's segments again.
            if ($segment !== 'And' && $segment !== 'Or') {
                this.addDynamic($segment, $connector, $parameters, $index);
                $index++;
            }
            // Otherwise, we will store the connector so we know how the next where clause we
            // find in the query should be connected to the previous ones, meaning we will
            // have the proper boolean connector to connect the next where clause found.
            else {
                $connector = $segment;
            }
        }
        return this;
    }
    /**
     * Add a single dynamic where clause statement to the query.
     *
     * @param  string  $segment
     * @param  string  $connector
     * @param  array   $parameters
     * @param  int     $index
     * @return void
     */
    protected addDynamic($segment, $connector, $parameters, $index)
    {
        // Once we have parsed out the columns and formatted the boolean operators we
        // are ready to add it to this query as a where clause just like any other
        // clause on the query. Then we'll increment the parameter index values.
        $bool = strtolower($connector);
        this.where(Str::snake($segment), '=', $parameters[$index], $bool);
    }
    /**
     * Add a "group by" clause to the query.
     *
     * @param  array  ...$groups
     * @return this
     */
    groupBy(...$groups)
    {
        foreach ($groups as $group) {
            this.groups = array_merge(
                (array) this.groups,
                Arr::wrap($group)
            );
        }
        return this;
    }
    /**
     * Add a "having" clause to the query.
     *
     * @param  string  $column
     * @param  string|null  $operator
     * @param  string|null  $value
     * @param  string  $boolean
     * @return this
     */
    having($column, $operator = null, $value = null, $boolean = 'and')
    {
        $type = 'Basic';
        // Here we will make some assumptions about the operator. If only 2 values are
        // passed to the method, we will assume that the operator is an equals sign
        // and keep going. Otherwise, we'll require the operator to be passed in.
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        // If the given operator is not found in the list of valid operators we will
        // assume that the developer is just short-cutting the '=' operators and
        // we will set the operators to '=' and set the values appropriately.
        if (this.invalidOperator($operator)) {
            [$value, $operator] = [$operator, '='];
        }
        this.havings[] = compact('type', 'column', 'operator', 'value', 'boolean');
        if (! $value instanceof Expression) {
            this.addBinding($value, 'having');
        }
        return this;
    }
    /**
     * Add a "or having" clause to the query.
     *
     * @param  string  $column
     * @param  string|null  $operator
     * @param  string|null  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    orHaving($column, $operator = null, $value = null)
    {
        [$value, $operator] = this.prepareValueAndOperator(
            $value, $operator, func_num_args() === 2
        );
        return this.having($column, $operator, $value, 'or');
    }
    /**
     * Add a "having between " clause to the query.
     *
     * @param  string  $column
     * @param  array  $values
     * @param  string  $boolean
     * @param  bool  $not
     * @return \Illuminate\Database\Query\Builder|static
     */
    havingBetween($column, array $values, $boolean = 'and', $not = false)
    {
        $type = 'between';
        this.havings[] = compact('type', 'column', 'values', 'boolean', 'not');
        this.addBinding(this.cleanBindings($values), 'having');
        return this;
    }
    /**
     * Add a raw having clause to the query.
     *
     * @param  string  $sql
     * @param  array   $bindings
     * @param  string  $boolean
     * @return this
     */
    havingRaw($sql, array $bindings = [], $boolean = 'and')
    {
        $type = 'Raw';
        this.havings[] = compact('type', 'sql', 'boolean');
        this.addBinding($bindings, 'having');
        return this;
    }
    /**
     * Add a raw or having clause to the query.
     *
     * @param  string  $sql
     * @param  array   $bindings
     * @return \Illuminate\Database\Query\Builder|static
     */
    orHavingRaw($sql, array $bindings = [])
    {
        return this.havingRaw($sql, $bindings, 'or');
    }
    /**
     * Add an "order by" clause to the query.
     *
     * @param  string  $column
     * @param  string  $direction
     * @return this
     */
    orderBy($column, $direction = 'asc')
    {
        this.{this.unions ? 'unionOrders' : 'orders'}[] = [
            'column' => $column,
            'direction' => strtolower($direction) === 'asc' ? 'asc' : 'desc',
        ];
        return this;
    }
    /**
     * Add a descending "order by" clause to the query.
     *
     * @param  string  $column
     * @return this
     */
    orderByDesc($column)
    {
        return this.orderBy($column, 'desc');
    }
    /**
     * Add an "order by" clause for a timestamp to the query.
     *
     * @param  string  $column
     * @return \Illuminate\Database\Query\Builder|static
     */
    latest($column = 'created_at')
    {
        return this.orderBy($column, 'desc');
    }
    /**
     * Add an "order by" clause for a timestamp to the query.
     *
     * @param  string  $column
     * @return \Illuminate\Database\Query\Builder|static
     */
    oldest($column = 'created_at')
    {
        return this.orderBy($column, 'asc');
    }
    /**
     * Put the query's results in random order.
     *
     * @param  string  $seed
     * @return this
     */
    inRandomOrder($seed = '')
    {
        return this.orderByRaw(this.grammar.compileRandom($seed));
    }
    /**
     * Add a raw "order by" clause to the query.
     *
     * @param  string  $sql
     * @param  array  $bindings
     * @return this
     */
    orderByRaw($sql, $bindings = [])
    {
        $type = 'Raw';
        this.{this.unions ? 'unionOrders' : 'orders'}[] = compact('type', 'sql');
        this.addBinding($bindings, 'order');
        return this;
    }
    /**
     * Alias to set the "offset" value of the query.
     *
     * @param  int  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    skip($value)
    {
        return this.offset($value);
    }
    /**
     * Set the "offset" value of the query.
     *
     * @param  int  $value
     * @return this
     */
    offset($value)
    {
        $property = this.unions ? 'unionOffset' : 'offset';
        this.$property = max(0, $value);
        return this;
    }
    /**
     * Alias to set the "limit" value of the query.
     *
     * @param  int  $value
     * @return \Illuminate\Database\Query\Builder|static
     */
    take($value)
    {
        return this.limit($value);
    }
    /**
     * Set the "limit" value of the query.
     *
     * @param  int  $value
     * @return this
     */
    limit($value)
    {
        $property = this.unions ? 'unionLimit' : 'limit';
        if ($value >= 0) {
            this.$property = $value;
        }
        return this;
    }
    /**
     * Set the limit and offset for a given page.
     *
     * @param  int  $page
     * @param  int  $perPage
     * @return \Illuminate\Database\Query\Builder|static
     */
    forPage($page, $perPage = 15)
    {
        return this.skip(($page - 1) * $perPage).take($perPage);
    }
    /**
     * Constrain the query to the next "page" of results after a given ID.
     *
     * @param  int  $perPage
     * @param  int|null  $lastId
     * @param  string  $column
     * @return \Illuminate\Database\Query\Builder|static
     */
    forPageAfterId($perPage = 15, $lastId = 0, $column = 'id')
    {
        this.orders = this.removeExistingOrdersFor($column);
        if (! is_null($lastId)) {
            this.where($column, '>', $lastId);
        }
        return this.orderBy($column, 'asc')
                    .take($perPage);
    }
    /**
     * Get an array with all orders with a given column removed.
     *
     * @param  string  $column
     * @return array
     */
    protected removeExistingOrdersFor($column)
    {
        return Collection::make(this.orders)
                    .reject(($order) use ($column) {
                        return isset($order['column'])
                               ? $order['column'] === $column : false;
                    }).values().all();
    }
    /**
     * Add a union statement to the query.
     *
     * @param  \Illuminate\Database\Query\Builder|\Closure  $query
     * @param  bool  $all
     * @return \Illuminate\Database\Query\Builder|static
     */
    union($query, $all = false)
    {
        if ($query instanceof Closure) {
            call_user_func($query, $query = this.newQuery());
        }
        this.unions[] = compact('query', 'all');
        this.addBinding($query.getBindings(), 'union');
        return this;
    }
    /**
     * Add a union all statement to the query.
     *
     * @param  \Illuminate\Database\Query\Builder|\Closure  $query
     * @return \Illuminate\Database\Query\Builder|static
     */
    unionAll($query)
    {
        return this.union($query, true);
    }
    /**
     * Lock the selected rows in the table.
     *
     * @param  string|bool  $value
     * @return this
     */
    lock($value = true)
    {
        this.lock = $value;
        if (! is_null(this.lock)) {
            this.useWritePdo();
        }
        return this;
    }
    /**
     * Lock the selected rows in the table for updating.
     *
     * @return \Illuminate\Database\Query\Builder
     */
    lockForUpdate()
    {
        return this.lock(true);
    }
    /**
     * Share lock the selected rows in the table.
     *
     * @return \Illuminate\Database\Query\Builder
     */
    sharedLock()
    {
        return this.lock(false);
    }
    /**
     * Get the SQL representation of the query.
     *
     * @return string
     */
    toSql()
    {
        return this.grammar.compileSelect(this);
    }
    /**
     * Execute a query for a single record by ID.
     *
     * @param  int    $id
     * @param  array  $columns
     * @return mixed|static
     */
    find($id, $columns = ['*'])
    {
        return this.where('id', '=', $id).first($columns);
    }
    /**
     * Get a single column's value from the first result of a query.
     *
     * @param  string  $column
     * @return mixed
     */
    value($column)
    {
        $result = (array) this.first([$column]);
        return count($result) > 0 ? reset($result) : null;
    }
    /**
     * Execute the query as a "select" statement.
     *
     * @param  array  $columns
     * @return \Illuminate\Support\Collection
     */
    get($columns = ['*'])
    {
        return collect(this.onceWithColumns($columns, () {
            return this.processor.processSelect(this, this.runSelect());
        }));
    }
    /**
     * Run the query as a "select" statement against the connection.
     *
     * @return array
     */
    protected runSelect()
    {
        return this.connection.select(
            this.toSql(), this.getBindings(), ! this.useWritePdo
        );
    }
    /**
     * Paginate the given query into a simple paginator.
     *
     * @param  int  $perPage
     * @param  array  $columns
     * @param  string  $pageName
     * @param  int|null  $page
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    paginate($perPage = 15, $columns = ['*'], $pageName = 'page', $page = null)
    {
        $page = $page ?: Paginator::resolveCurrentPage($pageName);
        $total = this.getCountForPagination($columns);
        $results = $total ? this.forPage($page, $perPage).get($columns) : collect();
        return this.paginator($results, $total, $perPage, $page, [
            'path' => Paginator::resolveCurrentPath(),
            'pageName' => $pageName,
        ]);
    }
    /**
     * Get a paginator only supporting simple next and previous links.
     *
     * This is more efficient on larger data-sets, etc.
     *
     * @param  int  $perPage
     * @param  array  $columns
     * @param  string  $pageName
     * @param  int|null  $page
     * @return \Illuminate\Contracts\Pagination\Paginator
     */
    simplePaginate($perPage = 15, $columns = ['*'], $pageName = 'page', $page = null)
    {
        $page = $page ?: Paginator::resolveCurrentPage($pageName);
        this.skip(($page - 1) * $perPage).take($perPage + 1);
        return this.simplePaginator(this.get($columns), $perPage, $page, [
            'path' => Paginator::resolveCurrentPath(),
            'pageName' => $pageName,
        ]);
    }
    /**
     * Get the count of the total records for the paginator.
     *
     * @param  array  $columns
     * @return int
     */
    getCountForPagination($columns = ['*'])
    {
        $results = this.runPaginationCountQuery($columns);
        // Once we have run the pagination count query, we will get the resulting count and
        // take into account what type of query it was. When there is a group by we will
        // just return the count of the entire results set since that will be correct.
        if (isset(this.groups)) {
            return count($results);
        } elseif (! isset($results[0])) {
            return 0;
        } elseif (is_object($results[0])) {
            return (int) $results[0].aggregate;
        }
        return (int) array_change_key_case((array) $results[0])['aggregate'];
    }
    /**
     * Run a pagination count query.
     *
     * @param  array  $columns
     * @return array
     */
    protected runPaginationCountQuery($columns = ['*'])
    {
        $without = this.unions ? ['orders', 'limit', 'offset'] : ['columns', 'orders', 'limit', 'offset'];
        return this.cloneWithout($without)
                    .cloneWithoutBindings(this.unions ? ['order'] : ['select', 'order'])
                    .setAggregate('count', this.withoutSelectAliases($columns))
                    .get().all();
    }
    /**
     * Remove the column aliases since they will break count queries.
     *
     * @param  array  $columns
     * @return array
     */
    protected withoutSelectAliases(array $columns)
    {
        return array_map(($column) {
            return is_string($column) && ($aliasPosition = stripos($column, ' as ')) !== false
                    ? substr($column, 0, $aliasPosition) : $column;
        }, $columns);
    }
    /**
     * Get a generator for the given query.
     *
     * @return \Generator
     */
    cursor()
    {
        if (is_null(this.columns)) {
            this.columns = ['*'];
        }
        return this.connection.cursor(
            this.toSql(), this.getBindings(), ! this.useWritePdo
        );
    }
    /**
     * Chunk the results of a query by comparing numeric IDs.
     *
     * @param  int  $count
     * @param  callable  $callback
     * @param  string  $column
     * @param  string|null  $alias
     * @return bool
     */
    chunkById($count, callable $callback, $column = 'id', $alias = null)
    {
        $alias = $alias ?: $column;
        $lastId = null;
        do {
            $clone = clone this;
            // We'll execute the query for the given page and get the results. If there are
            // no results we can just break and return from here. When there are results
            // we will call the callback with the current chunk of these results here.
            $results = $clone.forPageAfterId($count, $lastId, $column).get();
            $countResults = $results.count();
            if ($countResults == 0) {
                break;
            }
            // On each chunk result set, we will pass them to the callback and then let the
            // developer take care of everything within the callback, which allows us to
            // keep the memory low for spinning through large result sets for working.
            if ($callback($results) === false) {
                return false;
            }
            $lastId = $results.last().{$alias};
            unset($results);
        } while ($countResults == $count);
        return true;
    }
    /**
     * Throw an exception if the query doesn't have an orderBy clause.
     *
     * @return void
     *
     * @throws \RuntimeException
     */
    protected enforceOrderBy()
    {
        if (empty(this.orders) && empty(this.unionOrders)) {
            throw new RuntimeException('You must specify an orderBy clause when using this function.');
        }
    }
    /**
     * Get an array with the values of a given column.
     *
     * @param  string  $column
     * @param  string|null  $key
     * @return \Illuminate\Support\Collection
     */
    pluck($column, $key = null)
    {
        // First, we will need to select the results of the query accounting for the
        // given columns / key. Once we have the results, we will be able to take
        // the results and get the exact data that was requested for the query.
        $queryResult = this.onceWithColumns(
            is_null($key) ? [$column] : [$column, $key],
            () {
                return this.processor.processSelect(
                    this, this.runSelect()
                );
            }
        );
        if (empty($queryResult)) {
            return collect();
        }
        // If the columns are qualified with a table or have an alias, we cannot use
        // those directly in the "pluck" operations since the results from the DB
        // are only keyed by the column itself. We'll strip the table out here.
        $column = this.stripTableForPluck($column);
        $key = this.stripTableForPluck($key);
        return is_array($queryResult[0])
                    ? this.pluckFromArrayColumn($queryResult, $column, $key)
                    : this.pluckFromObjectColumn($queryResult, $column, $key);
    }
    /**
     * Strip off the table name or alias from a column identifier.
     *
     * @param  string  $column
     * @return string|null
     */
    protected stripTableForPluck($column)
    {
        return is_null($column) ? $column : last(preg_split('~\.| ~', $column));
    }
    /**
     * Retrieve column values from rows represented as objects.
     *
     * @param  array  $queryResult
     * @param  string $column
     * @param  string $key
     * @return \Illuminate\Support\Collection
     */
    protected pluckFromObjectColumn($queryResult, $column, $key)
    {
        $results = [];
        if (is_null($key)) {
            foreach ($queryResult as $row) {
                $results[] = $row.$column;
            }
        } else {
            foreach ($queryResult as $row) {
                $results[$row.$key] = $row.$column;
            }
        }
        return collect($results);
    }
    /**
     * Retrieve column values from rows represented as arrays.
     *
     * @param  array  $queryResult
     * @param  string $column
     * @param  string $key
     * @return \Illuminate\Support\Collection
     */
    protected pluckFromArrayColumn($queryResult, $column, $key)
    {
        $results = [];
        if (is_null($key)) {
            foreach ($queryResult as $row) {
                $results[] = $row[$column];
            }
        } else {
            foreach ($queryResult as $row) {
                $results[$row[$key]] = $row[$column];
            }
        }
        return collect($results);
    }
    /**
     * Concatenate values of a given column as a string.
     *
     * @param  string  $column
     * @param  string  $glue
     * @return string
     */
    implode($column, $glue = '')
    {
        return this.pluck($column).implode($glue);
    }
    /**
     * Determine if any rows exist for the current query.
     *
     * @return bool
     */
    exists()
    {
        $results = this.connection.select(
            this.grammar.compileExists(this), this.getBindings(), ! this.useWritePdo
        );
        // If the results has rows, we will get the row and see if the exists column is a
        // boolean true. If there is no results for this query we will return false as
        // there are no rows for this query at all and we can return that info here.
        if (isset($results[0])) {
            $results = (array) $results[0];
            return (bool) $results['exists'];
        }
        return false;
    }
    /**
     * Determine if no rows exist for the current query.
     *
     * @return bool
     */
    doesntExist()
    {
        return ! this.exists();
    }
    /**
     * Retrieve the "count" result of the query.
     *
     * @param  string  $columns
     * @return int
     */
    count($columns = '*')
    {
        return (int) this.aggregate(__FUNCTION__, Arr::wrap($columns));
    }
    /**
     * Retrieve the minimum value of a given column.
     *
     * @param  string  $column
     * @return mixed
     */
    min($column)
    {
        return this.aggregate(__FUNCTION__, [$column]);
    }
    /**
     * Retrieve the maximum value of a given column.
     *
     * @param  string  $column
     * @return mixed
     */
    max($column)
    {
        return this.aggregate(__FUNCTION__, [$column]);
    }
    /**
     * Retrieve the sum of the values of a given column.
     *
     * @param  string  $column
     * @return mixed
     */
    sum($column)
    {
        $result = this.aggregate(__FUNCTION__, [$column]);
        return $result ?: 0;
    }
    /**
     * Retrieve the average of the values of a given column.
     *
     * @param  string  $column
     * @return mixed
     */
    avg($column)
    {
        return this.aggregate(__FUNCTION__, [$column]);
    }
    /**
     * Alias for the "avg" method.
     *
     * @param  string  $column
     * @return mixed
     */
    average($column)
    {
        return this.avg($column);
    }
    /**
     * Execute an aggregate on the database.
     *
     * @param  string  $function
     * @param  array   $columns
     * @return mixed
     */
    aggregate($function, $columns = ['*'])
    {
        $results = this.cloneWithout(this.unions ? [] : ['columns'])
                        .cloneWithoutBindings(this.unions ? [] : ['select'])
                        .setAggregate($function, $columns)
                        .get($columns);
        if (! $results.isEmpty()) {
            return array_change_key_case((array) $results[0])['aggregate'];
        }
    }
    /**
     * Execute a numeric aggregate on the database.
     *
     * @param  string  $function
     * @param  array   $columns
     * @return float|int
     */
    numericAggregate($function, $columns = ['*'])
    {
        $result = this.aggregate($function, $columns);
        // If there is no result, we can obviously just return 0 here. Next, we will check
        // if the result is an integer or float. If it is already one of these two data
        // types we can just return the result as-is, otherwise we will convert this.
        if (! $result) {
            return 0;
        }
        if (is_int($result) || is_float($result)) {
            return $result;
        }
        // If the result doesn't contain a decimal place, we will assume it is an int then
        // cast it to one. When it does we will cast it to a float since it needs to be
        // cast to the expected data type for the developers out of pure convenience.
        return strpos((string) $result, '.') === false
                ? (int) $result : (float) $result;
    }
    /**
     * Set the aggregate property without running the query.
     *
     * @param  string  $function
     * @param  array  $columns
     * @return this
     */
    protected setAggregate($function, $columns)
    {
        this.aggregate = compact('function', 'columns');
        if (empty(this.groups)) {
            this.orders = null;
            this.bindings['order'] = [];
        }
        return this;
    }
    /**
     * Execute the given callback while selecting the given columns.
     *
     * After running the callback, the columns are reset to the original value.
     *
     * @param  array  $columns
     * @param  callable  $callback
     * @return mixed
     */
    protected onceWithColumns($columns, $callback)
    {
        $original = this.columns;
        if (is_null($original)) {
            this.columns = $columns;
        }
        $result = $callback();
        this.columns = $original;
        return $result;
    }
    /**
     * Insert a new record into the database.
     *
     * @param  array  $values
     * @return bool
     */
    insert(array $values)
    {
        // Since every insert gets treated like a batch insert, we will make sure the
        // bindings are structured in a way that is convenient when building these
        // inserts statements by verifying these elements are actually an array.
        if (empty($values)) {
            return true;
        }
        if (! is_array(reset($values))) {
            $values = [$values];
        }
        // Here, we will sort the insert keys for every record so that each insert is
        // in the same order for the record. We need to make sure this is the case
        // so there are not any errors or problems when inserting these records.
        else {
            foreach ($values as $key => $value) {
                ksort($value);
                $values[$key] = $value;
            }
        }
        // Finally, we will run this query against the database connection and return
        // the results. We will need to also flatten these bindings before running
        // the query so they are all in one huge, flattened array for execution.
        return this.connection.insert(
            this.grammar.compileInsert(this, $values),
            this.cleanBindings(Arr::flatten($values, 1))
        );
    }
    /**
     * Insert a new record and get the value of the primary key.
     *
     * @param  array  $values
     * @param  string|null  $sequence
     * @return int
     */
    insertGetId(array $values, $sequence = null)
    {
        $sql = this.grammar.compileInsertGetId(this, $values, $sequence);
        $values = this.cleanBindings($values);
        return this.processor.processInsertGetId(this, $sql, $values, $sequence);
    }
    /**
     * Insert new records into the table using a subquery.
     *
     * @param  array  $columns
     * @param  \Closure|\Illuminate\Database\Query\Builder|string  $query
     * @return bool
     */
    insertUsing(array $columns, $query)
    {
        [$sql, $bindings] = this.createSub($query);
        return this.connection.insert(
            this.grammar.compileInsertUsing(this, $columns, $sql),
            this.cleanBindings($bindings)
        );
    }
    /**
     * Update a record in the database.
     *
     * @param  array  $values
     * @return int
     */
    update(array $values)
    {
        $sql = this.grammar.compileUpdate(this, $values);
        return this.connection.update($sql, this.cleanBindings(
            this.grammar.prepareBindingsForUpdate(this.bindings, $values)
        ));
    }
    /**
     * Insert or update a record matching the attributes, and fill it with values.
     *
     * @param  array  $attributes
     * @param  array  $values
     * @return bool
     */
    updateOrInsert(array $attributes, array $values = [])
    {
        if (! this.where($attributes).exists()) {
            return this.insert(array_merge($attributes, $values));
        }
        return (bool) this.take(1).update($values);
    }
    /**
     * Increment a column's value by a given amount.
     *
     * @param  string  $column
     * @param  float|int  $amount
     * @param  array  $extra
     * @return int
     */
    increment($column, $amount = 1, array $extra = [])
    {
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException('Non-numeric value passed to increment method.');
        }
        $wrapped = this.grammar.wrap($column);
        $columns = array_merge([$column => this.raw("$wrapped + $amount")], $extra);
        return this.update($columns);
    }
    /**
     * Decrement a column's value by a given amount.
     *
     * @param  string  $column
     * @param  float|int  $amount
     * @param  array  $extra
     * @return int
     */
    decrement($column, $amount = 1, array $extra = [])
    {
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException('Non-numeric value passed to decrement method.');
        }
        $wrapped = this.grammar.wrap($column);
        $columns = array_merge([$column => this.raw("$wrapped - $amount")], $extra);
        return this.update($columns);
    }
    /**
     * Delete a record from the database.
     *
     * @param  mixed  $id
     * @return int
     */
    delete($id = null)
    {
        // If an ID is passed to the method, we will set the where clause to check the
        // ID to let developers to simply and quickly remove a single row from this
        // database without manually specifying the "where" clauses on the query.
        if (! is_null($id)) {
            this.where(this.from.'.id', '=', $id);
        }
        return this.connection.delete(
            this.grammar.compileDelete(this), this.cleanBindings(
                this.grammar.prepareBindingsForDelete(this.bindings)
            )
        );
    }
    /**
     * Run a truncate statement on the table.
     *
     * @return void
     */
    truncate()
    {
        foreach (this.grammar.compileTruncate(this) as $sql => $bindings) {
            this.connection.statement($sql, $bindings);
        }
    }
    /**
     * Get a new instance of the query builder.
     *
     * @return \Illuminate\Database\Query\Builder
     */
    newQuery()
    {
        return new static(this.connection, this.grammar, this.processor);
    }
    /**
     * Create a new query instance for a sub-query.
     *
     * @return \Illuminate\Database\Query\Builder
     */
    protected forSubQuery()
    {
        return this.newQuery();
    }
    /**
     * Create a raw database expression.
     *
     * @param  mixed  $value
     * @return \Illuminate\Database\Query\Expression
     */
    raw($value)
    {
        return this.connection.raw($value);
    }
    /**
     * Get the current query value bindings in a flattened array.
     *
     * @return array
     */
    getBindings()
    {
        return Arr::flatten(this.bindings);
    }
    /**
     * Get the raw array of bindings.
     *
     * @return array
     */
    getRawBindings()
    {
        return this.bindings;
    }
    /**
     * Set the bindings on the query builder.
     *
     * @param  array   $bindings
     * @param  string  $type
     * @return this
     *
     * @throws \InvalidArgumentException
     */
    setBindings(array $bindings, $type = 'where')
    {
        if (! array_key_exists($type, this.bindings)) {
            throw new InvalidArgumentException("Invalid binding type: {$type}.");
        }
        this.bindings[$type] = $bindings;
        return this;
    }
    /**
     * Add a binding to the query.
     *
     * @param  mixed   $value
     * @param  string  $type
     * @return this
     *
     * @throws \InvalidArgumentException
     */
    addBinding($value, $type = 'where')
    {
        if (! array_key_exists($type, this.bindings)) {
            throw new InvalidArgumentException("Invalid binding type: {$type}.");
        }
        if (is_array($value)) {
            this.bindings[$type] = array_values(array_merge(this.bindings[$type], $value));
        } else {
            this.bindings[$type][] = $value;
        }
        return this;
    }
    /**
     * Merge an array of bindings into our bindings.
     *
     * @param  \Illuminate\Database\Query\Builder  $query
     * @return this
     */
    mergeBindings(self $query)
    {
        this.bindings = array_merge_recursive(this.bindings, $query.bindings);
        return this;
    }
    /**
     * Remove all of the expressions from a list of bindings.
     *
     * @param  array  $bindings
     * @return array
     */
    protected cleanBindings(array $bindings)
    {
        return array_values(array_filter($bindings, ($binding) {
            return ! $binding instanceof Expression;
        }));
    }
    /**
     * Get the database connection instance.
     *
     * @return \Illuminate\Database\ConnectionInterface
     */
    getConnection()
    {
        return this.connection;
    }
    /**
     * Get the database query processor instance.
     *
     * @return \Illuminate\Database\Query\Processors\Processor
     */
    getProcessor()
    {
        return this.processor;
    }
    /**
     * Get the query grammar instance.
     *
     * @return \Illuminate\Database\Query\Grammars\Grammar
     */
    getGrammar()
    {
        return this.grammar;
    }
    /**
     * Use the write pdo for query.
     *
     * @return this
     */
    useWritePdo()
    {
        this.useWritePdo = true;
        return this;
    }
    /**
     * Clone the query without the given properties.
     *
     * @param  array  $properties
     * @return static
     */
    cloneWithout(array $properties)
    {
        return tap(clone this, ($clone) use ($properties) {
            foreach ($properties as $property) {
                $clone.{$property} = null;
            }
        });
    }
    /**
     * Clone the query without the given bindings.
     *
     * @param  array  $except
     * @return static
     */
    cloneWithoutBindings(array $except)
    {
        return tap(clone this, ($clone) use ($except) {
            foreach ($except as $type) {
                $clone.bindings[$type] = [];
            }
        });
    }
}
