(function(exports) {
  'use strict';

  var _ = require('lodash');
  var Q = require('q');

  /* Reserved -32000 to -32099 */
  var ERR_INVALID_REQUEST  = -32600;
  var ERR_INTERNAL         = -32603;

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

  _.parseUri = function(str) {
    var parser = document.createElement('a');
    parser.href = str;

    var uParser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
    var qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;
    var keys = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'];

    var u = {};
    var i = keys.length;
    var m = uParser.exec(parser.href);
    while (i--) {
      u[keys[i]] = m[i] || '';
    }

    u.queryKey = {};
    u.query.replace(qParser, function($0, $1, $2) {
      if ($1) { u.queryKey[$1] = $2; }
    });

    return u;
  };

  _.isSet = function(val) {
    return typeof val !== 'undefined' && val !== null;
  };

  _.hashMap = function(array, val) {
    val = _.isSet(val) ? val : true;
    return _.reduce(array || [], function(obj, key) {
      obj[key] = val;
      return obj;
    }, {});
  };

  function Router(iframe, origin) {
    var inProc = function(e) {
      if (e.source !== window && e.origin === origin) {
        return e;
      }
    };

    var outProc = function(m) {
      iframe.contentWindow.postMessage(m, '*');
    };

    // Main rpc handler.
    var r = function(evt) {
      evt = inProc(evt);
      if (!evt) { return; }

      if (!a) { return Q.fcall(function() { throw new Error('router: not mounted'); }); }

      var msg = evt.data;
      var src = evt.source;

      if (!_.isNumber(msg.id)) {
        return error(-1, ERR_INVALID_REQUEST, 'invalid request', src);
      }

      var method = msg.method || msg.action; // retro-compat
      if (!_.isString(method)) {
        return error(msg.id, ERR_INVALID_REQUEST, 'invalid request', src);
      }

      var h = a[method];
      if (!h) { h = forward(method); }

      var ret;
      var fn = h.handler;
      try {
        ret = _.isFunction(fn) ? fn.call(h.context, msg.params) : fn;
      } catch (e) {
        ret = new Error(e);
      }

      return Q.fcall(function() { return ret; })
        .then(toJSON)
        .then(function(res) {
          respond(msg.id, res, src);
        },

        function(err) {
          error(msg.id, ERR_INTERNAL, err, src);
        });
    };

    function toJSON(data) {
      if (!data) { return null; }

      return _.isFunction(data.toJSON) ? data.toJSON() : data;
    }

    function respond(id, res, src) {
      try {
        outProc({
          id:       id,
          result:   res,
          response: res, // retro-compat
        }, src);
      } catch (err) {
        error(id, ERR_INTERNAL, err, src);
      }
    }

    function toErrorMessage(err) {
      if (err instanceof Error) {
        return err.message;
      }

      if (err instanceof XMLHttpRequest) {
        return 'Request error: ' + [err.status, err.method, err.url].join(' ');
      }

      if (_.isString(err)) {
        return err;
      }

      return 'unknown error';
    }

    function error(id, code, err, src) {
      var message = toErrorMessage(err);
      outProc({ id: id, error: {
        code: code,
        message: message,
      }, }, src);
      return Q.fcall(function() { throw new Error(message); });
    }

    // send a broadcasted message
    function broadcast(evt, data) {
      var msg = {};
      var json = toJSON(data);
      msg[evt] = _.isUndefined(json) ? true : json;
      outProc(msg, null);
    }

    // actions used by the api
    var a = {};

    // default action used to forward to R7
    function forward(method) {
      return {
        handler: function(params) {
          return Q.Promise(function(resolve, reject) {
            R7(method, params, function(error, result) {
              if (error) { reject(error); }

              resolve(result);
            });
          });
        },
      };
    }

    function addStreamListener(params) {
      var type = params.source + ':' + params.event;
      var stream = 'stream:' + type;
      R7.addStreamListener(type, _.bind(broadcast, null, stream));
    }

    function navigate(params) {
      var route = params.control;
      var context = params.context;
      return Q.Promise(function(resolve, reject) {
        R7.navigate(route, context, function(error, result) {
          if (error) { reject(error); }

          resolve(result);
        });
      });
    }

    function registerKeys(keys) {
      if (!keys) { return; }

      if (Array.isArray(keys)) {
        keys = _.hashMap(keys, false);
      }

      for (var key in keys) {
        var fn = _.bind(broadcast, null, 'key', key);
        if (key === 'Back' || key === 'Exit') { r['onKey' + key] = fn; } else { R7.grabKey(key, fn); }
      }
    }

    function unregisterKeys(keys) {
      if (!keys) { return; }

      if (!Array.isArray(keys)) {
        keys = Object.keys(keys);
      }

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === 'Back' || key === 'Exit') { r['onKey' + key] = null; } else { R7.releaseKey(key); }
      }
    }

    // list of all streamers forwarding events
    // var s = _.extend({}, EventEmitter);

    // Register a handler to match messages of a given
    // type.
    r.use = function(action, fn, ctx) {
      a[action] = { handler: fn, context: ctx };
      return r;
    };

    // Unregister a route.
    r.unuse = function(action) {
      delete a[action];
      return r;
    };

    r.broadcast = broadcast;

    r.mount = function() {
      if (!a) { a = {}; }

      // if (!s) { s = _.extend({}, EventEmitter); }

      // then bind methods
      r.use('addStreamListener', addStreamListener);
      r.use('navigate', navigate);

      r.use('addKeys', registerKeys);
      r.use('removeKeys', unregisterKeys);

      R7.addStreamListener('focus', _.bind(broadcast, null, 'focus'));
      R7.addStreamListener('blur', _.bind(broadcast, null, 'blur'));
    };

    r.unmount = function() {
      // if (!s || !a) { return; }
      if (!a) { return; }

      // s.stopListening();
      a = null;

      // s = null;
    };

    r.onKeyBack = r.onKeyExit = null;

    r.mount();

    return r;
  }

  function R7IFrame() {
    this.initialize.apply(this, arguments);
  }

  R7IFrame.prototype =  {
    initialize: function(options) {
      var url = options.url;

      if (!this.iframe) {
        this.iframe = document.createElement('iframe');
        this.iframe.sandbox = SANDBOX;
        this.iframe.src = url;

        var style = _.extend(IFRAME_STYLE, options.style);
        for (var property in style) {
          this.iframe.style[property] = style[property];
        }
      }

      this.el = options.el || document.body;

      var parsed = _.parseUri(url);
      var origin = parsed.protocol + '://' + parsed.authority;

      this.router = new Router(this.iframe, origin);
    },

    load: function(callback, context) {
      callback = _.bind(callback, context);
      this._loaded = _.bind(this.loaded, this, callback);

      if (!this.iframe.dataset.loaded) {
        if (this.timeout) {clearTimeout(this.timeout);}

        this.timeout = setTimeout(_.bind(this.onTimeoutExpired, this, callback), READY_DELAY);
        window.addEventListener('message', this.router, false);
        this.iframe.addEventListener('load', this._loaded, false);
        this.el.appendChild(this.iframe);
      }
    },

    loaded: function(callback) {
      this.iframe.removeEventListener('load', this._loaded, false);
      this.iframe.dataset.loaded = 'loaded';

      this.router.use('ready', _.bind(function() {
        clearTimeout(this.timeout);
        this.router.unuse('ready');
        this.iframe.style.display = 'block';
        callback();
      }, this));
    },

    onTimeoutExpired: function(callback) {
      callback(new Error('iframe: timeout expired'));
    },

    unload: function() {
      if (this.timeout) {clearTimeout(this.timeout);}

      this.el.removeChild(this.iframe);
      window.removeEventListener('message', this.router, false);
      this.iframe.removeEventListener('load', this._loaded, false);
      delete this.router;
      delete this._loaded;
    },

    use: function(action, fn, ctx) {
      this.router.use(action, fn, ctx);
    },

    onKeyBack: function() {
      return !!this.router.onKeyBack;
    },

    goBack: function() {
      return this.router.onKeyBack();
    },

    onKeyExit: function() {
      return !!this.router.onKeyExit;
    },

    resume: function() {
      return this.router.resume();
    },
  };

  exports.R7IFrame = R7IFrame;

})(this);
