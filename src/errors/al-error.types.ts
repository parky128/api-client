/**
 * A collection of classed error types.
 */

/**
 * This error should be used when an HTTP 5xx response (or other general error) is received
 * from an internal API.
 */

export class AlAPIServerError extends Error
{
    constructor( message:string,
                 public serviceName:string,
                 public statusCode:number ) {
        super( message );
    }
}

/**
 * The AlResponseValidationError is intended to alert of unexpected responses from an internal API.
 * These responses need to be identified separately from other errors so that the relevant
 * system health checks or communication with an appropriate backend team can be organized in response.
 * Please note that this should NOT be used to handler general server-side failures; please see AlAPIServerError
 * for that error condition.
 */
export class AlResponseValidationError extends Error
{
    constructor( message:string, errors:any[] = [] ) {
        console.error( message, errors );
        super( message );
    }
}
