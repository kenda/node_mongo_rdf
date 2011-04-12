var fs  = require("fs"),
    rdf = require("./lib/flat");

// Default RDF/json triple
var rdf_trip_default1 = {
  "http://example.org/about" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
  }
};
var rdf_trip_default2 = {
  "http://example.org/about2" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Tom Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superman" : [ { "value" : "Gerad Wilder", "lang" : "de" } ]
  }
};

test = rdf.NodeMongoRdfFlat("test");

// console.log("starting.");
// fs.readFile("caucasus-spiders.json", function(err, data){
//     if (err) console.log(err);
//     // console.log(data);
//     rdf = JSON.parse(data);
//     // console.log(rdf);
//     start = new Date();
//     test.insert(rdf, function(err){
//         if (err) console.log(err);
//         ende = new Date();
//         console.log("finished. "+(ende-start)/1000)+"s";
//     });
// });

// test.insert(rdf_trip_default1, function(err){
//   if (err) console.log(err.message);
// });
// test.insert(rdf_trip_default2, function(err){
//   if (err) console.log(err.message);
// });
// 
// test.findOne({}, function(err, doc){
//  if (err) console.log(err);
//  else console.log(doc);
// })

test.getModel().count({},function(err, count){
  if (err) console.log(err);
  else console.log(count);
});
