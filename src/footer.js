import React from 'react';
import './styles/footer.css';

// import appleMusic from "./images/apple_music.svg"

export default class Footer extends React.Component {
    render() {
        return (
            <footer>
                <div className="row-fluid" id="footerContent">
                    <div className="col">
                    </div>
                    <div className="col" style={{ color: "white", textAlign: "center" }}>
                        <ul id="footerul">
                            <i className="fab fa-linkedin socialIcon"></i>
                            <i className="fab fa-github socialIcon"></i>
                            <i className="fab fa-spotify socialIcon"></i>
                            <i className="fab fa-facebook socialIcon"></i>
                            <i className="fab fa-instagram socialIcon"></i>
                        </ul>
                        <small className="muli">© Copyright 2020, Pranshu Gupta</small><br></br>
                    </div>
                    <div className="col"></div>
                </div>
            </footer>
        );
    }
}