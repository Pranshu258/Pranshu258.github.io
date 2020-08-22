import React from 'react';

import { Route, BrowserRouter as Router } from "react-router-dom";

import Nav from './nav';
import Body from './body';
import Footer from './footer';
import Blog from './blog';
import Artworks from './artworks';

import './styles/app.css';


export default class App extends React.Component {
    render() {
        return (
            <div className="layout">
                <Router>
                    <Nav />
                    <Route exact path="/" component={Body} />
                    <Route path="/blog" component={Blog} />
                    <Route path="/artworks" component={Artworks} />
                    <Footer />
                </Router>
            </div>
        );
    }
};
