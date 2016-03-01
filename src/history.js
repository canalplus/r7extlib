'use strict';

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

if (hasSessionStorage()) {
  // SessionStorage is available ...

  // Default history
  var __defaultHistory = {
    stack: [window.location.href],
    state: 0,
  };

  // Get history stored in sessionStorage or set the defaultHistory
  var __history;
  try {
    __history = JSON.parse(__sessionStorage.getItem('R7History'));
  } catch (e) {
  }

  __history = __history || {...{}, ...__defaultHistory};

  __history.clear = function() {
    __history.save();
  };

  /** @function
   * Save the current page
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

  /** @function
   * go implementation
   *
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
      popStateEvent = new CustomEvent('popstate', {
        state: {url: this.stack[newState]},
      });
      window.dispatchEvent(popStateEvent);
    } else {
      popStateEvent = document.createEvent('Event');
      popStateEvent.initEvent('popstate', true, true, {
        state: {url: this.stack[newState]},
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
  __history.pushState = function(stateObj, title, url) {
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
  __history.replaceState = function(stateObj, title, url) {
    if (!url) {
      return;
    }

    this.stack[this.state] = url;
    return __sessionStorage.setItem('R7History', JSON.stringify(this));
  };

  // Only for boxes (History and its prototype must be rewritten). In chrome, we can only extend prototype
  window.history = function() {
  };

  var __isBox = window.history instanceof Function;

  if (__isBox) {
    window.History = function() {
    };

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

  //used for debug an unit tests
  window.__history = __history;

  //Only for boxes (History and its prototype must be rewritten).
  if (__isBox) {
    window.history = new window.History();
  }

  window.addEventListener('hashchange', function() {
    history.save();
  }, false);

  if (window.Backbone && window.Backbone.history) {
    window.Backbone.history.history = window.history;
  }
} else {
  console.warn(
    'History can not be rewritten: window.sessionStorage not available!'
  );
}
