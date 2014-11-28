define(['lib/socket.io'], function (io) {
    /**
     * NodeClient
     * @param {String} serverAddress
     * @returns {NodeClient}
     */
    function NodeClient(serverAddress) {
        /**
         * Touch distance required to register a swipe
         * @access static
         * @var {Number}
         */
        NodeClient.swipeDistance = 50;

        /**
         * IO socket
         * @access private
         * @var {Object}
         */
        var socket;

        /**
         * Connected flag
         * @access public
         * @var {Boolean}
         */
        this.connected = false;

        /**
         * Data synced to server
         * @access public
         * @var {Object}
         */
        this.data = {packet: []};

        /**
         * Client id
         * @access public
         * @var {String}
         */
        this.id = false;

        /**
         * Client inputs
         * @access public
         * @var {Object}
         */
        this.inputs = {keyboard: {}, touches: {}, events: {}};

        /**
         * Server address
         * @access public
         * @var {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Connection callback
         * @access public
         * @param {Object} response
         */
        this.connectCallback = function (response) {
            this.log("Connection opened:", response);
        };

        /**
         * Disconnect callback
         * @access public
         */
        this.disconnectCallback = function () {
            this.log("Connection closed");
        };

        /**
         * Error callback
         * @access public
         * @param {Object} response
         */
        this.errorCallback = function (response) {
            this.log("Error recieved:", response);
        };

        /**
         * Message recieved callback
         * @access public
         * @param {String} response
         */
        this.messageCallback = function (response) {
            this.log("Message recieved:", response);
        };

        /**
         * Update data callback
         * @access public
         */
        this.updateCallback = false;

        /**
         * Update server with client info
         * @access public
         * @param {Object} info
         */
        NodeClient.prototype.infoUpdate = function (info) {
            socket.emit("clientInfo", info);
        };

        /**
         * Update server with client inputs
         * @access public
         * @param {Object} inputs
         */
        NodeClient.prototype.inputUpdate = function (inputs) {
            socket.emit("clientInput", inputs);
            this.inputs.events = this.getEmptyInputEvents();
        };

        /**
         * Basic logging
         * @param {String} message
         */
        NodeClient.prototype.log = function (message) {
            console.log(message);
        };

        /**
         * Generate empty event object
         * @returns {Object}
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
         * @access public
         * @return {Number}
         */
        this.getClientScreenWidth = function () {
            return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        };

        /**
         * Client screen height
         * @access public
         * @return {Number}
         */
        this.getClientScreenHeight = function () {
            return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        };

        /**
         * Open connection and bind server/input callback events
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
             * On connection
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
             * On disconnect
             */
            socket.on('disconnect', function () {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.disconnectCallback)
                    nodeClient.disconnectCallback.call(nodeClient);
            });

            /**
             * On error
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
             * @param {String} response
             */
            socket.on('message', function (response) {
                if (nodeClient.messageCallback)
                    nodeClient.messageCallback.call(nodeClient, response);
            });

            /**
             * On update
             * @param {Object} response
             */
            socket.on("update", function (response) {
                nodeClient.data.packet = response.packet;
                if (nodeClient.updateCallback)
                    nodeClient.updateCallback.call(nodeClient, response);
            });

            /**
             * Update server with new screen size on orientation change
             */
            window.addEventListener('orientationchange', function () {
                nodeClient.infoUpdate({screenWidth: nodeClient.getClientScreenWidth(), screenHeight: nodeClient.getClientScreenHeight()});
            });

            /**
             * Update server with new screen size on resize
             */
            window.addEventListener('resize', function () {
                nodeClient.infoUpdate({screenWidth: nodeClient.getClientScreenWidth(), screenHeight: nodeClient.getClientScreenHeight()});
            });

            /**
             * Client keydown
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