import React from 'react';
import { Route } from "react-router-dom";
import Sharer from "../sharer";

import '../styles/fonts.css';
import '../styles/blog.css';

export default class Gitviz extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            items: []
        };
    }
    componentDidMount() {
        window.scrollTo(0, 0);
    }
    render() {
        const { error, isLoaded, items } = this.state;
        var bannerStyle = {
            margin: "20px 0 20px 0",
        }
        return (
            <div>
                <h1 className="title">Exploring GitHub Repositories</h1>
                <p>Pranshu Gupta, Apr 30, 2020</p>
                <Sharer link={window.location.href}></Sharer>
                <br></br>
                <p className="introduction">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">Commits</h3>
                <p>
                </p>
            </div>
        )
    }
}