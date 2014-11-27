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
      result: res
    }, '*');
  }

  function sendError(id, message, code) {
    window.postMessage({
      id: id,
      error: { code: code || 42, message: message }
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
      [ 'ready', 'send', 'rpc', 'grabKey', 'releaseKey', 'onReadyState',
        'addStreamListener' ].forEach(function(meth) {
          expect(R7[meth]).to.be.a('function');
        });
    });

    describe('on successful RPCs', function() {
      var onResult, onRequest, onError;

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
        R7('foo', function() { expect(this).to.equal(ctx); done(); }, ctx);
      });

      it('should be possible to pass a context', function(done) {
        onRequest = this.handler.onRequest = sinon.spy(function(data) {
          sendResponse(data.id, 'laréponse2');
        });
        var ctx = {};
        R7('foo', {bar: 'baz'}, function() { expect(this).to.equal(ctx); done(); }, ctx);
      });
    });
  });

})(this.R7, this.chai, this.sinon);