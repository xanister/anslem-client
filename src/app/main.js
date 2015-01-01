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
        'socketio': {
            exports: 'io'
        }
    }
});

/*
 * Start it up
 */
requirejs(
        ['AnslemClient', 'AnslemClientConfig'],
        function (AnslemClient, AnslemClientConfig) {
            // Attach to window for debugging
            window.ac = new AnslemClient(AnslemClientConfig.serverUrl);

            // Initialize and go ahead and start when ready
            window.ac.start();
        }
);
