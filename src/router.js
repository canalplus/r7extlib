var _ = require('lodash');
var Q = require('q');

var
    /* Reserved -32000 to -32099 */
    ERR_INVALID_REQUEST  = -32600,
    ERR_INTERNAL         = -32603,
    /**
     * Sandbox options for iframe
     * @type {String}
     */
    SANDBOX = 'allow-scripts allow-same-origin allow-forms',
    /**
     * Delay for a remote service to load
     * @type {Number}
     */
    READY_DELAY = 45 * 1000;

_.parseUri = function(str) {
  var uParser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  var qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;
  var keys = ['source','protocol','authority','userInfo','user','password','host','port','relative','path','directory','file','query','anchor'];

  var u = {}, i = keys.length;
  var m = uParser.exec(str);
  while (i--) {
    u[keys[i]] = m[i] || '';
  }

  u.queryKey = {};
  u.query.replace(qParser, function ($0, $1, $2) {
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

    var ret, fn = h.handler;
    try {
      ret = _.isFunction(fn) ? fn.call(h.context, msg.params) : fn;
    } catch(e) {
      ret = new Error(e);
    }

    return Q.fcall(function () { return ret; })
      .then(toJSON)
      .then(function(res) {
        respond(msg.id, res, src);
      }, function(err) {
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
        response: res // retro-compat
      }, src);
    } catch(err) {
      error(id, ERR_INTERNAL, err, src);
    }
  }

  function toErrorMessage(err) {
    if (err instanceof Error) {
      return err.message;
    }
    if (err instanceof XMLHttpRequest) {
      return 'Request error: '+ [err.status, err.method, err.url].join(' ');
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
      message: message
    } }, src);
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
      }
    };
  }

  function addStreamListener(params) {
    var type = params.source + ':' + params.event,
        stream = 'stream:' + type;
    R7.addStreamListener(type, _.bind(broadcast, null, stream));
  }

  function registerKeys(keys) {
    if (!keys) { return; }
    if (Array.isArray(keys)) {
      keys = _.hashMap(keys, false);
    }
    for (var key in keys) {
      R7.grabKey(key, _.bind(broadcast, null, 'key', key));
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
    // r.use('navigate', ...);

    r.use('addKeys', registerKeys);

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

  r.mount();

  return r;
}

function R7IFrame() {
  this.initialize.apply(this, arguments);
}

R7IFrame.prototype =  {
  initialize: function(options) {
    var url = options.url;

    // create the iframe
    var iframe = this.iframe = options.el;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.sandbox = SANDBOX;
      iframe.src = url;

      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.width = '1280px';
      iframe.style.height = '720px';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.border = '0';

      document.body.appendChild(iframe);

      this.iframe = iframe;
    } else if (iframe.dataset.keys) {
      // this.registerKeys(JSON.parse(this.iframe.dataset.keys));
    }

    var parsed = _.parseUri(url);
    var origin = parsed.protocol + '://' + parsed.authority;

    this.router = new Router(this.iframe, origin);
  },

  load: function(callback, context) {
    window.addEventListener('message', this.router, false);

    callback = _.bind(callback, context);
    if (!this.iframe.dataset.loaded) {
      this.timeout = setTimeout(_.bind(this.onTimeoutExpired, this, callback), READY_DELAY);
      this.iframe.addEventListener('load', _.bind(this.loaded, this, callback), false);
    }
  },

  loaded: function(callback) {
    this.iframe.dataset.loaded = 'loaded';
    this.router.use('ready', _.bind(function() {
      clearTimeout(this.timeout);
      this.router.unuse('ready');
      this.iframe.style.display = 'block';
      callback();
    }, this));
  },

  onTimeoutExpired: function(callback) {
    this.iframe.removeEventListener('load', this.loaded, false);
    this.unload();
    callback(new Error('iframe: timeout expired'));
  },

  unload: function() {
    window.removeEventListener('message', this.router, false);
    this.iframe.style.display = 'none';
  }
};

var r7iframe;
R7.loadIframe = function(options, callback, context) {
  if (r7iframe) { console.error('iframe: already loaded'); return; }
  r7iframe = new R7IFrame(options);
  r7iframe.load(callback, context);
};
