/**
 *  A (very) simple wrapper for localStorage and sessionStorage, written with expirable cachability in mind.
 *
 *  @author McNielsen <knielsen@alertlogic.com>
 *
 *  @copyright Alert Logic Inc., 2019.
 */

import { AlStopwatch } from './al-stopwatch';

export class AlCabinet
{
    /**
     * The following three constants indicate which type of storage should be used for a given Cabinet.
     */
    public static LOCAL = 1;          //  Local: in memory only
    public static EPHEMERAL = 2;      //  Ephemeral: flushed to sessionStorage, limited to lifespan of browser process
    public static PERSISTENT = 3;     //  Persistent: flushed to localStorage, and will survive load/exit of browser

    static openCabinets: {[cabinetName:string]:AlCabinet} = {};

    public syncronizer:AlStopwatch = null;

    constructor( public name:string,
                 public data:any = {},
                 public type:number = AlCabinet.LOCAL ) {
        if ( type !== AlCabinet.LOCAL ) {
            this.syncronizer = AlStopwatch.later( this.synchronize );
        }
        AlCabinet.openCabinets[name] = this;
    }

    /**
     *  Instantiates a persistent information cache (uses localStorage), deserializing data from the provided name if it exists.
     *
     *  @param {string} name The name of the data cluster.
     *
     *  @returns {Cabinet} A cabinet instance that can be used to interrogate/update the data.
     */

    public static persistent( name:string ):AlCabinet {
        if ( AlCabinet.openCabinets.hasOwnProperty( name ) ) {
            return AlCabinet.openCabinets[name];
        }
        let cabinet = new AlCabinet( name, {}, AlCabinet.PERSISTENT );
        try {
            if ( localStorage ) {
                let content = localStorage.getItem( name );
                if ( content ) {
                    cabinet.data = JSON.parse( content );
                }
            }
        } catch( e ) {
            //  really?  A browser that doesn't support localStorage?  Bollocks.
            console.warn("Unexpected error: could not access localStorage OR failed to parse JSON content found there.", e.toString() );
        }
        AlCabinet.openCabinets[name] = cabinet;
        return cabinet;
    }

    /**
     *  Instantiates a temporary information cache (uses sessionStorage), deserializing data from the provided name if it exists.
     *
     *  @param {string} name The name of the data cluster.
     *
     *  @returns {Cabinet} A cabinet instance that can be used to interrogate/update the data.
     */

    public static ephemeral( name:string ):AlCabinet {
        if ( AlCabinet.openCabinets.hasOwnProperty( name ) ) {
            return AlCabinet.openCabinets[name];
        }
        let cabinet = new AlCabinet( name, {}, AlCabinet.PERSISTENT );
        try {
            if ( sessionStorage ) {
                let content = sessionStorage.getItem( name );
                if ( content ) {
                    cabinet.data = JSON.parse( content );
                }
            }
        } catch( e ) {
            //  Just, bollocks!
            console.warn("Unexpected error: could not access localStorage OR failed to parse JSON content found there.", e.toString() );
        }
        AlCabinet.openCabinets[name] = cabinet;
        return cabinet;
    }

    /**
     *  Instantiates a local cache (uses no storage or persistence).
     *
     *  @param {string} name The name of the data cluster
     *
     *  @returns {Cabinet} A cabinet instance that can be used just to hold arbitrary data.
     */
    public static local( name:string ):AlCabinet {
        if ( AlCabinet.openCabinets.hasOwnProperty( name ) ) {
            return AlCabinet.openCabinets[name];
        }
        let cabinet = new AlCabinet( name, {}, AlCabinet.PERSISTENT );
        AlCabinet.openCabinets[name] = cabinet;
        return cabinet;
    }

    /**
     *  Retrieves a property from the cabinet.
     *
     *  @param {string} property The name of the property.
     *  @param {any} defaultValue The value to return if the property doesn't exist (defaults to null).
     *  @param {boolean} disableExpiration Indicates whether or not time-based expiration rules should be honored.
     *
     *  @returns {any} The value of the property (or provided default)
     */

    public get( property:string, defaultValue:any = null, disableExpiration:boolean = false ):any {
        if ( ! this.data.hasOwnProperty( property ) ) {
            return this.data[property];
        }
        let currentTS = + new Date();
        if ( ! disableExpiration && ( this.data[property].expires > 0 && this.data[property].expires < currentTS ) ) {
            delete this.data[property];
            if ( this.syncronizer ) {
                this.syncronizer.again();
            }
            return defaultValue;
        }
        return this.data[property].value;
    }

    /**
     *  Check to see if a property is present in the cabinet.
     *
     *  @param {string} property The name of the property.
     *
     *  @returns {boolean} True if the property exists, false otherwise.
     */
    public exists( property:string ):boolean {
        return this.data.hasOwnProperty( property );
    }

    /**
     *  Checks to see if a given property is expired.
     *
     *  @param {string} property The name of the property to check expiration for.
     *
     *  @returns {boolean} True if the property either does not exist or has expired, false otherwise.
     */
    public expired( property:string ):boolean {
        if ( ! this.data.hasOwnProperty( property ) ) {
            return true;
        }
        let currentTS = + new Date();
        if ( this.data[property].expires > 0 && this.data[property].expires < currentTS ) {
            return true;
        }
        return false;
    }

    /**
     *  Sets a property in the cabinet (and schedules synchronization)
     *
     *  @param {string} property The name of the property.
     *  @param {any} value The value to set it to.
     *  @param {number} ttl The number of seconds the data should be retained for.  Defaults to 0 (indefinite).
     *
     *  @returns {Cabinet} returns the instance so that calls to it may be chained, if desired.
     */
    public set( property:string, value:any, ttl:number = 0 ) {
        if ( value === null || value === undefined ) {
            return this.delete( property );
        }
        let expirationTS = ttl === 0 ? 0 : + new Date() + ( ttl * 1000 );
        this.data[property] = {
            expires:    expirationTS,
            value:      value
        };
        if ( this.syncronizer ) {
            this.syncronizer.again();
        }
        return this;
    }

    /**
     *  Deletes a property in the cabinet (and schedules synchronization)
     *
     *  @param {string} property The property to be deleted.
     *
     *  @returns {Cabinet} returns the instance so that calls may be chained, if desired.
     */
    public delete( property:string ) {
        if ( this.data.hasOwnProperty( property ) ) {
            delete this.data[property];
            if ( this.syncronizer ) {
                this.syncronizer.again();
            }
        }
        return this;
    }

    /**
     *  Destroys the current cabinet, discarding any contents it may have.
     */
    public destroy() {
        try {
            if ( this.type === AlCabinet.PERSISTENT ) {
                localStorage.removeItem( this.name );
            } else if ( this.type === AlCabinet.EPHEMERAL ) {
                sessionStorage.removeItem( this.name );
            }
        } catch( e ) {
        }
    }

    /**
     *  Synchronizes data back into the storage facility after performing a garbage collection run.
     *
     *  @returns {Cabinet} the class instance.
     */
    public synchronize = () => {
        /**
         *  Perform garbage collection on the dataset and purge any expired stuff
         */
        let currentTS = + new Date();
        for ( let property in this.data ) {
            if ( this.data.hasOwnProperty( property ) ) {
                if ( this.data[property].expires > 0 && this.data[property].expires < currentTS ) {
                    delete this.data[property];
                }
            }
        }

        /**
         *  Now, serialize the surviving data and put it into storage
         */
        try {
            if ( localStorage && sessionStorage ) {
                if ( this.type === AlCabinet.PERSISTENT ) {
                    localStorage.setItem( this.name, JSON.stringify( this.data ) );
                } else if ( this.type === AlCabinet.EPHEMERAL ) {
                    sessionStorage.setItem( this.name, JSON.stringify( this.data ) );
                }
            }
        } catch( e ) {
            //  Argh, snarfblatt!
            console.warn("An error occurred while trying to syncronize data to local or session storage. ", e.toString() );
        }

        /**
         *  Last but not least, make sure no further executions of the synchronizer are scheduled.
         */
        if ( this.syncronizer ) {
            this.syncronizer.cancel();
        }
        return this;
    }
}
