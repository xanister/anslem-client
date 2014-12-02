/*
 * Setup requirejs
 */
requirejs.config({
    baseUrl: 'src',
    shim: {
        'socketio': {
            exports: 'io'
        }
    }
});

/*
 * Start it up
 */
requirejs(
        ['./AnslemClient', './AnslemClientConfig'],
        function (AnslemClient, AnslemClientConfig) {
            // Attach to window for debugging
            console.log(AnslemClientConfig.serverUrl);
            window.ac = new AnslemClient(AnslemClientConfig.serverUrl);

            // Initialize and go ahead and start when ready
            window.ac.init(function () {
                this.start();
            });
        }
);
