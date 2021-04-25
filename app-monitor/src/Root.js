import React, { Fragment } from 'react';
import App from './App';

const Root = () => {
    const activePage = window.location.hash.replace('#', '') || 1;
    const setActive = page => () => {
        window.location.hash = page;
        window.location.reload();
    };
    return <Fragment>
        <App page={parseInt(activePage)} setActive={setActive} />
    </Fragment>
}

export default Root;