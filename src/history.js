(function(exports) {
  'use strict';

  // Only for boxes (History and its prototype must be rewritten). In chrome, we can only extend prototype
  try {
    window.history = function() {};
  } catch (e) {
    console.warn('window.history is readonly. History will not be fully available.');
    console.warn(e);
    return;
  }

  var _ = require('lodash');

  // Check if SessionStorage is available
  var __sessionStorage = window.sessionStorage;
  var hasSessionStorage = function() {
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

  if (!hasSessionStorage()) {
    console.error('window.sessionStorage not available! History will not be fully available.');
    return;
  }

  // SessionStorage is available ...

  // Default history
  var __defaultHistory = {
    stack: [window.location.href],
    state: 0,
  };

  // Get history stored in sessionStorage or set the defaultHistory
  var __history = (function() {
    return JSON.parse(__sessionStorage.getItem('R7History'));
  })() || _.cloneDeep(__defaultHistory);

  __history.clear = function() {
    var cpyDefaultHistory = _.cloneDeep(__defaultHistory);
    _.extend(__history, cpyDefaultHistory);
    __history.save();
  };

  /**
   * Save the current page
   * @method function
   */
  __history.save = function() {
    // If access another page
    if (this.stack[this.state] !== window.location.href) {

      // delete last entries (case we did some backs before)
      this.stack.length = this.state + 1;

      this.stack.push(window.location.href);
      this.state = this.stack.length - 1;
    }

    return __sessionStorage.setItem('R7History', JSON.stringify(this));
  };

  /**
   * go implementation
   * @method function
   * @param  {Integer} n can positive or negative
   */
  __history.go = function(n) {
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
      popStateEvent = new CustomEvent('popstate', {state: {url: this.stack[newState]}});
      window.dispatchEvent(popStateEvent);
    } else {
      popStateEvent = document.createEvent('Event');
      popStateEvent.initEvent('popstate', true, true, {state: {url: this.stack[newState]}});
      window.dispatchEvent(popStateEvent);
    }
  };

  /**
   * pushState implementation
   * @method function
   * @param  {Object} stateObj not implemented yet
   * @param  {String} title    not implemented yet
   * @param  {String} url      url to push in history
   */
  __history.pushState = function(stateObj, title, url) {
    if (!url) {
      return;
    }

    this.stack.push(url);
    this.state = this.stack.length - 1;
    return __sessionStorage.setItem('R7History', JSON.stringify(this));
  };

  /**
   * replaceState implementation
   * @method function
   * @param  {Object} stateObj not implemented yet
   * @param  {String} title    not implemented yet
   * @param  {String} url      url to push in history
   */
  __history.replaceState = function(stateObj, title, url) {
    if (!url) {
      return;
    }

    this.stack[this.state] = url;
    return __sessionStorage.setItem('R7History', JSON.stringify(this));
  };

  var __isBox = window.history instanceof Function;

  if (__isBox) {
    window.History = function() {};

    window.History.prototype = {};
  }

  Object.defineProperties(window.History.prototype, {
    init: {
      value: function(clear) {
        clear ? __history.clear() : __history.save();
      },
    },

    save: {
      value: function() {
        __history.save();
      },
    },

    state: {
      get: function() {
        return __history.state;
      },
    },

    go: {
      value: function(n) {
        __history.go(n);
      },
    },

    back: {
      value: function() {
        __history.go(-1);
      },
    },

    forward: {
      value: function() {
        __history.go(1);
      },
    },

    length: {
      get: function() {
        return __history.stack.length;
      },
    },

    pushState: {
      value: function(stateObj, title, url) {
        __history.pushState(stateObj, title, url);
      },
    },

    replaceState: {
      value: function(stateObj, title, url) {
        __history.replaceState(stateObj, title, url);
      },
    },

  });

  //Only for boxes (History and its prototype must be rewritten).
  if (__isBox) {
    try {
      window.history = new window.History();
    } catch (e) {
      console.warn(e);
    }
  }

  window.addEventListener(
    'hashchange', function() {
      try {
        history.save();
      } catch (e) {
        console.log(e);
      }
    },
    false
  );

  if (window.Backbone && window.Backbone.history) {
    window.Backbone.history.history = window.history;
  }

  exports.history = window.history;

  //used for debug an unit tests
  window.__history = __history;
  exports.__history = window.__history;

})(this);
