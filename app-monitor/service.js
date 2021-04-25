var Service = require('node-windows').Service;

var svc = new Service({
    name: 'Portainer Service',
    description: 'Portainer Service | Made By BKP',
    script: 'app.js',
});

svc.on('install', function () {
    svc.start();
});

svc.install();