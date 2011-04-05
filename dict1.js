/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses the native MongoDB driver and saves the 
 * triples in two collections.
 */

var mongodb = require('mongodb');

// Stndard RDF/Json Triple
var rdf_trip_default = {
        "http://example.org/about" : {
            "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
            "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
        }
};

// Verbindung herstellen
var server = new mongodb.Server("127.0.0.1", 27017, {});
new mongodb.Db('test', server, {}).open(function (error, client) {
        if ( error ) console.log( error );

        
        // Beispiel Triple speichern
        // Collections erstellen
        var uri_coll = new mongodb.Collection(client, 'uri');
        var triple_coll = new mongodb.Collection(client, 'triple');

        // URIs in URI-Collection speichern
        for ( subj in rdf_trip_default ){
            //TODO Prüfen ob URI schon gespeichert wurde
            uri_coll.insert({uri: subj}, function(err, docs_subj){
                if ( err ) console.log( err )
                else{
                    // URIs in RDF-Tripel durch ID ersetzen
                    rdf_trip_default[docs_subj[0]._id] = rdf_trip_default[subj]; 
                    delete rdf_trip_default[subj];

                    // URIs in URI-Collection speichern
                    for ( pred in rdf_trip_default[docs_subj[0]._id] ){
                        //TODO Prüfen ob URI schon gespeichert wurde
                        uri_coll.insert({uri: pred}, function(err, docs_pred){
                            if ( err ) console.log( err )
                            else{
                                // URIs in RDF-Tripel durch ID ersetzen
                                rdf_trip_default[docs_subj[0]._id][docs_pred[0]._id] = rdf_trip_default[docs_subj[0]._id][pred]; 
                                delete rdf_trip_default[docs_subj[0]._id][pred];
                                
                                //TODO URIs in Objekten umwandeln
                            }
                        });
                    }
                    // RDF-Tripel in RDF-Coll speichern
                    triple_coll.insert(rdf_trip_default, function(err, docs){
                        if ( err ) console.log( err );
                    });

                }
            });
        }
        console.log(rdf_trip_default);

        // Beispiel DS selektieren
        
});
