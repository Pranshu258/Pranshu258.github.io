import React from 'react';
import { FaFingerprint } from 'react-icons/fa6';
import banner from './images/banner.png';
import './styles/fonts.css';
import './styles/blog.css';

export default class CookiePolicy extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Cookies Policy | Pranshu Gupta";
    }

    render() {
        return (
            <div className="content blog-content">
                <div className="container">
                    <div className="row-fluid" style={{ margin: '-12px 0 50px 0' }}>
                        <div className="row-fluid">
                            <div className="col-lg-9">
                                <div className="row bhead">
                                    <FaFingerprint className="bigger gt1" />
                                </div>
                                <h1 className="title">Cookies Policy</h1>
                                <p style={{ opacity: 0.55 }}>Last updated: March 7, 2026</p>
                                <p className="introduction">
                                    Cookies are small text files stored on your device by your browser when you visit
                                    a website. They are widely used to make websites work, remember your preferences,
                                    and provide information to site owners.
                                </p>
                                <hr style={{ backgroundColor: "white" }}></hr>

                                <h3 className="headings">How this site uses cookies</h3>
                                <p>This site uses two categories of storage:</p>

                                <h4 className="headings">Analytics cookies (require your consent)</h4>
                                <p>
                                    This site uses <strong>Google Analytics</strong> to understand how visitors interact with the content — for example, which pages are
                                    visited most and how long visitors stay. Google Analytics sets the following cookies:
                                </p>
                                <ul>
                                    <li><code>_ga</code> — distinguishes users. Expires after 2 years.</li>
                                    <li><code>_gid</code> — distinguishes users. Expires after 24 hours.</li>
                                    <li><code>_gat</code> — throttles the request rate. Expires after 1 minute.</li>
                                </ul>
                                <p>
                                    These cookies are only loaded if you click <strong>Accept</strong> on the cookie
                                    banner. If you click <strong>Decline</strong>, Google Analytics is never loaded
                                    and no tracking cookies are set.
                                </p>
                                <p>
                                    You can learn more about how Google uses data at{' '}
                                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                                        policies.google.com/privacy
                                    </a>.
                                </p>

                                <h4 className="headings">Functional browser storage (no consent required)</h4>
                                <p>
                                    The following items are stored in your browser's <code>localStorage</code> for
                                    purely functional purposes. They never leave your device and are not shared with
                                    any third party.
                                </p>
                                <ul>
                                    <li><code>preferred-theme</code> — remembers your dark/light mode preference.</li>
                                    <li><code>renju_saved_game</code> — saves your in-progress Renju game state.</li>
                                    <li><code>cookie-consent</code> — remembers whether you accepted or declined analytics cookies.</li>
                                </ul>

                                <hr style={{ backgroundColor: "white" }}></hr>

                                <h3 className="headings">Managing your consent</h3>
                                <p>
                                    Your analytics consent choice is stored locally under the key <code>cookie-consent</code>.
                                    To reset it, run the following in your browser console and reload the page:
                                </p>
                                <pre style={{ background: 'rgba(128,128,128,0.12)', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
                                    <code>localStorage.removeItem('cookie-consent')</code>
                                </pre>
                                <hr style={{ backgroundColor: "white" }}></hr>
                                <h3 className="headings">Contact</h3>
                                <p>
                                    If you have any questions about this policy, you can reach out via the links in
                                    the footer.
                                </p>
                            </div>
                            <div className="col-lg-3">
                                <br />
                                <img alt="" src={banner} className="img-fluid" style={{ margin: '20px 0' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
