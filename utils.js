exports.range = function (i,j) {
  return (j
          ? Array(j-i).fill(0).map( (_, idx) => idx+i )
          : Array(i).fill(0).map( (_, idx) => idx ) );
};

exports.reversed = function (a) {
  const n = a.length;
  return range(n).map( i => a[n-i] );
};


exports.deepCopy = function (state) {
  return JSON.parse(JSON.stringify(state));
};

class InvalidToken extends Error {
  constructor (msg) {
    super(msg);
    this.name = 'InvalidToken';
  }
};
exports.InvalidToken = InvalidToken;

exports.authenticate = function (want, got) {
  if (want != got) {
    throw new InvalidToken(`Wanted token ${want}, but got ${got}`);
  }
};

exports.drop = function (a, x) {
  var i = a.indexOf(x);
  if(i != -1) {
    a.splice(i, 1);
    return true;
  } else { return false; }
};

