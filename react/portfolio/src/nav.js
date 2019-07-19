import React from 'react';
import './styles/nav.css';

export default class Nav extends React.Component {
    render() {
        return (
            <header>
                <nav class="navbar navbar-expand-lg navbar-default">
                    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ml-auto">
                            <li className="nav-item">
                                <a className="nav-link" href="#">Home</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">Blog</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">Projects</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">Artworks</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">Photography</a>
                            </li>
                        </ul>
                    </div>
                </nav>
            </header>
        );
    }
}

