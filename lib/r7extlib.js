(function(global) {

  var _uid = 1,

  STREAM_NAMESPACE = 'stream',

  AVAILABLE_KEYS = {
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
  },

  // pending rpc requests
  _ids = {},
  // Store grabbed keys
  _grabbedKeys = {},
  // Store listened streams
  _streams = {};

  function _bind(callback, context) {
    return function boundFunction() {
      callback.apply(context, arguments);
    };
  }

  function _extractKey(key) {
    if (typeof key === 'string') { return key; }
    if (Array.isArray(key)) { return key[0]; }
    if (typeof key === 'object') { return Object.keys[0]; }
  }

  function _rpcHandler(msg) {
    var id = msg.data.id,
        callback = _ids[id],
        responseData = msg.data.response;

    if (!callback) { return; }

    callback(responseData);
    delete _ids[id];
  }

  function _keypressHandler(msg) {
    var key = msg.data.key,
        callback = _grabbedKeys[key];

    if (!callback) { return; }

    callback();
  }

  function _streamHandler(msg) {
    for (var key in msg.data) {
      // test if in the data hash there is a key of the form:
      // stream:<source>:<event>
      if (!_streams[key]) { continue; }

      var callback = _streams[key],
          responseData = msg.data[key];

      callback(responseData);
    }
  }

  function _globalHandler(msg) {
    if (msg.data.key) { _keypressHandler(msg); }
    else if (msg.data.id) { _rpcHandler(msg); }
    else { _streamHandler(msg); }
  }

  function _extractStreamParams(type) {
    if (typeof type !== 'string') { return null; }
    var split = type.split(':');
    if (split.length !== 2) { return null; }
    return {
      source: split[0],
      event: split[1]
    };
  }

  // r7extlib methods

  function send(action, params) {
    window.parent.postMessage({
      id: _uid,
      action: action,
      params: params
    }, '*');
    return _uid++;
  }

  function rpc(method, params, callback, context) {
    // In case params is omitted, rotate assignations.
    if (typeof params === 'function') {
      context  = callback;
      callback = params;
      params   = null;
    }

    callback = context ? _bind(callback, context) : callback;

    var id = send(method, params);

    function finalCallback(responseData) {
      callback(responseData);
      delete _ids[id];
    }

    _ids[id] = finalCallback;
    return id;
  }

  function grabKey(key, callback, context) {
    // Get the key string in case the infos is passed like ["KeyName"] or
    // { Up: { after: 300, throttle: 50 } }
    var keyString = _extractKey(key);
    if (!AVAILABLE_KEYS[keyString]) { return; }

    callback = context ? _bind(callback, context) : callback;

    // Tell the R7 box to forward the specified key press event
    if (!_grabbedKeys[keyString]) {
      // R7 doesn't take keys as pure strings
      send('addKeys', typeof key === 'string' ? [key] : key);
    }

    // If key already grabbed => replace old callback. Else just add it
    _grabbedKeys[keyString] = callback;
  }

  function releaseKey(key) {
    // Get the key string in case the infos is passed like ["KeyName"] or
    // { Up: { after: 300, throttle: 50 } }
    var keyString = _extractKey(key);
    if (!AVAILABLE_KEYS[keyString]) { return; }

    if (!_grabbedKeys[keyString]) { return; }

    // R7 doesn't take keys as pure strings
    send('removeKeys', typeof key === 'string' ? [key] : key);
    delete _grabbedKeys[keyString];
  }

  function onReadyState(callback, context) {
    // Bind global handler => will handle every incomming message and will then
    // distribute the job to the concerned logic
    window.addEventListener('message', _globalHandler, false);

    // Handshake with the R7 box
    window.addEventListener('load', function boot() {
      send('ready');
      callback.call(context);
      window.removeEventListener('load', boot);
    }, false);
  }

  function addStreamListener(type, callback, context) {
    var eventInfos, namespace;
    callback = context ? _bind(callback, context) : callback;

    if (!(eventInfos = _extractStreamParams(type))) { return false; }

    // namespace of the form "stream:<source>:<event>"
    namespace = STREAM_NAMESPACE + ':' + type;

    // Tell the R7 box to forward the specified event
    if (!_streams[namespace]) {
      send('stream', eventInfos);
    }

    // If key already bound => replace old callback. Else just add it
    _streams[namespace] = callback;
    return true;
  }

  function removeStreamListener(type) {
    var eventInfos, namespace;

    if (!(eventInfos = _extractStreamParams(type))) { return; }

    // namespace of the form "stream:<source>:<event>"
    namespace = STREAM_NAMESPACE + ':' + type;

    if (!_streams[namespace]) { return; }

    send('stopListeningToStreamEvent', eventInfos);
    delete _streams[namespace];
  }

  var R7 = {};

  R7.send = send;
  R7.rpc = rpc;
  R7.grabKey = grabKey;
  R7.releaseKey = releaseKey;
  R7.onReadyState = onReadyState;
  R7.addStreamListener = addStreamListener;
  R7.removeStreamListener = removeStreamListener;

  global.R7 = R7;

})(this);