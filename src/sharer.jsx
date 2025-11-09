import React from 'react';
import './styles/sharer.css';
import { FaCircleCheck as FaCheckCircle, FaEnvelope, FaFacebook, FaLink, FaLinkedin, FaXTwitter } from 'react-icons/fa6';
import { TbBrandThreads } from 'react-icons/tb';

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
                            <FaLink className="sharerIcon" />
                        </button>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}
                        >
                            <FaLinkedin className="sharerIcon" />
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"mailto:?subject=" + this.props.title + "&body=Check out this new article on Pranshu's blog:%0A" + this.props.link}
                        >
                            <FaEnvelope className="sharerIcon" />
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://www.threads.net/intent/post?text=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}
                        >
                            <TbBrandThreads className="sharerIcon" />
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(this.props.link)}
                        >
                            <FaFacebook className="sharerIcon" />
                        </a>
                    </li>
                    <li>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sharerTrigger"
                            href={"https://twitter.com/share?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}
                        >
                            <FaXTwitter className="sharerIcon" />
                        </a>
                    </li>
                </ul>
                <span> {this.state.tooltipVisible && (
                    <b style={{ color: 'green' }}>
                        <FaCheckCircle /> link copied to clipboard!
                    </b>
                )}</span>
                <br></br>
            </div>
        );
    }
}
