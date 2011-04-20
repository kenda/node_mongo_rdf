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

    find: function(query, callback){},

    disconnect: function(){
      db.close();
    }

  };
}

// vim: set tw=79 sw=2 ts=2 sts=2:
