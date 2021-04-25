import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@material-ui/core';
import DesktopWindows from '@material-ui/icons/DesktopWindows';
import { makeStyles } from '@material-ui/core/styles';
import axios from "axios";
import moment from 'moment';

const useStyles = makeStyles({
    root: {
        display: 'inline-block',
        margin: '20px 32px',
        width: '336px',
        "& a": {
            fontSize: "20px",
            fontWeight: "bold",
            color: "rgb(26 35 126)",
            textDecoration: "none",
            "& svg": {
                color: "#000",
            }
        },
        "& strong": {
            color: "#000"
        },
        "& textarea": {
            "&::-webkit-scrollbar": {
                width: "7px",
                maxHeight: "72px"
            },
            "&::-webkit-scrollbar-thumb": {
                background: "rgba(0, 0, 0, 0.5)",
                borderRadius: "3.5px"
            },
            "&::-webkit-scrollbar-track": {
                background: "#fff"
            }
        }
    },
    hide: {
        display: "none"
    },
    headerRed: {
        backgroundColor: "rgb(245 205 210)"
    },
    headerBlue: {
        backgroundColor: "rgb(187 222 251)"
    },
    headerGreen: {
        backgroundColor: "rgb(204 254 144)"
    },
    subHeader: {
        // color: "rgb(74 20 140) !important"
    }
});

const Container = ({ host, container, port, token, setState: setParent, index, showAllLogs }) => {
    const classes = useStyles();
    const [state, setState] = useState({
        console: "",
        lastLog: ""
    });
    const [config, setConfig] = useState({
        currentIndex: 0,
        rows: 0,
    });
    const [showLogs, hideLogs] = useState(showAllLogs);
    const fetchLogs = (showLogs) => {
        if (showLogs !== undefined)
            hideLogs(showLogs);
        (async () => {
            await Promise.all([
                window[`${host}_${container}`] ? axios('http://34.236.120.40/api', {
                    method: 'GET',
                    params: { host, container, token }
                }) : Promise.resolve({ data: "" }),
                axios('http://34.236.120.40/api/last', {
                    method: 'GET',
                    params: { host, container, token }
                }),
                axios('http://34.236.120.40/api/config', {
                    method: 'GET',
                    params: { host, port }
                })
            ])
                .then(function (response) {
                    const lastRun = moment(response[1].data.replace(/.* \| /gm, '').replace(/\r\n/gm, ''));
                    let lastLog = "", status
                    if (lastRun.isValid() && lastRun > moment().add(-5, 'minutes')) {
                        status = "Running"
                        lastLog = classes.headerBlue
                    }
                    else {
                        status = "Stopped"
                        lastLog = classes.headerRed
                    }
                    if (response[1].data.includes('Exporting Finished')) {
                        status = "Finished"
                        lastLog = classes.headerGreen
                    }
                    setParent({
                        id: `${host}_${container}`,
                        state: response[1].data ? status : undefined
                    })
                    setState({
                        ...state,
                        console: response[0].data,
                        lastLog,
                    });
                    const { data: { currentIndex, rows } } = response[2];
                    setConfig({
                        ...config,
                        currentIndex,
                        rows
                    })
                })
                .catch(() => { });
            const textarea = document.getElementById(`${host}_${container}`);
            if (textarea)
                textarea.scrollTop = textarea.scrollHeight;
        })();
    }

    const displayLogs = showAllLogs => () => {
        if (showAllLogs !== undefined) {
            window[`${host}_${container}`] = showAllLogs;
            fetchLogs(showAllLogs)
        } else {
            window[`${host}_${container}`] = !window[`${host}_${container}`];
            fetchLogs(!showLogs)
        }
    }

    useEffect(() => {
        displayLogs(showAllLogs)();
        setInterval(fetchLogs, 10000);
    }, [showAllLogs])

    return <Card className={classes.root}>
        <CardHeader
            title={<a
                target="blank"
                onClick={event => event.stopPropagation()}
                href={`http://${host}:${port}`}>
                {`http://${host}:${port}`}
            </a>}
            className={state.lastLog}
            style={{ cursor: "pointer" }}
            onClick={displayLogs()}
            avatar={<a
                target="blank"
                onClick={event => event.stopPropagation()}
                href={`http://${host}:9000/#/containers/${container}/exec`}>
                <DesktopWindows />
            </a>}
            subheader={<strong>
                {`#${index} | ${container} | ${config.rows || 0} | ${config.currentIndex && config.currentIndex + 1}`}
            </strong>}
        />
        {showLogs && <CardContent>
            <textarea readOnly rows="15" cols="40" value={state.console} id={`${host}_${container}`} />
        </CardContent>}
    </Card>
}

export default Container;