/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses Mongoose ORM and saves the 
 * triples as flat objects.
 */

var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

/**
 * @class
 */
var NodeMongoRdfFlat = exports.NodeMongoRdfFlat = function(db, host, port){

  // Defining the schemas
  var RDFObject = new Schema({
    value: String,
    type: { type: String, 'enum': ['uri', 'literal', 'bnode'] },
    lang: { type: String, required: false },
    datatype: { type: String, required: false }
  });

  var RDFPredicate = new Schema({
    uri: { type: String }, //unique: true },
    objects: [RDFObject]
  });

  var RDFTriple = new Schema({
    subject: { type: String, unique: true },
    predicates: [RDFPredicate]
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
   * @returns {Array} An array of the converted rdf/json objects in flat structure.
   */
  function _rdf_json_to_flat(rdf){
    flats = [];
    for (subject in rdf){
      flat = {};
      flat.subject = subject;
      flat.predicates = [];
      for (predicate in rdf[subject]){
        // for (object in p = rdf[subject][predicate]){
        //   var objects = [];
        //   objects.push(p[object]);
        // }
        flat.predicates.push({'uri': predicate, 'objects': rdf[subject][predicate]});
      }
      flats.push(flat);
    }
    return flats;
  }

  /**
   * Function for converting Flat Objects to RDF/json.
   * @param {Object} flat The flat object which will be converted.
   * @returns {Object} The converted flat object in rdf/json structure.
   */
  function _flat_to_rdf_json(flats){
    rdf = {};
    flats.forEach(function(flat){
      rdf[flat.subject] = {};
      flat.predicates.forEach(function(p){
        if (p.doc.uri !== undefined){
          rdf[flat.subject][p.doc.uri] = [];
          if (p.doc.objects !== undefined){
            p.doc.objects.forEach(function(o){
              rdf[flat.subject][p.doc.uri].push(o.doc);
            });
          }
        }
      });
    });
    return rdf;
  }

  /**
   * @lends NodeMongoRdfFlat
   */
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
              triples = _rdf_json_to_flat(rdf_triple);
              triples.forEach(function(triple, triple_count){
                var obj = new RDFTripleModel();
                  obj.doc = triple;
                  obj.save(function(err){
                    if (err){
                      // Document already stored
                      if (err.message.indexOf('E11000 ') !== -1) {

                        // get existing document
                        RDFTripleModel.findOne({subject: obj.doc.subject}, function(err, doc){
                          if (err) callback(err);

                          var update;

                          // check whether there are new predicates
                          exist_pred_uris = {};
                          // collect all existing predicate uris
                          doc.doc.predicates.forEach(function(pred, pred_count){
                            if (pred.uri !== undefined)
                              exist_pred_uris[pred.uri] = pred_count;
                          });
                          // compare predicate uris of the new triple with the
                          // existing ones
                          obj.doc.predicates.forEach(function(pred, pred_count){
                            // if a new predicate is found - push it 
                            if ( (pred.uri in exist_pred_uris) === false ){
                              update = true;
                              doc.doc.predicates.push(pred);
                            }
                            else{
                              var push;
                              // predicate already stored - check for different
                              // objects
                              pred.objects.forEach(function(new_object){
                                var stop = false;
                                var exist_object_count = doc.doc.predicates[exist_pred_uris[pred.uri]].objects.length;

                                doc.doc.predicates[exist_pred_uris[pred.uri]].objects.forEach(function(exist_object ){
                                  if (!stop){
                                    if ( (exist_object.doc.value === new_object.value) && (exist_object.doc.lang === new_object.lang) ){
                                        console.log("2");
                                        // object with same value key already stored -
                                        // check for new attributes
                                        for (key in new_object){
                                          if (exist_object.doc[key] === undefined){
                                            console.log("3");
                                            // key don't exist - set it
                                            exist_object.doc[key] = new_object[key];
                                            //TODO updated in doc.save() nicht
                                            update = true;
                                          }
                                          else{
                                            // because we found an object with the same
                                            // value key we don't have to push it anymore
                                            push = false;
                                            stop = true;
                                          }
                                        }
                                        exist_object_count--;
                                      }
                                      // if the value key differs push the new objects
                                      else{
                                        console.log("1");
                                        push = true;
                                        exist_object_count--;
                                      }
                                      if ( (exist_object_count === 0) && (push === true) ){
                                          // push new object to document
                                          update = true;
                                          doc.doc.predicates[exist_pred_uris[pred.uri]].objects.push(new_object);
                                      }
                                  }
                                });
                              });
                            }
                          });
                          console.log(update);
                          if (update === true){
                            console.log(doc.doc.predicates[1].doc.objects[1]);
                            doc.save(function(err){
                              if (err) callback(err);
                            });
                          }
                        });
                      }
                      else callback(err);
                    }
                    else callback(err);
                  });
                  if (triple_count == triples.length-1)
                    callback(null);
              });
            },

    /**
     * Method for replacing existing documents in the database.
     *
     * Inserts if the new subject uri isn't stored yet,
     * else replaces the existing document with the new one.
     * @param {Object} rdf_triple The triple to insert in rdf/json
     * @param {function} callback function(error){}
     */
    replace: function(rdf_triple, callback){
               // Because saving the same object two times in the
               // same scope doesn't work, we have to use two 
               // identical objects here.
               // TODO upsert testen
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
    findOne: function(query, callback){
               RDFTripleModel.findOne(query, function(err, doc){
                 // console.log(doc.doc.predicates);
                 if (err) callback(err);
                 else callback(null, _flat_to_rdf_json([doc]));
               });
             },

    /**
     * Method for querying the documents with a given subject.
     * @param {String} subject The subject of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
    findBySubject: function(subject, callback){

                     RDFTripleModel.find({subject: subject}, function(err, docs){
                       // console.log(docs);
                       if (err) callback(err);
                       else callback(null, _flat_to_rdf_json(docs));
                     });
                   },

    /**
     * Method for querying the documents with a given subject.
     * This query additionally adds all documents to the result set
     * that are referred by an object of type 'uri'.
     * @param {String} subject The subject of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
                   findBySubjectDeep: function(subject, callback){

                     RDFTripleModel.find({subject: subject}, function(err, docs){
                       if (err) callback(err);
                         else{
                           // safe the number of documents before new ones may be
                           // pushed
                           var docs_length = docs.length;

                           docs.forEach(function(doc, doc_count){
                             doc.predicates.forEach(function(pred, pred_count){
                               pred.objects.forEach(function(obj, obj_count){

                                 // if an object type 'uri' is found we look
                                 // for the referred document
                                 if (obj.type === 'uri'){
                                   RDFTripleModel.findOne({subject: obj.value}, function(err, doc){
                                     if (err) callback(err);
                                     else if (doc){
                                         // push the document to the result set
                                         docs.push(doc);

                                         // after the last object is done
                                         // return the result set
                                         if (
                                           ((doc_count + 1) == docs_length) &&
                                           ((pred_count +1) == doc.predicates.length) &&
                                           ((obj_count + 1) == pred.objects.length)
                                         ){
                                           callback(null, _flat_to_rdf_json(docs));
                                         }
                                       }
                                   });
                                 }
                               });
                             });
                           });
                         }
                     });
                   },

    /**
     * Method for querying the documents with a given subject and
     * a predicate.
     * @param {String} subject The subject of the rdf triple. 
     * @param {String} predicate The predicate of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
    findBySubjectPredicate: function(subj, pred, callback){
                              query = {subject: subj, "predicates.uri": pred};
                              RDFTripleModel.find(query, function(err, docs){
                                // console.log(docs);
                                if (err) callback(err);
                                callback(null, _flat_to_rdf_json(docs));
                              });
                            },
    /**
     * Method for querying the documents with a given predicate and
     * a value of the matching object.
     * @param {String} predicate The predicate of the rdf triple. 
     * @param {String} value The objects value of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
    findByPredicateValue: function(pred, value, callback){
                              query = {
                                "predicates.uri": pred, 
                                "predicates.objects.value": value
                              };
                              RDFTripleModel.find(query, function(err, docs){
                                if (err) callback(err);
                                callback(null, _flat_to_rdf_json(docs));
                              });
                            },

    /**
     * Method for querying the documents with a given value of an object.
     * @param {String} value The objects value of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
    findByValue: function(value, callback){
                              query = {
                                "predicates.objects.value": value
                              };
                              RDFTripleModel.find(query, function(err, docs){
                                if (err) callback(err);
                                callback(null, _flat_to_rdf_json(docs));
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
  };
};

//mongoose.disconnect();

// vim: set tw=79 sw=2 ts=2 sts=2:
