import React, { Component } from 'react';
import './styles/nav.css';

import { Link } from "react-scroll";

export default class Nav extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isMenuOpen: false
        };
    }

    toggleMenu = () => {
        this.setState(prevState => ({
            isMenuOpen: !prevState.isMenuOpen
        }));
    }

    closeMenu = () => {
        this.setState({ isMenuOpen: false });
    }

    handleCrossPageNav(section) {
        if (window.location.href.split('/').length > 4) {
            window.location ="/#" + section;
        }
        this.closeMenu();
    }

    handleNavClick = () => {
        this.closeMenu();
    }

    render() {
        const { theme = 'dark', onToggleTheme = () => {} } = this.props;
        const { isMenuOpen } = this.state;
        const nextThemeLabel = theme === 'dark' ? 'light' : 'dark';
        
        return (
            <header>
                <nav className="navbar fixed-top navbar-expand-lg navbar-default">
                    <button 
                        className="navbar-toggler" 
                        type="button" 
                        onClick={this.toggleMenu}
                        aria-controls="navbarNav" 
                        aria-expanded={isMenuOpen} 
                        aria-label="Toggle navigation"
                    >
                        <span className={`menu-icon ${isMenuOpen ? 'open' : ''}`} aria-hidden="true">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                    </button>
                    <div className={`navbar-collapse ${isMenuOpen ? 'show' : 'collapse'}`} id="navbarNav">
                        <ul className="navbar-nav ml-auto">
                            <li>
                                <Link activeClass="active" to="about" spy={true} smooth={true} offset={-70} duration={500}>
                                    <button onClick={() => this.handleCrossPageNav("about")} className="btn btn-default nav-link-btn">Home</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="publications" spy={true} smooth={true} offset={-70} duration={500}>
                                    <button onClick={() => this.handleCrossPageNav("publications")} className="btn btn-default nav-link-btn">Papers</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="blog" spy={true} smooth={true} offset={-70} duration={500}>
                                    <button onClick={() => this.handleCrossPageNav("blog")} className="btn btn-default nav-link-btn">Blog</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="projects" spy={true} smooth={true} offset={-70} duration={500}>
                                    <button onClick={() => this.handleCrossPageNav("projects")} className="btn btn-default nav-link-btn">Projects</button>
                                </Link>
                            </li>
                            <li>
                                <Link activeClass="active" to="artworks" spy={true} smooth={true} offset={-70} duration={500}>
                                    <button onClick={() => this.handleCrossPageNav("artworks")} className="btn btn-default nav-link-btn">Artworks</button>
                                </Link>
                            </li>
                            <li>
                                <a href="/PranshuGuptaResume.pdf" onClick={this.handleNavClick}>
                                    <button className="btn btn-default nav-link-btn">Resume</button>
                                </a>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-default nav-link-btn theme-toggle"
                                    onClick={(e) => {
                                        onToggleTheme();
                                        this.closeMenu();
                                    }}
                                    aria-label={`Switch to ${nextThemeLabel} mode`}
                                    aria-pressed={theme === 'dark'}
                                    title={`Switch to ${nextThemeLabel} mode`}
                                >
                                    <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
            </header>
        );
    }
}