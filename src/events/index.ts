import { AxiosRequestConfig } from 'axios';
import { AlTriggeredEvent } from '@al/haversack/triggers';

export class AlClientBeforeRequestEvent extends AlTriggeredEvent
{
    constructor( public request:AxiosRequestConfig ) {
        super();
    }
}
