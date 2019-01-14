let ALClient = require('./src/index.js');

ALClient = new ALClient();

module.exports = {
  setAuthentication: ALClient.setAuthentication,
  getAuthentication: ALClient.getAuthentication,
  setActive: ALClient.setActive,
  getActive: ALClient.getActive,
  deactivateSession: ALClient.deactivateSession,
  isActive: ALClient.isActive,
  getToken: ALClient.getToken,
  Fetch: ALClient.Fetch,
  Post: ALClient.Post,
  Set: ALClient.Set,
  Delete: ALClient.Delete,
  Authenticate: ALClient.Authenticate,
};
