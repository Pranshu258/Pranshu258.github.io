import React, { useEffect, useState } from 'react';
import './styles/cookiebanner.css';

const GA_ID = 'UA-135463323-1';
const CONSENT_KEY = 'cookie-consent';

export function loadGA() {
    if (document.getElementById('ga-script')) return;
    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
}

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (consent === 'accepted') {
            loadGA();
        } else if (!consent) {
            setVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        loadGA();
        setVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem(CONSENT_KEY, 'declined');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="cookie-banner" role="region" aria-label="Cookie consent">
            <div className="cookie-banner__content">
                <p className="cookie-banner__text">
                    This website uses cookies to ensure you get the best experience on our website.{' '}
                    <a href="/cookies-policy" className="cookie-banner__link">Cookies Policy</a>
                </p>
                <div className="cookie-banner__actions">
                    <button className="cookie-banner__btn cookie-banner__btn--decline" onClick={handleDecline}>
                        Decline
                    </button>
                    <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={handleAccept}>
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
