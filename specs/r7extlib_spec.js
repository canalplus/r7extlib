var expect = chai.expect;

describe('r7extlib', function() {

  it('exists', function() {
    expect(R7).to.exist;
  });

  describe('has method:', function() {
    function keyTest(key) {
      it(key, function() {
        expect(R7[key]).to.be.a('function');
      });
    }
    var methodNames = [
      'send', 'rpc', 'grabKey', 'releaseKey', 'onReadyState',
      'addStreamListener'
    ];
    methodNames.forEach(keyTest);
  });

});