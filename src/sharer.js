import React from 'react';
import './styles/sharer.css';

export default class Sharer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tooltipVisible: false
        };
    }

    copyToClipboard = () => {
        navigator.clipboard.writeText(this.props.link).then(() => {
            this.setState({ tooltipVisible: true });
            setTimeout(() => {
                this.setState({ tooltipVisible: false });
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    render() {

        return (
            <div>
                <ul id="sharerul">
                    <li>
                        <button
                            type="button"
                            onClick={this.copyToClipboard}
                            aria-label="Copy link to clipboard"
                            className="sharerTrigger"
                        >
                            <i title='copy link' className="fas fa-link sharerIcon"></i>
                        </button>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}
                        >
                            <i title='share on linkedin' className="fab fa-linkedin sharerIcon"></i>
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"mailto:?subject=" + this.props.title + "&body=Check out this new article on Pranshu's blog:%0A" + this.props.link}
                        >
                            <i title='share via email' className="fas fa-envelope sharerIcon"></i>
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://www.threads.net/intent/post?text=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}
                        >
                            <i title='share on threads' className="fa-brands fa-threads  sharerIcon"></i>
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(this.props.link)}
                        >
                            <i title='share on facebook' className="fab fa-facebook sharerIcon"></i>
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://twitter.com/share?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}
                        >
                            <i title='share on X' className="fa-brands fa-x-twitter  sharerIcon"></i>
                        </a>
                    </li>
                </ul>
                <span> {this.state.tooltipVisible && (
                    <b style={{ color: 'green' }}>
                        <i className='fas fa-circle-check'></i> link copied to clipboard!
                    </b>
                )}</span>
                <br></br>
            </div>
        );
    }
}
