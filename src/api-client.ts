/**
 * Module to deal with discovering available endpoints
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import cache from 'cache';
import btoa from 'btoa';
import * as qs from 'qs';
import { ALSession, AIMSAuthentication, AIMSAccount } from '@al/session';

interface EndPointResponse {
  host: string;
  path: string;
}

export interface APIRequestParams {
  account_id?: string;
  residency?: string;
  service_name?: string;
  endpoint_type?: string;
  version?: string;
  data?: any;
  path?: string;
  params?: any;
  ttl?: number;
  accept_header?: string;
  response_type?: string;
}

class ALClient {

  constructor() {}

  private alSession = ALSession;

/**
   * Service specific fallback params
   * ttl is 1 minute by default, consumers can set cache duration in requests
   */
  private defaultParams: APIRequestParams = {
    account_id: '0',
    // ("us" or "emea" or "default")
    residency: 'default',
    service_name: 'aims',
    // ("api" or "ui")
    endpoint_type: 'api',
    version: 'v1',
    data: {},
    path: '',
    params: {},
    ttl: 60000,
  };

  private cache = new cache(60000);

  /**
   * Are we running in a browser?
   */
  private isBrowserBased() {
    if (typeof window === 'undefined') {
      return false;
    }
    return true;
  }

  setAuthentication(proposal: AIMSAuthentication): AIMSAuthentication {
    this.alSession.setAuthentication(proposal);
    return this.getAuthentication();
  }

  getAuthentication(): AIMSAuthentication {
    return this.alSession.getAuthentication();
  }

  setActive(proposal: AIMSAccount): AIMSAccount {
    this.alSession.setActive(proposal);
    this.alSession.activateSession();
    return this.getActive();
  }

  getActive(): AIMSAccount {
    return this.alSession.getActive();
  }

  deactivateSession() {
    return this.alSession.deactivateSession();
  }

  isActive() {
    return this.alSession.isActive();
  }

  getToken(): string {
    return this.alSession.getToken();
  }

  /**
   * Create a default Discovery Response for Global Stack
   */
  getDefaultEndpoint() {
    let response = { global: 'api.global-services.global.alertlogic.com' };
    if (this.isBrowserBased()) {
      /**
       * Do some machinations to find out if we are in Production or Integration
       */
      let tld = window.location.hostname;
      tld = tld.toString();
      if (tld.match('/product.dev/gi') !== null || tld === 'localhost') {
        response = { global: 'api.global-integration.product.dev.alertlogic.com' };
      }
    }
    return response;
  }

  /**
   * Ensure that the params object is always fully populated for URL construction
   */
  mergeParams(params: APIRequestParams) {
    const keys = Object.keys(this.defaultParams);
    const merged: APIRequestParams = {};
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        merged[key] = params[key];
      } else {
        merged[key] = this.defaultParams[key];
      }
    });
    return merged;
  }

  /**
   * Instantiate a properly configured axios client for services
   */
  axiosInstance(): AxiosInstance {
    const axiosInstance = axios.create({
      baseURL: this.getDefaultEndpoint().global,
      timeout: 5000,
      withCredentials: false,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-AIMS-Auth-Token': this.alSession.getToken(),
      },
    });
    axiosInstance.interceptors.response.use(
      response => response,
      (error) => {
      // Do something with response error
        console.log(error);
        return Promise.reject(error.response);
      });
    return axiosInstance;
  }

  /**
   * Get endpoint
   * GET
   * /endpoints/v1/:account_id/residency/:residency/services/:service_name/endpoint/:endpoint_type
   * https://api.global-services.global.alertlogic.com/endpoints/v1/01000001/residency/default/services/incidents/endpoint/ui
   */
  async getEndpoint(params: APIRequestParams): Promise<AxiosResponse<any>> {
    const merged = this.mergeParams(params);
    const defaultEndpoint = this.getDefaultEndpoint();
    const uri = `/endpoints/v1/${merged.account_id}/residency/default/services/${merged.service_name}/endpoint/${merged.endpoint_type}`;
    const testCache = this.cache.get(uri);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = `https://${defaultEndpoint.global}`;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = this.getToken();
    if (!testCache) {
      await xhr.get(uri).then((response) => {
        const ttl = 15 * 60000; // cache our endpoints response for 15 mins
        this.cache.put(uri, response, ttl);
      });
    }
    return this.cache.get(uri);
  }

  async createURI(params: APIRequestParams) {
    const merged = this.mergeParams(params);
    const queryParams = qs.stringify(merged.params);
    const defaultEndpoint = this.getDefaultEndpoint();
    let fullPath = `/${merged.service_name}/${merged.version}`;
    if (merged.account_id !== '0') {
      fullPath = `${fullPath}/${merged.account_id}`;
    }
    if (Object.prototype.hasOwnProperty.call(merged, 'path')) {
      fullPath = `${fullPath}${merged.path}`;
    }
    if (queryParams.length > 0) {
      fullPath = `${fullPath}?${queryParams}`;
    }
    const endpoint: EndPointResponse = await this.getEndpoint(merged)
      .then(serviceURI => ({ host: `https://${serviceURI.data[merged.service_name]}`, path: fullPath }))
      .catch(() => ({ host: `https://${defaultEndpoint.global}`, path: fullPath }));
    return endpoint;
  }

  /**
   * Return Cache, or Call for updated data
   */
  async fetch(params: APIRequestParams) {
    const uri = await this.createURI(params);
    let testCache = this.cache.get(uri.path);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    if (params.accept_header) {
      xhr.defaults.headers.Accept = params.accept_header;
    }
    if (params.response_type) {
      xhr.defaults.responseType = params.response_type;
    }
    let originalDataResponse = null;
    if (!testCache) {
      await xhr.get(uri.path)
        .then((response) => {
          originalDataResponse = response.data;
          this.cache.put(uri.path, response.data, params.ttl);
        });
    }
    testCache = this.cache.get(uri.path);
    return testCache ? testCache : originalDataResponse;
  }

  /**
   * Post for new data
   */
  async post(params: APIRequestParams) {
    const uri = await this.createURI(params);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = this.getToken();
    this.cache.del(uri.path);
    return await xhr.post(uri.path, params.data)
      .then(response => response.data);
  }

  /**
   * Put for updated data
   */
  async set(params: APIRequestParams) {
    const uri = await this.createURI(params);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = this.getToken();
    this.cache.del(uri.path);
    return await xhr.put(uri.path, params.data)
      .then(response => response.data);
  }

  /**
   * Delete data
   */
  async delete(params: APIRequestParams) {
    const uri = await this.createURI(params);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = this.getToken();
    this.cache.del(uri.path);
    return await xhr.delete(uri.path)
      .then(response => response.data);
  }

  /**
   * Use HTTP Basic Auth
   * Optionally supply an mfa code if the user account is enrolled for Multi-Factor Authentication
   */
  async authenticate(params: APIRequestParams, user: string, pass: string, mfa?) {
    const uri = await this.createURI(params);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common.Authorization = `Basic ${btoa(unescape(encodeURIComponent(`${user}:${pass}`)))}`;
    let mfaCode = '';
    if (mfa) {
      mfaCode = `{ "mfa_code": "${mfa}" }`;
    }
    await xhr.post(uri.path, mfaCode)
      .then((res) => {
        this.setAuthentication(res.data.authentication);
        if (this.getActive().id === '0') {
          this.setActive(res.data.authentication.account);
        }
      });
    return this.getAuthentication();
  }

  /**
   * Authenticate with an mfa code and a temporary session token.
   * Used when a user inputs correct username:password but does not include mfa code when they are enrolled for Multi-Factor Authentication
   * The session token can be used to complete authentication without re-entering the username and password, but must be used within 3 minutes (token expires)
   */
  async authenticateWithMFASessionToken(params: APIRequestParams, token: string, mfa: string) {
    const uri = await this.createURI(params);
    const xhr = this.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Session-Token'] = token;
    const mfaCode = `{ "mfa_code": "${mfa}" }`;
    await xhr.post(uri.path, mfaCode)
      .then((res) => {
        this.setAuthentication(res.data.authentication);
        if (this.getActive().id === '0') {
          this.setActive(res.data.authentication.account);
        }
      });
    return this.getAuthentication();
  }
}

export const alClient =  new ALClient();
