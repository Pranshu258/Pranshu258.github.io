import React from 'react';
import ReactDOM from 'react-dom';
import Nav from './nav';
import Body from './body';
import Footer from './footer';
import './styles/index.css';

class App extends React.Component {
    render() {
        return (
            <div className="layout">
                <Nav />
                <Body />
                <Footer />
            </div>
        );
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root')
);