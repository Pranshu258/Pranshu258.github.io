import React from 'react';
import './styles/footer.css';

// import appleMusic from "./images/apple_music.svg"

export default class Footer extends React.Component {
    render() {
        return (
            <footer>
                <div className="row-fluid" id="footerContent">
                    <div className="col-sm-2">
                    </div>
                    <div className="col-sm-8" style={{ color: "white", textAlign: "center"}}>
                        <ul id="footerul">
                            <a target="_blank" style={{color:"white"}} href="https://www.linkedin.com/in/pranshug258"><i className="fab fa-linkedin socialIcon"></i></a>
                            <a target="_blank" style={{color:"white"}} href="https://github.com/Pranshu258"><i className="fab fa-github socialIcon"></i></a>
                            <a target="_blank" style={{color:"white"}} href="https://in.pinterest.com/pranshugupta258/boards/"><i className="fab fa-pinterest socialIcon"></i></a>
                            <a target="_blank" style={{color:"white"}} href="https://music.apple.com/profile/pranshug258"><i className="fab fa-apple socialIcon"></i></a>
                            <a target="_blank" style={{color:"white"}} href="https://open.spotify.com/user/31cr4nlq54iqlngkrrwdxff5faey?si=Q4d2S8utTEKMETey3_7uLw"><i className="fab fa-spotify socialIcon"></i></a>
                            <a target="_blank" style={{color:"white"}} href="https://www.facebook.com/pranshug258"><i className="fab fa-facebook socialIcon"></i></a>
                            <a target="_blank" style={{color:"white"}} href="https://www.instagram.com/pranshug258/"><i className="fab fa-instagram socialIcon"></i></a>
                        </ul>
                        <small className="muli">© Copyright 2020, Pranshu Gupta</small><br></br>
                        <small>digital illustrations by Ouch.pics https://icons8.com</small>
                    </div>
                    <div className="col-sm-2"></div>
                </div>
            </footer>
        );
    }
}
