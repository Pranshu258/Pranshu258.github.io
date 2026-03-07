import React from 'react';
import './styles/footer.css';
import { FaFacebook, FaGithub, FaGoodreads, FaInstagram, FaLinkedin, FaRss, FaSpotify, FaYoutube } from 'react-icons/fa6';

// import appleMusic from "./images/apple_music.svg"

export default class Footer extends React.Component {
    render() {
        const year = new Date().getFullYear();
        return (
            <footer>
                <div className="row-fluid" id="footerContent">
                    <div className="col-sm-2">
                    </div>
                    <div className="col-sm-8" style={{ color: "var(--footer-text-color)", textAlign: "center" }}>
                        <nav className="footer-nav">
                            <a href="/#publications" className="footer-nav-link">Papers</a>
                            <a href="/#blog" className="footer-nav-link">Blog</a>
                            <a href="/#projects" className="footer-nav-link">Projects</a>
                            <a href="/#artworks" className="footer-nav-link">Artworks</a>
                        </nav>
                        <ul id="footerul">
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.linkedin.com/in/pranshug258" title="LinkedIn">
                                    <FaLinkedin className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.goodreads.com/prang" title="Goodreads">
                                    <FaGoodreads className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.instagram.com/pranshu.paints/" title="Instagram">
                                    <FaInstagram className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.youtube.com/playlist?list=PLYYwWL0YAN2KHK81AcrbhLdeHZdgPjGS6" title="YouTube">
                                    <FaYoutube className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://open.spotify.com/user/pranshugupta?si=a2369fa3eaf24985" title="Spotify">
                                    <FaSpotify className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://github.com/Pranshu258" title="GitHub">
                                    <FaGithub className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" className="footerTrigger" href="https://www.facebook.com/pranshug258" title="Facebook">
                                    <FaFacebook className="socialIcon" />
                                </a>
                            </li>
                            <li>
                                <a href="/rss.xml" className="footerTrigger" title="RSS Feed">
                                    <FaRss className="socialIcon" />
                                </a>
                            </li>
                        </ul>
                        <small className="montserrat">© Copyright {year}, Pranshu Gupta</small><br></br>
                    </div>
                    <div className="col-sm-2"></div>
                </div>
            </footer>
        );
    }
}
