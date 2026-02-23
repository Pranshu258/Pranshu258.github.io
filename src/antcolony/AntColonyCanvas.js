/**
 * Canvas Visualization for Ant Colony Optimization
 * Renders cities, ants, pheromone trails, and the best solution
 */

export class ACOVisualizer {
    constructor(canvas, width = 800, height = 520) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Visual parameters
        this.cityRadius = 6;
        this.antRadius = 3;
        this.lineWidth = 1;
        this.trailAlpha = 0.3;
        this.antAlpha = 0.8;
        
        // Color scheme
        this.colors = {
            cityFill: '#FF6B6B',
            cityStroke: '#C92A2A',
            antFill: '#4ECDC4',
            antStroke: '#1B8A8A',
            trail: '#FFD93D',
            bestPath: '#6BCB77',
            background: '#F8F9FA',
            grid: '#E8E8E8',
            pheromone: '#A8E6CF'
        };
        
        this.cities = [];
        this.currentAnts = [];
        this.bestPath = [];
        this.pheromones = [];
        this.showPheromones = true;
        this.showTrails = true;
        this.showBestPath = true;
        this.animationFrame = 0;
    }

    setColors(colorScheme) {
        this.colors = { ...this.colors, ...colorScheme };
    }

    update(state) {
        this.cities = state.cities || this.cities;
        this.currentAnts = state.currentAnts || this.currentAnts;
        this.bestPath = state.bestPath || this.bestPath;
        this.pheromones = state.pheromones || this.pheromones;
        this.animationFrame++;
    }

    render() {
        this.clear();
        
        if (this.showPheromones && this.pheromones.length > 0) {
            this.drawPheromoneTrails();
        }
        
        if (this.showBestPath && this.bestPath.length > 0) {
            this.drawBestPath();
        }
        
        if (this.showTrails && this.currentAnts.length > 0) {
            this.drawAntTrails();
        }
        
        this.drawCities();
        this.drawAnts();
    }

    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw subtle grid
        this.drawGrid();
    }

    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    drawPheromoneTrails() {
        if (!this.pheromones || !this.cities) return;
        
        const maxPheromone = this.getMaxPheromone();
        
        for (let i = 0; i < this.pheromones.length; i++) {
            for (let j = i + 1; j < this.pheromones[i].length; j++) {
                const pheromone = this.pheromones[i][j];
                const normalizedPheromone = Math.min(pheromone / maxPheromone, 1);
                
                if (normalizedPheromone > 0.01) {
                    this.drawLine(
                        this.cities[i],
                        this.cities[j],
                        this.colors.pheromone,
                        normalizedPheromone * 3,
                        normalizedPheromone * this.trailAlpha
                    );
                }
            }
        }
    }

    drawAntTrails() {
        for (const ant of this.currentAnts) {
            if (!ant.path || ant.path.length < 2) continue;
            
            for (let i = 0; i < ant.path.length; i++) {
                const from = ant.path[i];
                const to = ant.path[(i + 1) % ant.path.length];
                
                this.drawLine(
                    this.cities[from],
                    this.cities[to],
                    this.colors.antFill,
                    this.lineWidth,
                    this.antAlpha * 0.4
                );
            }
        }
    }

    drawBestPath() {
        if (!this.bestPath || this.bestPath.length < 2) return;
        
        // Draw the line
        for (let i = 0; i < this.bestPath.length; i++) {
            const from = this.bestPath[i];
            const to = this.bestPath[(i + 1) % this.bestPath.length];
            
            this.drawLine(
                this.cities[from],
                this.cities[to],
                this.colors.bestPath,
                3,
                0.9
            );
        }
        
        // Draw animated circles along the path
        const offset = (this.animationFrame % 60) / 60;
        for (let i = 0; i < this.bestPath.length; i++) {
            const from = this.bestPath[i];
            const to = this.bestPath[(i + 1) % this.bestPath.length];
            const c1 = this.cities[from];
            const c2 = this.cities[to];
            
            const x = c1.x + (c2.x - c1.x) * ((i / this.bestPath.length + offset) % 1);
            const y = c1.y + (c2.y - c1.y) * ((i / this.bestPath.length + offset) % 1);
            
            this.ctx.fillStyle = this.colors.bestPath;
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
    }

    drawCities() {
        for (const city of this.cities) {
            // Circle
            this.ctx.fillStyle = this.colors.cityFill;
            this.ctx.beginPath();
            this.ctx.arc(city.x, city.y, this.cityRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Border
            this.ctx.strokeStyle = this.colors.cityStroke;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // City number (if available)
            if (city.id !== undefined) {
                this.ctx.fillStyle = this.colors.cityStroke;
                this.ctx.font = 'bold 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(city.id, city.x, city.y);
            }
        }
    }

    drawAnts() {
        for (const ant of this.currentAnts) {
            if (!ant.path || ant.path.length === 0) continue;
            
            // Draw ant at current position (at first city in path)
            const cityIndex = ant.path[0];
            const city = this.cities[cityIndex];
            
            if (city) {
                this.ctx.fillStyle = this.colors.antFill;
                this.ctx.globalAlpha = this.antAlpha;
                this.ctx.beginPath();
                this.ctx.arc(city.x, city.y, this.antRadius, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = this.colors.antStroke;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }
    }

    drawLine(from, to, color, width, alpha) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    getMaxPheromone() {
        let max = 0;
        for (let i = 0; i < this.pheromones.length; i++) {
            for (let j = 0; j < this.pheromones[i].length; j++) {
                max = Math.max(max, this.pheromones[i][j]);
            }
        }
        return max || 1;
    }

    setShowPheromones(show) {
        this.showPheromones = show;
    }

    setShowTrails(show) {
        this.showTrails = show;
    }

    setShowBestPath(show) {
        this.showBestPath = show;
    }

    drawStats(stats) {
        const padding = 10;
        const lineHeight = 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(padding, padding, 250, 100);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'left';
        
        let y = padding + lineHeight;
        this.ctx.fillText(`Iteration: ${stats.iteration || 0}`, padding + 5, y);
        y += lineHeight;
        this.ctx.fillText(`Best Distance: ${(stats.bestCost || 0).toFixed(2)}`, padding + 5, y);
        y += lineHeight;
        this.ctx.fillText(`Ants: ${stats.numAnts || 0}`, padding + 5, y);
        y += lineHeight;
        this.ctx.fillText(`Cities: ${stats.numCities || 0}`, padding + 5, y);
    }
}
