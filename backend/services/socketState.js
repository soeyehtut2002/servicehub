/**
 * socketState.js
 * Shared module to expose io + onlineUsers without circular imports.
 * server.js calls init() once after io is created.
 */

let _io         = null;
let _onlineUsers = null;

module.exports = {
  init(io, onlineUsers) {
    _io          = io;
    _onlineUsers = onlineUsers;
  },
  getIo()          { return _io; },
  getOnlineUsers() { return _onlineUsers; },
};
