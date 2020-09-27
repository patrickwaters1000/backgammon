const sqlite = require('sqlite3').verbose();

exports.connect = function () {
  let db = new sqlite.Database(
    './db/primary.db',
    sqlite.OPEN_READWRITE,
    err => {
      if (err) {
	console.log(err);
      }
    }
  );
  return db;
};

/*
exports.query = function (db, sql) {
  const p = new Promise( (res, rej) => {
    db.all(
      sql,
      [],
      (err, rows) => {
	if (err) { rej(err); }
	else { res(rows); }
      }
    );
  });
  return p;
}
*/
