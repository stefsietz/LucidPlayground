import React from 'react';
import { Route, BrowserRouter as Router } from 'react-router-dom';

/**
 * Import all page components here
 */
import Home from './Home0';
import BlogpostHome from './BlogpostHome';

/**
 * All routes go here.
 * Don't forget to import the components above after adding new route.
 */
export default function App() {
    return (
        <Router >
            <div  style={{ width: "100%", height: "100%", top: 0, left: 0 }}>
                <Route path="/" exact component={BlogpostHome} />
            </div>
        </Router>);
};