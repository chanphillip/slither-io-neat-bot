
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
	}, 200);

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
		return Math.abs(Math.pow(obj.xx - snake.xx, 2) + Math.pow(obj.yy - snake.yy, 2));
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

		var DIVISION_COUNT = 36;
		var DIVISION_ANGLE = Math.PI * 2 / DIVISION_COUNT;

		var nearestObjs = [];

		for (var z = 0; z < DIVISION_COUNT; ++z) {

			var pointingAngle = z * DIVISION_ANGLE;

			if (pointingAngle > Math.PI / 2 && pointingAngle < Math.PI * 3 / 2) continue;

			var pointingObjs = [];

			// checking other snakes
			snakes.forEach(function(snakeTmp) {
				if (snakeTmp == snake) return;		// self

				snakeTmp.pts.forEach(function(body, i) {
					if (body.dying) return;

					if (Math.abs(angleDiff(self.getAngleDiff(body), pointingAngle)) < DIVISION_ANGLE / 2) {
						if (i == snakeTmp.pts.length - 1) {
							pointingObjs.push({
								type: 'SNAKE_HEAD',
								obj: body
							});
						} else {
							pointingObjs.push({
								type: 'SNAKE_BODY',
								obj: body
							});
						}
					}
				});
			});

			// checking food
			foods.forEach(function(food) {
				if (food && !food.eaten && self.getDistance(food) < 100000) {

					if (Math.abs(angleDiff(self.getAngleDiff(food), pointingAngle)) < DIVISION_ANGLE / 2) {
						pointingObjs.push({
							type: 'FOOD',
							obj: food
						});
					}
				}
			});

			// sort by distance
			if (pointingObjs.length) {
				pointingObjs.sort(function(a, b) {
					return self.getDistance(a.obj) - self.getDistance(b.obj);
				});

				var nearestObj = pointingObjs[0];
				nearestObjs.push(nearestObj);
			}
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
	setInterval(function() {

		var nearestObjs = ctrl.processSurrounding();

		can.clearLines();
		nearestObjs.forEach(function(nearestObj) {
			var color;
			var width;
			switch (nearestObj.type) {
				case 'FOOD':
					color = 'rgba(0, 255, 0, 1)';
					width = 1;
					break;
				case 'SNAKE_BODY':
					color = 'rgba(255, 0, 0, .5)';
					width = nearestObj.obj.tl;
					break;
				case 'SNAKE_HEAD':
					color = 'rgba(80, 80, 255, .5)';
					width = 2;
					break;
			};
			can.drawLine(nearestObj.obj.xx, nearestObj.obj.yy, color, width);
		});

		// nearestFood = foodSorted[0] || null;

		// can.clearLines();
		// if (nearestFood) {
		// 	can.drawLine(nearestFood.obj.xx, nearestFood.obj.yy, '#FF0000');

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