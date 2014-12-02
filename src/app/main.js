/*
 * Setup requirejs
 */
requirejs.config({
    baseUrl: 'src/lib',
    paths: {
        'AnslemClient': "../app/AnslemClient",
        'AnslemClientConfig': "../app/AnslemClientConfig"
    },
    shim: {
        'jquery.keyboard': ["jquery"],
        'socketio': {
            exports: 'io'
        }
    }
});

/*
 * Start it up
 */
requirejs(
        ['AnslemClient', 'AnslemClientConfig', 'jquery'],
        function (AnslemClient, AnslemClientConfig) {
            // Attach to window for debugging
            window.ac = new AnslemClient(AnslemClientConfig.serverUrl);

            // Initialize and go ahead and start when ready
            window.ac.init(function () {
                this.start();
            });
        }
);
