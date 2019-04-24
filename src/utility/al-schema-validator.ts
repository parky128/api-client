/**
 *  A simple wrapper class for AJV.
 */

import * as Ajv from 'ajv';
import { AlResponseValidationError } from '../errors';

export class AlSchemaValidator<Type>
{
    protected static validatorCache:{[type:string]:any} = {};
    protected static validationEngine = null;

    public validate( data:any, schema:any|any[], converter:{(data:any):Type} = null ):Type {

        //  Instantiate the validation generator if necessary
        if ( ! AlSchemaValidator.validationEngine ) {
            AlSchemaValidator.validationEngine = new Ajv();
        }

        let primarySchema = schema;
        let referenceSchemas = [];
        if ( schema instanceof Array ) {
            primarySchema = schema[0];
            referenceSchemas = schema.slice( 1 );
        }
        //  Get or create the validation method for this schema
        let typeName = primarySchema.hasOwnProperty( "$id" ) ? primarySchema["$id"] : null;
        if ( typeName === null ) {
            console.warn("Warning: attempting validation of a schema without an $id property." );
            typeName = "generic";
        }
        let validationMethod;
        if ( typeName && AlSchemaValidator.validatorCache.hasOwnProperty( typeName ) ) {
            validationMethod = AlSchemaValidator.validatorCache[typeName];
        } else {
            try {
                for ( let i = 0; i < referenceSchemas.length; i++ ) {
                    AlSchemaValidator.validationEngine.addSchema( referenceSchemas[i] );
                }
                validationMethod = AlSchemaValidator.validationEngine.compile( primarySchema );
            } catch( e ) {
                console.error(`Failed to compile validation routine for schema for ${typeName}`, e );
                throw e;
            }

            if ( typeName ) {
                AlSchemaValidator.validatorCache[typeName] = validationMethod;
            }
        }

        //  Execute the validator against the provided data
        if ( ! validationMethod( data ) ) {
            throw new AlResponseValidationError( `Provided data does not match the schema '${typeName}'`, validationMethod.errors );
        }

        if ( converter ) {
            return converter( data );
        }

        return <Type>data;
    }
}
