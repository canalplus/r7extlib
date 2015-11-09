'use strict';

import Router from './router.js';

/**
 * Sandbox options for iframe
 * @type {String}
 */
var SANDBOX = 'allow-scripts allow-same-origin allow-forms';

/**
 * Delay for a remote service to load
 * @type {Number}
 */
var READY_DELAY = 45 * 1000;

/**
 * Default style properties for iframe
 */
var IFRAME_STYLE = {
  display: 'none',
  width: '1280px',
  height: '720px',
  border: '0',
};

var parseUri = (str) => {
  let parser = document.createElement('a');
  parser.href = str;

  let uParser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  let qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;
  let keys = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host',
    'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor',
  ];

  let u = {};
  let i = keys.length;
  let m = uParser.exec(parser.href);
  while (i--) {
    u[keys[i]] = m[i] || '';
  }

  u.queryKey = {};
  u.query.replace(qParser, ($0, $1, $2) => {
    if ($1) { u.queryKey[$1] = $2; }
  });

  return u;
};

export default class R7IFrame {
  constructor(options) {
    let url = options.url;

    if (!this.iframe) {
      this.iframe = document.createElement('iframe');
      this.iframe.sandbox = SANDBOX;
      this.iframe.src = url;

      let style = Object.assign({}, IFRAME_STYLE, options.style);
      for (let property in style) {
        this.iframe.style[property] = style[property];
      }
    }

    this.el = options.el || document.body;

    var parsed = parseUri(url);
    var origin = parsed.protocol + '://' + parsed.authority;

    this.router = new Router(this.iframe, origin);
  }

  load(callback, context) {
    callback = callback.bind(context);

    if (!this.iframe.dataset.loaded) {
      if (this.timeout) {clearTimeout(this.timeout);}

      this.timeout =
        setTimeout(this.onTimeoutExpired.bind(this, callback), READY_DELAY);
      window.addEventListener('message', this.router, false);
      this.iframe.addEventListener('load', () => {
        this.loaded(callback);
      }, false);
      this.el.appendChild(this.iframe);
    }
  }

  loaded(callback) {
    this.iframe.removeEventListener('load', this._loaded, false);
    this.iframe.dataset.loaded = 'loaded';

    this.router.use('ready', () => {
      clearTimeout(this.timeout);
      this.router.unuse('ready');
      this.iframe.style.display = 'block';
      callback();
    });
  }

  onTimeoutExpired(callback) {
    callback(new Error('iframe: timeout expired'));
  }

  unload() {
    if (this.timeout) { clearTimeout(this.timeout); }

    this.el.removeChild(this.iframe);
    window.removeEventListener('message', this.router, false);
    this.iframe.removeEventListener('load', this._loaded, false);
    delete this.router;
    delete this._loaded;
  }

  use(action, fn, ctx) {
    this.router.use(action, fn, ctx);
  }

  onKeyBack() {
    return !!this.router.onKeyBack;
  }

  goBack() {
    return this.router.onKeyBack();
  }

  onKeyExit() {
    return !!this.router.onKeyExit;
  }

  resume() {
    return this.router.resume();
  }
}
