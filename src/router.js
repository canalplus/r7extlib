'use strict';

/* Reserved -32000 to -32099 */
var ERR_INVALID_REQUEST  = -32600;
var ERR_INTERNAL         = -32603;

var hashMap = (array, val) => {
  val = (typeof val !== 'undefined' && val !== null) ? val : true;
  return (array || []).reduce((obj, key) => {
    obj[key] = val;
    return obj;
  }, {});
};

export default function Router(iframe, origin) {
  var inProc = (e) => {
    if (e.source !== window && e.origin === origin) {
      return e;
    }
  };

  var outProc = (m) => {
    iframe.contentWindow.postMessage(m, '*');
  };

  // Main rpc handler.
  var r = (evt) => {
    evt = inProc(evt);
    if (!evt) { return; }

    if (!a) {
      return new Promise((resolve, reject) => {
        reject(new Error('router: not mounted'));
      });
    }

    var msg = evt.data;
    var src = evt.source;

    if (typeof msg.id !== 'number') {
      return error(-1, ERR_INVALID_REQUEST, 'invalid request', src);
    }

    var method = msg.method || msg.action; // retro-compat
    if (typeof method !== 'string') {
      return error(msg.id, ERR_INVALID_REQUEST, 'invalid request', src);
    }

    var h = a[method];
    if (!h) { h = forward(method); }

    var ret;
    var fn = h.handler;
    try {
      ret = (typeof fn === 'function') ? fn.call(h.context, msg.params) : fn;
    } catch (e) {
      ret = new Error(e);
    }

    return new Promise((resolve, reject) => {
      if (ret instanceof Error) {
        reject(ret);
      }

      resolve(ret);
    })
      .then(toJSON)
      .then((res) => {
        respond(msg.id, res, src);
      }, (err) => {
        error(msg.id, ERR_INTERNAL, err, src);
      });
  };

  function toJSON(data) {
    if (!data) { return null; }

    return (typeof data.toJSON === 'function') ? data.toJSON() : data;
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

    if (typeof err === 'string') {
      return err;
    }

    return 'unknown error';
  }

  function error(id, code, err, src) {
    var message = toErrorMessage(err);
    outProc({
      id: id,
      error: {
        code: code,
        message: message,
      },
    }, src);
    return new Promise((resolve, reject) => {
      reject(new Error(message));
    });
  }

  // send a broadcasted message
  function broadcast(evt, data) {
    var msg = {};
    var json = toJSON(data);
    msg[evt] = (typeof json === 'undefined') ? true : json;
    outProc(msg, null);
  }

  // actions used by the api
  var a = {};

  // default action used to forward to R7
  function forward(method) {
    return {
      handler: function(params) {
        return new Promise(function(resolve, reject) {
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
    R7.addStreamListener(type, broadcast.bind(null, stream));
  }

  function navigate(params) {
    var route = params.control;
    var context = params.context;
    return new Promise((resolve, reject) => {
      R7.navigate(route, context, (error, result) => {
        if (error) { reject(error); }

        resolve(result);
      });
    });
  }

  function registerKeys(keys) {
    if (!keys) { return; }

    if (Array.isArray(keys)) {
      keys = hashMap(keys, false);
    }

    for (var key in keys) {
      var fn = broadcast.bind(null, 'key', key);
      if (key === 'Back' || key === 'Exit') {
        r['onKey' + key] = fn;
      } else {
        R7.grabKey(key, fn);
      }
    }
  }

  function unregisterKeys(keys) {
    if (!keys) { return; }

    if (!Array.isArray(keys)) {
      keys = Object.keys(keys);
    }

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key === 'Back' || key === 'Exit') {
        r['onKey' + key] = null;
      } else {
        R7.releaseKey(key);
      }
    }
  }

  // list of all streamers forwarding events
  // var s = _.extend({}, EventEmitter);

  // Register a handler to match messages of a given
  // type.
  r.use = function(action, fn, ctx) {
    a[action] = {handler: fn, context: ctx};
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

    R7.addStreamListener('focus', broadcast.bind(null, 'focus'));
    R7.addStreamListener('blur', broadcast.bind(null, 'blur'));
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
