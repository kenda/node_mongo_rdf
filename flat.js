/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses Mongoose ORM and saves the 
 * triples as flat objects.
 */

var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

// Default RDF/json triple
var rdf_trip_default1 = {
  "http://example.org/about" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
  }
};
var rdf_trip_default2 = {
  "http://example.org/about" : {
    "http://purl.org/dc/elements/1.1/superman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ]
  }
};

var NodeMongoRdfFlat = function(db, host, port){
  // TODO setting indices
  //   - subject
  //   - predicates.uri

  // Defining the schemas
  var RDFTriple = new Schema({
    subject: String,
    predicates: [RDFPredicate]
  });

  var RDFPredicate = new Schema({
    uri: String,
    objects: [RDFObject]
  });

  var RDFObject = new Schema({
    value: String,
    type: String,
    lang: { type: String, required: false }
  });

  // Connecting to the database
  host = host !== undefined ? host : "localhost";
  port = port !== undefined ? port : 27017;
  mongoose.connect("mongodb://" + host + ":" + port + "/" + db);

  // Initializing a new model
  mongoose.model('RDFTriple', RDFTriple );
  var RDFTripleModel = mongoose.model('RDFTriple');

  // Function for converting RDF/json to Flat Objects
  function _rdf_json_to_flat(rdf){
    for (subject in rdf){
      flat = {};
      flat.subject = subject;
      flat.predicates = [];
      for (predicate in rdf[subject]){
        for (object in p = rdf[subject][predicate]){
          var objects = [];
          objects.push(p[object]);
        }
        flat.predicates.push({'uri': predicate, 'objects': objects});
      }
    }
    return flat;
  }

  // Function for converting Flat Objects to RDF/json
  function _flat_to_rdf_json(flat){
    rdf = {};
    rdf[flat.subject] = {};
    for (p in flat.predicates){
      if (flat.predicates[p].uri !== undefined){
        rdf[flat.subject][flat.predicates[p].uri] = [];
        for (o in flat.predicates[p].objects){
          rdf[flat.subject][flat.predicates[p].uri].push(flat.predicates[p].objects[o]);
        }
      }
    }
    return rdf;
  }

  return {
    // Method for saving documents to the database
    // If a document is already stored, this method
    // merges the existing with the new document.
    insert: function(rdf_triple, callback){
              obj = new RDFTripleModel();

              obj.doc = _rdf_json_to_flat(rdf_triple);
              obj.save(function(err){
                if (err){
                  if (err.message.indexOf('E11000 ') !== -1) {
                    // Document already stored

                    // get existing document
                    RDFTripleModel.findOne({subject: obj.doc.subject}, function(err, doc){
                      if (err) callback(err);

                      // check whether there are new predicates
                      exist_pred_uris = {};
                      // collect all existing predicate uris
                      for (pred in doc.doc.predicates){
                        if (uri = doc.doc.predicates[pred].uri !== undefined)
                          exist_pred_uris[doc.doc.predicates[pred].uri]=1;
                      }

                      // compare predicate uris of the new triple with the
                      // existing ones
                      for (pred in obj.doc.predicates){
                        // if a new predicate is found - push it 
                        // FIXME pusht unter Umständen doppelt
                        if ( (obj.doc.predicates[pred].uri in exist_pred_uris) == false ){
                          console.log("neues Prädikat");
                          doc.doc.predicates.push(obj.doc.predicates[pred]);
                        }
                        else{
                          // TODO else compare the objects
                          console.log("altes Prädikat");
                        }
                      }
                      doc.save(function(err){
                          if (err) callback(err);
                      });
                    });
                  }
                  else callback(err);
                }
              });
            },

    // Method for replacing existing documents in
    // the database.
    // Inserting if the new subject uri isn't stored yet,
    // else replacing the existing document with the new one.
    replace: function(rdf_triple, callback){
               obj = new RDFTripleModel();

               obj.doc = _rdf_json_to_flat(rdf_triple);
               obj.save(function(err){
                 if (err){
                   callback(err);
                   if (err.message.indexOf('E11000 ') !== -1) {
                     // Document already stored
                     RDFTripleModel.findOne({subject: obj.doc.subject}, function(err, doc){
                       if (err) console.log(err);
                       doc.remove(function(err){
                         if (err) callback(err);
                         // FIXME save() wird nicht ausgeführt
                         obj.save(function(err){
                           if (err) callback(err);
                         });
                       });
                     });
                   }
                 }
               });
             },

    // Method for querying one specific document
    findOne: function(query, callback){
               RDFTripleModel.findOne( function(err, doc){
                 if (err) callback(err);
                 if (doc) callback(null, _flat_to_rdf_json(doc));
               });
             }
  }
}

/* Test snippet */

test = NodeMongoRdfFlat("test");

//test.insert(rdf_trip_default1, function(err){
//  if (err) console.log(err.message);
//});
test.replace(rdf_trip_default2, function(err){
  if (err) console.log(err.message);
});

//test.findOne({}, function(err, doc){
//  if (err) console.log(err);
//  else console.log(doc);
//})

//mongoose.disconnect();

// vim: set tw=79 sw=2 ts=2 sts=2:
