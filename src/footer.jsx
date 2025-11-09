import React from 'react';
import './styles/footer.css';
import { FaFacebook, FaGithub, FaGoodreads, FaInstagram, FaLinkedin, FaSpotify, FaYoutube } from 'react-icons/fa6';

// import appleMusic from "./images/apple_music.svg"

export default class Footer extends React.Component {
    render() {
        return (
            <footer>
                <div className="row-fluid" id="footerContent">
                    <div className="col-sm-2">
                    </div>
                    <div className="col-sm-8" style={{ color: "var(--footer-text-color)", textAlign: "center" }}>
                        <ul id="footerul">
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.linkedin.com/in/pranshug258">
                                    <FaLinkedin className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.goodreads.com/prang">
                                    <FaGoodreads className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.instagram.com/pranshu.paints/">
                                    <FaInstagram className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.youtube.com/playlist?list=PLYYwWL0YAN2KHK81AcrbhLdeHZdgPjGS6">
                                    <FaYoutube className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://open.spotify.com/user/pranshugupta?si=a2369fa3eaf24985">
                                    <FaSpotify className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://github.com/Pranshu258">
                                    <FaGithub className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.facebook.com/pranshug258">
                                    <FaFacebook className="socialIcon" />
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
