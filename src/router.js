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

var iframe;

R7.loadIframe = function(options) {
  var url = options.url;

  if (iframe) { return new Error('iframe: already loaded'); }
  // create the iframe
  iframe = options.el;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.sandbox = SANDBOX;
    iframe.src = url;
    document.body.appendChild(iframe);
  } else if (iframe.dataset.keys) {
    this.registerKeys(JSON.parse(iframe.dataset.keys));
  }

  var parsed = _.parseUri(url);
  var origin = parsed.protocol + '://' + parsed.authority;

  var router = new Router(iframe, origin);

  var timeout;

  function load() {
    if (!iframe.dataset.loaded) {
      timeout = setTimeout(this.unavailableError, READY_DELAY);
      iframe.addEventListener('load', loaded, false);
    }
  }

  function loaded() {
    iframe.dataset.loaded = 'loaded';
    router.use('ready', function() {
      clearTimeout(timeout);
      router.unuse('ready');
    });
  }

  window.addEventListener('message', router, false);
  load();

  // router.use('addKeys', this.registerKeys, this);
  // router.use('removeKeys', this.unregisterKeys, this);
};
