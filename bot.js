
var DIVISION_ANGLE = Math.PI / 2;
var DIVISION_COUNT = 9;
var DIVISION_SLICE_ANGLE = DIVISION_ANGLE * 2 / (DIVISION_COUNT - 1);

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

	this.getScore = function() {
		var $elem = $('div.nsi:contains("Your length") > span:first');
		if (!$elem.length) {
			return null;
		}
		return parseInt($elem.text().match(/\d+$/)[0]);
	};

	var checkGameState = setInterval(function() {
		if (!snake) {
			var score = self.getScore();
			if (score && self.onGameEnded) {
				self.onGameEnded(score);
			}
		}
	}, 100);

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
	};

	this.press = function(key, delay) {
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
		var self = this;

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

	can.onGameEnded = function(score) {
		console.log('Gameover:', score);
	};

	// some random variables to watch
	can.listenTo('snake.ang', v => Math.round(v * 180 / Math.PI));
	can.listenTo('foods.length');
	can.listenTo('snake.xx');
	can.listenTo('snake.yy');

	var nearestFood;

	ctrl = new controller();
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

		// dummy logics here..
		// var frontScore = 0;
		// nearestObjs.forEach(function(nearestObj) {
		// 	if (nearestObj.type == 'FOOD') {
		// 		++frontScore;
		// 	} else {
		// 		--frontScore;
		// 	}
		// });

		// if (frontScore < 0) {
		// 	ctrl.press('RIGHT', 800);
		// } else if (nearestObjs.length) {
		// 	var frontObjs = nearestObjs.slice().filter(function(frontObj) {
		// 		return frontObj.type == 'FOOD';
		// 	});
		// 	frontObjs.sort(function(a, b) {
		// 		return Math.abs(ctrl.getAngleDiff(a.obj)) - Math.abs(ctrl.getAngleDiff(b.obj));
		// 	});

		// 	var nearestFood = frontObjs[0];
		// 	can.drawLine(nearestFood.obj.xx, nearestFood.obj.yy, 'rgba(255, 255, 255, .5)', 3);
		// 	var dang = ctrl.getAngleDiff(nearestFood.obj);
		// 	if (dang > 0) {
		// 		ctrl.press('RIGHT', 800 * dang);
		// 	} else if (dang < 0) {
		// 		ctrl.press('LEFT', 800 * Math.abs(dang));
		// 	}
		// }

	}, 40);

	can.listenTo('//dis', function() {
		return nearestFood ? Math.round(nearestFood.distance) : null;
	});
	can.listenTo('//ang', function() {
		return nearestFood ? Math.round(nearestFood.angleDiff * 180 / Math.PI) : null;
	});
});

/*var goRand = function() {
	var r = Math.random();
	var d = Math.random() * 1000 + 100;
	if (r < .3) {
		c.press('LEFT', d);
	} else if (r >= .7) {
		c.press('RIGHT', d);
	} else if (r >= .5) {
		c.press('SPACE', d);
	}
	setTimeout(goRand, d);
};*/

// auto restart
setInterval(function() {
	$('#playh .nsi').click();
}, 2000);