const pull = require('pull-stream');

const nameCache = {

};

let cacheClearerInitialised = false;

module.exports = (aboutSelfChangeStream, getDisplayNameCb) => {

  function clearCacheEntriesOnNewName() {
    const aboutTypeStream = aboutSelfChangeStream(Date.now() - 60000);

    pull(aboutTypeStream, pull.drain(about => {

      if (about && nameCache[about]) {
        delete nameCache[about];
      }
    }))
  }

  if (!cacheClearerInitialised) {
    cacheClearerInitialised = true;
    clearCacheEntriesOnNewName();
  }

  return {
    getDisplayName: (id, cb) => {

    const cacheHit = nameCache[id];

    if (cacheHit) {
      cb(null, cacheHit);
    } else {
      getDisplayNameCb(id, (err, result) => {
        nameCache[id] = result;
        cb(err, result);
      });
    }

  }
  }
}
