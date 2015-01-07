/**
 * Node client
 *
 * @module NodeRoomClient
 * @requires socket.io
 */
define(['socket.io'], function (io) {
    /**
     * NodeRoomClient
     *
     * @class NodeRoomClient
     * @constructor
     * @param {String} serverAddress
     */
    function NodeRoomClient(serverAddress) {
        /**
         * IO socket, send some basic data to server on connect
         *
         * @property socket
         * @private
         * @type {Object}
         */
        var socket = false;

        /**
         * Touch velocity required to register a swipe
         *
         * @property swipeVelocity
         * @static
         * @type {Number}
         */
        NodeRoomClient.swipeVelocity = 0.3;

        /**
         * Client info synced to server
         *
         * @property info
         * @type {Object}
         */
        this.info = {};

        /**
         * Client inputs
         *
         * @property inputs
         * @type {Object}
         */
        this.inputs = {keyboard: {}, touches: {}, events: {}};

        /**
         * Is touch device
         *
         * @property isTouchDevice
         * @type {Boolean}
         */
        this.isTouchDevice = ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);

        /**
         * Connection success callback
         *
         * @event onconnect
         * @type {Function}
         */
        this.onconnect = false;

        /**
         * Disconnect callback
         *
         * @event ondisconnect
         * @type {Function}
         */
        this.ondisconnect = false;

        /**
         * Error callback
         *
         * @event onerror
         * @type {Function}
         */
        this.onerror = false;

        /**
         * State changed
         *
         * @event
         * @param {String} newstate
         */
        this.onstatechange = false;

        /**
         * Server address
         *
         * @property serverAddress
         * @type {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Client state
         *
         * @property state
         * @type {String}
         */
        this.state = "disconnected";

        /**
         * Bind user input events
         *
         * @method bindClientEvents
         * @protected
         */
        this.bindClientEvents = function () {
            var self = this;
            var touchStartX = {};
            var touchStartY = {};
            var touchStartTime = {};

            /**
             * Update server with new screen size on orientation change
             *
             * @event orientationchange
             * @private
             */
            window.addEventListener('orientationchange', function () {
                var newScreenWidth = window.innerWidth;
                var newScreenHeight = window.innerHeight;

                self.setInfo({
                    screenWidth: newScreenWidth,
                    screenHeight: newScreenHeight,
                    orientaion: window.orientation
                });
            });

            /**
             * Update server with new screen size on resize
             *
             * @event resize
             * @private
             */
            window.addEventListener('resize', function () {
                var newScreenWidth = window.innerWidth;
                var newScreenHeight = window.innerHeight;

                self.setInfo({
                    screenWidth: newScreenWidth,
                    screenHeight: newScreenHeight,
                    orientaion: window.orientation
                });
            });

            /**
             * Client resumes
             *
             * @event focus
             * @private
             * @param {Event} event
             */
            window.addEventListener("focus", function (event) {
                self.unpause();
            });

            /**
             * Client leaves
             *
             * @event blur
             * @private
             * @param {Event} event
             */
            window.addEventListener("blur", function (event) {
                self.pause();
            });

            /**
             * Client keydown
             *
             * @event keydown
             * @private
             * @param {Event} event
             */
            document.addEventListener("keydown", function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                if (self.inputs.keyboard[keyPressed])
                    return false;
                self.inputs.keyboard[keyPressed] = true;
                if (!self.inputs.events.keydown)
                    self.inputs.events.keydown = {};
                self.inputs.events.keydown[keyPressed] = true;
                self.sendInputUpdate.call(self);
            });

            /**
             * Client keyup
             *
             * @event keyup
             * @private
             * @param {Event} event
             */
            document.addEventListener("keyup", function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                self.inputs.keyboard[keyPressed] = false;
                if (!self.inputs.events.keyup)
                    self.inputs.events.keyup = {};
                self.inputs.events.keyup[keyPressed] = true;
                self.sendInputUpdate.call(self);
            });

            /**
             * Mousedown
             *
             * @event mousedown
             * @private
             * @param {Event} event
             */
            document.addEventListener("mousedown", function (event) {
                if (!self.inputs.events.mousedown)
                    self.inputs.events.mousedown = {};
                self.inputs.events.mousedown[event.button] = {
                    x: event.clientX,
                    y: event.clientY
                };
                self.sendInputUpdate.call(self);
            });

            /**
             * Mousemove
             *
             * @event mousedown
             * @private
             * @param {Event} event
             */
            document.addEventListener("mousemove", function (event) {
                self.inputs.events.mousemove = {
                    x: event.clientX,
                    y: event.clientY
                };
                self.sendInputUpdate.call(self);
            });

            /**
             * Mouseup
             *
             * @event mousedown
             * @private
             * @param {Event} event
             */
            document.addEventListener("mouseup", function (event) {
                if (!self.inputs.events.mouseup)
                    self.inputs.events.mouseup = {};
                self.inputs.events.mouseup[event.button] = {
                    x: event.clientX,
                    y: event.clientY
                };
                self.sendInputUpdate.call(self);
            });

            /**
             * Client touchend
             *
             * @event touchend
             * @private
             * @param {Event} event
             */
            document.addEventListener("touchend", function (event) {
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var touch = event.changedTouches[index];
                    self.inputs.events.touchend = {};
                    self.inputs.events.touchend[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    var touchTime = new Date().getTime() - touchStartTime[touch.identifier];
                    if (touchTime < 200) {
                        var xDist = touch.clientX - touchStartX[touch.identifier];
                        var yDist = touch.clientY - touchStartY[touch.identifier];
                        if (xDist > 50)
                            self.inputs.events.swiperight = {
                                xDist: xDist,
                                yDist: yDist
                            };
                        else if (xDist < -50)
                            self.inputs.events.swipeleft = {
                                xDist: xDist,
                                yDist: yDist
                            };
                        else if (yDist < -50)
                            self.inputs.events.swipeup = {
                                xDist: xDist,
                                yDist: yDist
                            };
                        else if (yDist > 50)
                            self.inputs.events.swipedown = {
                                xDist: xDist,
                                yDist: yDist
                            };
                    }
                    delete touchStartX[touch.identifier];
                    delete touchStartY[touch.identifier];
                    delete touchStartTime[touch.identifier];
                    delete self.inputs.touches[touch.identifier];
                    self.inputs.touches.length--;
                }
                self.sendInputUpdate.call(self);
            });

            /**
             * Client touchmove
             *
             * @event touchmove
             * @private
             * @param {Event} event
             */
            document.addEventListener("touchmove", function (event) {
                event.preventDefault();
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var touch = event.changedTouches[index];
                    self.inputs.events.touchmove = {};
                    self.inputs.events.touchmove[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    self.inputs.touches[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touch.clientX,
                        y: touch.clientY
                    };
                }
                self.sendInputUpdate.call(self);
            });

            /**
             * Client touchstart
             *
             * @event touchstart
             * @private
             * @param {Event} event
             */
            document.addEventListener("touchstart", function (event) {
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var touch = event.changedTouches[index];
                    touchStartX[touch.identifier] = touch.clientX;
                    touchStartY[touch.identifier] = touch.clientY;
                    touchStartTime[touch.identifier] = new Date().getTime();

                    self.inputs.events.touchstart = {};
                    self.inputs.events.touchmove = {};
                    self.inputs.events.touchstart[touch.identifier] = self.inputs.events.touchmove[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touchStartX[touch.identifier],
                        y: touchStartY[touch.identifier]
                    };
                    self.inputs.touches[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touchStartX[touch.identifier],
                        y: touchStartY[touch.identifier]
                    };
                    self.inputs.touches.length = self.inputs.touches.length ? self.inputs.touches.length + 1 : 1;
                }
                self.sendInputUpdate.call(self);
            });
        };

        /**
         * Bind basic server events
         *
         * @method bindServerEvents
         * @protected
         */
        this.bindServerEvents = function () {
            var self = this;

            /**
             * Clear old listeners
             */
            socket.removeAllListeners();

            /**
             * On connect
             *
             * @event connection
             * @private
             * @param {Object} response
             */
            socket.on("connection", function (response) {
                self.log("connected");
                self.setState("running");
                self.setInfo({
                    screenHeight: window.innerHeight,
                    screenWidth: window.innerWidth,
                    touchDevice: self.isTouchDevice,
                    orientaion: window.orientaion || false,
                    pixelRatio: window.devicePixelRatio || 1
                });
                if (self.onconnect)
                    self.onconnect(response);
            });

            /**
             * Connection error
             *
             * @event connect_error
             * @private
             * @param {Object} response
             */
            socket.on('connect_error', function (response) {
                self.log(response, "error");
                self.setState("disconnected");
                socket.disconnect();
                if (self.onerror)
                    self.onerror(response);
            });

            /**
             * On disconnect
             *
             * @event disconnect
             * @private
             */
            socket.on('disconnect', function () {
                self.log("disconnected");
                self.setState("disconnected");
                socket.disconnect();
                socket = false;
                if (self.ondisconnect)
                    self.ondisconnect();
            });

            /**
             * On error
             *
             * @event error
             * @private
             * @param {Object} response
             */
            socket.on('error', function (response) {
                self.log(response, "error");
                self.setState("socket error");
                socket.disconnect();
                if (self.onerror)
                    self.onerror(response);
            });

            /**
             * Listen for ping
             *
             * @event ping
             * @private
             */
            socket.on('ping', function () {
                self.trigger("pong");
            });
        };

        /**
         * Open connection
         *
         * @method connect
         */
        NodeRoomClient.prototype.connect = function () {
            this.setState("connecting");
            socket = io.connect(this.serverAddress, {
                'forceNew': true,
                'sync disconnect on unload': true
            });
            this.bindServerEvents();
        };

        /**
         * Close connection
         *
         * @method disconnect
         */
        NodeRoomClient.prototype.disconnect = function () {
            this.setState("disconnected", true);
            socket.disconnect();
        };

        /**
         * Basic logging
         *
         * @method log
         * @param {String} message
         * @param {String} [logType=info]
         */
        NodeRoomClient.prototype.log = function (message, logType) {
            console.log("[" + (logType || "info") + "] " + message);
        };

        /**
         * Add event listener for server event
         *
         * @method on
         * @param {String} eventName
         * @param {Function} callback
         */
        NodeRoomClient.prototype.on = function (eventName, callback) {
            var self = this;
            socket.on(eventName, function (response) {
                callback.call(self, response);
            });
        };

        /**
         * Pause connection
         *
         * @method pause
         */
        NodeRoomClient.prototype.pause = function () {
            if (this.state === "running")
                this.setState("paused", true);
        };

        /**
         * Update server with client inputs
         *
         * @method sendInputUpdate
         */
        NodeRoomClient.prototype.sendInputUpdate = function () {
            if (this.state === "running")
                socket.emit("input", this.inputs);
            this.inputs.events = {};
        };

        /**
         * Update info
         *
         * @method setInfo
         * @param {Object} newInfo
         */
        NodeRoomClient.prototype.setInfo = function (newInfo) {
            for (var key in newInfo)
                this.info[key] = newInfo[key];
            socket.emit("info", this.info);
        };

        /**
         * Updates client state
         *
         * @method setState
         * @param {String} state
         * @param {Boolean} [updateServer=false]
         */
        NodeRoomClient.prototype.setState = function (state, updateServer) {
            this.log("state change: " + state + (updateServer ? ", with server update" : ""));
            this.state = state;
            if (updateServer)
                socket.emit("stateChange", state);
            if (this.onstatechange)
                this.onstatechange(state);
        };

        /**
         * Open connection and bind server/input callback events
         *
         * @method start
         */
        NodeRoomClient.prototype.start = function () {
            if (!socket) {
                this.connect();
                this.bindClientEvents();
            }
        };

        /**
         * Emit event to server
         *
         * @method trigger
         * @param {String} eventName
         * @param {Object} packet
         */
        NodeRoomClient.prototype.trigger = function (eventName, packet) {
            socket.emit(eventName, packet || false);
        };

        /**
         * Unpause connection
         *
         * @method unpause
         */
        NodeRoomClient.prototype.unpause = function () {
            if (this.state === "paused")
                this.setState("running", true);
        };
    }

    return NodeRoomClient;
});