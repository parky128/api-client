import { ALClient, APIRequestParams } from '../src/index';
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

describe('when determining an endpoint for a given service', () => {
  it('should return the resolved endpoint from the service', async () => {
    const serviceName = 'cargo';
    const responseBody = {
      cargo: 'api.global-integration.product.dev.alertlogic.com'
    };
    xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/cargo/endpoint/api', {
      status: 200,
      body: JSON.stringify(responseBody),
    });
    const endpoint = await ALClient.getEndpoint({ service_name: serviceName });
    expect(endpoint.data).to.deep.equals(responseBody);
  });
});

describe('when calculating an endpoint URI', () => {
  describe('with no params supplied', () => {
    it('should throw an error', async () => {
      let result = await ALClient.calculateEndpointURI( {} )
          .then( r => {
            expect( false ).to.equal( true );       //  this should never occur
          } ).catch( e => {
            expect(true).to.equal( true );
          } );
    } );
  });
  describe('with parameters', () => {
    it('should return targets with correct hosts and paths', async () => {
      const serviceEndpointHost = 'api.global-integration.product.dev.alertlogic.com';
      const responseBody = {
        'kevin': 'kevin.product.dev.alertlogic.com',
        'cargo': serviceEndpointHost,
        'search': 'api.global-fake-integration.product.dev.alertlogic.com',
        'aims': serviceEndpointHost
      };
      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/2/residency/default/services/cargo/endpoint/api`, {
        status: 200,
        body: JSON.stringify(responseBody)
      });

      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/12345678/residency/default/services/kevin/endpoint/api`, {
        status: 200,
        body: JSON.stringify(responseBody)
      });

      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/aims/endpoint/api`, {
        status: 200,
        body: JSON.stringify(responseBody)
      });

      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/67108880/residency/default/services/aims/endpoint/api`, {
        status: 200,
        body: JSON.stringify( responseBody )
      } );

      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/67108880/residency/default/services/cargo/endpoint/api`, {
        status: 200,
        body: JSON.stringify( responseBody )
      } );

      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/search/endpoint/api`, {
        status: 200,
        body: JSON.stringify( responseBody )
      } );

      xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/2/residency/default/services/search/endpoint/api`, {
        status: 200,
        body: JSON.stringify( responseBody )
      } );

      let endpoint = await ALClient.calculateEndpointURI({ service_name: 'cargo' });
      expect(endpoint.host).to.equal( serviceEndpointHost );
      expect(endpoint.path).to.equal( `/cargo` );                //  path should default to /:service_name/v1, no trailing slash

      endpoint = await ALClient.calculateEndpointURI( { service_name: 'aims', version: 'v4' } );
      expect(endpoint.host).to.equal( serviceEndpointHost );
      expect(endpoint.path).to.equal( `/aims/v4` );                 //  path should be /:service_name/:version, no trailing slash

      endpoint = await ALClient.calculateEndpointURI( { service_name: 'cargo', version: 'v2', account_id: '67108880' } );
      expect( endpoint.host ).to.equal( serviceEndpointHost );
      expect( endpoint.path ).to.equal( `/cargo/v2/67108880` );      //  path should be /:service_name/:version/:accountId, no trailing slash

      endpoint = await ALClient.calculateEndpointURI( { service_name: 'search', version: 'v1', path: 'global-capabilities' } );
      expect( endpoint.host ).to.equal( `api.global-fake-integration.product.dev.alertlogic.com` );     //  domain should be non-default
      expect( endpoint.path ).to.equal( `/search/v1/global-capabilities` );                                     //  path should be /:service_name/:version/:path

      endpoint = await ALClient.calculateEndpointURI( { service_name: 'aims', version: 'v100', account_id: '67108880', path: '/some/arbitrary/path/' } );
      expect( endpoint.host ).to.equal( serviceEndpointHost );
      expect( endpoint.path ).to.equal( `/aims/v100/67108880/some/arbitrary/path/` );       //  path should be /:service_name/:version/:accountId, trailing slash ONLY because it is included in path, but no double slash from the slash at the beginning of `path`

      endpoint = await ALClient.calculateEndpointURI( { service_name: 'search', version: 2, account_id: '2', path: '/some/endpoint', params: { a: 1, b: 2, c: 3 } } );
      expect( endpoint.host ).to.equal( `api.global-fake-integration.product.dev.alertlogic.com` );
      expect( endpoint.path ).to.equal( `/search/v2/2/some/endpoint` );                     //  query params should not be applied by this stage -- axios serializes them and dispatches them during the actual request execution

      ALClient.defaultAccountId = "12345678";
      endpoint = await ALClient.calculateEndpointURI( { service_name: 'kevin', version: 16, path: 'some/arbitrary/endpoint' } );
      expect( endpoint.host ).to.equal( `kevin.product.dev.alertlogic.com` );
      expect( endpoint.path ).to.equal( `/kevin/v16/some/arbitrary/endpoint` );
      ALClient.defaultAccountId = null;

    });
  });
  describe('and an exception is thrown from the backend service', () => {
    it('should return an endpoint response containing the default global endpoint', async () => {
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/0/residency/default/services/aims/endpoint/api', {
        status: 500,
        body: '',
      });
      const endpoint = await ALClient.calculateEndpointURI({ service_name: 'aims', version: 1 });
      expect(endpoint.host).to.equal( 'api.global-integration.product.dev.alertlogic.com' );
      expect( endpoint.path ).to.equal( '/aims/v1' );
    });
  });
});

describe('When performing two fetch operations', () => {
  beforeEach(() => {
    // mock out endpoints call first
    const serviceEndpointHost = 'api.global-integration.product.dev.alertlogic.com';
    const responseBody = {
      aims: serviceEndpointHost
    };
    xhrMock.get(`https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/2/residency/default/services/aims/endpoint/api`, {
      status: 200,
      body: JSON.stringify(responseBody),
    });
  });

  describe(' with the TTL overridden zero ms', () => {
    it('should return fresh data without caching', async () => {
      // Here we mock out a second response from back end...
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1/2/users', once({
        status: 200,
        body: 'first response',
      }));
      await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '2', path: 'users' });                            //  fetch once
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1/2/users', once({
        status: 200,
        body: 'second response',
      }));
      let response = await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '2', path: 'users', ttl: 0 });     //  fetch again, TTL 0 to disable caching
      expect(response).to.equal('second response');
    });
  });
  describe('with no TTL override value supplied', () => {
    it('should return the first server response', async () => {
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1/2/users', once({
        status: 200,
        body: 'first response',
      }));
      await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '2', path: 'users', ttl: 60000 });
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1/2/users', once({
        status: 200,
        body: 'second response',
      }));
      let response = await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '2', path: 'users' });
      expect(response).to.equal('first response');
    });
  });
  describe('with query params supplied', () => {
    it('should return the first server response', async () => {
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1/2/users?foo=bar', once({
        status: 200,
        body: 'first response',
      }));
      await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '2', path: 'users', params: {foo: 'bar'} });
      xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/aims/v1/2/users?foo=bar', once({
        status: 200,
        body: 'second response',
      }));
      let response = await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '2', path: 'users' , params: {foo: 'bar'}});
      expect(response).to.equal('first response');
    });
  });
});

describe('When authenticating a user with credentials', () => {
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
  xdescribe('but without supplying an mfa code', () => {
    it('should perform the authenticate request and set underlying session details using the response returned', async() => {
      xhrMock.post('https://api.global-integration.product.dev.alertlogic.com/aims/v1/authenticate', (req, res) => {
        expect(req.header('Authorization')).to.equal(`Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`);
        expect(req.body()).to.equal('');
        return res.status(200).body(defaultAuthResponse);
      });
      await ALClient.authenticate(username, password);
        //      expect(ALClient.getAuthentication().user).to.deep.equals(defaultAuthResponse.authentication.user);
    });
  });
  xdescribe('and an mfa code supplied', () => {
    it('should perform the authenticate request and include an mfa_code request body parameter', async() => {
      xhrMock.post('https://api.global-integration.product.dev.alertlogic.com/aims/v1/authenticate', (req, res) => {
        expect(req.header('Authorization')).to.equal(`Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`);
        expect(JSON.parse(req.body())).to.deep.equals({mfa_code: mfaCode});
        return res.status(200).body(defaultAuthResponse);
      });
      await ALClient.authenticate(username, password, mfaCode);
        // expect(ALClient.getAuthentication().user).to.deep.equals(defaultAuthResponse.authentication.user);
    });
  });
});

describe('When authenticating a user with a session token and mfa code', () => {
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
      expect(JSON.parse(req.body())).to.deep.equals({ mfa_code: mfaCode });
      return res.status(200).body(defaultAuthResponse);
    });
    await ALClient.authenticateWithMFASessionToken(sessionToken, mfaCode);
  });
});

describe('retry logic', () => {
  it( 'should detect the difference between retryable and non-retryable errors', () => {
    const config:APIRequestParams = {
        retry_count: 10
    };
    expect( ALClient.isRetryableError( { data: {}, status: 500, statusText: "Something", config: {}, headers: {} }, config, 0 ) ).to.equal( true );
    expect( ALClient.isRetryableError( { data: {}, status: 503, statusText: "Something", config: {}, headers: {} }, config, 0  ) ).to.equal( true );
    expect( ALClient.isRetryableError( { data: {}, status: 302, statusText: "Something", config: {}, headers: {} }, config, 0  ) ).to.equal( true );
    expect( ALClient.isRetryableError( { data: {}, status: 0, statusText: "Something", config: {}, headers: {} }, config, 0  ) ).to.equal( true );
    expect( ALClient.isRetryableError( { data: {}, status: 0, statusText: "Something", config: {}, headers: {} }, config, 10  ) ).to.equal( false );
    expect( ALClient.isRetryableError( { data: {}, status: 204, statusText: "Something", config: {}, headers: {} }, config, 0  ) ).to.equal( false );
    expect( ALClient.isRetryableError( { data: {}, status: 404, statusText: "Something", config: {}, headers: {} }, config, 0  ) ).to.equal( false );
    expect( ALClient.isRetryableError( { data: {}, status: 403, statusText: "Something", config: {}, headers: {} }, config, 0  ) ).to.equal( false );
  } );
  it('should retry if retry_count is specified', async () => {
    xhrMock.reset();
    const serviceEndpointHost = 'api.global-integration.product.dev.alertlogic.com';
    const responseBody = {
      'aims': serviceEndpointHost
    };
    xhrMock.get('https://api.global-integration.product.dev.alertlogic.com/endpoints/v1/10101010/residency/default/services/aims/endpoint/api', {
      status: 200,
      body: JSON.stringify(responseBody),
    });
    // Here we mock out a second response from back end...
    xhrMock.get( new RegExp( "https://api.global\\-integration\\.product\\.dev\\.alertlogic\\.com\\/aims\\/v1\\/10101010\\/users.*", "i" ), once({
      status: 500,
      body: 'Unexpected result',
    }));
    xhrMock.get( new RegExp( "https://api.global\\-integration\\.product\\.dev\\.alertlogic\\.com\\/aims\\/v1\\/10101010\\/users.*", "i" ), once({
      status: 500,
      body: 'Unexpected result',
    }));
    xhrMock.get( new RegExp( "https://api.global\\-integration\\.product\\.dev\\.alertlogic\\.com\\/aims\\/v1\\/10101010\\/users.*", "i" ), once({
      status: 200,
      body: 'Final result',
    }));
    const result = await ALClient.fetch({ service_name: 'aims', version: 'v1', account_id: '10101010', path: 'users', retry_count: 3, retry_interval: 10 });                            //  fetch once
    expect( result ).to.equal( "Final result" );
  });
} );
