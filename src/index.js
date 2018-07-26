(function() {
  'use strict';

  var VERSION = '0.1.9';

  var _ = require('lodash');
  var history = require('./history.js');
  var embed = require('./embed');

  function noop() {}

  function _bind(callback, context) {
    callback = callback || noop;
    if (!context) {
      return callback;
    }

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
    Vdown:    true,
    Vup:      true,
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
    TV:       true,
  };

  var _rpcs = {};
  var _keys = {};
  var _streams = {};
  var _iframe = null;

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
      if (!cb) {
        return;
      }

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
      if (!cb) {
        return;
      }

      cb(msg);
    },

    stream: function(msg) {
      for (var key in msg) {
        if (!_streams[key]) {
          continue;
        }

        var cb = _streams[key];
        cb(msg[key]);
      }
    },
  };

  function onMessage(evt) {
    var msg = evt.data;
    if (msg.id)  { return handlers.rpc(msg); }

    if (msg.key) { return handlers.key(msg); }

    return handlers.stream(msg);
  }

  var send = (function() {
    var uid = 1;
    return function(method, params) {
      window.parent.postMessage({
        jsonrpc: '2.0',
        id: uid,
        method: method,
        params: params,
      }, '*');
      return uid++;
    };
  })();

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
      context: options,
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
      rpc('ready', function(notUsed, response) {
        if (response) {
          try {
            window.history.init(response.clearHistory);
          } catch (e) {
            console.warn(e);
          }
        }

        _bind(callback, context)();
      });
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

  function removeStreamListener(type) {
    if (type === 'focus' || type === 'blur') {
      delete _streams[type];
    } else {
      delete _streams['stream:' + type];
    }
  }

  function loadIframe(options, callback, context) {
    if (_iframe) {
      console.error('iframe: already loaded');
      return;
    }

    var keys = _.clone(_keys);
    var streams = _.clone(_streams);

    function clearContext() {
      for (var key in _keys) { releaseKey(key); }

      for (var stream in _streams) { removeStreamListener(stream); }
    }

    function restoreContext() {
      clearContext();
      _iframe.unload();
      _iframe = null;
      for (var key in keys) { grabKey(key, keys[key]); }

      for (var stream in streams) { addStreamListener(stream, streams[stream]); }
    }

    function exit() {
      restoreContext();
      if (!!streams.focus) { streams.focus(); }
    }

    clearContext();

    _iframe = new embed.R7IFrame(options);
    _iframe.use('exit', exit);

    grabKey('Back', function() {
      if (_iframe.onKeyBack()) { return _iframe.goBack(); }

      exit();
    });

    if (!_.isSet(options.exit) || options.exit) {
      grabKey('Exit', function() {
        if (_iframe.onKeyExit()) { return _iframe.resume(); }

        exit();
      });
    }

    _iframe.load(function(err) {
      if (err) { restoreContext(); }

      callback.call(context, err);
      if (!err && !!streams.blur) { streams.blur(); }
    });
  }

  //Will only work inside an iframe
  function exit() {
    send('exit');
  }

  function R7(method, params, callback, context) {
    return rpc(method, params, callback, context);
  }

  R7.version = VERSION;

  R7.ready      = ready;
  R7.grabKey    = grabKey;
  R7.releaseKey = releaseKey;
  R7.navigate   = navigate;

  R7.addStreamListener = addStreamListener;
  R7.removeStreamListener = removeStreamListener;

  R7.loadIframe = loadIframe;
  R7.exit = exit;

  // Deprecated methods
  R7.rpc          = _deprecate('rpc',  deprecatedRPC);
  R7.send         = _deprecate('send', deprecatedRPC);
  R7.onReadyState = _deprecate('onReadyState', ready);

  // Bind global handler
  window.addEventListener('message', onMessage, false);

  window.R7 = R7;

})();
