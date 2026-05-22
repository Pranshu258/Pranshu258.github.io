import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/body.css';
import '../styles/blog.css';
import './AppLayout.css';

/**
 * Reusable page layout for standalone apps (SPAs within the website).
 * Follows the blog post header convention: icon → title → meta → sharer → description → hr → content.
 *
 * Props:
 *   icon        — React node, the big icon above the title (e.g. <FaBrain className="bigger gt1" />)
 *   title       — string, the big Raleway heading
 *   meta        — string or React node, shown below the title (e.g. "Pranshu Gupta · May 2026")
 *   description — string, the italic introduction paragraph
 *   right       — React node, rendered in the sticky right panel (col-lg-3)
 *   children    — main column content, rendered below the hr
 */
export default function AppLayout({ icon, title, meta, description, right, children }) {
    return (
        <div className="content blog-content">
            <div className="container">
                <div className="row-fluid" style={{ margin: '-12px 0 50px 0' }}>
                    <div className="row">

                        {/* ── Main column (col-lg-9) ── */}
                        <div className="col-lg-9">
                            {icon && (
                                <div className="row bhead">
                                    {icon}
                                </div>
                            )}
                            <h1 className="title">{title}</h1>
                            {meta && <p>{meta}</p>}
                            <Sharer link={window.location.href} title={title} />
                            {description && (
                                <p className="introduction" style={{ marginBottom: '2rem' }}>{description}</p>
                            )}
                            {children}
                        </div>

                        {/* ── Right panel (col-lg-3) ── */}
                        <div className="col-lg-3">
                            {right && (
                                <div className="app-right-panel">
                                    {right}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
