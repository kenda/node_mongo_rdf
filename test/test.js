var mongo_rdf  = require("../index"),
    assert = require("assert");

// Default RDF/json triple
var rdf_trip_default1 = {
  "http://example.org/about" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ],
    "http://purl.org/dc/elements/1.1/creator2" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    // "http://purl.org/dc/elements/1.1/title2"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ],
    // "http://purl.org/dc/elements/1.1/creator3" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    // "http://purl.org/dc/elements/1.1/title3"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
  },
  "http://example.org/about2" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Tom Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superman" : [ { "value" : "Gerad Wilder", "lang" : "de" } ]
  },
  "http://example.org/about3" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Tom Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superman" : 
      [ 
        { "value" : "Gerad Wilder", "lang" : "de" }, 
        { "value" : "Bobbele Wilder", "lang" : "de", "type": "literal" },
        { "value" : "Hans Wilder", "lang" : "de", "type": "literal" },
        { "value" : "Babs Wilder", "lang" : "de", "type": "literal" }
      ]
  }
};

function test(){
	var foo = mongo_rdf.NodeMongoRdf("flat", "test");

	  foo.insert(rdf_trip_default1, function(err){
          assert.equal(err, null);
	  });

      foo.findBySubject("http://example.org/about", function(err, docs){
          // console.log(err,docs);
          assert.equal(err, null);
          assert.notEqual(docs, null);
      });

      foo.findBySubjectPredicate("http://example.org/about", 
        "http://purl.org/dc/elements/1.1/title", function(err, docs){
           // console.log(err,docs);
           assert.equal(err, null);
           assert.notEqual(docs, null);
      });

      foo.findByPredicateValue("http://purl.org/dc/elements/1.1/superman",
        "Gerad Wilder", function(err, docs){
          // console.log(err,docs);
          assert.equal(err, null);
          assert.notEqual(docs, null);
      });

      foo.findByValue( "Gerad Wilder", function(err, docs){
          // console.log(err,docs);
          assert.equal(err, null);
          assert.notEqual(docs, null);
      });
};
test();

// vim: set tw=79 sw=2 ts=2 sts=2:
