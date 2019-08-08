import { AxiosRequestConfig } from 'axios';
import { AlTriggeredEvent } from '@al/common';

export class AlClientBeforeRequestEvent extends AlTriggeredEvent
{
    constructor( public request:AxiosRequestConfig ) {
        super( "AlClientBeforeRequest" );
    }
}
