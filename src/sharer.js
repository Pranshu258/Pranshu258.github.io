import React from 'react';
import './styles/sharer.css';

export default class Sharer extends React.Component {
    render() {
        
        return (
            <ul>
                <li>
                    <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"https://twitter.com/share?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}>
                        <i className="fab fa-twitter"></i>
                    </a>
                </li>
                <li>
                    <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}>
                        <i className="fab fa-linkedin"></i>
                    </a>
                </li>
                <li>
                    <a target="_blank" rel="noopener noreferrer" style={{color:"black"}} href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(this.props.link)}>
                        <i className="fab fa-facebook"></i>
                    </a>
                </li>
                <li>
                    <a style={{color:"black"}} href={"mailto:?subject="+ this.props.title +"&body=Check out this new article on Pranshu's blog:%0A" + this.props.link}>
                        <i className="fas fa-envelope"></i>
                    </a>
                </li>
            </ul>
        );
    }
}
