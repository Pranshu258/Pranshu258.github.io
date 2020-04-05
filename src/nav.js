import React, { Component } from 'react';
import { Link } from "react-router-dom";
import './styles/nav.css';


export default class Nav extends Component {
    render() {
        var brandStyle = {
            height: "32px",
            marginLeft: "100px",
            marginRight: "32px"
        };
        return (
            <header>
                <nav className="navbar fixed-top navbar-expand-lg navbar-default">
                    <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ml-auto">
                            <li>
                                <button className="btn btn-default" style={{color: "white"}}>Home</button>
                            </li>
                            <li>
                                <button className="btn btn-default" style={{color: "white"}}>Blog</button>
                            </li>
                            <li>
                                <button className="btn btn-default" style={{color: "white"}}>Projects</button>
                            </li>
                            <li>
                                <button className="btn btn-default" style={{color: "white"}}>Artworks</button>
                            </li>
                            <li>
                                <button className="btn btn-default" style={{color: "white"}}>Resume</button>
                            </li>
                        </ul>
                    </div>
                </nav>
            </header>
        );
    }
}