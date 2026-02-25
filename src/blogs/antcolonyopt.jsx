import React from 'react';
import AntColonyVisualization from '../antcolony/AntColonyVisualization';
import AntForagingVisualization from '../antcolony/AntForagingVisualization';
import '../styles/blog.css';

export default function AntColonyOptimizationBlog() {
    return (
        <div className="blog-content">
            {/* ── Foraging Simulation ────────────────────────────── */}
            <div style={{ marginTop: '48px' }}>
                <AntForagingVisualization />
            </div>

            {/* ── TSP Solver ─────────────────────────────────────── */}
            <div style={{ marginTop: '30px' }}>
                <AntColonyVisualization />
            </div>
        </div>
    );
}
