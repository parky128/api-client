  @alertlogic/client
=========

A client to support higher order client interfaces.

This library uses axios as its HTTP provider interface.

This library uses cache to provide transparent persistent storage to consumers.

## Disclaimer

Until the release of version 1.0.0 all current minor version increments may be backwards incompatible. Please bear this in mind when developing against this library. Should you have any further questions, please do not hesitate to contact us as [npm@alertlogic.com](mailto:npm@alertlogic.com)

## Installation

      npm install @alertlogic/client --save

## Usage

      var ALClient = require('@alertlogic/client').ALClient; //commonjs - e.g. node
      import { ALClient } from '@alertlogic/client'; //ES2015 - e.g. Angular, TS projects

  Log in to AIMS and establish a Session.

      ALClient.Authenticate(params, username, password, mfa_code);
        params: {
          service_name: 'aims',
          path: '/authenticate'
        },
        username: 'bob@email.com',
        password: 'IAmNotAValidUser!@#$',
        mfa_code: '123456'
    
  Return the current API or UI endpoint (FQDN) for the provided account ID, residency, service, and endpoint type.

      ALClient.getEndpoint(params)
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
    
  Get authenticated user account details

      ALClient.getAuthentication();
    
  Get authenticated user active customer context

      ALClient.getActive();
    
  Test if a user is authenticated and active

      ALClient.isActive();
    
  Clear the active Session

      ALClient.deactivateSession();
    
  GET data from an Alert Logic API

      ALClient.Fetch(params)
        params: {
          service_name: 'aims',
          path: '/token_info',
        }
    
  POST data to an Alert Logic API

      ALClient.Post(params)
        params: {
          service_name: 'aims',
          path: '/change_password',
          // Data can be a String or Object
          data: {"email": "admin@company.com", "current_password": "hunter2", "new_password": "Fraudulent$Foes"}
        }
        
  PUT data to an Alert Logic API

      ALClient.Set(params)
        params: {
          service_name: 'aims',
          path: '/reset_password/:token',
          // Data can be a String or Object
          data: {"password": "hunter2"}
        }
    
  DELETE data from an Alert Logic API

      ALClient.Delete(params)
        params: {
          account_id: '1234'
          service_name: 'aims',
          path: '/roles/:role_id',
        }

## Interactive

  Loads the library into memory and stays in an interactive node shell.
  
      npm run interactive

## Tests

      npm run test
      npm run test-watch //keeps karma test server running, e.g. re-runs tests after code changes are made
  
  An auto-generated `coverage` directory will be produced which will contain a browsable HTML report

## Linting

      npm run lint

## Contributing

This repository follows the eslint airbnb style.

## Release History

* 0.1.0 Initial release
