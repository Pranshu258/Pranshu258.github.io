import React from 'react';

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import Nav from './nav';
import Body from './body';
import Footer from './footer';
import Blog from './blog';
import Artworks from './artworks';

import './styles/app.css';

const IconGradientDefs = () => (
    <svg
        aria-hidden="true"
        focusable="false"
        className="icon-gradient-defs"
        width="0"
        height="0"
    >
        <defs>
            <linearGradient id="icon-gradient-gt1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#207d42" />
                <stop offset="100%" stopColor="#196634" />
            </linearGradient>
            <linearGradient id="icon-gradient-gt2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#196634" />
                <stop offset="100%" stopColor="#134f28" />
            </linearGradient>
            <linearGradient id="icon-gradient-gt3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#AA771C" />
                <stop offset="100%" stopColor="#ffc107" />
            </linearGradient>
            <linearGradient id="icon-gradient-gt4" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#134f28" />
                <stop offset="100%" stopColor="#0c351b" />
            </linearGradient>
        </defs>
    </svg>
);

const THEME_STORAGE_KEY = 'preferred-theme';

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            theme: this.getInitialTheme()
        };
        this.applyTheme(this.state.theme);
    }

    getInitialTheme() {
        if (typeof window === 'undefined') {
            return 'dark';
        }
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    applyTheme(theme) {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
    }

    toggleTheme = () => {
        this.setState((prevState) => {
            const nextTheme = prevState.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme(nextTheme);
            return { theme: nextTheme };
        });
    };

    render() {
        const { theme } = this.state;
        return (
            <div className="layout">
                <IconGradientDefs />
                <Router>
                    <Nav theme={theme} onToggleTheme={this.toggleTheme} />
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
