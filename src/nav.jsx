import React, { Component } from 'react';
import './styles/nav.css';

import { Link } from "react-scroll";
import { FaMoon, FaSun } from 'react-icons/fa6';

export default class Nav extends Component {
    constructor(props) {
        super(props);
        const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        const initialHash = typeof window !== 'undefined' ? window.location.hash : '';
        this.state = {
            isMenuOpen: false,
            isMobile: typeof window !== 'undefined' ? window.innerWidth <= 991 : false,
            currentPath: initialPath,
            currentHash: initialHash
        };
    }

    componentDidMount() {
        if (typeof window !== 'undefined') {
            this.resizeListener = () => this.handleResize();
            window.addEventListener('resize', this.resizeListener);
            this.handleResize();
            this.locationListener = () => this.handleLocationChange();
            window.addEventListener('popstate', this.locationListener);
            window.addEventListener('hashchange', this.locationListener);
            this.patchHistoryMethods();
            window.addEventListener('locationchange', this.locationListener);
            this.handleLocationChange();
        }
    }

    componentWillUnmount() {
        if (typeof window !== 'undefined' && this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
        if (typeof window !== 'undefined' && this.locationListener) {
            window.removeEventListener('popstate', this.locationListener);
            window.removeEventListener('hashchange', this.locationListener);
            window.removeEventListener('locationchange', this.locationListener);
        }
        if (typeof window !== 'undefined' && this.originalHistoryMethods) {
            Object.entries(this.originalHistoryMethods).forEach(([method, original]) => {
                window.history[method] = original;
            });
            this.originalHistoryMethods = null;
        }
    }

    handleResize = () => {
        if (typeof window !== 'undefined') {
            const isMobile = window.innerWidth <= 991;
            this.setState(prevState => ({
                isMobile,
                isMenuOpen: isMobile ? prevState.isMenuOpen : false
            }));
        }
    }

    patchHistoryMethods = () => {
        if (typeof window === 'undefined') {
            return;
        }
        if (!this.originalHistoryMethods) {
            this.originalHistoryMethods = {};
        }
        ['pushState', 'replaceState'].forEach(method => {
            if (this.originalHistoryMethods[method]) {
                return;
            }
            const original = window.history[method];
            this.originalHistoryMethods[method] = original;
            window.history[method] = (...args) => {
                const result = original.apply(window.history, args);
                window.dispatchEvent(new Event('locationchange'));
                return result;
            };
        });
    }

    handleLocationChange = () => {
        if (typeof window !== 'undefined') {
            const nextPath = window.location.pathname;
            const nextHash = window.location.hash;
            if (nextPath !== this.state.currentPath || nextHash !== this.state.currentHash) {
                this.setState({
                    currentPath: nextPath,
                    currentHash: nextHash
                });
            }
        }
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
        const { isMenuOpen, currentPath, currentHash } = this.state;
        const nextThemeLabel = theme === 'dark' ? 'light' : 'dark';
        const isHomePage = currentPath === '/' && (currentHash === '' || currentHash === '#/' || currentHash === '#top');
        const showMobileBrand = !isHomePage;
    const ThemeIcon = theme === 'dark' ? FaSun : FaMoon;
        
        return (
            <header>
                <nav className="navbar fixed-top navbar-expand-lg navbar-default">
                    {showMobileBrand && (
                        <a href="/" className="navbar-brand-mobile">Pranshu Gupta</a>
                    )}
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
                                    <ThemeIcon />
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
            </header>
        );
    }
}