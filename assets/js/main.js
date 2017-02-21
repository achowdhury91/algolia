// Algolia settings

var DEFAULT_HITS_PER_PAGE = 3;

var client = algoliasearch('BKTROLTLZ0', '02eb00fe0e219418103fccc22fb08cd8');

var helper = algoliasearchHelper(client, 'algolia', {
	hitsPerPage: DEFAULT_HITS_PER_PAGE,
	disjunctiveFacets: ['food_type', 'stars_count', 'payment_options']
});

/*
Runs an initial check for geolocation and uses a fallback if
unsuccessful
*/
function checkGeo() {

	function successGeo(position) {
		var lat = position.coords.latitude.toFixed(2);
		var longi = position.coords.longitude.toFixed(2);
		var combined = lat.toString() + ', ' + longi.toString();
		helper.setQueryParameter('aroundLatLng', combined).search();
	}

	function errorGeo() {
		helper.setQueryParameter('aroundLatLngViaIP', true).search();
	}

	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(successGeo, errorGeo);
	}
	else {
		helper.setQueryParameter('aroundLatLngViaIP', true).search();
	}
}

checkGeo();

class App extends React.Component {

	constructor() {
		super();
		this.state = {
			// used because otherwise rendering Facets and Results
			// with empty data throws errors
			initialCall: false,
			data: []
		}
		this.updateResults = this.updateResults.bind(this);
		this.textQuery = this.textQuery.bind(this);
		this.showMore = this.showMore.bind(this);
		this.facetQuery = this.facetQuery.bind(this);
		this.ratingQuery = this.ratingQuery.bind(this);
	}

	updateResults(data) {
		this.setState({
			data: data,
			initialCall: true
		});
	}

	textQuery(text) {
		// reset hits per page to default value
		helper.setQueryParameter('hitsPerPage', DEFAULT_HITS_PER_PAGE);
		helper.setQuery(text).search();
	}

	facetQuery(facet) {
		// reset hits per page to default value
		helper.setQueryParameter('hitsPerPage', DEFAULT_HITS_PER_PAGE);
		helper.toggleRefine('food_type', facet.name).search();
	}

	ratingQuery(rating, remove) {
		helper.setQueryParameter('hitsPerPage', DEFAULT_HITS_PER_PAGE);
		helper.removeNumericRefinement('stars_count');
		if (!remove) {
			// here we need to set two numeric refinements based on our rating #
			helper.addNumericRefinement('stars_count', '>=', rating);
			helper.addNumericRefinement('stars_count', '<', rating + 1);
		}
		helper.search();
	}

	updatePayment(payment) {
		helper.setQueryParameter('hitsPerPage', DEFAULT_HITS_PER_PAGE);
		helper.toggleRefine('payment_options', payment).search();
	}

	showMore() {
		var newHitsPerPage = helper.state.hitsPerPage + 3;
		helper.setQueryParameter('hitsPerPage', newHitsPerPage).search();
	}

	componentDidMount() {
		// Set handler function to deal with changing results from Algolia
		helper.on('result', this.updateResults);

		// Make an initial query to populate the list
		helper.search();
	}

	render() {
		return(
			<div>
				<Search updateTextQuery={this.textQuery} />
				{this.state.initialCall &&
					<Facets
						rating={this.ratingQuery}
						update={this.facetQuery}
						payment={this.updatePayment}
						data={this.state.data} />
				}
				{this.state.initialCall && <Results data={this.state.data} more={this.showMore} />}
			</div>
		);
	}
}

class Search extends React.Component {
	constructor() {
		super();
		this.state = {
			input: ''
		};
		// ensures that the context of handleChange is always set to Search instead of
		// whatever else is calling it
		this.handleChange = this.handleChange.bind(this);
	}

	handleChange(e) {
		this.setState({
			input: e.target.value
		});
		// need to send this value up to App component to make the query
		this.props.updateTextQuery(e.target.value);
	}

	render() {
		var style = {
			wrapper: {
				width: '100%',
				height: '80px',
				backgroundColor: '#1C688E',
				padding: '20px'
			},
			input: {
				width: '100%',
				height: '40px',
				padding: '0 15px',
				border: '1px solid #D7D7D7',
				fontSize: '15px',
				borderRadius: '3px'
			}
		}

		return(
			<div style={style.wrapper}>
				<input
					value={this.state.input}
					onChange={this.handleChange}
					style={style.input}
					placeholder="Search for Restaurants by Name, Cuisine, Location" />
			</div>
		);
	}
}

class Facets extends React.Component {
	render() {
		var style = {
			wrapper: {
				float: 'left',
				width: '25%',
				height: 'calc(100% - 80px)',
				borderRight: '1px solid #E6E6E6',
				padding: '25px',
				overflow: 'scroll'
			}
		};

		return(
			<div style={style.wrapper}>
				<FoodType
					updateFacet={this.props.update}
					data={this.props.data.getFacetValues('food_type', { sortBy: ['count:desc']})} />
				<RatingType
					updateFacet={this.props.rating}
					data={this.props.data.getFacetValues('stars_count')} />
				<PaymentType
					updateFacet={this.props.payment}
					data={this.props.data.getFacetValues('payment_options')} />
			</div>
		);
	}
}

class FoodType extends React.Component {
	constructor(props) {
		super(props);
	}

	handleClick(val) {
		this.props.updateFacet(val);
	}

	render() {
		var style = {
			wrapper: {
				maxHeight: '200px',
				overflow: 'scroll'
			},
			title: {
				marginBottom: '15px',
				fontSize: '14px',
				fontWeight: '600',
				color: '#333'
			},
			item: {
				fontSize: '13px',
				padding: '5px 10px',
				count: {
					float: 'right'
				}
			}
		};

		var facetItems = this.props.data.map(function(val, index) {

			var newStyle = {
				active: val.isRefined ? 'food-facet-active' : ''
			};

			return(
				<div
					onClick={this.handleClick.bind(this, val)}
					className={newStyle.active + ' food-facet'}
					style={style.item}
					key={index}>
					{val.name}
					<span
						className="item-count"
						style={style.item.count}>
						{val.count}
					</span>
				</div>
			);
		}.bind(this));

		return(
			<div style={style.wrapper}>
				<div style={style.title}>Cuisine / Food Type</div>
				{facetItems}
			</div>
		);
	}
}

class RatingType extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			active: null
		};
	}

	handleClick(rating, count) {
		if (this.state.active === rating) {
			this.props.updateFacet(rating, true);
			this.setState({
				active: null
			});
		}
		else {
			this.props.updateFacet(rating);
			this.setState({
				active: rating
			});
		}
	}

	render() {
		var style = {
			wrapper: {
				maxHeight: '200px',
				overflow: 'scroll'
			},
			title: {
				margin: '15px 0',
				fontSize: '14px',
				fontWeight: '600',
				color: '#333'
			},
			item: {
				fontSize: '13px',
				padding: '5px 10px',
				count: {
					float: 'right'
				}
			}
		};

		var integerBucket = [0, 0, 0, 0, 0, 0];

		for (var i = 0; i < this.props.data.length; i++) {
			var tempFacet = this.props.data[i];
			var index = Math.floor(Number(tempFacet.name));
			integerBucket[index] += tempFacet.count;
		}

		var list = integerBucket.map(function(val, idx) {
			var style = {
				padding: '0 10px',
				cursor: 'pointer'
			};
			return(
				<div
					className={(this.state.active === idx) ? 'rating-facet-active' : 'rating-facet'}
					style={style}
					onClick={this.handleClick.bind(this, idx, val)}
					key={idx}>
					<FilterStars
						num={idx} />
				</div>
			);
		}.bind(this));

		return(
			<div>
				<div style={style.title}>Rating</div>
				{list}
			</div>
		);
	}
}

class FilterStars extends React.Component {
	render() {
		var style = {
			empty: {
				display: 'inline-block',
				backgroundImage: 'url("../../resources/graphics/star-empty.png")',
				backgroundSize: 'cover',
				height: '20px',
				width: '20px'
			},
			filled: {
				display: 'inline-block',
				backgroundImage: 'url("../../resources/graphics/stars-plain.png")',
				backgroundSize: 'cover',
				height: '20px',
				width: '20px'
			},
			inline: {
				display: 'inline-block'
			}
		};

		var items = [];

		var wuht = this.props.num;

		// Iterate 5 times to create 5 stars
		for (var i = 0; i < 5; i++) {
			if (wuht > 0) {
				items.push(<span key={i} style={style.filled}></span>);
			}
			else {
				items.push(<span key={i} style={style.empty}></span>);
			}
			wuht--;
		}

		return(
			<div style={this.props.inline ? style.inline : null}>
			{items}
			</div>
		);
	}
}

class PaymentType extends React.Component {
	constructor(props) {
		super(props);
	}

	handleClick(val) {
		this.props.updateFacet(val.name);
	}

	render() {

		// filter data
		var mapper = {
			AMEX: true,
			Visa: true,
			Discover: true,
			MasterCard: true
		};

		var filteredData = null;

		filteredData = this.props.data.filter(function(val) {
			if (!mapper[val.name]) {
				return false;
			}
			return true;
		});

		var style = {
			wrapper: {
				maxHeight: '200px',
				overflow: 'scroll'
			},
			title: {
				margin: '15px 0',
				fontSize: '14px',
				fontWeight: '600',
				color: '#333'
			},
			item: {
				fontSize: '13px',
				padding: '5px 10px',
				count: {
					float: 'right'
				}
			}
		};

		var facetItems = filteredData.map(function(val, index) {
			var newStyle = {
				active: val.isRefined ? 'food-facet-active' : ''
			};

			return(
				<div
					onClick={this.handleClick.bind(this, val)}
					className={newStyle.active + ' food-facet'}
					style={style.item}
					key={index}>
					{val.name}
					<span
						className="item-count"
						style={style.item.count}>
						{val.count}
					</span>
				</div>
			);
		}.bind(this));

		return(
			<div style={style.wrapper}>
				<div style={style.title}>Payment Options</div>
				{facetItems}
			</div>
		);
	}
}

class Results extends React.Component {
	render() {
		var style = {
			wrapper: {
				marginLeft: '25%',
				padding: '25px',
				height: 'calc(100% - 80px)',
				overflow: 'scroll'
			},
			meta: {
				wrapper: {
					marginBottom: '20px'
				},
				result: {
					float: 'left',
					marginRight: '25px',
					fontSize: '15px',
					color: '#333'
				},
				boldResult: {
					fontWeight: '600'
				},
				divider: {
					height: '22px',
					overflow: 'hidden',
					borderBottom: '1px solid #E6E6E6'
				}
			},
			item: {
				marginBottom: '25px',
				display: 'inline-block',
				width: '100%',
				title: {
					fontSize: '16px',
					fontWeight: '600',
					marginBottom: '5px'
				},
				stars: {
					float: 'left',
					marginRight: '10px',
					fontSize: '17px',
					color: '#FFAB66'
				},
				reviews: {
					display: 'inline-block',
					position: 'relative',
					top: '-3px',
					color: '#707070',
					fontSize: '17px',
					marginLeft: '10px'
				},
				description: {
					fontSize: '17px',
					marginTop: '2px',
					color: '#707070'
				},
				img: {
					height: '80px',
					width: '80px',
					marginRight: '15px',
					float: 'left'
				}
			},
			buttonWrapper: {
				textAlign: 'center'
			},
			button: {
				width: '184px',
				height: '40px',
				backgroundColor: '#fff',
				border: '1px solid #E6E6E6',
				borderRadius: '4px',
				fontSize: '14px',
				color: 'rgba(0,0,0,0.5)'
			}
		};

		var items = this.props.data.hits.map(function(val, index) {
			return(
				<div key={index} style={style.item}>
					<img style={style.item.img} src={val.image_url}/>
					<div style={style.item.title}>{val.name}</div>
					<div style={style.item.stars}>{val.stars_count}</div>
					<FilterStars
						inline={true}
						num={Math.round(val.stars_count)} />
					<div style={style.item.reviews}>({val.reviews_count} reviews)</div>
					<div style={style.item.description}>
						{val.food_type} | {val.neighborhood} | {val.price_range}
					</div>
				</div>
			);
		});

		return(
			<div style={style.wrapper}>
				<div style={style.meta.wrapper}>
					<div style={style.meta.result}>
					<span style={style.meta.boldResult}>
						{this.props.data.nbHits} results found
					</span> in&nbsp;
					{this.props.data.processingTimeMS / 1000} seconds</div>
					<div style={style.meta.divider}></div>
				</div>
				{items}
				{(this.props.data.hitsPerPage < this.props.data.nbHits) ?
					<div style={style.buttonWrapper}>
						<button style={style.button} onClick={this.props.more}>Show More</button>
					</div> :
					null}
			</div>
		);
	}
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
