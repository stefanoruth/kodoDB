export class GuardsAttributes {
	/**
	 * The attributes that are mass assignable.
	 */
	protected _fillable: string[] = []

	/**
	 * The attributes that aren't mass assignable.
	 */
    protected _guarded: string[] = ['*']

    /**
     * Indicates if all mass assignment is enabled.
     */
    protected static _unguarded = false;

    /**
     * Get the fillable attributes for the model.
     */
    getFillable(): string[] {
        return this._fillable;
    }

    /**
     * Set the fillable attributes for the model.
     */
    fillable(fillable: string[]):this {
        this._fillable = fillable;
        return this;
    }

    /**
     * Get the guarded attributes for the model.
     */
    getGuarded():string[] {
        return this._guarded;
    }

    /**
     * Set the guarded attributes for the model.
     */
    guard(guarded:string[]):this {
        this._guarded = guarded;
        return this;
    }

    /**
     * Disable all mass assignable restrictions.
     */
    static unguard(state:boolean = true):void {
       this._unguarded = state;
    }

    /**
     * Enable the mass assignment restrictions.
     */
    static reguard():void {
        this._unguarded = false;
    }

    /**
     * Determine if current state is "unguarded".
     */
    static isUnguarded():boolean {
        return this._unguarded;
    }

    /**
     * Run the given callable while being unguarded.
     */
    static unguarded(callback: () => void) {
        if (this._unguarded) {
            return callback();
        }
        this.unguard();
        try {
            return callback();
        } finally {
            this.reguard();
        }
    }

    /**
     * Determine if the given attribute may be mass assigned.
     */
    isFillable(key:string):boolean {
        if (GuardsAttributes._unguarded) {
            return true;
        }
        // If the key is in the "fillable" array, we can of course assume that it's
        // a fillable attribute. Otherwise, we will check the guarded array when
        // we need to determine if the attribute is black-listed on the model.
        if (this.getFillable().indexOf(key) > -1) {
            return true;
        }
        // If the attribute is explicitly listed in the "guarded" array then we can
        // return false immediately. This means this attribute is definitely not
        // fillable and there is no point in going any further in this method.
        if (this.isGuarded(key)) {
            return false;
        }
        return this.getFillable().length === 0 &&
            !Str:: startsWith(key, '_');
    }

    /**
     * Determine if the given key is guarded.
     */
    isGuarded(key:string):boolean {
        return this.getGuarded().indexOf(key) > 0 || this.getGuarded() === ['*'];
    }

    /**
     * Determine if the model is totally guarded.
     */
    totallyGuarded():boolean {
        return this.getFillable().length === 0 && this.getGuarded() === ['*'];
    }

    /**
     * Get the fillable attributes of a given array.
     */
    protected fillableFromArray(attributes: []): [] {
        if (this.getFillable().length > 0 && !GuardsAttributes._unguarded) {
            return array_intersect_key(attributes, array_flip(this.getFillable()));
        }
        return attributes;
    }
}
