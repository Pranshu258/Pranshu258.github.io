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
                    <a onClick={this.copyToClipboard} style={{ color: "black", background: "none", border: "none", cursor: "pointer" }}><i className="fas fa-link sharerIcon"></i></a>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black" }} href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}><i className="fab fa-linkedin sharerIcon"></i></a>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black" }} href={"mailto:?subject=" + this.props.title + "&body=Check out this new article on Pranshu's blog:%0A" + this.props.link}><i className="fas fa-envelope sharerIcon"></i></a>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black" }} href={"https://www.threads.net/intent/post?text=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}><i className="fa-brands fa-threads  sharerIcon"></i></a>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black" }} href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(this.props.link)}><i className="fab fa-facebook sharerIcon"></i></a>
                    <a target="_blank" rel="noopener noreferrer" style={{ color: "black" }} href={"https://twitter.com/share?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}><i className="fa-brands fa-x-twitter  sharerIcon"></i></a>
                    <a> {this.state.tooltipVisible && (
                    <b style={{color: 'green'}}>
                        <i className='fas fa-circle-check'></i> link copied to clipboard!
                    </b>
                )}</a>
                </ul>
            </div>
        );
    }
}
