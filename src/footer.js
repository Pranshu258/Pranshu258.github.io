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
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://www.linkedin.com/in/pranshug258"><i className="fab fa-linkedin socialIcon"></i></a>
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://www.goodreads.com/prang"><i className="fab fa-goodreads socialIcon"></i></a>
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://www.instagram.com/pranshu.paints/"><i className="fab fa-instagram socialIcon"></i></a>                   
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://open.spotify.com/user/pranshugupta?si=a2369fa3eaf24985"><i className="fab fa-spotify socialIcon"></i></a>
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://github.com/Pranshu258"><i className="fab fa-github socialIcon"></i></a>
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://in.pinterest.com/pranshugupta258/boards/"><i className="fab fa-pinterest socialIcon"></i></a>
                            <a target="_blank" rel="noopener noreferrer" style={{color:"white"}} href="https://www.facebook.com/pranshug258"><i className="fab fa-facebook socialIcon"></i></a>
                            
                        </ul>
                        <small className="montserrat">© Copyright 2023, Pranshu Gupta</small><br></br>
                    </div>
                    <div className="col-sm-2"></div>
                </div>
            </footer>
        );
    }
}
