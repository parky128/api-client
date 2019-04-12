  @al/client
=========

A client to support higher order client interfaces.

This library uses axios as its HTTP provider interface.

This library uses cache to provide transparent persistent storage to consumers.

Disclaimer
---
Until the release of version 1.0.0 all current minor version increments may be backwards incompatible. Please bear this in mind when developing against this library. Should you have any further questions, please do not hesitate to contact us as [npm@alertlogic.com](mailto:npm@alertlogic.com)

Installation
---
      npm install @al/client --save

Note that this client library has [@al/session](https://github.com/alertlogic/session-client) as a `peerDependency` so make sure you have this installed in your consuming application you are writing.

Usage
---

For commonjs environments, e.g nodejs:

      var ALClient = require('@al/client').ALClient;

For ES2015 environments, e.g. TypeScript based frameworks such as Angular:

      import { ALClient } from '@al/client';

Methods
---
**authenticate**

Log in to AIMS and establish a Session.

      ALClient.authenticate(username, password, mfa_code);

**authenticateWithMFASessionToken**

Authenticate with an mfa code and a temporary session token.

      ALClient.authenticateWithMFASessionToken(token, mfa_code);

**getEndpoint**

Return the current API or UI endpoint (FQDN) for the provided account ID, residency, service, and endpoint type.

      ALClient.getEndpoint(params);
        params: {
          account_id: '0',
          // ("us" or "emea" or "default")
          residency: 'default',
          service_name: 'aims',
          // ("api" or "ui")
          endpoint_type: 'api',
          path: '',
          query: {},
          data: {},
        }
    
**fetch**

GET data from an Alert Logic API

      ALClient.fetch(params)
        params: {
          service_name: 'aims',
          path: '/token_info',
        }

GET data from an Alert Logic API in a different response format e.g. CSV file download

      ALClient.fetch(params)
        params: {
          service_name: 'aims',
          path: '/token_info',
          accept_header: 'text/csv',
          response_type: 'blob'
        }

**post**

POST data to an Alert Logic API

      ALClient.post(params)
        params: {
          service_name: 'aims',
          path: '/change_password',
          // Data can be a String or Object
          data: {"email": "admin@company.com", "current_password": "hunter2", "new_password": "Fraudulent$Foes"}
        }

**set**

PUT data to an Alert Logic API

      ALClient.set(params)
        params: {
          service_name: 'aims',
          path: '/reset_password/:token',
          // Data can be a String or Object
          data: {"password": "hunter2"}
        }

**delete**

DELETE data from an Alert Logic API

      ALClient.delete(params)
        params: {
          account_id: '1234'
          service_name: 'aims',
          path: '/roles/:role_id',
        }

## Interactive

  Loads the library into memory and stays in an interactive node shell.
  
      npm run interactive

## Tests

      npm test

or to watch for code changes and re-run tests:

      npm test-watch

An auto-generated `coverage` directory will be produced which will contain a browsable HTML report

## Contributing

The sources are written in Typescript and follow the tslint [airbnb](https://www.npmjs.com/package/tslint-config-airbnb) style.

## Building

To generate a production build

    npm run build

To generate a development build for local testing - non minified, concatenated only

    npm run build-dev

Builds will be be generated into a `dist` folder and will contain commonjs and umd bundles that will be consumed depending on the module system in whichever environment you are using.

