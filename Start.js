const path = require('path');
const fs = require('fs');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH()

const consoleLogging = fs.createWriteStream('dump/Start.log');
const consoleLogger = new console.Console(consoleLogging, consoleLogging);

const instances = [
    "18.188.207.214",
    "18.219.74.225",
    "18.223.32.0",
    "3.139.106.50",
    "18.222.201.79",
    "3.142.68.159",
    "3.23.130.167",
    "18.218.238.138",
    "3.16.44.23",
    "18.218.109.101",
    "3.141.190.72",
    "18.225.33.31",
    "18.188.168.197",
    "18.190.158.28",
    "18.224.21.26",
    "3.140.243.74",
    "3.143.170.114",
    "18.221.122.64",
    "13.59.77.161",
    "18.220.94.241",
    "3.143.113.128",
    "18.116.53.201",
    "3.16.23.113",
    "3.139.55.229",
    "18.116.25.152"
];

const containers = [
    "demo_1",
    "demo_2",
    "demo_3",
    "demo_4",
    "demo_5",
    "demo_6",
    "demo_7",
    "demo_8",
]

const Upload = async () => {
    await ssh.putDirectory('.', '/home/ubuntu/demo', {
        recursive: true,
        concurrency: 10,
        validate: function (itemPath) {
            const baseName = path.basename(itemPath);
            return ['.dockerignore', 'Dockerfile', 'package.json',
                'init.sh', 'demo.js', 'XPaths.csv', 'Reset',
                'config.json', 'Extract.csv', 'Failed.csv', 'Retry.csv'].includes(baseName)
        },
        tick: function (localPath, remotePath, error) {
            if (error)
                consoleLogger.log("Failed | " + localPath);
            else
                consoleLogger.log("Success | " + localPath);
        }
    }).then(async function () {
        consoleLogger.log("$ sudo docker rmi -f demo")
        await ssh.execCommand("sudo docker rmi -f demo")
            .then(output => consoleLogger.log(output.stdout || output.stderr))
        consoleLogger.log("$ sudo docker build -t demo ./demo")
        await ssh.execCommand("sudo docker build -t demo ./demo")
            .then(output => consoleLogger.log(output.stderr))
        consoleLogger.log("$ sudo docker images")
        await ssh.execCommand("sudo docker images")
            .then(output => consoleLogger.log(output.stderr || output.stderr))
        for (let i = 0; i < containers.length; i++) {
            const port = 2001;
            consoleLogger.log(`$ sudo docker run -p ${port + i}:8080 --name ${containers[i]} -itd demo bash init.sh`)
            await ssh.execCommand(`sudo docker run -p ${port + i}:8080 --name ${containers[i]} -itd demo bash init.sh`)
                .then(output => consoleLogger.log(output.stdout || output.stderr))
        }
    })
}

(async function () {
    for (let i = 0; i < instances.length; i++) {
        console.log(`#${i + 1} | ` + "Connected | " + instances[i])
        await ssh.connect({
            host: instances[i],
            username: 'ubuntu',
            privateKey: './private-key.ppk',
            passphrase: 'biki2014'
        }).then(async function () {
            consoleLogger.log(`#${i + 1} | ` + "Connected | " + instances[i])
            await Upload();
            consoleLogger.log(`#${i + 1} | ` + "Disconnected | " + instances[i] + "\n");
        }).catch(error => consoleLogger.log(error.message))
        console.log(`#${i + 1} | ` + "Disconnected | " + instances[i] + "\n");
    }
})();