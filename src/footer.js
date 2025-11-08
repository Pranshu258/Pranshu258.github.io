import React from 'react';
import './styles/footer.css';

// import appleMusic from "./images/apple_music.svg"

export default class Footer extends React.Component {
    render() {
        return (
            <footer>
                <div className="row-fluid" id="footerContent">
                    <div className="col-sm-2">
                    </div>
                    <div className="col-sm-8" style={{ color: "white", textAlign: "center"}}>
                        <ul id="footerul">
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.linkedin.com/in/pranshug258">
                                    <i className="fab fa-linkedin socialIcon"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.goodreads.com/prang">
                                    <i className="fab fa-goodreads socialIcon"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.instagram.com/pranshu.paints/">
                                    <i className="fab fa-instagram socialIcon"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.youtube.com/playlist?list=PLYYwWL0YAN2KHK81AcrbhLdeHZdgPjGS6">
                                    <i className="fab fa-youtube socialIcon"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://open.spotify.com/user/pranshugupta?si=a2369fa3eaf24985">
                                    <i className="fab fa-spotify socialIcon"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://github.com/Pranshu258">
                                    <i className="fab fa-github socialIcon"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.facebook.com/pranshug258">
                                    <i className="fab fa-facebook socialIcon"></i>
                                </a>
                            </li>
                        </ul>
                        <small className="montserrat">© Copyright 2024, Pranshu Gupta</small><br></br>
                    </div>
                    <div className="col-sm-2"></div>
                </div>
            </footer>
        );
    }
}
