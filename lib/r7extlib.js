(function(global) {

  VERSION = '0.1.2';

  function noop() {}

  function _bind(callback, context) {
    callback = callback || noop;
    if (!context) { return callback; }
    return function bound() {
      return callback.apply(context, arguments);
    };
  }

  function _deprecate(name, fn) {
    return function() {
      console.warn('R7 deprecated method ' + name);
      return fn.apply(null, arguments);
    };
  }

  var AVAILABLE_KEYS = {
    Up:       true,
    Down:     true,
    Right:    true,
    Left:     true,
    Enter:    true,
    Mute:     true,
    Zoom:     true,
    Back:     true,
    Exit:     true,
    Guide:    true,
    Menu:     true,
    Numeric:  true,
    Rewind:   true,
    Play:     true,
    Forward:  true,
    Stop:     true,
    Pause:    true,
    Rec:      true,
    TV:       true
  };

  var _rpcs = {};
  var _keys = {};
  var _streams = {};

  function getKey(key) {
    if (typeof key === 'object') {
      key = Object.keys(key)[0];
    }
    if (!AVAILABLE_KEYS[key]) {
      throw new Error('non available key');
    }
    return key;
  }

  function streamParams(type) {
    var m = type.match(/(\w+):(\w+)/);
    return { source: m[1], event: m[2] };
  }

  var handlers = {
    rpc: function(msg) {
      var id = msg.id;
      var cb = _rpcs[id];
      if (!cb) { return; }
      if (!msg.id || !(msg.hasOwnProperty('error') || msg.hasOwnProperty('result'))) {
        return;
      }
      delete _rpcs[id];
      if (msg.error) {
        cb(new Error(msg.error.message));
      } else {
        cb(null, msg.result);
      }
    },

    key: function(msg) {
      var key = msg.key;
      var res = key.match(/Numeric([0-9])/i);
      if (res) {
        key = 'Numeric';
        msg.number = +res[1];
      }
      var cb = _keys[key];
      if (!cb) { return; }
      cb(msg);
    },

    stream: function(msg) {
      for (var key in msg) {
        if (!_streams[key]) { continue; }
        var cb = _streams[key];
        cb(msg[key]);
      }
    }
  };

  function onMessage(evt) {
    var msg = evt.data;
    if (msg.id)  { return handlers.rpc(msg); }
    if (msg.key) { return handlers.key(msg); }
    return handlers.stream(msg);
  }

  var send = function() {
    var uid = 1;
    return function(method, params) {
      window.parent.postMessage({
        jsonrpc: '2.0',
        id: uid,
        method: method,
        params: params
      }, '*');
      return uid++;
    };
  }();

  // !! DEPRECATED !! do not handle errors
  function deprecatedRPC(method, params, callback, context) {
    if (typeof params === 'function') {
      context  = callback;
      callback = params;
      params   = null;
    }

    callback = _bind(callback, context);

    var uid = send(method, params);
    _rpcs[uid] = function(err, res) {
      callback(err || res);
    };

    return uid;
  }

  function rpc(method, params, callback, context) {
    if (typeof params === 'function') {
      context  = callback;
      callback = params;
      params   = null;
    }

    var uid = send(method, params);
    _rpcs[uid] = _bind(callback, context);

    return uid;
  }

  function navigate(route, options, callback, context) {
    return rpc('navigate', {
      control: route,
      context: options
    }, callback, context);
  }

  function grabKey(key, callback, context) {
    var k = getKey(key);
    if (typeof key === 'object') {
      send('addKeys', key);
    } else {
      send('addKeys', [k]);
    }
    _keys[k] = _bind(callback, context);
  }

  function releaseKey(key) {
    key = getKey(key);
    delete _keys[key];
    send('removeKeys', [key]);
  }

  function ready(callback, context) {
    window.addEventListener('load', function() {
      rpc('ready', _bind(callback, context));
    }, false);
  }

  function addStreamListener(type, callback, context) {
    if (type === 'focus' || type === 'blur') {
      _streams[type] = _bind(callback, context);
    } else {
      send('addStreamListener', streamParams(type));
      _streams['stream:' + type] = _bind(callback, context);
    }
  }

  function R7(method, params, callback, context) {
    return rpc(method, params, callback, context);
  }

  R7.ready      = ready;
  R7.grabKey    = grabKey;
  R7.releaseKey = releaseKey;
  R7.navigate   = navigate;

  R7.addStreamListener = addStreamListener;

  // Deprecated methods
  R7.rpc          = _deprecate('rpc',  deprecatedRPC);
  R7.send         = _deprecate('send', deprecatedRPC);
  R7.onReadyState = _deprecate('onReadyState', ready);

  // Bind global handler
  window.addEventListener('message', onMessage, false);

  global.R7 = R7;

})(this);
