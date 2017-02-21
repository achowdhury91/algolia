var algoliasearch = require('algoliasearch');

// set our settings for our algolia account
var client = algoliasearch('BKTROLTLZ0', '0941444eedf8f68aed531e357612f3ac');

// get a reference to the index we want to update
var index = client.initIndex('algolia');

// define our searchable attributes and assign a hierarchy to them
index.setSettings({"searchableAttributes":["name", "area"]});

// define our attributes for faceting / filtering
index.setSettings({"attributesForFaceting":["food_type", "stars_count", "payment_options"]});

var restaurantsJSON = require('./resources/dataset/restaurants_list.json');

var csv = require('csvtojson');
var csvpath = './resources/dataset/restaurants_info.csv';

var i = 0;

var tempStore = [];

csv({
	delimiter: ';'
})
.fromFile(csvpath)
.on('json', function(jsonObj) {
	tempStore.push(jsonObj);
})
.on('done', function() {
	// do the sorting in here
	for (var i = 0; i < restaurantsJSON.length; i++) {
		for (var j = 0; j < tempStore.length; j++) {
			tempStore[j].stars_count = Number(tempStore[j].stars_count);
			// check if objectID are equal
			if (restaurantsJSON[i].objectID == tempStore[j].objectID) {
				// add properties from tempStore to restaurantsJSON
				for (var prop in tempStore[j]) {
					if (tempStore[j].hasOwnProperty(prop)) {
						restaurantsJSON[i][prop] = tempStore[j][prop];
					}
				}
			}
		}
	}

	index.addObjects(restaurantsJSON, function(err, content) {
	  if (err) {
	    console.error(err);
	  }
	});

});
