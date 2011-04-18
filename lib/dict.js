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


    return {
        insert: function(rdf_triple, callback){
                    var count_subj = 0;
                    for (key in rdf_triple){
                        if (rdf_triple.hasOwnProperty(key)) count_subj++;
                    }

                    var db = new mongodb.Db("test", new mongodb.Server(host, port, {}));
                    db.open(function(err, db) {
                        if ( err ) console.log( err.message );

                        // creating collections
                        // var uri_coll = new mongodb.Collection(db, 'uri');
                        db.collection('uri', function( err, uri_coll ){
                            db.createIndex("uri", "uri", true, function(){});
                            // var triple_coll = new mongodb.Collection(db, 'triple');
                            db.collection('triple', function( err, triple_coll ){

                                // URIs in URI-Collection speichern
                                for ( var subj in rdf_triple ){
                                    var id_subj, id_pred;

                                    uri_coll.insert({uri: subj}, {safe: true}, function( err, docs_subj ){
                                        if ( err ){
                                            console.log("1");
                                            console.warn( err.message );

                                            // Duplikat vorhanden
                                            // FIXME findet keine Dokumente
                                            uri_coll.find( function(err, cursor){
                                                cursor.toArray(function( err, docs ){
                                                    if (err) console.warn(err.message);
                                                    id_subj = docs[0]._id;
                                                    rdf_triple[id_subj] = rdf_triple[subj]; 
                                                    delete rdf_triple[subj];
                                                });
                                            });
                                        }
                                        else{
                                            // Dokument wurde eingefügt
                                            console.log("2");
                                            id_subj = docs_subj[0]._id;
                                            rdf_triple[id_subj] = rdf_triple[subj]; 
                                            delete rdf_triple[subj];
                                        }
                                        count_subj--;
                                        if (count_subj <= 0){
                                            var count_pred = 0;
                                            for (key in rdf_triple[id_subj]){
                                                if (rdf_triple[id_subj].hasOwnProperty(key)) count_pred++;
                                            }

                                            // URIs in URI-Collection speichern
                                            for ( pred in rdf_triple[id_subj] ){
                                                console.log("##########################\n"+pred);
                                                uri_coll.insert({uri: pred}, {safe: true}, function(err, docs_pred){
                                                    if ( err ) {
                                                        console.log("3");
                                                        console.log( err.message );

                                                        // FIXME findet keine Dokumente
                                                        uri_coll.findOne({uri: pred}, function(err, doc){
                                                            if (err) console.warn(err.message);
                                                            id_pred = doc._id;
                                                            rdf_triple[id_subj][id_pred] = rdf_triple[id_subj][pred]; 
                                                            delete rdf_triple[id_subj][pred];
                                                        });
                                                    }
                                                    else{
                                                        console.log("4");
                                                        id_pred = docs_pred[0]._id;
                                                        rdf_triple[id_subj][id_pred] = rdf_triple[id_subj][pred];
                                                        delete rdf_triple[id_subj][pred];
                                                    }
                                                        console.log(rdf_triple);

                                                    count_pred--;
                                                    if (count_pred <= 0){
                                                        //TODO Triples an richtiger Stelle speichern - nachdem alle URIS ersetzt wurden
                                                        console.log(rdf_triple);
                                                        // RDF-Tripel in RDF-Coll speichern
                                                        triple_coll.insert(rdf_triple, function(err, docs){
                                                            if ( err ) console.log( err.message );
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    });

                                }
                            });
                        });
                    });
                },

            replace: function(rdf_triple, callback){},

            find: function(query, callback){},

            disconnect: function(){
                db.close();
            }

    };
}
