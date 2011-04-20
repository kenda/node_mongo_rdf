// Testing the caucasus_spiders data.

var fs  = require("fs"),
    flat = require("../lib/flat"),
    dict = require("../lib/dict");

dict = dict.NodeMongoRdfDict("test");
flat = flat.NodeMongoRdfFlat("test");

console.log("starting.");
fs.readFile("caucasus-spiders.tiny.json", function(err, data){
    if (err) console.log(err);

    count=0;
    rdf = JSON.parse(data);
    for (key in rdf)
        count++;

    console.log("Source DS: "+count);

    start = new Date();
    flat.insert(rdf, function(err){
        // if (err) console.log(err);
        ende = new Date();
        console.log("finished. "+(ende-start)/1000)+"s";
    });
    // dict.insert(rdf, function(err){
    //     // if (err) console.log(err);
    //     ende = new Date();
    //     console.log("finished. "+(ende-start)/1000)+"s";
    // });
});
