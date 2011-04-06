/*
 * Test file for saving RDF/json data in MongoDB.
 *
 * This approach uses Mongoose ORM and saves the 
 * triples as flat objects.
 */

var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

// Stndard RDF/Json Triple
var rdf_trip_default = {
        "http://example.org/about" : {
            "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
            "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
        }
};

var NodeMongoRdfFlat = function(host, db, port){
    
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
        lang: { type: String, required: false }
    });

    mongoose.connect("mongodb://localhost/test");

    mongoose.model('RDFTriple', RDFTriple );
    var RDFTripleModel = mongoose.model('RDFTriple');

    //RDF/Json in Flat Objects und zurück wandeln
    function _rdf_json_to_flat(rdf){
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
        return flat;
    }

    function _flat_to_rdf_json(flat){
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

    return {
        insert: function(rdf_triple, callback){
                    console.log("insert..");
            obj = new RDFTripleModel();
            obj.doc = _rdf_json_to_flat(rdf_triple);
            obj.save(function(err){
                if(err) callback(err);
            });
         },

        findOne: function(query, callback){
            RDFTripleModel.findOne( function(err, doc){
                if (err) callback(err);
                console.log(doc);
                if (doc) callback(null, _flat_to_rdf_json(doc));
            });
        }

    }
}

/* Test snippet */

test = NodeMongoRdfFlat("localhost", "test");

test.insert(rdf_trip_default, function(err){
    if (err) console.log("mh"+err.message);
});

//test.findOne({}, function(err, doc){
//    if (err) console.log(err);
//    else console.log(doc);
//})

//mongoose.disconnect();
