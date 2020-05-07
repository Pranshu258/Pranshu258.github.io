import React from 'react';
import './styles/sharer.css';

export default class Sharer extends React.Component {
    render() {
        
        return (
            <ul>
                <li>
                    <a style={{color:"black"}} href={"https://twitter.com/share?url=" + encodeURIComponent(this.props.link)}>
                        <i className="fab fa-twitter"></i>
                    </a>
                </li>
                <li>
                    <a  style={{color:"black"}} href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(this.props.link).replace("blog", "%3Fp%3Dblog")}>
                        <i className="fab fa-linkedin"></i>
                    </a>
                </li>
                <li>
                    <a  style={{color:"black"}} href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(this.props.link)}>
                        <i className="fab fa-facebook"></i>
                    </a>
                </li>
            </ul>
        );
    }
}
