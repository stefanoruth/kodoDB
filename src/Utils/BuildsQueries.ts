import { QueryBuilder } from "../Query/QueryBuilder";
import { Collection } from "./Collection";

export class BuildsQueries
{
    /**
     * Chunk the results of the query.
     */
    chunk(count: number, callback: (results:any, page:number) => any)
    {
        this.enforceOrderBy();
        let results
        let countResults
        let page = 1;
        do {
            // We'll execute the query for the given page and get the results. If there are
            // no results we can just break and return from here. When there are results
            // we will call the callback with the current chunk of these results here.
            results = this.forPage(page, count).get();
            countResults = results.count();
            if (countResults === 0) {
                break;
            }
            // On each chunk result set, we will pass them to the callback and then let the
            // developer take care of everything within the callback, which allows us to
            // keep the memory low for spinning through large result sets for working.
            if (callback(results, page) === false) {
                return false;
            }
            unset(results);
            page++;
        } while (countResults === count);
        return true;
    }

    /**
     * Execute a callback over each item while chunking.
     */
    each(callback: () => any, count:number = 1000):boolean
    {
        return this.chunk(count, (results) => {
            foreach (results as key => value) {
                if (callback(value, key) === false) {
                    return false;
                }
            }
        });
    }

    /**
     * Execute the query and get the first result.
     */
    first(columns: string[] = ['*']):any // \Illuminate\Database\Eloquent\Model|object|static|null
    {
        return this.take(1).get(columns).first();
    }

    /**
     * Apply the callback's query changes if the given "value" is true.
     */
    when(value: any, callback: (current: this, value: any) => any, defaultValue?: (current: this, value: any) => any): this | any
    {
        if (value) {
            const result = callback(this, value)
            return result ? result : this;
        } else if (defaultValue) {
            const result = defaultValue(this, value)
            return result ? result : this;
        }
        return this;
    }

    /**
     * Pass the query to a given callback.
     */
    tap(callback: () => any): QueryBuilder
    {
        return this.when(true, callback);
    }

    /**
     * Apply the callback's query changes if the given "value" is false.
     */
    unless(value:any, callback: (current: this, value: any) => any, defaultValue?: (current: this, value: any) => any): this | any
    {
        if (! value) {
            const result = callback(this, value)
            return result ? result : this;
        } else if (defaultValue) {
            const result = defaultValue(this, value)
            return result ? result : this;
        }
        return this;
    }

    /**
     * Create a new length-aware paginator instance.
     */
    protected paginator(items: Collection, total: number, perPage: number, currentPage: number, options: {})
    {
        // return Container::getInstance().makeWith(LengthAwarePaginator::class, compact(
        //     'items', 'total', 'perPage', 'currentPage', 'options'
        // ));
    }

    /**
     * Create a new simple paginator instance.
     */
    protected simplePaginator(items: Collection, perPage: number, currentPage: number, options: {})
    {
        // return Container::getInstance().makeWith(Paginator::class, compact(
        //     'items', 'perPage', 'currentPage', 'options'
        // ));
    }
}
