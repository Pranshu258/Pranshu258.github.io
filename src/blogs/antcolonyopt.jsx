import React from 'react';
import AntColonyVisualization from '../antcolony/AntColonyVisualization';
import '../styles/blog.css';

export default function AntColonyOptimizationBlog() {
    return (
        <div className="blog-content">

            <div style={{ marginTop: '30px' }}>
                <AntColonyVisualization />
            </div>

        </div>
    );
}
