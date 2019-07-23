import React from 'react';
import { Route } from "react-router-dom";

import About from './about';
import Blog from './blogs';
import Projects from './projects';
import Artworks from './artworks';
import Photography from './photography';

import linkedinLogo from './images/in.png';
import githubLogo from './images/git.png';
import instaLogo from './images/insta.png';
import fbLogo from './images/fb.png';

import './styles/fonts.css';

export default class Body extends React.Component {
    render() {
        var leftPaneStyle = {
            padding: "0 4% 0 6%",
            textAlign: "left"
        };
        var rightPaneStyle = {
            padding: "0 10% 0 10%",
            textAlign: "justify"
        };
        return (
            <div className="content row-fluid">
                <div className="row">
                    <div className="col-md-3" style={leftPaneStyle}>
                        <span className="bangers big">PG</span>
                        <h3 className="roboto">Pranshu Gupta</h3>
                        #BeAwesome
                        <br></br><br></br><br></br>
                        <h3 className="bangers">DEVELOPER</h3>
                        <h3 className="bangers">ARTIST</h3>
                        <h3 className="bangers">PHOTOGRAPHER</h3>
                        <br></br><br></br><br></br>
						<ul className="social">
                            <li>
                                <a rel="noopener noreferrer" target = "_blank" href="https://www.linkedin.com/in/pranshug258">
                                <img alt=""src={linkedinLogo} ></img></a></li>
							<li>
                                <a rel="noopener noreferrer" target = "_blank" href="https://github.com/Pranshu258">
                                <img alt=""src={githubLogo} ></img></a>
                            </li>
                            <li>
                                <a rel="noopener noreferrer" target = "_blank" href="https://www.instagram.com/pranshug258/">
                                <img alt=""src={instaLogo} ></img></a>
                            </li>
							<li>
                                <a rel="noopener noreferrer" target = "_blank" href="https://www.facebook.com/pranshug258">
                                <img alt=""src={fbLogo} ></img></a>
                            </li>
						</ul>
                    </div>
                    <div className="col-md-9" style={rightPaneStyle}>
                        <Route exact path="/" component={About} />
                        <Route path="/blog/" component={Blog} />
                        <Route path="/projects/" component={Projects} />
                        <Route path="/artworks/" component={Artworks} />
                        <Route path="/photography/" component={Photography} />
                    </div>
                </div>
            </div>
        );
    }
}