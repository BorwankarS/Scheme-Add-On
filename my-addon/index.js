var self = require("sdk/self");
var tabs = require("sdk/tabs");


tabs.on('ready', function(tab) {
  var worker = tab.attach({
      contentScriptFile: [self.data.url("peg-0.9.0.js"),self.data.url("my-script.js")]
  });
});
