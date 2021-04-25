import { useEffect, useState } from "react";
import moment from "moment";
import { Button, Container as AppContainer, LinearProgress, Typography } from "@material-ui/core";
import { makeStyles } from '@material-ui/core/styles';
import axios from "axios";

import Container from "./Container";

const useStyles = makeStyles({
  header: {
    backgroundColor: "white",
    marginTop: "-140px",
    paddingTop: "10px",
    paddingBottom: "24px",
    position: "fixed",
    width: "100%"
  },
  root: {
    backgroundColor: "#E0E0E0",
    borderRadius: "4px",
    marginTop: "140px",
    marginBottom: "40px",
    padding: "20px 36px 12px"
  },
  progress: {
    margin: "44px",
    marginTop: "60px"
  }
});

const App = ({ page, setActive }) => {
  const classes = useStyles();
  const { servers, ports, containers } = window.configuration;
  const [NodeList, setNodes] = useState([]);
  let [state, setState] = useState([]);
  const [processed, setProcessed] = useState(0);
  const [count, setCount] = useState(0);
  const [showAllLogs, hideAllLogs] = useState(false);
  const [startDate, setStartDate] = useState(moment().format("YYYY-MM-DDTHH:mm"));

  Array.range = (start, end) => Array.from({ length: (end - start) }, (v, k) => k + start);

  const setParentState = child => {
    state = [...state.filter(st => st.id !== child.id), child];
    setState(state);
  }

  const changeDate = ({ target: { value } }) => {
    const newDate = moment(value).utcOffset('+00:00').format("YYYY-MM-DDTHH:mm");
    axios('http://34.236.120.40/api/processed', {
      method: 'POST',
      params: {
        StartDate: newDate,
        EndDate: moment().utcOffset('+00:00').endOf('day').format('YYYY-MM-DDTHH:mm')
      }
    })
      .then(function (response) {
        setCount(response.data);
      })
      .catch(() => { });
    setStartDate(moment(value).format("YYYY-MM-DDTHH:mm"));
  }

  useEffect(() => {
    const fetchTokens = async () => {
      const tokens = [], nodes = []
      let ind = 0;
      for (let i = (page - 1) * 6; i < servers.length && i < page * 6; i++) {
        if (sessionStorage[`${servers[i]}_token`]) {
          tokens.push({
            host: servers[i],
            token: sessionStorage[`${servers[i]}_token`]
          });
        }
        else {
          await axios.post(`http://34.236.120.40/api`, null, {
            params: {
              host: servers[i]
            }
          })
            .then(function (response) {
              sessionStorage[`${servers[i]}_token`] = response.data.jwt;
              tokens.push({
                host: servers[i],
                token: response.data.jwt
              });
            })
            .catch(() => { });
        }
      }
      tokens.forEach((server, index) => {
        for (var i = 0; i < containers.length; i++)
          nodes.push(<Container
            key={index.toString() + i}
            index={++ind}
            setState={setParentState}
            host={server.host}
            port={ports[i]}
            container={containers[i]}
            token={server.token}
            showAllLogs={showAllLogs}
          />)
      });
      setNodes(nodes);
    }
    setNodes([]);
    setState([]);
    fetchTokens();
    fetchProcessed();
    setInterval(fetchProcessed, 3000);
  }, [page, showAllLogs])

  useEffect(() => {
    changeDate({
      target: {
        value: startDate
      }
    });
  }, [processed])

  const fetchProcessed = () => {
    axios('http://34.236.120.40/api/processed', {
      method: 'POST',
      params: {
        StartDate: "2020-11",
        EndDate: moment().utcOffset('+00:00').endOf('day').format('YYYY-MM-DDTHH:mm')
      }
    })
      .then(function (response) {
        setProcessed(response.data);
      })
      .catch(() => { });
  }

  const nodes = state.filter(st => servers.filter((server, index) =>
    index < page * 6 && index >= (page - 1) * 6).includes(st.id.split('_')[0]));
  const Total = nodes.filter(st => st.state).length;
  const Running = nodes.filter(st => st.state && st.state.toString().includes('Running')).length;
  const Stopped = nodes.filter(st => st.state && st.state.toString().includes('Stopped')).length;
  const Finished = nodes.filter(st => st.state && st.state.toString().includes('Finished')).length;

  return <div>
    <div className={NodeList.length && classes.header} id="header">
      <Typography
        variant="h4"
        gutterBottom
        align="center"
        style={{ cursor: "pointer" }}
        onClick={() => hideAllLogs(!showAllLogs)}
      >
        Portainer Service | Made By BKP
      </Typography>
      {`Total Containers: ${Total} | Running: ${Running} | Finished: ${Finished} | Stopped: ${Stopped}`}
      <div style={{ marginTop: "8px", position: "absolute" }}>
        {`Finished: ${processed} | `}
        <input
          onChange={changeDate}
          style={{ width: "175px" }}
          type="datetime-local"
          value={startDate}
        />
        {` | ${count}`}
      </div>
      <div style={{ float: "right", marginTop: "8px", marginRight: "32px" }}>
        {Array.range(0, servers.length % 6 ? servers.length / 6 + 1 : servers.length / 6)
          .map(item => <Button
            style={{ marginRight: "10px" }}
            key={item}
            variant="contained"
            color={item === page - 1 ? "primary" : "default"}
            onClick={setActive(item + 1)}>
            {item + 1}
          </Button>)}
      </div>
    </div>
    {NodeList.length ? <AppContainer className={classes.root}>{NodeList}</AppContainer>
      : <LinearProgress className={classes.progress} />}
  </div>
}

export default App;
