/**
 *  AlStopwatch is an attempt to encapsulate a few basic timer-related use cases into a simple interface.
 *  Most uses cases can be handled by one of the three static methods:
 *    `Stopwatch.later` - creates a Stopwatch instance that won't be executed until someone calls its `now` or `again` methods.
 *    `Stopwatch.once` - creates a Stopwatch instance that executes once after a specified delay, defaulting to 0.
 *    `Stopwatch.repeatedly` - creates a Stopwatch instance that executes repeatedly at a given interval until its `cancel` method is called.
 *
 *  @author Kevin Nielsen <knielsen@alertlogic.com>
 *
 *  @copyright Alert Logic Inc, 2019
 */

/**
 *  Simple Callback descriptor
 */
export declare type AlStopwatchCallback = { ():void };

export class AlStopwatch {

    public callback:AlStopwatchCallback;
    public timer:any = null;
    public interval:number = 0;

    constructor() {
    }

    /**
     *  A static method to generate an unscheduled timer
     */
    public static later( callback:AlStopwatchCallback ) {
        let watch = new AlStopwatch();
        watch.callback = callback;
        return watch;
    }

    /**
     *  A static method to generate a timer that will execute once after a given number of milliseconds.
     */
    public static once( callback:AlStopwatchCallback, delay:number = 0 ) {
        let watch = new AlStopwatch();
        watch.callback = callback;
        watch.timer = setTimeout( watch.tick, delay );
        return watch;
    }

    /**
     *  A static method to generate a timer that will execute intermittently.
     *  Note that this implementation deviates from the behavior of setInterval by *defaulting*
     *  to firing the timer immediately.
     */
    public static repeatedly( callback:AlStopwatchCallback, interval:number = 1000, beginImmediately:boolean = true ) {
        let watch = new AlStopwatch();
        watch.callback = callback;
        watch.interval = interval;
        watch.timer = setInterval( watch.tick, interval );
        if ( beginImmediately ) {
            setTimeout( () => watch.tick, 0 );
        }
        return watch;
    }

    /**
     *  The timer's tick handler; executes the callback and, for single-fire timers, clears the timer handle.
     */
    public tick = () => {
        if ( this.interval === 0 ) {
            this.timer = null;
        }
        this.callback();
    }

    /**
     *  Cancels a scheduled execution.
     */
    public cancel = () => {
        if ( this.timer ) {
            clearTimeout( this.timer );
            this.timer = null;
        }
    }

    /**
     *  Schedules a repeated execution.  This method has no effect if there is already a scheduled execution.
     */
    public again = ( delay:number = 0 ) => {
        if ( ! this.timer ) {
            this.interval = 0;
            this.timer = setTimeout( this.tick, delay );
        }
    }

    /**
     * Schedules a repeated execution.  This method will cancel any previously scheduled execution.
     */
    public reschedule = ( delay:number = 0 ) => {
        this.cancel();
        this.again( delay );
    }

    /**
     *  Executes the timer immediately (literally, right now!)
     */
    public now = () => {
        this.tick();
    }
}



