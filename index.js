var flat = require("./lib/flat"),
dict = require("./lib/dict");

exports.NodeMongoRdf = function(wrapper, db, host, port){
	if (wrapper === "flat")
		return flat.NodeMongoRdfFlat(db, host, port);
	else if (wrapper === "dict")
		return dict.NodeMongoRdfDict(db, host, port);
	else
		throw new Error("Invalid wrapper argument.");
};