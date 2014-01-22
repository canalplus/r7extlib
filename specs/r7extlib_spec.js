var expect = chai.expect;

describe('r7extlib', function() {
  it('exists', function() {
    expect(R7).to.exist;
  });

  function keyTest(key) {
    it('has a ' + key + ' method', function() {
      expect(R7[key]).to.be.a('function');
    });
  }
  ['send', 'rpc', 'grabKey', 'releaseKey', 'onReadyState'].forEach(keyTest);
});