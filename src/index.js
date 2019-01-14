/**
 * Module to deal with discovering available endpoints
 */
const axios = require('axios');
const Cache = require('cache');
const btoa = require('btoa');
const qs = require('qs');
const ALSession = require('@alertlogic/session');

const ALClient = function ALClient() {
  /**
   * Hide internals from export
   */
  const self = this;

  /**
   * Are we running in a browser?
   */
  self.isBrowserBased = function isBrowserBased() {
    if (typeof window === 'undefined') {
      return false;
    }
    return true;
  };

  /**
   * Expose ALSession to higher level consumers
   */
  self.ALSession = ALSession;

  self.setAuthentication = function setAuthentication(proposal) {
    self.ALSession.setAuthentication(proposal);
    return self.getAuthentication();
  };

  self.getAuthentication = function getAuthentication() {
    return self.ALSession.getAuthentication();
  };

  self.setActive = function setActive(proposal) {
    self.ALSession.setActive(proposal);
    self.ALSession.activateSession();
    return self.getActive();
  };

  self.getActive = function getActive() {
    return self.ALSession.getActive();
  };

  self.deactivateSession = function deactivateSession() {
    return self.ALSession.deactivateSession();
  };

  self.isActive = function isActive() {
    return self.ALSession.isActive();
  };

  self.getToken = function getToken() {
    return self.ALSession.getToken();
  };

  /**
   * Create a default Discovery Response for Global Stack
   */
  self.getDefaultEndpoint = function getDefaultEndpoint() {
    let response = { global: 'api.global-services.global.alertlogic.com' };
    if (self.isBrowserBased()) {
      /**
       * Do some machinations to find out if we are in Production or Integration
       */
      // eslint-disable-next-line no-undef
      let tld = window.location.hostname;
      tld = tld.toString();
      if (tld.match('/product.dev/gi') !== null || tld === 'localhost') {
        response = { global: 'api.global-integration.product.dev.alertlogic.com' };
      }
    }
    const endpoint = new Promise(
      // eslint-disable-next-line no-unused-vars
      (resolve, _reject) => setTimeout(() => resolve(response, 100)),
    );
    return endpoint;
  };

  /**
   * Service specific fallback params
   * ttl is 1 minute by default, consumers can set cache duration in requests
   */
  self.defaultParams = {
    account_id: '0',
    // ("us" or "emea" or "default")
    residency: 'default',
    service_name: 'aims',
    // ("api" or "ui")
    endpoint_type: 'api',
    version: 'v1',
    query: {},
    data: {},
    path: '',
    params: {},
    ttl: 60000,
  };

  /**
   * Ensure that the params object is always fully populated for URL construction
   */
  self.mergeParams = function mergeParams(params) {
    const keys = Object.keys(self.defaultParams);
    const merged = {};
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        merged[key] = params[key];
      } else {
        merged[key] = self.defaultParams[key];
      }
    });
    return merged;
  };

  /**
   * Instantiate a properly configured axios client for services
   */
  self.axiosInstance = function axiosInstance() {
    return axios.create({
      baseURL: self.getDefaultEndpoint().global,
      timeout: 5000,
      withCredentials: false,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-AIMS-Auth-Token': self.ALSession.getToken(),
      },
    });
  };

  /**
   * Get endpoint
   * GET
   * /endpoints/v1/:account_id/residency/:residency/services/:service_name/endpoint/:endpoint_type
   * https://api.global-services.global.alertlogic.com/endpoints/v1/01000001/residency/default/services/incidents/endpoint/ui
   */
  self.getEndpoint = async function getEndpoint(params) {
    const merged = self.mergeParams(params);
    const defaultEndpoint = await self.getDefaultEndpoint();
    const uri = `/endpoints/${merged.version}/${merged.account_id}/residency/${merged.residency}/services/${merged.service_name}/endpoint/${merged.endpoint_type}`;
    const xhr = self.axiosInstance();
    xhr.defaults.baseURL = `https://${defaultEndpoint.global}`;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = self.getToken();
    const endpoint = await xhr.get(uri);
    return endpoint;
  };

  self.cache = new Cache(60000);

  self.createURI = async function createURI(params) {
    const merged = self.mergeParams(params);
    const queryParams = qs.stringify(merged.params);
    const defaultEndpoint = await self.getDefaultEndpoint();
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
    const endpoint = await self.getEndpoint(merged)
      .then(serviceURI => ({ host: `https://${serviceURI.data[merged.service_name]}`, path: fullPath }))
      // eslint-disable-next-line no-unused-vars
      .catch(_err => ({ host: `https://${defaultEndpoint.global}`, path: fullPath }));
    return endpoint;
  };

  /**
   * Return Cache, or Call for updated data
   */
  self.Fetch = async function Fetch(params) {
    const uri = await self.createURI(params);
    const testCache = self.cache.get(uri.path);
    const xhr = self.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = self.getToken();
    if (!testCache) {
      await xhr.get(uri.path)
        .then((response) => {
          self.cache.put(uri.path, response.data, params.ttl);
        })
        .catch((_err) => {
          /**
           * Log self to help users diagnose call failures
           */
          // eslint-disable-next-line no-console
          console.log(_err);
          return _err.response.data.error;
        });
    }
    return self.cache.get(uri.path);
  };

  /**
   * Post for new data
   */
  self.Post = async function Post(params) {
    const uri = await self.createURI(params);
    const xhr = self.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = self.getToken();
    self.cache.del(uri.path);
    await xhr.post(uri.path, params.data)
      .then(response => response.data)
      .catch((_err) => {
        /**
         * Log self to help users diagnose call failures
         */
        // eslint-disable-next-line no-console
        console.log(_err);
        return _err.response.data.error;
      });
  };

  /**
   * Put for updated data
   */
  self.Set = async function Set(params) {
    const uri = await self.createURI(params);
    const xhr = self.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = self.getToken();
    self.cache.del(uri.path);
    await xhr.put(uri.path, params.data)
      .then(response => response.data)
      .catch((_err) => {
        /**
         * Log self to help users diagnose call failures
         */
        // eslint-disable-next-line no-console
        console.log(_err);
        return _err.response.data.error;
      });
  };

  /**
   * Delete data
   */
  self.Delete = async function Delete(params) {
    const uri = await self.createURI(params);
    const xhr = self.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common['X-AIMS-Auth-Token'] = self.getToken();
    self.cache.del(uri.path);
    await xhr.delete(uri.path)
      .then(response => response.data)
      .catch((_err) => {
        /**
         * Log self to help users diagnose call failures
         */
        // eslint-disable-next-line no-console
        console.log(_err);
        return _err.response.data.error;
      });
  };

  /**
   * Use HTTP Basic Auth
   */
  self.Authenticate = async function Authenticate(params, user, pass, mfa) {
    const uri = await self.createURI(params);
    const xhr = self.axiosInstance();
    xhr.defaults.baseURL = uri.host;
    xhr.defaults.headers.common.Authorization = `Basic ${btoa(unescape(encodeURIComponent(`${user}:${pass}`)))}`;
    let mfaCode = '';
    if (mfa) {
      mfaCode = `{ "mfa_code": "${mfa}" }`;
    }
    await xhr.post(uri.path, mfaCode)
      .then((res) => {
        self.setAuthentication(res.data.authentication);
        if (self.getActive().id === '0') {
          self.setActive(res.data.authentication.account);
        }
      })
      .catch((_err) => {
        /**
         * Log self to help users diagnose call failures
         */
        // eslint-disable-next-line no-console
        console.log(_err.response.data.error);
        return _err.response.data.error;
      });
    return self.isActive();
  };
};

module.exports = ALClient;
