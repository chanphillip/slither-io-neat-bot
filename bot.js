
var DIVISION_ANGLE = Math.PI / 2 * 1.5;
var DIVISION_COUNT = 13;
var DIVISION_SLICE_ANGLE = DIVISION_ANGLE * 2 / (DIVISION_COUNT - 1);

var NETWORK_INPUT_COUNT = DIVISION_COUNT * 2;
var NETWORK_OUTPUT_COUNT = 3;
var NETWORK_GENOME_AMOUNT = 10;
var NETWORK_MUTATION_RATE = .3;
var NETWORK_ELITISM = Math.round(.1 * NETWORK_GENOME_AMOUNT);

var NETWORK_GENOME_TIMEOUT = 10000;		// 60 seconds for each genome
var NETWORK_GAMEOVER_PENALTY = 100;

var canvas = function() {
	var self = this;

	this.ctrl = new controller();

	// canvas for displaying graphics
	var $mask = $('<canvas>').css({
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		zIndex: 10000000,
		pointerEvents: 'none'
	}).attr({
		width: $(window).width(),
		height: $(window).height(),
	}).appendTo('body');
	var ctx = $mask[0].getContext("2d");

	// container for displaying data
	var $display = $('<div>').css({
		position: 'absolute',
		top: 0,
		left: 0,
		zIndex: 10000000,
		width: '300px',
		height: '400px',
		background: 'rgba(255, 255, 255, .75)',
		padding: '8px',
		fontSize: '12px',
		lineHeight: 1.5
	}).appendTo('body');

	// watching variables
	this.listenTo = function(expression, func) {
		var $elem = $('<div>').attr('expression', expression).appendTo($display);
		var itv = setInterval(function() {
			try {
				var val = eval(expression);
			} catch(e) {
				var val = null;
			};
			$elem.text(expression+' = '+(func ? func(val) : val));
		}, 100);
		$elem.data('varItv', itv);
	};

	this.clearLines = function() {
		ctx.clearRect(0, 0, $mask[0].width, $mask[0].height);
	}

	this.drawLine = function(xx, yy, color, width) {
		var x1 = $mask[0].width / 2;
		var y1 = $mask[0].height / 2;
		var x2 = x1 + (xx - snake.xx) * sgsc;
		var y2 = y1 + (yy - snake.yy) * sgsc;

		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = width || 1;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	};

	return this;
};

var controller = function() {
	var self = this;

	this.getScore = function() {
		var $elem = $('div.nsi:contains("Your length") > span:first');
		if (!$elem.length) {
			return null;
		}
		return parseInt($elem.text().match(/\d+$/)[0]);
	};

	var gameState = 'ENDED';
	var checkGameState = setInterval(function() {
		if (gameState == 'PLAYING' && !snake) {
			gameState = 'ENDED';
			self.endGenome(true);
		} else if (gameState == 'ENDED' && snake) {
			gameState = 'PLAYING';

			self.release('LEFT');
			self.release('RIGHT');
			self.release('SPACE');
		}
	}, 100);

	var iteration = 0;
	var highestScore = 0;

	var currGenomeIndex = 0;

	this.startGeneration = function() {
		console.log('-------------');
		console.log('Start Generation '+this.network.generation+'...');

		highestScore = 0;

		this.startGenome();
	}

	var genomeTimeout = null;

	var startingScore;
	this.startGenome = function() {
		var itvTmp = setInterval(function() {
			if (gameState != 'PLAYING') return;
			clearInterval(itvTmp);

			startingScore = self.getScore();
			console.log('  Start Genome '+currGenomeIndex+'...');

			genomeTimeout = setTimeout(function() {
				self.endGenome();
			}, NETWORK_GENOME_TIMEOUT);
		}, 100);
	};

	this.endGenome = function(hasPenalty) {

		if (!genomeTimeout) {
			return;
		}

		clearTimeout(genomeTimeout);
		genomeTimeout = null;

		var score = (this.getScore() || 0) - startingScore;
		if (hasPenalty) {
			score -= NETWORK_GAMEOVER_PENALTY;
		}
		console.log('  Ended Genome '+currGenomeIndex+':', score);

		this.network.population[currGenomeIndex].score = score;

		++currGenomeIndex;
		if (currGenomeIndex >= NETWORK_GENOME_AMOUNT) {
			currGenomeIndex = 0;

			this.endGeneration();
		} else {
			this.startGenome();
		}
	};

	/** End the evaluation of the current generation */
	this.endGeneration = function() {
		console.log('End Generation '+this.network.generation+':', Math.round(this.network.getAverage()));
		console.log('Fittest score:', Math.round(this.network.getFittest().score));

		// // Networks shouldn't get too big
		// for(var genome in this.network.population){
		// 	genome = this.network.population[genome];
		// 	genome.score -= genome.nodes.length * SCORE_RADIUS / 10;
		// }

		// Sort the population by score
		this.network.sort();

		// Draw the best genome
		// drawGraph(neat.population[0].graph($('.best').width()/2, $('.best').height()/2), '.best');

		// Init new pop
		var newPopulation = [];

		// Elitism
		for (var i = 0; i < this.network.elitism; i++) {
			newPopulation.push(this.network.population[i]);
		}

		// Breed the next individuals
		for (var i = 0; i < this.network.popsize - this.network.elitism; i++) {
			newPopulation.push(this.network.getOffspring());
		}

		// Replace the old population with the new population
		this.network.population = newPopulation;
		this.network.mutate();

		this.network.generation++;
		this.startGeneration();
	}

	this.network = new neataptic.Neat(
		NETWORK_INPUT_COUNT, NETWORK_OUTPUT_COUNT,
		null,
		{
			mutation: [
				neataptic.methods.mutation.ADD_NODE,
				neataptic.methods.mutation.SUB_NODE,
				neataptic.methods.mutation.ADD_CONN,
				neataptic.methods.mutation.SUB_CONN,
				neataptic.methods.mutation.MOD_WEIGHT,
				neataptic.methods.mutation.MOD_BIAS,
				// neataptic.methods.mutation.MOD_ACTIVATION,
				neataptic.methods.mutation.ADD_GATE,
				neataptic.methods.mutation.SUB_GATE,
				neataptic.methods.mutation.ADD_SELF_CONN,
				neataptic.methods.mutation.SUB_SELF_CONN,
				neataptic.methods.mutation.ADD_BACK_CONN,
				neataptic.methods.mutation.SUB_BACK_CONN
			],
			popsize: NETWORK_GENOME_AMOUNT,
			mutationRate: NETWORK_MUTATION_RATE,
			elitism: NETWORK_ELITISM
		}
	);

	this.network.population.forEach(function(genome) {
		genome.nodes.forEach(function(node) {
			switch(node.type) {
				case 'input':
					node.squash = neataptic.methods.activation.IDENTITY;
					break;
				case 'output':
					node.squash = neataptic.methods.activation.IDENTITY;
					break;
			}
		});
		genome.connections.forEach(function(connection) {
			connection.weight = Math.random() * 2 - 1;
		});
	});

	for (var i = 0; i < 300; ++i) {
		this.network.mutate();
	}

	this.runNeat = function(inputs) {
		return this.network.population[currGenomeIndex].activate(inputs);
	};

	// handle input for the game
	var sendEvent = function(keyCode, event) {
		var e = new Event(event);
		e.keyCode = keyCode;
		e.which = e.keyCode;
		e.altKey = false;
		e.ctrlKey = true;
		e.shiftKey = false;
		e.metaKey = false;
		e.bubbles = true;
		document.dispatchEvent(e);
		// console.log('SEND', keyCode, event);
	};

	this.pressFor = function(key, delay) {
		var keyCode;
		switch (key) {
			case 'LEFT': keyCode = 37; break;
			case 'RIGHT': keyCode = 39; break;
			case 'SPACE': keyCode = 32; break;
		}

		sendEvent(keyCode, 'keydown');
		setTimeout(function() {
			sendEvent(keyCode, 'keyup');
		}, delay);
	};

	var pressed = {};
	this.press = function(key) {
		if (!pressed[key]) {
			pressed[key] = true;

			var keyCode;
			switch (key) {
				case 'LEFT': keyCode = 37; break;
				case 'RIGHT': keyCode = 39; break;
				case 'SPACE': keyCode = 32; break;
			}
			sendEvent(keyCode, 'keydown');
		}
	};

	this.release = function(key) {
		if (pressed[key]) {
			pressed[key] = false;

			var keyCode;
			switch (key) {
				case 'LEFT': keyCode = 37; break;
				case 'RIGHT': keyCode = 39; break;
				case 'SPACE': keyCode = 32; break;
			}
			sendEvent(keyCode, 'keyup');
		}
	};

	this.getDistance = function(obj) {
		return Math.sqrt(Math.pow(obj.xx - snake.xx, 2) + Math.pow(obj.yy - snake.yy, 2));
	};

	this.getAngle = function(obj) {
		var dy = obj.yy - snake.yy;
		var dx = obj.xx - snake.xx;
		return Math.atan2(dy, dx)
	};

	var angleDiff = function(ang1, ang2) {
		return (ang2 - ang1 + Math.PI + Math.PI * 2) % (Math.PI * 2) - Math.PI;
	};

	this.getAngleDiff = function(obj) {
		var ang = this.getAngle(obj);
		return angleDiff(snake.ang, ang);
	};

	this.processSurrounding = function() {

		var nearestObjs = {
			food: [],
			enermy: []
		};

		for (var z = 0; z < DIVISION_COUNT; ++z) {

			var pointingAngle = - DIVISION_ANGLE + z * DIVISION_SLICE_ANGLE;

			// things at this slice
			var pointingObjs = {
				food: [],
				enermy: []
			};

			var findNearestObj = function(objs) {
				// sort by distance
				var nearestObj = null;
				if (objs.length) {
					objs.sort(function(a, b) {
						return a.distance - b.distance;
					});
					nearestObj = objs[0];
				}
				return {
					angle: pointingAngle,
					distance: nearestObj ? nearestObj.distance : 1000,
					obj: nearestObj ? nearestObj.obj : null,
					type: nearestObj ? nearestObj.type : null,
				};
			};

			// checking other snakes
			snakes.forEach(function(snakeTmp) {
				if (snakeTmp == snake) return;		// self

				snakeTmp.pts.forEach(function(body, i) {
					if (body.dying) return;

					if (Math.abs(angleDiff(self.getAngleDiff(body), pointingAngle)) < DIVISION_SLICE_ANGLE / 2) {
						pointingObjs.enermy.push({
							type: (i == snakeTmp.pts.length - 1) ? 'SNAKE_HEAD' : 'SNAKE_BODY',
							obj: body,
							distance: self.getDistance(body)
						});
					}
				});
			});
			nearestObjs.enermy.push(findNearestObj(pointingObjs.enermy));

			// checking food
			foods.forEach(function(food) {
				if (food && !food.eaten && self.getDistance(food) < 1000) {

					if (Math.abs(angleDiff(self.getAngleDiff(food), pointingAngle)) < DIVISION_SLICE_ANGLE / 2) {
						pointingObjs.food.push({
							type: 'FOOD',
							obj: food,
							distance: self.getDistance(food)
						});
					}
				}
			});
			nearestObjs.food.push(findNearestObj(pointingObjs.food));
		}

		return nearestObjs;
	};

	return this;
};

$(document).ready(function() {
	console.log('Slither IO bot is loaded!');

	can = new canvas();

	// some random variables to watch
	can.listenTo('snake.ang', v => Math.round(v * 180 / Math.PI));
	can.listenTo('foods.length');
	can.listenTo('snake.xx');
	can.listenTo('snake.yy');

	var nearestFood;

	ctrl = new controller();

	ctrl.startGeneration();

	var lastInputs = [];
	var lastOutputs = [];

	setInterval(function() {

		var nearestObjs = ctrl.processSurrounding();

		can.clearLines();

		if (!snake) {
			return;
		}

		// food
		nearestObjs.food.forEach(function(nearestObj) {
			var pa = nearestObj.angle + snake.ang - DIVISION_SLICE_ANGLE / 20;
			var px = Math.cos(pa) * nearestObj.distance + snake.xx;
			var py = Math.sin(pa) * nearestObj.distance + snake.yy;
			can.drawLine(px, py, 'rgba(0, 255, 0, .6)', 2);
		});

		// enermy
		nearestObjs.enermy.forEach(function(nearestObj) {
			var color = 'rgba(255, 0, 0, .5)';
			var width = 2;
			if (nearestObj.obj) {
				switch (nearestObj.type) {
					case 'SNAKE_BODY':
						color = 'rgba(255, 0, 0, .5)';
						break;
					case 'SNAKE_HEAD':
						color = 'rgba(80, 80, 255, .5)';
						width = 2;
						break;
				};
			}
			var pa = nearestObj.angle + snake.ang + DIVISION_SLICE_ANGLE / 20;
			var px = Math.cos(pa) * nearestObj.distance + snake.xx;
			var py = Math.sin(pa) * nearestObj.distance + snake.yy;
			can.drawLine(px, py, color, width);
		});

		// run neat
		var networkInputs = nearestObjs.food.map(function(obj) {
			return obj.distance / 1000;
		}).concat(nearestObjs.enermy.map(function(obj) {
			return obj.distance / 1000;
		}));

		var networkOutputs = ctrl.runNeat(networkInputs);

		if (networkOutputs[0] < 0 && networkOutputs[1] > 0) {
			ctrl.press('LEFT');
		} else {
			ctrl.release('LEFT');
		}

		if (networkOutputs[1] < 0 && networkOutputs[0] > 0) {
			ctrl.press('RIGHT');
		} else {
			ctrl.release('RIGHT');
		}

		if (networkOutputs[2] < 0) {
			ctrl.press('SPACE');
		} else {
			ctrl.release('SPACE');
		}

		lastInputs = networkInputs.slice();
		lastOutputs = networkOutputs.slice();

	}, 40);

	can.listenTo('//inputs', function() {
		return lastInputs.join(', ');
	});
	can.listenTo('//outputs', function() {
		return lastOutputs.join(', ');
	});
});

// auto restart
setInterval(function() {
	$('#playh .nsi').click();
}, 1000);