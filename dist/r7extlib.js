(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["R7"] = factory();
	else
		root["R7"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(3);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _router = __webpack_require__(5);

	var _router2 = _interopRequireDefault(_router);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
	  border: '0'
	};

	var parseUri = function parseUri(str) {
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
	  u.query.replace(qParser, function ($0, $1, $2) {
	    if ($1) {
	      u.queryKey[$1] = $2;
	    }
	  });

	  return u;
	};

	var R7IFrame = (function () {
	  function R7IFrame(options) {
	    _classCallCheck(this, R7IFrame);

	    var url = options.url;

	    if (!this.iframe) {
	      this.iframe = document.createElement('iframe');
	      this.iframe.sandbox = SANDBOX;
	      this.iframe.src = url;

	      var style = Object.assign({}, IFRAME_STYLE, options.style);
	      for (var property in style) {
	        this.iframe.style[property] = style[property];
	      }
	    }

	    this.el = options.el || document.body;

	    var parsed = parseUri(url);
	    var origin = parsed.protocol + '://' + parsed.authority;

	    this.router = new _router2.default(this.iframe, origin);
	  }

	  _createClass(R7IFrame, [{
	    key: 'load',
	    value: function load(callback, context) {
	      var _this = this;

	      callback = callback.bind(context);

	      if (!this.iframe.dataset.loaded) {
	        if (this.timeout) {
	          clearTimeout(this.timeout);
	        }

	        this.timeout = setTimeout(this.onTimeoutExpired.bind(this, callback), READY_DELAY);
	        window.addEventListener('message', this.router, false);
	        this.iframe.addEventListener('load', function () {
	          _this.loaded(callback);
	        }, false);
	        this.el.appendChild(this.iframe);
	      }
	    }
	  }, {
	    key: 'loaded',
	    value: function loaded(callback) {
	      var _this2 = this;

	      this.iframe.removeEventListener('load', this._loaded, false);
	      this.iframe.dataset.loaded = 'loaded';

	      this.router.use('ready', function () {
	        clearTimeout(_this2.timeout);
	        _this2.router.unuse('ready');
	        _this2.iframe.style.display = 'block';
	        callback();
	      });
	    }
	  }, {
	    key: 'onTimeoutExpired',
	    value: function onTimeoutExpired(callback) {
	      callback(new Error('iframe: timeout expired'));
	    }
	  }, {
	    key: 'unload',
	    value: function unload() {
	      if (this.timeout) {
	        clearTimeout(this.timeout);
	      }

	      this.el.removeChild(this.iframe);
	      window.removeEventListener('message', this.router, false);
	      this.iframe.removeEventListener('load', this._loaded, false);
	      delete this.router;
	      delete this._loaded;
	    }
	  }, {
	    key: 'use',
	    value: function use(action, fn, ctx) {
	      this.router.use(action, fn, ctx);
	    }
	  }, {
	    key: 'onKeyBack',
	    value: function onKeyBack() {
	      return !!this.router.onKeyBack;
	    }
	  }, {
	    key: 'goBack',
	    value: function goBack() {
	      return this.router.onKeyBack();
	    }
	  }, {
	    key: 'onKeyExit',
	    value: function onKeyExit() {
	      return !!this.router.onKeyExit;
	    }
	  }, {
	    key: 'resume',
	    value: function resume() {
	      return this.router.resume();
	    }
	  }]);

	  return R7IFrame;
	})();

	exports.default = R7IFrame;

/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict'

	// Check if SessionStorage is available
	;
	var __sessionStorage = window.sessionStorage;
	var hasSessionStorage = function hasSessionStorage() {
	  if (!__sessionStorage) {
	    return false;
	  }

	  try {
	    __sessionStorage.setItem('test', '1');
	    __sessionStorage.removeItem('test');
	    return true;
	  } catch (exception) {
	    return false;
	  }
	};

	if (hasSessionStorage()) {
	  // SessionStorage is available ...

	  // Default history
	  var __defaultHistory = {
	    stack: [window.location.href],
	    state: 0
	  };

	  // Get history stored in sessionStorage or set the defaultHistory
	  var __history;
	  try {
	    __history = JSON.parse(__sessionStorage.getItem('R7History'));
	  } catch (e) {}

	  __history = __history || Object.assign({}, __defaultHistory);

	  __history.clear = function () {
	    Object.assign(__history, __defaultHistory);
	    __history.save();
	  };

	  /** @function
	   * Save the current page
	   */
	  __history.save = function () {
	    // If access another page
	    if (this.stack[this.state] !== window.location.href) {

	      // delete last entries (case we did some backs before)
	      this.stack.length = this.state + 1;

	      this.stack.push(window.location.href);
	      this.state = this.stack.length - 1;
	    }

	    return __sessionStorage.setItem('R7History', JSON.stringify(this));
	  };

	  /** @function
	   * go implementation
	   *
	   * @param  {Integer} n can positive or negative
	   */
	  __history.go = function (n) {
	    n = n || 0;
	    var newState = this.state + n;
	    if (n === 0 || !__history.stack[newState]) {
	      return false;
	    }

	    this.state = newState;
	    window.location.href = this.stack[newState];

	    // trigger popstate event (listen by window.onpopstate)
	    var popStateEvent;
	    if (window.CustomEvent !== undefined) {
	      popStateEvent = new CustomEvent('popstate', {
	        state: { url: this.stack[newState] }
	      });
	      window.dispatchEvent(popStateEvent);
	    } else {
	      popStateEvent = document.createEvent('Event');
	      popStateEvent.initEvent('popstate', true, true, {
	        state: { url: this.stack[newState] }
	      });
	      window.dispatchEvent(popStateEvent);
	    }
	  };

	  /** @function
	   * pushState implementation
	   *
	   * @param  {Object} stateObj not implemented yet
	   * @param  {String} title    not implemented yet
	   * @param  {String} url      url to push in history
	   */
	  __history.pushState = function (stateObj, title, url) {
	    if (!url) {
	      return;
	    }

	    this.stack.push(url);
	    this.state = this.stack.length - 1;
	    return __sessionStorage.setItem('R7History', JSON.stringify(this));
	  };

	  /** @function
	   * replaceState implementation
	   *
	   * @param  {Object} stateObj not implemented yet
	   * @param  {String} title    not implemented yet
	   * @param  {String} url      url to push in history
	   */
	  __history.replaceState = function (stateObj, title, url) {
	    if (!url) {
	      return;
	    }

	    this.stack[this.state] = url;
	    return __sessionStorage.setItem('R7History', JSON.stringify(this));
	  };

	  // Only for boxes (History and its prototype must be rewritten). In chrome, we can only extend prototype
	  window.history = function () {};

	  var __isBox = window.history instanceof Function;

	  if (__isBox) {
	    window.History = function () {};

	    window.History.prototype = {};
	  }

	  Object.defineProperties(window.History.prototype, {
	    init: {
	      value: function value(clear) {
	        clear ? __history.clear() : __history.save();
	      }
	    },

	    save: {
	      value: function value() {
	        __history.save();
	      }
	    },

	    state: {
	      get: function get() {
	        return __history.state;
	      }
	    },

	    go: {
	      value: function value(n) {
	        __history.go(n);
	      }
	    },

	    back: {
	      value: function value() {
	        __history.go(-1);
	      }
	    },

	    forward: {
	      value: function value() {
	        __history.go(1);
	      }
	    },

	    length: {
	      get: function get() {
	        return __history.stack.length;
	      }
	    },

	    pushState: {
	      value: function value(stateObj, title, url) {
	        __history.pushState(stateObj, title, url);
	      }
	    },

	    replaceState: {
	      value: function value(stateObj, title, url) {
	        __history.replaceState(stateObj, title, url);
	      }
	    }

	  });

	  //used for debug an unit tests
	  window.__history = __history;

	  //Only for boxes (History and its prototype must be rewritten).
	  if (__isBox) {
	    window.history = new window.History();
	  }

	  window.addEventListener('hashchange', function () {
	    history.save();
	  }, false);

	  if (window.Backbone && window.Backbone.history) {
	    window.Backbone.history.history = window.history;
	  }
	} else {
	  console.warn('History can not be rewritten: window.sessionStorage not available!');
	}

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	__webpack_require__(4);

	__webpack_require__(2);

	var _embed = __webpack_require__(1);

	var _embed2 = _interopRequireDefault(_embed);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

	var VERSION = '0.2.2';

	function _deprecate(name, fn) {
	  return function () {
	    console.warn('R7 deprecated method ' + name);
	    return fn.apply(null, arguments);
	  };
	}

	var AVAILABLE_KEYS = {
	  Up: true,
	  Down: true,
	  Right: true,
	  Left: true,
	  Enter: true,
	  Mute: true,
	  Vdown: true,
	  Vup: true,
	  Zoom: true,
	  Back: true,
	  Exit: true,
	  Guide: true,
	  Menu: true,
	  Numeric: true,
	  Rewind: true,
	  Play: true,
	  Forward: true,
	  Stop: true,
	  Pause: true,
	  Rec: true,
	  TV: true
	};

	var _rpcs = {};
	var _keys = {};
	var _streams = {};
	var _iframe = null;

	function getKey(key) {
	  if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
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
	  rpc: function rpc(msg) {
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

	  key: function key(msg) {
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

	  stream: function stream(msg) {
	    for (var key in msg) {
	      if (!_streams[key]) {
	        continue;
	      }

	      var cb = _streams[key];
	      cb(msg[key]);
	    }
	  }
	};

	function onMessage(evt) {
	  var msg = evt.data;
	  if (msg.id) {
	    return handlers.rpc(msg);
	  }

	  if (msg.key) {
	    return handlers.key(msg);
	  }

	  return handlers.stream(msg);
	}

	var send = (function () {
	  var uid = 1;
	  return function (method, params) {
	    window.parent.postMessage({
	      jsonrpc: '2.0',
	      id: uid,
	      method: method,
	      params: params
	    }, '*');
	    return uid++;
	  };
	})();

	// !! DEPRECATED !! do not handle errors
	function deprecatedRPC(method, params, callback, context) {
	  if (typeof params === 'function') {
	    context = callback;
	    callback = params;
	    params = null;
	  }

	  callback = callback.bind(context);

	  var uid = send(method, params);
	  _rpcs[uid] = function (err, res) {
	    callback(err || res);
	  };

	  return uid;
	}

	function rpc(method, params, callback, context) {
	  if (typeof params === 'function') {
	    context = callback;
	    callback = params;
	    params = null;
	  }

	  var uid = send(method, params);
	  _rpcs[uid] = callback.bind(context);

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
	  if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
	    send('addKeys', key);
	  } else {
	    send('addKeys', [k]);
	  }

	  _keys[k] = callback.bind(context);
	}

	function releaseKey(key) {
	  key = getKey(key);
	  delete _keys[key];
	  send('removeKeys', [key]);
	}

	function ready(callback, context) {
	  window.addEventListener('load', function () {
	    rpc('ready', function (notUsed, response) {
	      if (response) {
	        window.history.init(response.clearHistory);
	      }

	      callback.call(context);
	    });
	  }, false);
	}

	function addStreamListener(type, callback, context) {
	  if (type === 'focus' || type === 'blur') {
	    _streams[type] = callback.bind(context);
	  } else {
	    send('addStreamListener', streamParams(type));
	    _streams['stream:' + type] = callback.bind(context);
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

	  var keys = Object.assign({}, _keys);
	  var streams = Object.assign({}, _streams);

	  function clearContext() {
	    for (var key in _keys) {
	      releaseKey(key);
	    }

	    for (var stream in _streams) {
	      removeStreamListener(stream);
	    }
	  }

	  function restoreContext() {
	    clearContext();
	    _iframe.unload();
	    _iframe = null;
	    for (var key in keys) {
	      grabKey(key, keys[key]);
	    }

	    for (var stream in streams) {
	      addStreamListener(stream, streams[stream]);
	    }
	  }

	  function exit() {
	    restoreContext();
	    if (!!streams.focus) {
	      streams.focus();
	    }
	  }

	  clearContext();

	  _iframe = new _embed2.default(options);
	  _iframe.use('exit', exit);

	  grabKey('Back', function () {
	    if (_iframe.onKeyBack()) {
	      return _iframe.goBack();
	    }

	    exit();
	  });

	  if (!(typeof options.exit !== 'undefined' && options.exit !== null) || options.exit) {
	    grabKey('Exit', function () {
	      if (_iframe.onKeyExit()) {
	        return _iframe.resume();
	      }

	      exit();
	    });
	  }

	  _iframe.load(function (err) {
	    if (err) {
	      restoreContext();
	    }

	    callback.call(context, err);
	    if (!err && !!streams.blur) {
	      streams.blur();
	    }
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

	R7.ready = ready;
	R7.grabKey = grabKey;
	R7.releaseKey = releaseKey;
	R7.navigate = navigate;

	R7.addStreamListener = addStreamListener;
	R7.removeStreamListener = removeStreamListener;

	R7.loadIframe = loadIframe;
	R7.exit = exit;

	// Deprecated methods
	R7.rpc = _deprecate('rpc', deprecatedRPC);
	R7.send = _deprecate('send', deprecatedRPC);
	R7.onReadyState = _deprecate('onReadyState', ready);

	// Bind global handler
	window.addEventListener('message', onMessage, false);

	exports.default = R7;

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';

	if (!Object.assign) {
	  Object.defineProperty(Object, 'assign', {
	    enumerable: false,
	    configurable: true,
	    writable: true,
	    value: function value(target) {
	      'use strict';

	      if (target === undefined || target === null) {
	        throw new TypeError('Cannot convert first argument to object');
	      }

	      var to = Object(target);
	      for (var i = 1; i < arguments.length; i++) {
	        var nextSource = arguments[i];
	        if (nextSource === undefined || nextSource === null) {
	          continue;
	        }

	        nextSource = Object(nextSource);

	        var keysArray = Object.keys(nextSource);
	        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
	          var nextKey = keysArray[nextIndex];
	          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
	          if (desc !== undefined && desc.enumerable) {
	            to[nextKey] = nextSource[nextKey];
	          }
	        }
	      }

	      return to;
	    }
	  });
	}

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict'

	/* Reserved -32000 to -32099 */
	;
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = Router;
	var ERR_INVALID_REQUEST = -32600;
	var ERR_INTERNAL = -32603;

	var hashMap = function hashMap(array, val) {
	  val = typeof val !== 'undefined' && val !== null ? val : true;
	  return (array || []).reduce(function (obj, key) {
	    obj[key] = val;
	    return obj;
	  }, {});
	};

	function Router(iframe, origin) {
	  var inProc = function inProc(e) {
	    if (e.source !== window && e.origin === origin) {
	      return e;
	    }
	  };

	  var outProc = function outProc(m) {
	    iframe.contentWindow.postMessage(m, '*');
	  };

	  // Main rpc handler.
	  var r = function r(evt) {
	    evt = inProc(evt);
	    if (!evt) {
	      return;
	    }

	    if (!a) {
	      return new Promise(function (resolve, reject) {
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
	    if (!h) {
	      h = forward(method);
	    }

	    var ret;
	    var fn = h.handler;
	    try {
	      ret = typeof fn === 'function' ? fn.call(h.context, msg.params) : fn;
	    } catch (e) {
	      ret = new Error(e);
	    }

	    return new Promise(function (resolve, reject) {
	      if (ret instanceof Error) {
	        reject(ret);
	      }

	      resolve(ret);
	    }).then(toJSON).then(function (res) {
	      respond(msg.id, res, src);
	    }, function (err) {
	      error(msg.id, ERR_INTERNAL, err, src);
	    });
	  };

	  function toJSON(data) {
	    if (!data) {
	      return null;
	    }

	    return typeof data.toJSON === 'function' ? data.toJSON() : data;
	  }

	  function respond(id, res, src) {
	    try {
	      outProc({
	        id: id,
	        result: res,
	        response: res }, // retro-compat
	      src);
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
	        message: message
	      }
	    }, src);
	    return new Promise(function (resolve, reject) {
	      reject(new Error(message));
	    });
	  }

	  // send a broadcasted message
	  function broadcast(evt, data) {
	    var msg = {};
	    var json = toJSON(data);
	    msg[evt] = typeof json === 'undefined' ? true : json;
	    outProc(msg, null);
	  }

	  // actions used by the api
	  var a = {};

	  // default action used to forward to R7
	  function forward(method) {
	    return {
	      handler: function handler(params) {
	        return new Promise(function (resolve, reject) {
	          R7(method, params, function (error, result) {
	            if (error) {
	              reject(error);
	            }

	            resolve(result);
	          });
	        });
	      }
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
	    return new Promise(function (resolve, reject) {
	      R7.navigate(route, context, function (error, result) {
	        if (error) {
	          reject(error);
	        }

	        resolve(result);
	      });
	    });
	  }

	  function registerKeys(keys) {
	    if (!keys) {
	      return;
	    }

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
	    if (!keys) {
	      return;
	    }

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
	  r.use = function (action, fn, ctx) {
	    a[action] = { handler: fn, context: ctx };
	    return r;
	  };

	  // Unregister a route.
	  r.unuse = function (action) {
	    delete a[action];
	    return r;
	  };

	  r.broadcast = broadcast;

	  r.mount = function () {
	    if (!a) {
	      a = {};
	    }

	    // if (!s) { s = _.extend({}, EventEmitter); }

	    // then bind methods
	    r.use('addStreamListener', addStreamListener);
	    r.use('navigate', navigate);

	    r.use('addKeys', registerKeys);
	    r.use('removeKeys', unregisterKeys);

	    R7.addStreamListener('focus', broadcast.bind(null, 'focus'));
	    R7.addStreamListener('blur', broadcast.bind(null, 'blur'));
	  };

	  r.unmount = function () {
	    // if (!s || !a) { return; }
	    if (!a) {
	      return;
	    }

	    // s.stopListening();
	    a = null;

	    // s = null;
	  };

	  r.onKeyBack = r.onKeyExit = null;

	  r.mount();

	  return r;
	}

/***/ }
/******/ ])
});
;