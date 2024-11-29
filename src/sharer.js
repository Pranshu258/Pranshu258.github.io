import React from 'react';
import './styles/sharer.css';

export default class Sharer extends React.Component {
    render() {
        
        return (
            <ul id="sharerul">
                <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}><i className="fab fa-linkedin sharerIcon"></i></a>
                <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"mailto:?subject="+ this.props.title +"&body=Check out this new article on Pranshu's blog:%0A" + this.props.link}><i className="fas fa-square-envelope sharerIcon"></i></a>
                <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(this.props.link)}><i className="fab fa-facebook sharerIcon"></i></a>  
                <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"https://twitter.com/share?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}><i className="fa-brands fa-x-twitter  sharerIcon"></i></a>                 
            </ul>
        );
    }
}
