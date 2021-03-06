var Cameras = require('../models/Camera')
  , expect = require('chai').expect
  , Emitter = require('events').EventEmitter
  , Promise = require('es6-promise').Promise;

describe("Camera", function() {
	var camera
	  , PACKET_FIXTURE = "data:image\jpg, fsajhkdfhafgd;fdjashfre8h";

	// Fixture that resembles Access interface
	var CameraAccess = function(name) {
		var emitter = new Emitter;

		emitter.play = function(fr) {
			var frames = 0;

			var interval = setInterval(function() {
				frames++;
				emitter.emit('packet', PACKET_FIXTURE);

				if(frames === 10) {
					clearInterval(interval);
					emitter.emit('close');
				}
			}, 1000/fr);
		};
		
		return {
			feed: function() {
				return emitter;
			},

			command: function() {
				return new Promise(function(resolve) {
					resolve();
				});
			}
		}
	};


	// Fixture that resemble Databaes interface
	var Database = function() {
		return {
			fetch: function() {
				return new Promise(function(resolve) {
					resolve({
						key: 'pair'
					});
				});
			},
			save: function() {
				return new Promise(function(resolve) {
					resolve();
				});
			}
		};
	};

	beforeEach(function() {
		camera = Cameras.create("SB_WLA", CameraAccess, Database);
	});

	afterEach(function() {
		camera.destroy();
	});

	it("Should throw error if constructing without valid CameraAccess and DB objects", function() {
		expect(function() {
			var camera = Cameras.create("SB_WLA", CameraAccess, {});
		}).to.throw(TypeError);
		expect(function() {
			var camera = Cameras.create("SB_WLA", {}, Database); 
		}).to.throw(TypeError);
	});

	it("Should start with no clients", function() {
		expect(camera.clients.length).to.equal(0);
	});

	it("Should be able to add and remove client", function() {
		var client = {};

		camera.addClient(client);
		expect(camera.clients.length).to.equal(1);
		camera.removeClient(client);
		expect(camera.clients.length).to.equal(0);
	});

	it("Should start out with framerate of 1", function() {
		expect(camera.currentFr).to.equal(1);
	});

	it("Should return status with promise", function(done) {
		camera.getStatus()
			.then(function(data) {
				expect(data).to.be.an("Object");
				done();
			});
		
	});

	it("Should reset clients and deactivate with close method", function() {
		camera.addClient({});
		camera.close();
		expect(camera.clients.length).to.equal(0);
		expect(camera.active).to.equal(false);
	});

	it("Should only allow client to be added once", function() {
		var client = {};
		camera.addClient(client)
			.addClient(client);

		expect(camera.clients.length).to.equal(1);
	});

	it("Should be able to set single key=>pair in store", function(done) {
		camera.set("left", 2000)
			.then(function() {
				done();
			}, function(err) {
				throw err;
				done();
			});
	});

	it("Should choose higher framerate feed", function() {
		camera.requestWithFramerate(5);
		camera.requestWithFramerate(4);

		expect(camera.currentFr).to.equal(5);
	});
		
	it("Should proxy packet to client from feed", function(done) {
		var client = {
			writeData: function(data) {
				expect(data).to.equal(PACKET_FIXTURE);
				done();
			}
		};

		camera.addClient(client)
			.requestWithFramerate(50);
	});

	it("Should stop writing data when feed closes", function(done) {
		var packets = 0;

		var client = {
			writeData: function(data) {
				packets++;
			}
		};

		// Our test feed only emits 10 packets
		setTimeout(function() {
			expect(packets).to.equal(10);
			done();
		}, 300);

		camera.addClient(client)
			.requestWithFramerate(50);
	});

	it("Should remove client when feed closes", function(done) {
		var client = {
			writeData: function(data) {
			}
		};

		// Our test feed only emits 10 packets
		setTimeout(function() {
			expect(camera.clients.indexOf(client)).to.equal(-1);
			done();
		}, 250);

		camera.addClient(client)
			.requestWithFramerate(50);
	});
		
});
