const express = require('express');
const axios = require("axios");

const app = express();
const port = 4000;

const getLogs = (host, container, token, tail) => {
    return {
        method: 'GET',
        url: `http://${host}:9000/api/endpoints/1/docker/containers/${container}/logs`,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        params: {
            stdout: 1,
            tail
        }
    }
};

app.get('/', ({ query: { host, container, token } }, res) => {
    axios(getLogs(host, container, token, 20))
        .then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            if (error.response && error.response.status === 404)
                res.send("");
            else
                console.log(error.message);
        });
});

app.get('/config', ({ query: { host, port } }, res) => {
    axios.get(`http://${host}:${port}/config.json`)
        .then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            console.log(error.message);
        });
});

app.post('/processed', ({ query: { StartDate, EndDate } }, res) => {
    axios.post("https://datacleaner.whoisvisiting.com/GetLinkedInProcessedProfilesCount.ashx", {
        StartDate,
        EndDate
    }, {
        headers: {
            Authorization: 'BFCC45E1-DAB4-4303-A987-F1E50C6350E2'
        }
    })
        .then(function (response) {
            res.send(response.data.toString());
        })
        .catch(function (error) {
            console.log(error.message);
        });
});

app.get('/last', ({ query: { host, container, token } }, res) => {
    axios(getLogs(host, container, token, 1))
        .then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            if (error.response && error.response.status === 404)
                res.send("");
            else
                console.log(error.message);
        });
});

app.post('/auth', ({ query: { host } }, res) => {
    axios.post(`http://${host}:9000/api/auth`, {
        username: 'admin',
        password: 'biki2014'
    })
        .then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            console.log(error.message);
        });
});

app.listen(port, () => {
    console.log(`Portainer loaded at http://localhost:${port}`)
});