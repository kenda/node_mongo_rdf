/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses the native MongoDB driver and saves the 
 * triples in two collections.
 */

var mongodb = require('mongodb');

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
  db.createIndex("uri", "uri", true, function(){});

  var triple_coll;
  db.collection('triple', function(err, triple_coll_){
    if (err) console.log(err);
    triple_coll = triple_coll_
  });

  /**
   * This function handles the replacing of predicate uris
   * and inserts the triples.
   */
  function _handle_predicates(rdf_triple, id_subj, count_subj, callback){
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
                });
              }
              else{
                callback(err);
              }
            }
            else{
              // console.log("4");
              id_pred = docs_pred[0]._id;
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
                    }
                  }
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
                      if ( err ){
                        if (err.message.indexOf('E11000 ') !== -1) {
                          // console.log("1");

                          // find the duplicate predicate
                          uri_coll.findOne({uri: subj}, function(err, doc){
                            if (err) callback(err);
                            id_subj = doc._id;
                            rdf_triple[id_subj] = rdf_triple[subj]; 
                            delete rdf_triple[subj];
                            count_subj--;

                            _handle_predicates(rdf_triple, id_subj, count_subj, callback)
                          });
                        }
                        else{
                          callback(err);
                        }
                      }
                      else{
                        // console.log("2");
                        id_subj = docs_subj[0]._id;
                        rdf_triple[id_subj] = rdf_triple[subj]; 
                        delete rdf_triple[subj];
                        count_subj--;

                        _handle_predicates(rdf_triple, id_subj, count_subj, callback)
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

    disconnect: function(){
      db.close();
    }

  };
}

// vim: set tw=79 sw=2 ts=2 sts=2:
