const combine = require("depject");
const nest = require("depnest");
const patchcore = require("patchcore");

const names = {
  needs: nest({
    "about.obs": "first"
  })
}

var api = combine(names, patchcore);

module.exports = (id) => {
  return api.about.obs.name[0](id);
}
