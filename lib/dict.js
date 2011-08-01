/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses the native MongoDB driver and saves the 
 * triples in two collections.
 */

var mongodb = require('mongodb');
var sys = require("sys");

/**
 * @class
 */
var NodeMongoRdfDict = exports.NodeMongoRdfDict = function(db, host, port ){

  // Connecting to the database
  host = host !== undefined ? host : "localhost";
  port = port !== undefined ? port : 27017;

  // connecting to the database
  var db = new mongodb.Db("test", new mongodb.Server(host, port, {}));
  db.open(function(err, db) {
    if ( err ) console.log( err );
  });

  // creating collections
  var uri_coll;
  db.collection('uri', function(err, uri_coll_){
    if (err) console.log(err);
    uri_coll = uri_coll_;
  });
  db.ensureIndex("uri", "uri", {background:true, unique:true}, function(){});

  var triple_coll;
  db.collection('triple', function(err, triple_coll_){
    if (err) console.log(err);
    triple_coll = triple_coll_;
  });

  /**
   * This function handles the replacing of predicate uris
   * and inserts the triples.
   */
  function _handle_predicates(rdf_triple, id_subj, count_subj, update_only, exist_doc, callback){
    var count_pred = 0;
    for (key in rdf_triple[id_subj]){
      if (rdf_triple[id_subj].hasOwnProperty(key)) count_pred++;
    }

    for ( pred_ in rdf_triple[id_subj] ){
      (function(){
        var pred = pred_;
        process.nextTick(function(){
          // save the uris of the predicates in the uri collection
          uri_coll.insert({uri: pred}, {safe: true}, function(err, docs_pred){
            if ( err ) {
              if (err.message.indexOf('E11000 ') !== -1) {
                // console.log("3");

                // find the duplicate predicate
                uri_coll.findOne({uri: pred}, function(err, doc){
                  if (err) callback(err);
                  id_pred = doc._id;
                  
                  if (update_only){
                    // get existing document for comparison
                    query = {};
                    query[id_subj] = {$exists: true};
                    triple_coll.findOne(query, function(err, doc) {
                      if (err) callback(err);
                      exist_objects = doc[id_subj][id_pred];
                      new_objects = rdf_triple[id_subj][pred];
                      new_objects.forEach(function(new_obj){
                        var push, stop = false;
                        exist_objects.forEach(function(exist_obj){
                          if (!stop){
                            // console.log(new_obj, exist_obj);
                            if ( (exist_obj.value === new_obj.value) && (exist_obj.lang === new_obj.lang) ){
                              push = false;
                              stop = true;
                              // check for new attributes
                              for (key in new_obj){
                                if (exist_obj[key] === undefined){
                                  // TODO
                                  // key don't exist - set it
                                  criteria = {};
                                  criteria[id_subj + "." + id_pred] = {
                                    $elemMatch: {
                                      'value': new_obj.value,
                                      'lang': new_obj.lang
                                      }
                                    };

                                  objNew = {};
                                  objNew[id_subj + "." + id_pred + ".$." + key] = new_obj[key];

                                  triple_coll.update(criteria, {$set: objNew}, {safe:true}, function(err) {
                                    if (err) callback(err);
                                  });
                                }
                              }
                            }
                            else{
                              // different objects - push new one
                              push = true;
                            }
                          }
                        });
                        if (push){
                          criteria = {};
                          criteria[id_subj] = {$exists:true};

                          id = id_subj + "." + id_pred;
                          objNew = {};
                          objNew[id] = new_obj;

                          triple_coll.update(criteria, {$push: objNew}, {safe:true}, function(err) {
                            if (err) callback(err);
                          });
                        }
                      });

                    });
                  }
                  else{
                    rdf_triple[id_subj][id_pred] = rdf_triple[id_subj][pred]; 
                    delete rdf_triple[id_subj][pred];
                    count_pred--;

                    if (count_pred <= 0){
                      // save the current object to the triple collection
                      rdf_triple_part = {}
                      rdf_triple_part[id_subj] = rdf_triple[id_subj];
                      triple_coll.insert(rdf_triple_part, function(err, docs){
                        if (err) callback(err);
                        if (count_subj <= 0)
                        callback(null);
                      });
                    }
                  }
                });
              }
              else{
                callback(err);
              }
            }
            else{
              // console.log("4");
              var id_pred = docs_pred[0]._id;

              if (update_only){
                criteria = {};
                criteria[id_subj] = {$exists:true};

                id_pred = id_subj + "." + id_pred;
                objNew = {};
                objNew[id_pred] = rdf_triple[id_subj][pred];

                triple_coll.update(criteria, {$set: objNew}, {safe:true}, function(err) {
                  if (err) callback(err);
                });
              }
              else {
                rdf_triple[id_subj][id_pred] = rdf_triple[id_subj][pred];
                delete rdf_triple[id_subj][pred];
                count_pred--;

                if (count_pred <= 0){
                  // save the current object to the triple collection
                  rdf_triple_part = {}
                  rdf_triple_part[id_subj] = rdf_triple[id_subj];
                  triple_coll.insert(rdf_triple_part, function(err, docs){
                    if (err) callback(err);
                    if (count_subj <= 0)
                      callback(null);
                  });
                }
              }
            }
          });
        });
      })();
    }
  }

  /**
   * This function replaces the id's by their original uri's.
   * @param {Array} an array of result objects.
   */
  function _results_to_rdf(results, callback){
      results_clean = {};
      // retrieve uri collection from memory
      _get_uri_coll(function(uris){
        results.forEach(function(res){
            delete res._id;
            // convert foreign id's to uri
            for (key in res){
              results_clean[uris[key]] = res[key];
              // delete res[key];
              preds = results_clean[uris[key]];
              for (key in preds){
                  preds[uris[key]] = preds[key];
                  delete preds[key];
                  // console.log(res);
              };
            };
        });
      callback(results_clean);
    });
  }

  /**
   * This function retrieves the uri collection and modifies it
   * so that we can hold this collection in memory.
   */
  function _get_uri_coll(callback){
      var uris = {};
      uri_coll.find({}, function(err, docs){
          docs.each(function(err, doc){
              if (doc !== null){
                uris[doc._id] = doc.uri;
              }
              else{
                callback( uris);
              }
          });
      });
  }

  /**
   * This function represents the query for the 
   * findByPredicateValue() method.
   *
   * Because this query can't established with the native
   * find() of mongodb we need this custom function.
   * See http://www.mongodb.org/display/DOCS/Server-side+Code+Execution
   * for details.
   */
  function _query_predicate_value(pred, value){
    // return function(){
    s = 'for (subj in this){\
        for (pred in this[subj]){\
          if (pred == "'+pred+'")\
            for (obj in this[subj][pred]){\
              if (this[subj][pred][obj].value == "'+value+'") return true;\
            }\
          }\
        }\
      }';
    return s;
  }

  /**
   * This function represents the query for the 
   * findByValue() method.
   *
   * Because this query can't established with the native
   * find() of mongodb we need this custom function.
   * See http://www.mongodb.org/display/DOCS/Server-side+Code+Execution
   * for details.
   */
  function _query_value(value){
    // return function(){
    s = 'for (subj in this){\
        for (pred in this[subj]){\
            for (obj in this[subj][pred]){\
              if (this[subj][pred][obj].value == "'+value+'") return true;\
            }\
        }\
      }';
    return s;
  }

  /**
   * @lends NodeMongoRdfDict
   */
  return {
    insert: function(rdf_triple, callback){
              var count_subj = 0;
              for (key in rdf_triple){
                if (rdf_triple.hasOwnProperty(key)) count_subj++;
              }

              // save the uris of the predicates in the uri collection
              for ( var subj_ in rdf_triple ){
                (function(){
                  var subj = subj_;
                  process.nextTick(function(){
                    var id_subj, id_pred;
                    uri_coll.insert({uri: subj}, {safe: true}, function( err, docs_subj ){
                      var update_only;
                      if ( err ){
                        if (err.message.indexOf('E11000 ') !== -1) {
                          // console.log("1");
                          // following operations updates the existing object
                          update_only = true;

                          // find the duplicate predicate
                          uri_coll.findOne({uri: subj}, function(err, doc){
                            if (err) callback(err);
                            id_subj = doc._id;
                            rdf_triple[id_subj] = rdf_triple[subj]; 
                            delete rdf_triple[subj];
                            count_subj--;

                            _handle_predicates(rdf_triple, id_subj, count_subj, update_only, doc, callback)
                          });
                        }
                        else{
                          callback(err);
                        }
                      }
                      else{
                        // console.log("2");
                        update_only = false;

                        id_subj = docs_subj[0]._id;
                        rdf_triple[id_subj] = rdf_triple[subj]; 
                        delete rdf_triple[subj];
                        count_subj--;

                        _handle_predicates(rdf_triple, id_subj, count_subj, update_only, null, callback)
                      }
                    });
                  });
                })();
              }
            },

    replace: function(rdf_triple, callback){},

    /**
     * Method for querying the documents with a given subject.
     * @param {String} subject The subject of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
    findBySubject: function(subject, callback){

      // retrieving the id of the subject
      uri_coll.find({uri: subject}, function(err, docs){
        docs.toArray(function(err, docs){
          if (docs.length != 0){
             var count_res = docs.length;
             var i=0;

             docs.forEach(function(doc){
                 query = {};
                 query[doc._id] = {$exists:true};
                 // retrieving the documents matching the subject id
                 triple_coll.find(query, function(err, docs){
                   if (err) callback(err);
                   docs.toArray(function(err,docs){
                     if (err) callback(err);
                     _results_to_rdf(docs, function(docs){
                       i++;
                       if (i == count_res) callback(null, docs);
                     })
                   });
                 });
             });
          }
          else callback(null, null);
        });
      });
    },

    /**
     * Method for querying the documents with a given subject and
     * a predicate.
     * @param {String} subject The subject of the rdf triple.
     * @param {String} predicate The predicate of the rdf triple.
     * @param {function} callback function(err, docs){}
     */
    findBySubjectPredicate: function(subject, predicate, callback){

      // retrieving the id of the subject
      uri_coll.find({uri: subject}, function(err, docs){

        docs.toArray(function(err, docs){
          if (docs.length != 0){
            var count_s = docs.length;
            var i=0;

            docs.forEach(function(subj){
              uri_coll.find({uri: predicate}, function(err, docs){
                docs.toArray(function(err, docs){
                  if (docs.length != 0){

                  // looping for each subject over each possible predicate 
                  // leads to a total loop count of subjects.length * predicates.length
                  var count_res = count_s * docs.length;
                  docs.forEach(function(pred){
                      query = {};
                      str = subj._id + "." + pred._id
                      query[str] = {$exists:true};
                      // retrieving the documents matching the subject id
                      triple_coll.find(query, function(err, docs){
                        if (err) callback(err);
                        docs.toArray(function(err,docs){
                          if (err) callback(err);
                          _results_to_rdf(docs, function(docs){
                            i++;
                            if (i == count_res) callback(null, docs);
                          })
                        });
                      });
                    });
                  }
                  else{
                    i++;
                    if (i == count_s) callback(null, null);
                  }
                });
              });
            });
          }
          else callback(null, null);
        });
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
      // retrieving the id of the subject
      uri_coll.find({uri: pred}, function(err, docs){
        docs.toArray(function(err, docs){
          if (docs.length != 0){
            var count_res = docs.length;
            var i=0;

            docs.forEach(function(doc){
              query = _query_predicate_value(doc._id, value);
              triple_coll.find( {$where: query}, function(err,docs){
                if (err) callback(err);
                docs.toArray(function(err,docs){
                  if (err) callback(err);
                  _results_to_rdf(docs, function(docs){
                    i++;
                    if (i == count_res) callback(null, docs);
                  })
                });
              });
            });
          }
          else callback(null, null);
        });
      });
    },

    /**
     * Method for querying the documents with a given value of an object.
     * @param {String} value The objects value of the rdf triple. 
     * @param {function} callback function(err, docs){}
     */
    findByValue: function(value, callback){
      // retrieving the id of the subject
              query = _query_value(value);
              triple_coll.find( {$where: query}, function(err,docs){
                if (err) callback(err);
                docs.toArray(function(err,docs){
                  if (err) callback(err);
                  _results_to_rdf(docs, function(docs){
                    callback(null, docs);
                  })
                });
              });
    },
    
    /**
     * Method which disconnects from the current MongoDB session.
     */
    disconnect: function(){
      db.close();
    }

  };
}

// vim: set tw=79 sw=2 ts=2 sts=2:
