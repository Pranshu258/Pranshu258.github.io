import React from 'react';

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

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
                    <Routes>
                        <Route exact path="/" element={<Body/>} />
                        <Route path="/blog/*" element={<Blog/>} />
                        <Route path="/artworks" element={<Artworks/>} />
                    </Routes>
                    <Footer />
                </Router>
            </div>
        );
    }
};
