## About

node\_mongo\_rdf is a project for storing rdf documents in [mongoDB](http://mongodb.org).
While mongoDB seems to be ideal for storing the documents in [rdf/JSON](http://docs.api.talis.com/platform-api/output-types/rdf-json)
syntax, there is the problem that mongoDB prohibits to use dots in key
identifiers. So it is not possible to store URIs as keys.

node\_mongo\_rdf implements two wrapper for this problem. Your are free to choose between them. See Design section for details.
  
## Design
Given the following triple in rdf/JSON syntax:
    
	{
      "http://example.org/about" : 
        {
           "http://purl.org/dc/elements/1.1/title": [ { "type" : "literal" , "value" : "Anna's Homepage." } ]
        }
    }
	
The following two wrapper exists:

### Flat
    { 
	  "subject": "http://example.org/about",
	  "predicates": [
	    {
		  "uri": "http://purl.org/dc/elements/1.1/title",
		  "objects": [
		    {
			  "type": "literal",
			  "value": "Anna's Homepage"
			}
		  ]
		}
	  ]
	}
### Dictionary
URI collection:

    { "id": "foo1", "uri": "http://example.org/about" },
	{ "id": "foo2", "uri": "http://purl.org/dc/elements/1.1/title" }
	
Triple collection:

    {
	  "foo1":
	    {
		  "foo2": [ { "type" : "literal" , "value" : "Anna's Homepage." } ]
		}
	}

## Usage
### Howto
1. Initialize plugin:

        var mongo_rdf = require('mongo_rdf');
        var foo = mongo_rdf.NodeMongoRdf("flat", "test");
where the first argument ist the wrapper type ("flat" or "dict") and the second argument the name of the database.
	
2. Do something

        foo.insert(rdf_json_triples, function(err){
          console.log(err);
	    });
	    foo.findBySubject("http://example.org/about", function(err, docs){
	      console.log(err, docs);
	    });

### API
Here is a short summary of available methods. For a full API documentation
see [-placeholder-]()

- `insert(rdf_json_triples, callback)`
- `replace(rdf_json_triples, callback)`
- `findBySubject(subject, callback)`
- `findBySubjectDeep(subject, callback)`
- `findBySubjectPredicate(subject, predicate, callback)`
- `findByPredicateValue(predicate, value, callback)`
- `findByValue(value, callback)`
