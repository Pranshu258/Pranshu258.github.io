import React from 'react';

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import Nav from './nav';
import Body from './body';
import Footer from './footer';
import Blog from './blog';
import Artworks from './artworks';

import './styles/app.css';

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
