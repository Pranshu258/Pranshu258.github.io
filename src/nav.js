import React, { Component } from 'react';
// import { Link } from "react-router-dom";
import './styles/nav.css';

import { Link, animateScroll as scroll } from "react-scroll";

export default class Nav extends Component {
    handleCrossPageNav(section) {
        if (window.location.href.split('/').length > 4) {
            window.location ="/#" + section;
        }
    }
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
                                <Link activeClass="active" to="about" spy={true} smooth={true} offset={-70} duration= {500}>
                                    <button onClick={() => this.handleCrossPageNav("about")} className="btn btn-default" style={{color: "white"}}>Home</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="blog" spy={true} smooth={true} offset={-70} duration= {500}>
                                    <button onClick={() => this.handleCrossPageNav("blog")} className="btn btn-default" style={{color: "white"}}>Blog</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="projects" spy={true} smooth={true} offset={-70} duration= {500}>
                                    <button onClick={() => this.handleCrossPageNav("projects")} className="btn btn-default" style={{color: "white"}}>Projects</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="artworks" spy={true} smooth={true} offset={-70} duration= {500}>
                                    <button onClick={() => this.handleCrossPageNav("artworks")} className="btn btn-default" style={{color: "white"}}>Artworks</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="photography" spy={true} smooth={true} offset={-70} duration= {500}>
                                    <button onClick={() => this.handleCrossPageNav("photography")} className="btn btn-default" style={{color: "white"}}>Photography</button>
                                </Link>
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