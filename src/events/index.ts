import { AxiosRequestConfig } from 'axios';
import { AlTriggeredEvent } from '../utility/al-trigger-stream';

export class AlClientBeforeRequestEvent extends AlTriggeredEvent
{
    constructor( public request:AxiosRequestConfig ) {
        super();
    }
}
