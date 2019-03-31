'use strict';

var should = require('chai').should();
var myntcore = require('../');

describe('Library', function() {
  it('should export primatives', function() {
    should.exist(myntcore.crypto);
    should.exist(myntcore.encoding);
    should.exist(myntcore.util);
    should.exist(myntcore.errors);
    should.exist(myntcore.Address);
    should.exist(myntcore.Block);
    should.exist(myntcore.MerkleBlock);
    should.exist(myntcore.BlockHeader);
    should.exist(myntcore.HDPrivateKey);
    should.exist(myntcore.HDPublicKey);
    should.exist(myntcore.Networks);
    should.exist(myntcore.Opcode);
    should.exist(myntcore.PrivateKey);
    should.exist(myntcore.PublicKey);
    should.exist(myntcore.Script);
    should.exist(myntcore.Transaction);
    should.exist(myntcore.URI);
    should.exist(myntcore.Unit);
  });
});
