/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses Mongoose ORM and saves the 
 * triples as flat objects.
 */

var mongoose = require('mongoose'),
    Schema   = mongoose.Schema,

// Stndard RDF/Json Triple
var rdf_trip_default = {
        "http://example.org/about" : {
            "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
            "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
        }
};

//Definieren des Schema
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
    lang: { type: String, required: false },
    age: { type: Number, required: false }
});

mongoose.connect("mongodb://localhost/test");

mongoose.model('RDFTriple', RDFTriple );
var RDFTripleModel = mongoose.model('RDFTriple');
var rdf_test_mongoose;

// 100 Datensätze erzeugen
for ( i = 0; i < 100; i++){
    rdf_test_mongoose = new RDFTripleModel();

    // RDF/Json in Flat umwandeln
    rdf_trip_mongo = rdf_json_to_flat(rdf_trip_default);
    rdf_trip_mongo.predicates[1].objects[0].age = i;
    rdf_test_mongoose.doc = rdf_trip_mongo; 

    // DS speichern
    rdf_test_mongoose.save( function(err){ 
        if (err) console.log(err); 
    } );
}

// einen Flat-DS holen und als RDF/Json ausgeben
RDFTripleModel.findOne( function(err, doc){
    console.log(flat_to_rdf_json(doc));
});

//mongoose.disconnect();


// Helper #############################################################

//RDF/Json in Flat Objects und zurück wandeln
function rdf_json_to_flat(rdf){
    for ( subject in rdf ){
        flat = {};
        flat.subject = subject;
        flat.predicates = [];
        for ( predicate in rdf[subject] ){
            for ( object in p = rdf[subject][predicate] ){
                var objects = [];
                objects.push(p[object]);
            }
            flat.predicates.push({'uri': predicate, 'objects': objects});
        }
    }
    return flat
}

function flat_to_rdf_json(flat){
    rdf = {};
    rdf[flat.subject] = {};
    for ( p in flat.predicates ){
        if ( flat.predicates[p].uri !== undefined ){
            rdf[flat.subject][flat.predicates[p].uri] = [];
            for ( o in flat.predicates[p].objects ){
                rdf[flat.subject][flat.predicates[p].uri].push(flat.predicates[p].objects[o]);
            }
        }
    }
   return rdf;
}
