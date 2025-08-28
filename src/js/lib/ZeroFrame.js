/**
 * Modern ZeroFrame implementation with improved error handling and TypeScript-like structure
 */

const CMD_INNER_READY = 'innerReady';
const CMD_RESPONSE = 'response';
const CMD_WRAPPER_READY = 'wrapperReady';
const CMD_PING = 'ping';
const CMD_PONG = 'pong';
const CMD_WRAPPER_OPENED_WEBSOCKET = 'wrapperOpenedWebsocket';
const CMD_WRAPPER_CLOSE_WEBSOCKET = 'wrapperClosedWebsocket';

export class ZeroFrame {
  constructor(url) {
    this.url = url;
    this.waitingCallbacks = new Map();
    this.wrapperNonce = this.extractWrapperNonce();
    this.nextMessageId = 1;
    this.isConnected = false;
    
    this.connect();
    this.init();
  }

  extractWrapperNonce() {
    const match = document.location.href.match(/wrapper_nonce=([A-Za-z0-9]+)/);
    return match ? match[1] : '';
  }

  init() {
    return this;
  }

  connect() {
    this.target = window.parent;
    window.addEventListener('message', (e) => this.onMessage(e), false);
    this.cmd(CMD_INNER_READY);
  }

  onMessage(event) {
    const message = event.data;
    const { cmd } = message;

    switch (cmd) {
      case CMD_RESPONSE:
        this.handleResponse(message);
        break;
      case CMD_WRAPPER_READY:
        this.cmd(CMD_INNER_READY);
        this.isConnected = true;
        break;
      case CMD_PING:
        this.response(message.id, CMD_PONG);
        break;
      case CMD_WRAPPER_OPENED_WEBSOCKET:
        this.onOpenWebsocket();
        break;
      case CMD_WRAPPER_CLOSE_WEBSOCKET:
        this.onCloseWebsocket();
        break;
      default:
        this.onRequest(cmd, message);
    }
  }

  handleResponse(message) {
    const callback = this.waitingCallbacks.get(message.to);
    if (callback) {
      this.waitingCallbacks.delete(message.to);
      callback(message.result);
    } else {
      this.log('Callback not found for message:', message);
    }
  }

  onRequest(cmd, message) {
    this.log('Unknown request:', message);
  }

  response(to, result) {
    this.send({
      cmd: CMD_RESPONSE,
      to,
      result
    });
  }

  cmd(cmd, params = {}, callback = null) {
    return new Promise((resolve, reject) => {
      const message = {
        cmd,
        params
      };

      const wrappedCallback = (result) => {
        if (callback) callback(result);
        resolve(result);
      };

      this.send(message, wrappedCallback);
    });
  }

  send(message, callback = null) {
    message.wrapper_nonce = this.wrapperNonce;
    message.id = this.nextMessageId++;
    
    this.target.postMessage(message, '*');
    
    if (callback) {
      this.waitingCallbacks.set(message.id, callback);
    }
  }

  log(...args) {
    console.log('[ZeroFrame]', ...args);
  }

  onOpenWebsocket() {
    this.log('Websocket opened');
  }

  onCloseWebsocket() {
    this.log('Websocket closed');
  }
}