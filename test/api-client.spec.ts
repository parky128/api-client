import { ALClient } from '../src/index';
import { expect } from 'chai';
import { describe, before } from 'mocha';
import xhrMock, { once } from 'xhr-mock';
import * as qs from 'qs';

const defaultAuthResponse = {
  authentication: {
    user: {
      id: '715A4EC0-9833-4D6E-9C03-A537E3F98D23',
      name: 'Bob Dobalina',
      email: 'bob@company.com',
      active: true,
      locked: false,
      version: 1,
      created: {
        at: 1430183768,
        by: 'System',
      },
      modified: {
        at: 1430183768,
        by: 'System',
      },
    },
    account: {
      id: '12345678',
      name: 'Company Name',
      active: true,
      version: 1,
      accessible_locations: ['insight-us-virginia'],
      default_location: 'insight-us-virginia',
      created: {
        by: 'system',
        at: 1436482061,
      },
      modified: {
        by: 'system',
        at: 1436482061,
      },
    },
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9==.QKRHma5zAOdhU50ZE4ryPxVpvKt0A0gbjY62xHCWm8s=',
    token_expiration: + new Date() + 1000,
  },
};

beforeEach(() => xhrMock.setup());
afterEach(() => xhrMock.teardown());

describe('When determining an endpoint for a given service', () => {
  it('should return the resolved endpoint from the service', async () => {
    const serviceName = 'cargo';
    const responseBody = {};
    responseBody[serviceName] = 'blaaa';
    xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/cargo/endpoint/api', {
      status: 200,
      body: JSON.stringify(responseBody),
    });
    const endpoint = await ALClient.getEndpoint({ service_name: serviceName });
    expect(endpoint.data).to.deep.equals(responseBody);
  });
});

describe('When creating a URI for a given service ', () => {
  describe('with no params supplied', () => {
    it('should fallback to request and returning the endpoint for the AIMS service', async () => {
      const serviceName = 'aims';
      const serviceEndpoint = 'api.global-integration.product.dev.alertlogic.com';
      const responseBody = {};
      responseBody[serviceName] = serviceEndpoint;
      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/${serviceName}/endpoint/api`, {
        status: 200,
        body: JSON.stringify(responseBody),
      });
      const endpoint = await ALClient.createURI({});
      expect(endpoint).to.deep.equals({
        host: `https://${serviceEndpoint}`,
        path: `/${serviceName}/v1`,
      });
    });
  });
  describe('with a service name, account_id and query params supplied', () => {
    it('should return an endpoint response containing a correctly constructed path', async () => {
      const serviceName = 'cargo';
      const queryParams = { foo: 'bar' };
      const accountID = 2;
      const serviceEndpoint = 'api.global-integration.product.dev.alertlogic.com';
      const responseBody = {};
      responseBody[serviceName] = serviceEndpoint;
      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/${accountID}/residency/default/services/${serviceName}/endpoint/api`, {
        status: 200,
        body: JSON.stringify(responseBody),
      });
      const endpoint = await ALClient.createURI({ service_name: serviceName, account_id: accountID, params: queryParams });
      expect(endpoint).to.deep.equals({
        host: `https://${serviceEndpoint}`,
        path: `/${serviceName}/v1/${accountID}?${qs.stringify(queryParams)}`,
      });
    });
  });
  describe('and an exception is thrown from the backend service', () => {
    it('should return an endpoint response containing the default global endpoint', async () => {
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/aims/endpoint/api', {
        status: 500,
        body: '',
      });
      const endpoint = await ALClient.createURI({});
      expect(endpoint).to.deep.equals({
        host: 'https://api.global-integration.product.dev.alertlogic.com',
        path: '/aims/v1',
      });
    });
  });
});

describe('When performing a fetch operation', () => {
  let response;
  const initialApiResponse = 'first response';
  beforeEach(() => {
    // mock out endpoints call first
    const serviceName = 'aims';
    const serviceEndpoint = 'api.global-integration.product.dev.alertlogic.com';
    const responseBody = {};
    responseBody[serviceName] = serviceEndpoint;
    xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/${serviceName}/endpoint/api`, {
      status: 200,
      body: JSON.stringify(responseBody),
    });

    xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1', once({
      status: 200,
      body: initialApiResponse,
    }));
  });
  describe('and the response has not yet been cached', () => {
    it('should return the actual response', async () => {
      response = await ALClient.fetch({ });
      expect(response).to.equal(initialApiResponse);
    });
  });
  describe('and the response has already been cached', () => {
    it('should return the previous cached response', async () => {
      // Here we mock out a second response from back end...
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1', once({
        status: 200,
        body: 'second response',
      }));
      response = await ALClient.fetch({});
      expect(response).to.equal(initialApiResponse);
    });
  });
});

describe('When authenticating a user with credentials', () => {
  const params = {
    service_name: 'aims',
    path: '/authenticate',
  };
  const username = 'bob@email.com';
  const password = 'IAmNotAValidUser!@#$';
  const mfaCode = '123456';
  beforeEach(() => {
    // mock out endpoints call first
    const serviceName = 'aims';
    const serviceEndpoint = 'api.global-integration.product.dev.alertlogic.com';
    const responseBody = {};
    responseBody[serviceName] = serviceEndpoint;
    xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/${serviceName}/endpoint/api`, {
      status: 200,
      body: JSON.stringify(responseBody),
    });
  });
  describe('but without supplying an mfa code', () => {
    it('should perform the authenticate request and set underlying session details using the response returned', async() => {
      xhrMock.post('https://api.global-integration.product.dev.alertlogic.com/aims/v1/authenticate', (req, res) => {
        expect(req.header('Authorization')).to.equal(`Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`);
        expect(req.body()).to.equal('');
        return res.status(200).body(defaultAuthResponse);
      });
      await ALClient.authenticate(params, username, password);
      expect(ALClient.getAuthentication().user).to.deep.equals(defaultAuthResponse.authentication.user);
    });
  });
  describe('and an mfa code supplied', () => {
    it('should perform the authenticate request and include an mfa_code request body parameter', async() => {
      xhrMock.post('https://api.global-integration.product.dev.alertlogic.com/aims/v1/authenticate', (req, res) => {
        expect(req.header('Authorization')).to.equal(`Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`);
        expect(req.body()).to.equal(`{ "mfa_code": "${mfaCode}" }`);
        return res.status(200).body(defaultAuthResponse);
      });
      await ALClient.authenticate(params, username, password, mfaCode);
      expect(ALClient.getAuthentication().user).to.deep.equals(defaultAuthResponse.authentication.user);
    });
  });
});

describe('When authenticating a user with a session token and mfa code', () => {
  const params = {
    service_name: 'aims',
    path: '/authenticate',
  };
  const sessionToken = 'Ses1ion.Tok3n==';
  const mfaCode = '123456';
  beforeEach(() => {
    // mock out endpoints call first
    const serviceName = 'aims';
    const serviceEndpoint = 'api.global-integration.product.dev.alertlogic.com';
    const responseBody = {};
    responseBody[serviceName] = serviceEndpoint;
    xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/${serviceName}/endpoint/api`, {
      status: 200,
      body: JSON.stringify(responseBody),
    });
  });
  it('should perform the authenticate request using the session token as a header and mfa code as a body param', async() => {
    xhrMock.post('https://api.global-integration.product.dev.alertlogic.com/aims/v1/authenticate', (req, res) => {
      expect(req.header('X-AIMS-Session-Token')).to.equal(sessionToken);
      expect(req.body()).to.equal(`{ "mfa_code": "${mfaCode}" }`);
      return res.status(200).body(defaultAuthResponse);
    });
    await ALClient.authenticateWithToken(params, sessionToken, mfaCode);
  });
});
