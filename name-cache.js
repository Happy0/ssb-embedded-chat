const pull = require('pull-stream');
const get = require('lodash/get');

const nameCache = {

};

let cacheClearerInitialised = false;

module.exports = (sbot, getDisplayNameCb) => {

  function clearCacheEntriesOnNewName() {
    const aboutTypeStream = sbot.messagesByType({
      type: "about",
      live: true,
      gte: Date.now() - 60000
    })

    pull(aboutTypeStream, pull.drain(msg => {
      let about = get(msg, 'value.content.about');

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
