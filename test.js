var fs  = require("fs"),
    rdf = require("./lib/flat");

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
