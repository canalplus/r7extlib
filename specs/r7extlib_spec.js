(function(R7, chai, sinon) {
  'use strict';

  var expect = chai.expect;

  function onMessage() {
    var proto = function(e) {
      var data = e.data;
      if (data.result) {
        proto.onResult(data);
      } else if (data.error) {
        proto.onError(data);
      } else if (data.method) {
        proto.onRequest(data);
      }
    };

    return proto;
  }

  function sendResponse(id, res) {
    window.postMessage({
      id: id,
      result: res,
    }, '*');
  }

  function sendError(id, message, code) {
    window.postMessage({
      id: id,
      error: { code: code || 42, message: message, },
    }, '*');
  }

  describe('r7extlib', function() {

    beforeEach(function() {
      this.handler = onMessage();
      window.addEventListener('message', this.handler);
    });

    afterEach(function() {
      window.removeEventListener('message', this.handler);
    });

    it('exists', function() {
      expect(R7).to.be.ok;
    });

    it('has methods', function() {
      ['ready', 'send', 'rpc', 'grabKey', 'releaseKey', 'onReadyState', 'addStreamListener'].forEach(function(meth) {
          expect(R7[meth]).to.be.a('function');
        });
    });

    describe('on successful RPCs', function() {
      var onResult;
      var onRequest;
      var onError;

      beforeEach(function() {
        onResult = this.handler.onResult = sinon.spy();
        onError = this.handler.onError = sinon.spy();
      });

      it('should send a request with params', function(done) {
        onRequest = this.handler.onRequest = sinon.spy(function(data) {
          expect(data.method).to.equal('foo');
          expect(data.params).to.eql({bar: 'baz'});
          sendResponse(data.id, 'laréponse1');
        });

        R7('foo', { bar: 'baz' }, function(err, res) {
          expect(err).not.to.be.ok;
          expect(res).to.be.ok;
          expect(res).to.equal('laréponse1');
          done();
        });
      });

      it('should send a request without params', function(done) {
        onRequest = this.handler.onRequest = sinon.spy(function(data) {
          expect(data.method).to.equal('foo');
          expect(data.params).not.to.be.ok;
          sendResponse(data.id, 'laréponse2');
        });

        R7('foo', function(err, res) {
          expect(err).not.to.be.ok;
          expect(res).to.be.ok;
          expect(res).to.equal('laréponse2');
          done();
        });
      });

      it('should handle errors', function(done) {
        onRequest = this.handler.onRequest = sinon.spy(function(data) {
          sendError(data.id, 'message1');
        });

        R7('foo', function(err, res) {
          expect(err).to.be.ok;
          expect(res).not.to.be.ok;
          expect(err).to.be.instanceof(Error);
          expect(err.message).to.equal('message1');
          done();
        });
      });

      it('should be possible to pass a context', function(done) {
        onRequest = this.handler.onRequest = sinon.spy(function(data) {
          sendResponse(data.id, 'laréponse2');
        });

        var ctx = {};
        R7('foo', function() {
            expect(this).to.equal(ctx);
            done();
          }, ctx);
      });

      it('should be possible to pass a context', function(done) {
        onRequest = this.handler.onRequest = sinon.spy(function(data) {
          sendResponse(data.id, 'laréponse2');
        });

        var ctx = {};
        R7('foo', {bar: 'baz'}, function() {
          expect(this).to.equal(ctx);
          done();
        }, ctx);
      });
    });

    describe('History', function() {

      var BASE_URL = window.location.href;
      var EXAMPLE_URL_1 = BASE_URL + '#test1';
      var EXAMPLE_URL_2 = BASE_URL + '#test2';
      var EXAMPLE_URL_3 = BASE_URL + '#test3';

      var pfhistory;

      beforeEach(function() {
        pfhistory = window.__history;
        pfhistory.clear();
      });

      it('clear', function(done) {
        // Default history
        var defaultHistory = {
          stack: [window.location.href],
          state: 0,
        };

        for (var i = 0; i < pfhistory.stack.length; i++) {
          expect(pfhistory.stack[i]).to.equal(defaultHistory.stack[i]);
        }

        expect(pfhistory.state).to.equal(defaultHistory.state);
        done();
      });

      it('save', function(done) {
        pfhistory.stack[0] = EXAMPLE_URL_1;
        pfhistory.save();

        expect(pfhistory.stack[0]).to.equal(EXAMPLE_URL_1);
        expect(!!pfhistory.stack[1]).to.be.true;
        expect(pfhistory.state).to.equal(1);

        done();
      });

      it('go', function(done) {
        // set environment
        pfhistory.stack = [EXAMPLE_URL_1, EXAMPLE_URL_2, EXAMPLE_URL_3];
        pfhistory.state = 1;
        this.timeout(5000);
        var eventFired = false;

        window.addEventListener('popstate', function() {
          eventFired = true;
        });

        expect(pfhistory.go(0)).to.be.false;
        expect(pfhistory.go()).to.be.false;
        expect(pfhistory.go(5)).to.be.false;

        pfhistory.go(1);
        expect(window.location.href).to.equal(EXAMPLE_URL_3);

        pfhistory.go(-2);
        expect(window.location.href).to.equal(EXAMPLE_URL_1);

        pfhistory.go(5);
        expect(window.location.href).to.equal(EXAMPLE_URL_1);

        chai.assert(eventFired, 'Event did not fire in 1000 ms.');
        done();

      });

      it('pushState', function(done) {
        pfhistory.pushState({}, 'title', EXAMPLE_URL_1);
        expect(pfhistory.stack[pfhistory.stack.length - 1]).to.equal(EXAMPLE_URL_1);
        expect(pfhistory.state).to.equal(pfhistory.stack.length - 1);
        done();
      });

      it('replaceState', function(done) {
        pfhistory.replaceState({}, 'title', EXAMPLE_URL_1);
        expect(pfhistory.stack[pfhistory.stack.length - 1]).to.equal(EXAMPLE_URL_1);
        done();
      });
    });

  });

})(this.R7, this.chai, this.sinon);
