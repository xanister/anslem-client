/**
 * Setup requirejs
 */
requirejs.config({
    baseUrl: 'js',
    shim: {
        'socketio': {
            exports: 'io'
        }
    }
});

/**
 * Start it up
 * @param {AnslemClient} AnslemClient
 */
requirejs(
        ['./AnslemClient'],
        function (AnslemClient) {
            // Attach to window for debugging
            window.ac = AnslemClient;

            // Initialize and go ahead and start when ready
            AnslemClient.init(function () {
                AnslemClient.start();
            });
        }
);
