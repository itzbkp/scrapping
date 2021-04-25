const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const shell = require('shelljs');

const ssh = new NodeSSH()

const consoleLogging = fs.createWriteStream('dump/Stop.log');
const consoleLogger = new console.Console(consoleLogging, consoleLogging);

const instances = [
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

const date = "17th Apr"

const Download = async instance => {
    for (let i = 0; i < containers.length; i++) {
        consoleLogger.log(`$ sudo docker exec -d ${containers[i]} pm2 kill`)
        await ssh.execCommand(`sudo docker exec -d ${containers[i]} pm2 kill`)
            .then(output => consoleLogger.log(output.stdout || output.stderr))
        // consoleLogger.log(`$ sudo docker cp ${containers[i]}:usr/src/app/Scrapping ./${containers[i]}`)
        // await ssh.execCommand(`sudo docker cp ${containers[i]}:usr/src/app/Scrapping ./${containers[i]}`)
        //     .then(output => consoleLogger.log(output.stdout || output.stderr))
        // shell.mkdir('-p', `./dump/People/${date}/${instance}/${containers[i]}`);
        // await ssh.getDirectory(`./dump/People/${date}/${instance}/${containers[i]}`, `/home/ubuntu/${containers[i]}`, {
        //     recursive: true,
        //     concurrency: 10,
        //     tick: function (localPath, remotePath, error) {
        //         if (error)
        //             consoleLogger.log("Failed | " + localPath);
        //         else
        //             consoleLogger.log("Success | " + localPath);
        //     }
        // }).then(async function (status) {
        // consoleLogger.log(`$ sudo chmod 777 ${containers[i]}`)
        // await ssh.execCommand(`sudo chmod 777 ${containers[i]}`)
        //     .then(output => consoleLogger.log(output.stdout || output.stderr))
        // consoleLogger.log(`$ rm -rf ${containers[i]}`)
        // await ssh.execCommand(`rm -rf ${containers[i]}`)
        //     .then(output => consoleLogger.log(output.stdout || output.stderr))
        consoleLogger.log(`$ sudo docker rm ${containers[i]} -f`)
        await ssh.execCommand(`sudo docker rm ${containers[i]} -f`)
            .then(output => consoleLogger.log(output.stdout || output.stderr))
        // consoleLogger.log('Completed ', status ? 'Successfully' : 'UnSuccessfully' + "\n");
        // }).catch(error => consoleLogger.log(error.message))
    }
}

(async function () {
    for (let i = 0; i < instances.length; i++) {
        console.log(`#${i + 1} | ` + "Connected | " + instances[i]);
        await ssh.connect({
            host: instances[i],
            username: 'ubuntu',
            privateKey: './private-key.pem',
            passphrase: 'biki2014'
        }).then(async function () {
            consoleLogger.log(`#${i + 1} | ` + "Connected | " + instances[i]);
            await Download(instances[i]);
            consoleLogger.log(`#${i + 1} | ` + "Disconnected | " + instances[i] + "\n");
        }).catch(error => consoleLogger.log(error.message))
        console.log(`#${i + 1} | ` + "Disconnected | " + instances[i] + "\n");
    }
})();