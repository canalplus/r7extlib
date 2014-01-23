(function(global) {

  var uid = 0;

  var STREAM_NAMESPACE = 'stream';

  var AVAILABLE_KEYS = {
    'Up':       true,
    'Down':     true,
    'Right':    true,
    'Left':     true,
    'Enter':    true,
    'Mute':     true,
    'Zoom':     true,
    'Back':     true,
    'Exit':     true,
    'Guide':    true,
    'Menu':     true,
    'Numeric0': true,
    'Rewind':   true,
    'Play':     true,
    'Forward':  true,
    'Stop':     true,
    'Pause':    true,
    'Rec':      true,
    'TV':       true
  };

  // Store grabbed keys
  grabedKeys = {},
  // Store listened streams
  streams = {};

  function bind(callback, context) {
    return function boundFunction() {
      callback.apply(context, arguments);
    }
  }

  function _extractKey(key) {
    if (typeof key === 'string') { return key; }
    if (Array.isArray(key)) { key = key[0]; }
    if (typeof key === 'object') { return Object.keys[0]; }
    return key;
  }

  function send(action, params) {
    window.parent.postMessage({
      id: uid,
      action: action,
      params: params
    }, '*');
    return uid++;
  }

  function rpc(method, params, callback, context) {
    if (typeof params === 'function') {
      context  = callback;
      callback = params;
      params   = null;
    }
    var id = send(method, params);
    window.addEventListener('message', function getter(msg) {
      if (msg.data.id === id) {
        callback.call(context || null, msg.data.response);
        window.removeEventListener('message', getter);
      }
    }, false);
    return id;
  }

  function grabKey(key, callback, context) {
    // Get the key string in case the infos is passed like ["KeyName"] or
    // { Up: { after: 300, throttle: 50 } }
    var keyString = _extractKey(key);
    if (!AVAILABLE_KEYS[keyString]) { return; }
    // G7 doesn't take keys as pure strings
    send('addKeys', typeof key === 'string' ? [key] : key);
    function keyPressHandler(msg) {
      if (keyString === msg.data.key) { callback.call(context); }
    }
    // Remove handler if key is already grabbed
    if (grabedKeys[keyString])
      { window.removeEventListener('message', grabedKeys[keyString]); }
    // Register freshly created handler
    grabedKeys[keyString] = keyPressHandler;
    window.addEventListener('message', keyPressHandler, false);
  }

  function releaseKey(key) {
    // Get the key string in case the infos is passed like ["KeyName"] or
    // { Up: { after: 300, throttle: 50 } }
    var keyString = _extractKey(key);
    if (!AVAILABLE_KEYS[keyString]) { return; }
    if (grabedKeys[keyString]) {
      send('removeKeys', typeof key === 'string' ? [key] : key);
      window.removeEventListener('message', grabedKeys[keyString]);
      delete grabedKeys[keyString];
    }
  }

  function onReadyState(callback, context) {
    window.addEventListener('load', function boot() {
      send('ready');
      callback.call(context);
      window.removeEventListener('load', boot);
    }, false);
  }

  function addStreamListener(type, listener, context) {
    var event, namespace,
        listener = context ? bind(listener, context) : listener;
    function extractParams(type) {
      if (typeof type !== 'string') { return false; }
      var split = type.split(':');
      if (split.length !== 2) { return false; }
      return {
        source: split[0],
        event: split[1]
      };
    }

    if (!(event = extractParams(type))) { return false; }
    // namespace of the form "stream:<source>:<event>"
    namespace = STREAM_NAMESPACE + ':' + type;
    // Override existing callback if exists
    if (streams[type]) {
      // type has the form "<source>:<event>"
      window.removeEventListener(namespace, streams[type]);
    }
    window.addEventListener(namespace, listener, false);
    streams[type] = listener;
    send('stream', event);
    return true;
  }

  var R7 = {};

  R7.send = send;
  R7.rpc = rpc;
  R7.grabKey = grabKey;
  R7.releaseKey = releaseKey;
  R7.onReadyState = onReadyState;
  R7.addStreamListener = addStreamListener;

  global.R7 = R7;

})(this);