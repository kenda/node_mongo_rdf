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
  "http://example.org/about2" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Tom Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superman" : [ { "value" : "Gerad Wilder", "lang" : "de" } ]
  }
};

/**
 * @class
 */
var NodeMongoRdfFlat = function(db, host, port){

  // Defining the schemas
  var RDFTriple = new Schema({
    subject: { type: String, unique: true },
    predicates: [RDFPredicate]
  });

  var RDFPredicate = new Schema({
    uri: { type: String, unique: true },
    objects: [RDFObject]
  });

  var RDFObject = new Schema({
    value: String,
    type: String,
    lang: { type: String, required: false },
  });

  // Connecting to the database
  host = host !== undefined ? host : "localhost";
  port = port !== undefined ? port : 27017;
  mongoose.connect("mongodb://" + host + ":" + port + "/" + db);

  // Initializing a new model
  mongoose.model('RDFTriple', RDFTriple );
  var RDFTripleModel = mongoose.model('RDFTriple');

  /**
   * Function for converting RDF/json to Flat Objects.
   * @param {Object} rdf The rdf/json object which will be converted.
   * @returns {Object} The converted rdf/json object in flat structure.
   */
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

  /**
   * Function for converting Flat Objects to RDF/json.
   * @param {Object} flat The flat object which will be converted.
   * @returns {Object} The converted flat object in rdf/json structure.
   */
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
    /**
     * Method for saving documents to the database.
     *
     * If a document is already stored, this method
     * merges the existing with the new document.
     * If a new predicate is found it will be simply pushed
     * with all the objects.
     * If a existing predicate is found the function checks each
     * object of the predicate whether the key 'value' is already·
     * stored. If not so the object will be pushed to the predicate.
     * Otherwise the object is already stored and non existing keys·
     * will be pushed to this object.
     * @param {Object} rdf_triple The triple to insert in rdf/json
     * @param {function} callback function(error)
     */
    insert: function(rdf_triple, callback){
              // calling save() of an object inside an find callback
              // doesn't seem to work, so we have to use two identical
              // objects here
              obj = new RDFTripleModel();
              obj2 = new RDFTripleModel();

              obj.doc = _rdf_json_to_flat(rdf_triple);
              obj.save(function(err){
                if (err){
                  // Document already stored
                  if (err.message.indexOf('E11000 ') !== -1) {

                    // get existing document
                    RDFTripleModel.findOne({subject: obj.doc.subject}, function(err, doc){
                      if (err) callback(err);

                      // check whether there are new predicates
                      exist_pred_uris = {};
                      // collect all existing predicate uris
                      for (pred in doc.doc.predicates){
                        if (uri = doc.doc.predicates[pred].uri !== undefined)
                          exist_pred_uris[doc.doc.predicates[pred].uri]=pred;
                      }
                      // compare predicate uris of the new triple with the
                      // existing ones
                      for (pred in obj.doc.predicates){
                        // if a new predicate is found - push it 
                        if ( (obj.doc.predicates[pred].uri in exist_pred_uris) == false ){
                          doc.doc.predicates.push(obj.doc.predicates[pred]);
                        }
                        else{
                          // predicate already stored - check for different
                          // objects
                          for (new_object in obj.doc.predicates[pred].objects){
                            for (exist_object in doc.doc.predicates[exist_pred_uris[obj.doc.predicates[pred].uri]].objects){
                              // if the value key differs mark the object for
                              // pushing
                              if (doc.doc.predicates[exist_pred_uris[obj.doc.predicates[pred].uri]].objects[exist_object].value !== obj.doc.predicates[pred].objects[new_object].value){
                                push=true;
                              }
                              else{
                                // object with same value key already stored -
                                // check for new attributes
                                for (key in obj.doc.predicates[pred].objects[new_object]){
                                  // console.log("comparing:"+key);
                                  // console.log(obj.doc.predicates[pred].objects[object]);
                                  // console.log(doc.doc.predicates[exist_pred_uris[obj.doc.predicates[pred].uri]].objects[exist_object]);
                                  // console.log("#############");

                                  if (doc.doc.predicates[exist_pred_uris[obj.doc.predicates[pred].uri]].objects[exist_object][key] === undefined){
                                    // key don't exist - set it
                                    doc.doc.predicates[exist_pred_uris[obj.doc.predicates[pred].uri]].objects[exist_object][key] = obj.doc.predicates[pred].objects[object][key]
                                  }
                                  // because we found an object with the same
                                  // value key we don't have to push it anymore
                                  push=false;
                                }
                              }
                            }
                            // push new object to document
                            if (push==true)
                              doc.doc.predicates[exist_pred_uris[obj.doc.predicates[pred].uri]].objects.push(obj.doc.predicates[pred].objects[new_object]);
                          }
                        }
                      }
                      // console.log(doc.doc.predicates[0].objects);
                      // HACK calling doc.save() doesn't work so we replace the
                      // existing document
                      obj2.doc = doc.doc;
                      doc.remove(function(err){
                          if (err) callback(err);
                          obj2.save(function(err){
                            if (err) callback(err)
                          });
                      });
                    });
                  }
                  else callback(err);
                }
              });
            },

    /**
     * Method for replacing existing documents in the database.
     *
     * Inserts if the new subject uri isn't stored yet,
     * else replaces the existing document with the new one.
     * @param {Object} rdf_triple The triple to insert in rdf/json
     * @param {function} callback function(error)
     */
    replace: function(rdf_triple, callback){
               // Because saving the same object two times in the
               // same scope doesn't work, we have to use two 
               // identical objects here.
               obj = new RDFTripleModel();
               obj2 = new RDFTripleModel();

               obj.doc = _rdf_json_to_flat(rdf_triple);
               obj2.doc = _rdf_json_to_flat(rdf_triple);
               obj.save(function(err){
                 if (err){
                   if (err.message.indexOf('E11000 ') !== -1) {
                     // Document already stored
                     RDFTripleModel.findOne({subject: obj.doc.subject}, function(err, doc){
                       if (err) callback(err);
                       doc.remove(function(err){
                         if (err) callback(err);
                         obj2.save(function(err){
                           if (err) callback(err);
                         });
                       });
                     });
                   }
                   else callback(err);
                 }
               });
             },

    /**
     * Method for querying one specific document.
     */
    findOne: function(callback){
               RDFTripleModel.findOne( function(err, doc){
                 if (err) callback(err);
                 else callback(null, _flat_to_rdf_json(doc));
               });
             },

    /**
     * Method which returns the native Mongoose Model instance.
     *
     * Therefore you can use all native methods that are not
     * implemented by node_mongo_rdf.
     * @returns {Object} mongoose.Model instance
     */
    getModel: function(){
                return RDFTripleModel;
              }
  }
}

/* Test snippet */

test = NodeMongoRdfFlat("test");

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

// test.getModel().count({},function(err, count){
//   if (err) console.log(err);
//   else console.log(count);
// });

//mongoose.disconnect();

// vim: set tw=79 sw=2 ts=2 sts=2:
