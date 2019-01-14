/* eslint-disable no-undef */
/* eslint-disable no-new-require */
/* eslint-disable no-unused-vars */
const should = require('chai').should();
const ALClient = require('../index.js');

describe('#FailAuthentication', () => {
  it('should fail authentication', async () => {
    const checkAuth = await ALClient.Authenticate({ service_name: 'aims', path: '/authenticate' }, 'bob@bob.com', 'IAmNotAUser!@#$', '');
    checkAuth.should.equal(false);
  });
});
