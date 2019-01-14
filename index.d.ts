// Type definitions for @alertlogic/client 0.1.0
// Project: https://github.com/alertlogic/api-client
// Definitions by: Rob Parker <https://github.com/parky128>

import { AIMSSession, AIMSAccount, AIMSAuthentication } from '@alertlogic/session';

declare module '@alertlogic/client';

interface DefaultEndpointDetail {
  global: string;
}

interface EndpointURIDetail{
  host: string;
  path: string;
}

interface ClientRequestParams {
  account_id: string;
  residency: string;
  service_name: string;
  endpoint_type: string;
  version: string;
  query?: any;
  data?: any;
  path: string;
}

/**
 * Update 'authentication' session details
 * Modelled on /aims/v1/authenticate
 * To be called by AIMS Service
 * Returns an AIMS Authentication object
 */
export function setAuthentication(proposal: AIMSAuthentication): AIMSAuthentication;
/**
 * Retrives the current AIMS Authentication object
 */
export function getAuthentication(): AIMSAuthentication;
/**
 * Update the active 'account' for the current session
 * Modelled on /aims/v1/:account_id/account
 * To be called by AIMS Service
 * Returns the active account details
 */
export function setActive(): AIMSAccount;
/**
 * Retrieves the active account session details
 */
export function getActive(): AIMSAccount;
/**
 * Deactivate Session
 */
export function deactivateSession(): boolean;
/**
 * Is the Session Active?
 */
export function isActive(): AIMSSession;
/**
 * Get AIMS Token
 */
export function getToken(): string;
/**
 * Returns the default api endpoint (global)
 */
export function getDefaultEndpoint(): Promise<DefaultEndpointDetail>;
/**
 * Get endpoint
 * GET
 * /endpoints/v1/:account_id/residency/:residency/services/:service_name/endpoint/:endpoint_type
 * https://api.global-services.global.alertlogic.com/endpoints/v1/01000001/residency/default/services/incidents/endpoint/ui
 */
export function getEndpoint(params: ClientRequestParams): Promise<any>;

export function CreateURI(params: ClientRequestParams): Promise<EndpointURIDetail>;
/**
 * Return Cache, or Call for updated data
 */
export function Fetch(params: ClientRequestParams): Promise<any>;
/**
 * Post for new data
 */
export function Post(params: ClientRequestParams): Promise<any>;
/**
 * Put for updated data
 */
export function Set(params: ClientRequestParams): Promise<any>;
/**
 * Delete data
 */
export function Delete(params: ClientRequestParams): Promise<any>;
/**
 * Use HTTP Basic Auth
 */
export function Authenticate(params: ClientRequestParams, username: string, password: string, mfa?: number): Promise<any>;
