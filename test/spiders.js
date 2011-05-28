// Testing the caucasus_spiders data.

var fs  = require("fs"),
mongo_rdf = require("../index");

foo = mongo_rdf.NodeMongoRdf("flat", "test");

console.log("starting.");
fs.readFile("caucasus-spiders.2k.json", function(err, data){
    if (err) console.log(err);

    count=0;
    rdf = JSON.parse(data);
    for (key in rdf)
        count++;

    console.log("Source DS: "+count);

    start = new Date();
    foo.insert(rdf, function(err){
        if (err) console.log(err);
        ende = new Date();
        console.log("finished. "+(ende-start)/1000)+"s";
    });
    // foo.findBySubject("http://db.caucasus-spiders.info/genus/308", function(err, data){
    //     ende = new Date();
    //     console.log(err, data);
    //     console.log("finished. "+(ende-start)/1000)+"s";
    // });
    // foo.findByValue("Minosiella", function(err, data){
    //     ende = new Date();
    //     console.log(err, data);
    //     console.log("finished. "+(ende-start)/1000)+"s";
    // });
    // foo.findByPredicateValue("http://www.w3.org/2000/01/rdf-schema#label", "Minosiella", function(err, data){
    //     ende = new Date();
    //     console.log(err, data);
    //     console.log("finished. "+(ende-start)/1000)+"s";
    // });
    // foo.findBySubjectPredicate("http://db.caucasus-spiders.info/genus/308", "http://www.w3.org/2000/01/rdf-schema#label", function(err, data){
    //     ende = new Date();
    //     console.log(err, data);
    //     console.log("finished. "+(ende-start)/1000)+"s";
    // });
});
