export class State<T>{
    valid: boolean = true
    private changeListeners: Array<(property: T | undefined) => void> = []
    private listeners: Array<() => void> = []

    incoming?: State<T>
    protected hook: (property: T | undefined) => void = () => this.invalidate()
    protected cache?: T

    #name: string

    constructor(name?: string, cache?: T) {
        this.cache = cache
        this.#name = name || ''
    }

    setName(name: string) {
        this.#name = name
        return this
    }

    getName() {
        return this.#name
    }

    addChangeListener(listener: (val: T | undefined) => void) {
        if (this.changeListeners.indexOf(listener) === -1) {
            this.changeListeners.push(listener)
            // listener(this.get())
        }

        return {
            listener,
            destroy: () => {
                this.removeChangeListener(listener)
            }
        }
    }

    removeChangeListener(listener: (val: T | undefined) => void) {
        let index = this.changeListeners.indexOf(listener)
        if (index !== -1) {
            this.changeListeners.splice(index, 1)
        }

        return this
    }

    clearChangeListeners() {
        for (let idx in this.changeListeners) {
            this.removeChangeListener(this.changeListeners[0])
        }
        return this
    }

    addInvalidationListener(listener: () => void) {
        if (this.listeners.indexOf(listener) === -1) {
            this.listeners.push(listener)
            // listener()
        }

        return {
            listener: listener,
            destroy: () => {
                this.removeChangeListener(listener)
            }
        }
    }

    removeInvalidationListener(listener: () => void) {
        let index = this.listeners.indexOf(listener)
        if (index !== -1) {
            this.listeners.splice(index, 1)
        }

        return this
    }

    clearInvalidationListeners() {
        for (let idx in this.listeners) {
            this.removeChangeListener(this.listeners[0])
        }
        return this
    }

    isValid() {
        return this.valid
    }

    protected validate() {
        if (!this.valid) {
            this.valid = true
            this.onValidate()
        }
    }

    protected invalidate() {
        if (this.valid) {
            this.valid = false
            this.onInvalidate()

            for (let listener of this.listeners) {
                listener()
            }
        }
        for (let listener of this.changeListeners) {
            listener(this.get())
        }
    }

    onInvalidate() { }

    onValidate() { }

    connect(other: State<T>) {
        other.setConnection(this)
        return this
    }

    setConnection(incoming?: State<T>) {
        this.incoming?.removeChangeListener(this.hook)
        this.incoming = undefined

        if (incoming) {
            this.incoming = incoming
            incoming.addChangeListener(this.hook)
        }

        this.invalidate()
        return this
    }

    isConnected() {
        return !!this.incoming
    }

    getIncoming() {
        return this.incoming
    }

    set(newValue: T) {
        this.cache = newValue
        this.invalidate()
        return this
    }

    get(): T | undefined {
        if (!this.valid) {
            this.cache = this.incoming ? this.incoming.get() : this.cache
            this.validate()
        }
        return this.cache
    }
}


export class StateGroup extends State<any> {
    [key: string]: any
    #inputs: State<any>[] = []

    constructor(name?: string, computeFn?: (...args: any) => any) {
        super(name)
        this.setComputeFn(computeFn)
    }

    addState(...inputs: State<any>[]) {
        inputs.forEach(input => {
            input.addChangeListener(this.hook)
            this.#inputs.push(input)
            this[input.getName()] = input
        })
        this.invalidate()
        return this
    }

    removeState(...inputs: State<any>[]) {
        inputs.forEach(input => {
            let idx = this.#inputs.indexOf(input)
            idx > -1 && this.removeStateAt(idx)
        })
        return this
    }

    removeStateAt(idx: number) {
        delete this[this.#inputs[idx].getName()]
        this.#inputs[idx].removeChangeListener(this.hook)
        this.#inputs.splice(idx, 1)
        this.invalidate()
        return this
    }

    clearStates() {
        for (let idx in this.#inputs) {
            this.removeStateAt(0)
        }
        return this
    }

    getStates() {
        return this.#inputs
    }


    set(newValue: any) {
        // does nothing, its here to override default invalidation
        return this
    }


    get() {
        if (!this.valid) {
            this.cache = this.compute(...this.#inputs.map(input => input.get()))
            this.validate()
        }
        return this.cache
    }

    // It can be overriden by subclass or setComputeFn can be used directly from this class
    compute(...args: any) {
        return this.#compute(...args)
    }

    #computeDefault = (...args: any) => {
        if (this.incoming) return this.incoming.get()

        let res: any = {}
        for (const state of this.getStates()) {
            res[state.getName()] = state.get()
        }
        return res
    }
    #compute: (...args: any) => any = this.#computeDefault

    setComputeFn(computeFn?: (...args: any) => any) {
        this.#compute = computeFn ? computeFn : this.#computeDefault
        this.invalidate()
        return this
    }
}