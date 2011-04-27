var flat = require("../lib/flat"),
    dict = require("../lib/dict"),
    assert = require("assert");

// Default RDF/json triple
var rdf_trip_default1 = {
  "http://example.org/about" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/title"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ],
    "http://purl.org/dc/elements/1.1/creator2" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/title2"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ],
    "http://purl.org/dc/elements/1.1/creator3" : [ { "value" : "Anna Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/title3"   : [ { "value" : "Anna's Homepage", "type" : "literal", "lang" : "en" } ]
  },
  "http://example.org/about2" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Tom Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superman" : [ { "value" : "Gerad Wilder", "lang" : "de" } ]
  },
  "http://example.org/about3" : {
    "http://purl.org/dc/elements/1.1/creator" : [ { "value" : "Tom Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superwoman" : [ { "value" : "Kim Wilder", "type" : "literal" } ],
    "http://purl.org/dc/elements/1.1/superman" : [ { "value" : "Gerad Wilder", "lang" : "de" } ]
  }
};

function testFlat(){
  flat = flat.NodeMongoRdfFlat("test");
  mongoose = flat.getModel();
  // mongoose.drop();

  flat.insert(rdf_trip_default1, function(err){
      assert.equal(err, null);

      flat.findOne({}, function(err, doc){
        assert.equal(err, null);
        assert.notEqual(doc, null);
      })

      flat.findBySubject("http://example.org/about", function(err, docs){
          assert.equal(err, null);
          assert.notEqual(docs, null);
      });

      flat.findBySubjectPredicate("http://example.org/about", 
      "http://purl.org/dc/elements/1.1/title", function(err, docs){
          console.log(err.message,docs);
          assert.equal(err, null);
          assert.notEqual(docs, null);
      });

      mongoose.count({},function(err, count){
        assert.equal(err, null);
        assert.equal(count, 3);
      });
  });

}
// testFlat();

function testDict(){
  dict = dict.NodeMongoRdfDict("test");

  // dict.insert(rdf_trip_default1, function(err){
  //   assert.equal(err, null);

  // });
    dict.findBySubject(/http:\/\/example.org\/about*/, function(err, docs){
        assert.equal(err, null);
        assert.notEqual(docs, null);
    });


//  dict.disconnect();
}
 testDict();

// vim: set tw=79 sw=2 ts=2 sts=2:
