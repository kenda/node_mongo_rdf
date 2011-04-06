/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses the native MongoDB driver and saves the 
 * triples in two collections.
 */

var mongodb = require('mongodb');

// Standard RDF/Json Triple
var rdf_trip_default = {
    "http://example.org/about" : {
        "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
        "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
    }
};

// Verbindung herstellen
var db = new mongodb.Db('test', new mongodb.Server("localhost", 27017, {}));
db.open(function(err, db) {
    if ( err ) console.log( err.message );

    /* Beispiel Triple speichern */

    // Collections erstellen
    //var uri_coll = new mongodb.Collection(db, 'uri');
    db.collection('uri', function( err, uri_coll){
        db.createIndex("uri", "uri", true, function(){});
        var triple_coll = new mongodb.Collection(db, 'triple');

        // URIs in URI-Collection speichern
        for ( var subj in rdf_trip_default ){
            var id_subj, id_pred;

            uri_coll.insert({uri: subj}, {safe: true}, function( err, docs_subj ){
                if ( err ){
                    console.log("1");
                    //console.warn( err.message );

                    // Duplikat vorhanden
                    // FIXME findet keine Dokumente
                    uri_coll.find( function(err, cursor){
                        cursor.toArray(function( err, docs ){
                            if (err) console.warn(err.message);
                            id_subj = docs[0]._id;
                            rdf_trip_default[id_subj] = rdf_trip_default[subj]; 
                            delete rdf_trip_default[subj];
                        });
                    });
                }
                else{
                    // Dokument wurde eingefügt
                    console.log("2");
                    id_subj = docs_subj[0]._id;
                    rdf_trip_default[id_subj] = rdf_trip_default[subj]; 
                    delete rdf_trip_default[subj];
                }

                // URIs in URI-Collection speichern
                for ( pred in rdf_trip_default[id_subj] ){
                    uri_coll.insert({uri: pred}, {safe: true}, function(err, docs_pred){
                        if ( err ) {
                            console.log("3");
                            //console.log( err.message );

                            // FIXME findet keine Dokumente
                            uri_coll.findOne({uri: pred}, function(err, doc){
                                if (err) console.warn(err.message);
                                id_pred = doc._id;
                                rdf_trip_default[id_subj][id_pred] = rdf_trip_default[id_subj][pred]; 
                                delete rdf_trip_default[id_subj][pred];
                            });
                        }
                        else{
                            console.log("4");
                            id_pred = docs_pred[0]._id;
                            rdf_trip_default[id_subj][id_pred] = rdf_trip_default[id_subj][pred]; 
                            delete rdf_trip_default[id_subj][pred];
                        }
                    });
                }
                //TODO URIs in Objekten umwandeln

                // RDF-Tripel in RDF-Coll speichern
                //triple_coll.insert(rdf_trip_default, function(err, docs){
                //    if ( err ) console.log( err.message );
                //});

                //console.log(rdf_trip_default);
            });
        }
    });
    db.close();

    /* Beispiel DS selektieren */

});
