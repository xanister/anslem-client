/**
 * Node client
 *
 * @module NodeClient
 * @requires socket.io
 */
define(['lib/socket.io'], function (io) {
    /**
     * NodeClient
     *
     * @class NodeClient
     * @constructor
     * @param {String} serverAddress
     */
    function NodeClient(serverAddress) {
        /**
         * Touch distance required to register a swipe
         *
         * @property swipeDistance
         * @static
         * @type {Number}
         */
        NodeClient.swipeDistance = 50;

        /**
         * IO socket
         *
         * @property socket
         * @private
         * @type {Object}
         */
        var socket;

        /**
         * Connected flag
         *
         * @property connected
         * @type {Boolean}
         */
        this.connected = false;

        /**
         * Data synced to server
         *
         * @property data
         * @type {Object}
         */
        this.data = {packet: []};

        /**
         * Client id
         *
         * @property
         * @type {String}
         */
        this.id = false;

        /**
         * Client inputs
         *
         * @property inputs
         * @type {Object}
         */
        this.inputs = {keyboard: {}, touches: {}, events: {}};

        /**
         * Server address
         *
         * @property serverAddress
         * @type {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Connection callback
         *
         * @method connectCallback
         * @param {Object} response
         */
        this.connectCallback = function (response) {
            this.log("Connection opened:", response);
        };

        /**
         * Disconnect callback
         *
         * @method disconnectCallback
         */
        this.disconnectCallback = function () {
            this.log("Connection closed");
        };

        /**
         * Error callback
         *
         * @method errorCallback
         * @param {Object} response
         */
        this.errorCallback = function (response) {
            this.log("Error recieved:", response);
        };

        /**
         * Message recieved callback
         *
         * @method messageCallback
         * @param {String} response
         */
        this.messageCallback = function (response) {
            this.log("Message recieved:", response);
        };

        /**
         * Update data callback
         *
         * @method messageCallback
         */
        this.updateCallback = false;

        /**
         * Update server with client info
         *
         * @method infoUpdate
         * @param {Object} info
         */
        NodeClient.prototype.infoUpdate = function (info) {
            socket.emit("clientInfo", info);
        };

        /**
         * Update server with client inputs
         *
         * @method inputUpdate
         * @param {Object} inputs
         */
        NodeClient.prototype.inputUpdate = function (inputs) {
            socket.emit("clientInput", inputs);
            this.inputs.events = this.getEmptyInputEvents();
        };

        /**
         * Basic logging
         *
         * @method log
         * @param {String} message
         */
        NodeClient.prototype.log = function (message) {
            console.log(message);
        };

        /**
         * Generate empty event object
         *
         * @method getEmptyInputEvents
         * @return {Object}
         */
        NodeClient.prototype.getEmptyInputEvents = function () {
            return {
                keydown: {},
                keyup: {},
                message: false,
                swipe: {},
                touchstart: false,
                touchend: false
            };
        };

        /**
         * Client screen width
         *
         * @method getClientScreenWidth
         * @return {Number}
         */
        this.getClientScreenWidth = function () {
            return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        };

        /**
         * Client screen height
         *
         * @method getClientScreenHeight
         * @return {Number}
         */
        this.getClientScreenHeight = function () {
            return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        };

        /**
         * Open connection and bind server/input callback events
         *
         * @method start
         * @param {function} connectCallback
         */
        NodeClient.prototype.start = function (connectCallback) {
            // Reset input events
            this.inputs.events = this.getEmptyInputEvents();

            // Open connection
            this.connectCallback = connectCallback || this.connectCallback;
            socket = io.connect(this.serverAddress, {'sync disconnect on unload': true, query: "screenSize=" + this.getClientScreenWidth() + "," + this.getClientScreenHeight()});

            // Bind events
            var nodeClient = this;

            /**
             * On connect
             *
             * @event connection
             * @param {Object} response expects {message: 'a message', clientId: 'aclientid', initialData: {someDataObject}}
             */
            socket.on("connection", function (response) {
                nodeClient.connected = true;
                nodeClient.id = response.clientId;
                nodeClient.initialData = response.initialData;
                if (nodeClient.connectCallback)
                    nodeClient.connectCallback.call(nodeClient, response);
            });

            /**
             * Connection error
             *
             * @event connect_error
             * @param {Object} response
             */
            socket.on('connect_error', function (response) {
                nodeClient.connected = false;
                socket.disconnect();
                console.log('Error connecting to server', response);
            });

            /**
             * On disconnect
             *
             * @event disconnect
             */
            socket.on('disconnect', function () {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.disconnectCallback)
                    nodeClient.disconnectCallback.call(nodeClient);
            });

            /**
             * On error
             *
             * @event error
             * @param {Object} response
             */
            socket.on('error', function (response) {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.errorCallback)
                    nodeClient.errorCallback.call(nodeClient, response);
            });

            /**
             * On message
             *
             * @event message
             * @param {String} response
             */
            socket.on('message', function (response) {
                if (nodeClient.messageCallback)
                    nodeClient.messageCallback.call(nodeClient, response);
            });

            /**
             * On update
             *
             * @event update
             * @param {Object} response
             */
            socket.on("update", function (response) {
                nodeClient.data.packet = response.packet;
                if (nodeClient.updateCallback)
                    nodeClient.updateCallback.call(nodeClient, response);
            });

            /**
             * Update server with new screen size on orientation change
             *
             * @event orientationchange
             */
            window.addEventListener('orientationchange', function () {
                nodeClient.infoUpdate({screenWidth: nodeClient.getClientScreenWidth(), screenHeight: nodeClient.getClientScreenHeight()});
            });

            /**
             * Update server with new screen size on resize
             *
             * @event resize
             */
            window.addEventListener('resize', function () {
                nodeClient.infoUpdate({screenWidth: nodeClient.getClientScreenWidth(), screenHeight: nodeClient.getClientScreenHeight()});
            });

            /**
             * Client keydown
             *
             * @event keydown
             * @param {Event} event
             */
            document.addEventListener("keydown", function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                if (nodeClient.inputs.keyboard[keyPressed])
                    return false;
                nodeClient.inputs.keyboard[keyPressed] = true;
                nodeClient.inputs.events.keydown[keyPressed] = true;
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });

            /**
             * Client keyup
             *
             * @event keyup
             * @param {Event} event
             */
            document.addEventListener("keyup", function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                nodeClient.inputs.keyboard[keyPressed] = false;
                nodeClient.inputs.events.keyup[keyPressed] = true;
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });

            /**
             * Client touchstart
             *
             * @event touchstart
             * @param {Event} event
             */
            document.addEventListener("touchstart", function (event) {
                event.preventDefault();
                for (var index = 0; index < event.changedTouches.length; index++) {
                    nodeClient.inputs.touches[index] = {
                        x: event.changedTouches[index].clientX,
                        y: event.changedTouches[index].clientY,
                        startX: event.changedTouches[index].clientX,
                        startY: event.changedTouches[index].clientY
                    };
                    nodeClient.inputs.events.touchstart = {
                        touchIndex: index,
                        x: event.changedTouches[index].clientX,
                        y: event.changedTouches[index].clientY
                    };
                }

                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });

            /**
             * Client touchmove, possibly dangerous to run over network
             *
             * @event touchmove
             * @param {Event} event
             */
            document.addEventListener("touchmove", function (event) {
                event.preventDefault();
                for (var index = 0; index < event.changedTouches.length; index++) {
                    nodeClient.inputs.touches[index].x = event.changedTouches[index].clientX;
                    nodeClient.inputs.touches[index].y = event.changedTouches[index].clientY;
                }
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });

            /**
             * Client touchend
             *
             * @event touchend
             * @param {Event} event
             */
            document.addEventListener("touchend", function (event) {
                event.preventDefault();
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var swipeDistX = event.changedTouches[index].clientX - nodeClient.inputs.touches[index].startX;
                    var swipeDistY = event.changedTouches[index].clientY - nodeClient.inputs.touches[index].startY;
                    var swipeH = swipeDistX > NodeClient.swipeDistance ? "right" : (swipeDistX < -NodeClient.swipeDistance ? "left" : false);
                    var swipeV = swipeDistY > NodeClient.swipeDistance ? "down" : (swipeDistY < -NodeClient.swipeDistance ? "up" : false);
                    var swipeDirection = swipeV || swipeH || false;
                    if (swipeDirection) {
                        nodeClient.inputs.events.swipe[swipeDirection] = {
                            dir: swipeDirection,
                            distX: swipeDistX,
                            distY: swipeDistY,
                            x: event.changedTouches[index].clientX,
                            y: event.changedTouches[index].clientY
                        };
                    }
                    delete nodeClient.inputs.touches[index];
                    nodeClient.inputs.events.touchend = {
                        touchIndex: index,
                        x: event.changedTouches[index].clientX,
                        y: event.changedTouches[index].clientY
                    };
                }
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });
        };
    }

    return NodeClient;
});