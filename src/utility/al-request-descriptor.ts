/**
 *  A utility class for "building" a request description using call chaining.
 *
 *  @author McNielsen (knielsen@alertlogic.com)
 *
 *  @copyright Alert Logic Inc, 2019.
 */

import { AxiosResponse } from 'axios';
import { AlCabinet } from './al-cabinet';
import { AlSchemaValidator } from './al-schema-validator';

export type AlRequestTypeConverter<ResponseType> = { (rawData:any, response?:AxiosResponse):ResponseType };
type RequestExecutor<ResponseType> = { (options:any):Promise<AxiosResponse<ResponseType>> };

/**
 *  A utility class to assist in building a request in a caller-friendly manner.
 *  See services/BaseAPIClient for more information.
 */
export class AlRequestDescriptor<ResponseType>
{
    protected executor:RequestExecutor<ResponseType> = null;
    protected data:any                          =   {};
    protected method:string                     =   "GET";
    protected credentials:boolean               =   true;
    protected headers:{[header:string]:string}  =   {};
    protected params:URLSearchParams            =   new URLSearchParams();
    protected cacheType:number                  =   AlCabinet.LOCAL;
    protected cacheTTL:number                   =   0;
    protected maxRetryCount:number              =   0;
    protected schema:any                        =   null;
    protected converter:AlRequestTypeConverter<ResponseType> = null;

    constructor( executor:RequestExecutor<ResponseType>, method:string = "GET" ) {
        this.executor = executor;
    }

    public useMethod( method:string ):AlRequestDescriptor<ResponseType> {
        this.method = method;
        return this;
    }

    public withData( data:any ):AlRequestDescriptor<ResponseType> {
        this.data = data;
        return this;
    }

    public withHeader( header:string, value:string ):AlRequestDescriptor<ResponseType> {
        this.headers[header] = value;
        return this;
    }

    public withParam( parameter:string, value:string|number ):AlRequestDescriptor<ResponseType> {
        this.params.set( parameter, value.toString() );
        return this;
    }

    public withParamIf( expression:boolean, parameter:string, value:string|number ):AlRequestDescriptor<ResponseType> {
        if ( expression ) {
            this.params.set( parameter, value.toString() );
        }
        return this;
    }

    public withCredentials( value:boolean = true ):AlRequestDescriptor<ResponseType> {
        this.credentials = value;
        return this;
    }

    public withSchemaValidation( schema:any ):AlRequestDescriptor<ResponseType> {
        this.schema = schema;
        return this;
    }

    public withConverter( converter:AlRequestTypeConverter<ResponseType> ):AlRequestDescriptor<ResponseType> {
        this.converter = converter;
        return this;
    }

    public enableCache( cacheType:number, ttl:number = 60 ):AlRequestDescriptor<ResponseType> {
        this.cacheType  = cacheType;
        this.cacheTTL   = ttl;
        return this;
    }

    public enableAutoRetry( maxRetryCount:number ) {
        this.maxRetryCount = maxRetryCount;
        return this;
    }

    public execute():Promise<ResponseType> {
        let options = {
            method: this.method,
            headers: this.headers,
            params: this.params,
            withCredentials: this.credentials
        };
        return this.executor( options )
                .then( response => {
                    if ( this.schema ) {
                        //  If there is a JSON schema for this response type, let the validation return the coerced type (optionally using a user provided converter)
                        let validator = new AlSchemaValidator<ResponseType>();
                        return validator.validate( response.data, this.schema, this.converter );
                    } else if ( this.converter ) {
                        //  If there is a user provided converter, use that to coerce the response data into the proper class or interface
                        return this.converter( response.data, response );
                    } else {
                        //  If there is neither a JSON schema nor a converter, cast the raw response to the user provided type
                        return <ResponseType>response.data;
                    }
                } );
    }
}
