import React from 'react';
import Sharer from '../sharer';
import AntColonyVisualization from '../antcolony/AntColonyVisualization';
import AntForagingVisualization from '../antcolony/AntForagingVisualization';
import { FaBugs, FaCode, FaChevronDown, FaHeart } from 'react-icons/fa6';
import { GiCrabClaw } from "react-icons/gi";
import { SiClaude } from 'react-icons/si';
import Prism from 'prismjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/prism.css';
import '../styles/blog.css';
import logo from '../images/openclaw-dark.svg'

const AW = "#94a3b8";   // arrow / line colour
const TF = 13;          // default text font-size

function Box({ x, y, w, h = 40, label, fill, stroke, color }) {
    return (
        <g>
            <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <text x={x + w / 2} y={y + h / 2 + 4.5} textAnchor="middle" fontSize={TF} fill={color} fontFamily="inherit">{label}</text>
        </g>
    );
}

function Arrow({ d }) {
    return <path d={d} fill="none" stroke={AW} strokeWidth={1.5} markerEnd="url(#oc-a)" />;
}

function SecLabel({ x, y, w, label }) {
    return (
        <text x={x + w / 2} y={y + 16} textAnchor="middle" fontSize={9.5} fontWeight={700}
            fill="#94a3b8" letterSpacing="0.12em" fontFamily="inherit">{label}</text>
    );
}

function GrpLabel({ x, y, w, label }) {
    return (
        <text x={x + w / 2} y={y + 14} textAnchor="middle" fontSize={9.5}
            fill="#94a3b8" letterSpacing="0.06em" fontFamily="inherit">{label}</text>
    );
}

function OpenClawWorkflowDiagram() {
    const actors = [
        { x: 50, label: "User", emoji: "👤", color: "#166534" },
        { x: 160, label: "Channel", emoji: "💬", color: "#c2410c" },
        { x: 280, label: "Gateway", emoji: "🌉", color: "#1e40af" },
        { x: 400, label: "Router", emoji: "🎯", color: "#78350f" },
        { x: 520, label: "Agent", emoji: "🤖", color: "#4c1d95" },
        { x: 640, label: "Model", emoji: "🧠", color: "#701a75" },
        { x: 760, label: "Tools", emoji: "🛠️", color: "#0f766e" },
        { x: 860, label: "Out", emoji: "📤", color: "#c2410c" }
    ];

    const messages = [
        // Main flow
        { from: 0, to: 1, y: 140, label: "Send message", emoji: "📝" },
        { from: 1, to: 2, y: 180, label: "Inbound event", emoji: "📨" },
        { from: 2, to: 3, y: 220, label: "Route message", emoji: "🎯" },
        { from: 3, to: 4, y: 280, label: "Load/create session", emoji: "📂" },
        { from: 4, to: 5, y: 340, label: "API request", emoji: "🚀" },
        
        // Streaming loop (highlighted)
        { from: 5, to: 4, y: 400, label: "Stream chunk", emoji: "📊", back: true, loop: true },
        { from: 4, to: 2, y: 420, label: "Agent event", emoji: "📡", loop: true },
        { from: 2, to: 7, y: 440, label: "Typing indicator", emoji: "⌨️", loop: true },
        
        // Tool call flow (alternative path)
        { from: 5, to: 4, y: 500, label: "Tool call request", emoji: "🔧", back: true },
        { from: 4, to: 6, y: 540, label: "Execute tool", emoji: "⚙️" },
        { from: 6, to: 4, y: 580, label: "Tool result", emoji: "✅", back: true },
        { from: 4, to: 5, y: 620, label: "Continue", emoji: "🔄" },
        
        // Final response flow
        { from: 5, to: 4, y: 680, label: "Final text", emoji: "✨", back: true },
        { from: 4, to: 3, y: 720, label: "Response ready", emoji: "📋", back: true },
        { from: 3, to: 2, y: 760, label: "Final response", emoji: "📮", back: true },
        { from: 2, to: 7, y: 800, label: "Send message", emoji: "📤" },
        { from: 7, to: 0, y: 840, label: "Deliver response", emoji: "📬", back: true }
    ];

    return (
        <svg viewBox="0 0 950 900" width="100%" xmlns="http://www.w3.org/2000/svg"
            style={{ fontFamily: "inherit", display: "block", maxWidth: 950, margin: "0 auto" }}>
            <defs>
                <marker id="seq-arrow" viewBox="0 0 10 10" refX={8} refY={5}
                    markerWidth={5} markerHeight={5} orient="auto">
                    <path d="M0,1 L9,5 L0,9 L2.5,5 z" fill="#64748b" />
                </marker>
                <marker id="seq-arrow-loop" viewBox="0 0 10 10" refX={8} refY={5}
                    markerWidth={5} markerHeight={5} orient="auto">
                    <path d="M0,1 L9,5 L0,9 L2.5,5 z" fill="#3b82f6" />
                </marker>
            </defs>

            {/* Actor boxes */}
            {actors.map((actor, i) => (
                <g key={i}>
                    <rect x={actor.x - 40} y={10} width={80} height={60} rx={8}
                        fill="#f8fafc" stroke={actor.color} strokeWidth={1.5} />
                    <text x={actor.x} y={38} textAnchor="middle" fontSize={18}>{actor.emoji}</text>
                    <text x={actor.x} y={58} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}>{actor.label}</text>
                    {/* Lifeline */}
                    <line x1={actor.x} y1={70} x2={actor.x} y2={870}
                        stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4,3" />
                </g>
            ))}

            {/* Streaming loop background */}
            <rect x={150} y={385} width={730} height={75} rx={8} 
                fill="#eff6ff" fillOpacity={0.3} stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4,4" />
            <text x={515} y={377} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight={700}>
                🔄 STREAMING RESPONSE LOOP
            </text>

            {/* Tool call alternative path background */}
            <rect x={510} y={485} width={270} height={160} rx={8}
                fill="#fffbeb" fillOpacity={0.3} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4,4" />
            <text x={645} y={477} textAnchor="middle" fontSize={10} fill="#78350f" fontWeight={700}>
                🔧 ALT: Tool Call
            </text>

            {/* Step numbers background box */}
            <rect x={8} y={130} width={28} height={730} rx={6} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1} />

            {/* Messages */}
            {messages.map((msg, i) => {
                const fromX = actors[msg.from].x;
                const toX = actors[msg.to].x;
                const isLoop = msg.loop;
                const strokeColor = isLoop ? "#3b82f6" : "#64748b";
                const marker = isLoop ? "url(#seq-arrow-loop)" : "url(#seq-arrow)";
                
                return (
                    <g key={i}>
                        {/* Step number */}
                        <circle cx={22} cy={msg.y} r={10} fill="#ffffff" stroke="#94a3b8" strokeWidth={1.5} />
                        <text x={22} y={msg.y + 4} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}>{i + 1}</text>
                        
                        {/* Arrow - always use markerEnd, orient="auto" handles direction */}
                        <line x1={fromX} y1={msg.y} x2={toX} y2={msg.y}
                            stroke={strokeColor} strokeWidth={1.5}
                            markerEnd={marker} />
                        
                        {/* Label */}
                        <text x={(fromX + toX) / 2} y={msg.y - 8} textAnchor="middle" 
                            fontSize={10.5} fill={isLoop ? "#1e40af" : "#1e293b"} fontWeight={500}>
                            {msg.emoji} {msg.label}
                        </text>
                    </g>
                );
            })}

            {/* Note boxes */}
            <rect x={420} y={300} width={200} height={26} rx={4} fill="#fffbeb" stroke="#fbbf24" strokeWidth={1} opacity={0.95} />
            <text x={520} y={318} textAnchor="middle" fontSize={10} fill="#78350f">
                📚 Load history • ⚙️ Apply system prompt
            </text>

            <rect x={420} y={695} width={100} height={20} rx={4} fill="#f5f3ff" stroke="#a78bfa" strokeWidth={1} opacity={0.95} />
            <text x={470} y={709} textAnchor="middle" fontSize={9} fill="#4c1d95">💾 Save state</text>
        </svg>
    );
}

function OpenClawArchDiagram() {
    const chan   = { fill: "#fff7ed", stroke: "#fb923c", color: "#c2410c" };
    const client = { fill: "#f0fdf4", stroke: "#4ade80", color: "#166534" };
    const gw     = { fill: "#eff6ff", stroke: "#60a5fa", color: "#1e40af" };
    const proc   = { fill: "#fffbeb", stroke: "#fbbf24", color: "#78350f" };
    const stor   = { fill: "#f5f3ff", stroke: "#a78bfa", color: "#4c1d95" };
    const prov   = { fill: "#fdf4ff", stroke: "#d946ef", color: "#701a75" };
    const svc    = { fill: "#f0fdfa", stroke: "#2dd4bf", color: "#0f766e" };
    const sec    = { fill: "#f8fafc", stroke: "#e2e8f0" };
    const grp    = { fill: "#f1f5f9", stroke: "#cbd5e1" };

    // ── Vertical layout ──────────────────────────────────────────
    // INPUTS:        y=8,   h=206  → bottom=214
    // gap=24
    // CORE:          y=238, h=196  → bottom=434
    // corridor=48    (arrows route here at y=458)
    // STORAGE:       y=482, h=148  → bottom=630
    // PROCESSING:    y=482, h=228  → bottom=710
    // gap=16
    // EXTERNAL:      y=726, h=162  → bottom=888
    // viewBox h=892

    return (
        <svg viewBox="0 0 900 892" width="100%" xmlns="http://www.w3.org/2000/svg"
            style={{ fontFamily: "inherit", display: "block", maxWidth: 900, margin: "0 auto" }}>
            <defs>
                <marker id="oc-a" viewBox="0 0 10 10" refX={8} refY={5}
                    markerWidth={5} markerHeight={5} orient="auto">
                    <path d="M0,1 L9,5 L0,9 L2.5,5 z" fill={AW} />
                </marker>
            </defs>

            {/* ── SECTION BACKGROUNDS ── */}
            <rect x={2}   y={8}   width={896} height={206} rx={12} {...sec} strokeWidth={1.5} />
            <SecLabel x={2} y={8} w={896} label="INPUTS" />

            <rect x={2}   y={238} width={896} height={196} rx={12} {...sec} strokeWidth={1.5} />
            <SecLabel x={2} y={238} w={896} label="GATEWAY CORE · PORT 18789" />

            <rect x={2}   y={482} width={390} height={148} rx={12} {...sec} strokeWidth={1.5} />
            <SecLabel x={2} y={482} w={390} label="STORAGE" />

            <rect x={400} y={482} width={498} height={228} rx={12} {...sec} strokeWidth={1.5} />
            <SecLabel x={400} y={482} w={498} label="PROCESSING LAYER" />

            <rect x={400} y={726} width={498} height={162} rx={12} {...sec} strokeWidth={1.5} />
            <SecLabel x={400} y={726} w={498} label="EXTERNAL SERVICES" />

            {/* ── GROUP BACKGROUNDS ── */}
            {/* Messaging Channels: rows at y=62 and y=118, h=158 */}
            <rect x={14}  y={30}  width={378} height={158} rx={9} {...grp} strokeWidth={1} />
            <GrpLabel x={14} y={30} w={378} label="Messaging Channels" />

            {/* Plugin Channels: rows at y=62 and y=118, h=158 */}
            <rect x={404} y={30}  width={192} height={158} rx={9} {...grp} strokeWidth={1} />
            <GrpLabel x={404} y={30} w={192} label="Plugin Channels" />

            {/* Control Clients: single row centred at y=88, h=158 */}
            <rect x={608} y={30}  width={278} height={158} rx={9} {...grp} strokeWidth={1} />
            <GrpLabel x={608} y={30} w={278} label="Control Clients" />

            {/* AI Providers */}
            <rect x={410} y={748} width={222} height={130} rx={8} {...grp} strokeWidth={1} />
            <GrpLabel x={410} y={748} w={222} label="AI Providers" />

            {/* Services */}
            <rect x={648} y={748} width={238} height={130} rx={8} {...grp} strokeWidth={1} />
            <GrpLabel x={648} y={748} w={238} label="Services" />

            {/* ── BOXES ── */}
            {/* Messaging: row1 y=62, row2 y=118 */}
            <Box x={24}  y={62}  w={174} h={42} label="WhatsApp" {...chan} />
            <Box x={208} y={62}  w={174} h={42} label="Telegram"  {...chan} />
            <Box x={24}  y={118} w={174} h={42} label="Discord"   {...chan} />
            <Box x={208} y={118} w={174} h={42} label="Slack"     {...chan} />

            {/* Plugin: row1 y=62, row2 y=118 */}
            <Box x={414} y={62}  w={172} h={42} label="Matrix"   {...chan} />
            <Box x={414} y={118} w={172} h={42} label="MS Teams" {...chan} />

            {/* Clients: centred at y=88 */}
            <Box x={618} y={88} w={80} h={42} label="CLI"    {...client} />
            <Box x={706} y={88} w={80} h={42} label="Web UI" {...client} />
            <Box x={794} y={88} w={80} h={42} label="macOS"  {...client} />

            {/* Gateway Core: WS centred top, row below */}
            <Box x={330} y={264} w={240} h={44} label="WebSocket Handler" {...gw} />
            <Box x={48}  y={356} w={200} h={44} label="Authentication"    {...gw} />
            <Box x={334} y={356} w={216} h={44} label="Channel Manager"   {...gw} />
            <Box x={658} y={356} w={162} h={44} label="Router"            {...gw} />

            {/* Storage */}
            <Box x={20}  y={506} w={168} h={44} label="Credentials" {...stor} />
            <Box x={204} y={506} w={168} h={44} label="Sessions"    {...stor} />

            {/* Processing */}
            <Box x={549} y={504} w={200} h={44} label="Pi Agent Runner" {...proc} />
            <Box x={414} y={582} w={146} h={44} label="Model Catalog"   {...proc} />
            <Box x={576} y={582} w={146} h={44} label="Tool Registry"   {...proc} />
            <Box x={738} y={582} w={146} h={44} label="Plugin Runtime"  {...proc} />

            {/* External */}
            <Box x={418} y={770} w={96}  h={40} label="OpenAI"    {...prov} />
            <Box x={528} y={770} w={96}  h={40} label="Anthropic" {...prov} />
            <Box x={658} y={770} w={106} h={40} label="Canvas"    {...svc} />
            <Box x={772} y={770} w={106} h={40} label="Search"    {...svc} />

            {/* ── ARROWS (top layer) ── */}

            {/* INPUTS → WS (straight down into section) */}
            <Arrow d="M450,214 L450,264" />

            {/* WS → AUTH (curve left from WS bottom) */}
            <Arrow d="M450,308 C450,332 148,332 148,356" />
            {/* WS → CHAN (gentle curve down) */}
            <Arrow d="M450,308 C450,332 440,332 440,356" />
            {/* CHAN → ROUTE (horizontal) */}
            <Arrow d="M550,378 C600,378 610,378 658,378" />

            {/* AUTH → CREDS */}
            <Arrow d="M148,400 C148,453 104,453 104,506" />
            {/* ROUTE → SESS */}
            <Arrow d="M668,400 C668,453 288,453 288,506" />
            {/* ROUTE → PI */}
            <Arrow d="M739,400 C739,453 649,453 649,504" />

            {/* PI → MODEL / TOOLS / PLUGIN */}
            <Arrow d="M649,548 C649,566 487,562 487,582" />
            <Arrow d="M649,548 C649,564 649,564 649,582" />
            <Arrow d="M649,548 C649,566 811,562 811,582" />

            {/* MODEL / TOOLS → External */}
            <Arrow d="M487,626 C487,684 466,678 466,770" />
            <Arrow d="M487,626 C487,684 576,678 576,770" />
            <Arrow d="M649,626 C649,684 711,678 711,770" />
            <Arrow d="M649,626 C649,684 825,678 825,770" />
        </svg>
    );
}

export default class OpenClawBlog extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "OpenClaw | blog by Pranshu Gupta";
        setTimeout(() => Prism.highlightAll(), 0);
    }

    render() {
        return (
            <div className="blog-content">
                <div className="row bhead">
                    <img src={logo} alt="OpenClaw Logo" className="gt1" style={{ height: '96px', width: 'auto' }} />
                </div>
                <h1 className="title">Diving into OpenClaw</h1>
                <p>Pranshu Gupta, {this.props.date}</p>
                <Sharer className="sharer" link={window.location.href} title={"Diving into OpenClaw"}></Sharer>
                <p className="introduction">
                    OpenClaw is a self-hosted gateway that connects your favorite chat apps — WhatsApp, Telegram, Discord, iMessage, and more — to AI coding agents like Pi. You run a single Gateway process on your own machine (or a server), and it becomes the bridge between your messaging apps and an always-available AI assistant. In this article, we will dive into the design and system architecture of OpenClaw.
                </p>
                <hr style={{ backgroundColor: "white" }} />

                <h2 className="headings">Architecture Overview</h2>
                <p>
                    OpenClaw is a unified messaging gateway that connects multiple communication platforms
                    (WhatsApp, Telegram, Discord, Slack) and control interfaces (CLI, Web UI, macOS) through
                    a single WebSocket-based core. The architecture consists of three main layers:
                </p>
                <ul>
                    <li><strong>Input Layer:</strong> Handles messages from various messaging platforms and control clients</li>
                    <li><strong>Gateway Core:</strong> Manages authentication, routing, and WebSocket connections on port 18789</li>
                    <li><strong>Processing Layer:</strong> Executes the Pi agent with access to AI models (OpenAI, Anthropic) and external services</li>
                </ul>
                <p>
                    The system maintains session state and credentials in a persistence layer, allowing seamless
                    interaction with AI providers and external services like Canvas and Search.
                </p>
                <div className="mermaid-diagram" style={{ margin: '1.5rem 0', padding: '0.5rem 0' }}>
                    <OpenClawArchDiagram />
                </div>

                <h2 className="headings" style={{ marginTop: '32px' }}>Message Flow</h2>
                <p>
                    When a user sends a message through any connected platform, it triggers a carefully orchestrated
                    sequence of operations. The message first enters through the appropriate channel adapter, gets
                    authenticated and routed to the relevant session, and then processed by the Pi agent which
                    leverages AI models and tools to generate intelligent responses.
                </p>
                <p>
                    The system supports streaming responses with real-time typing indicators, and can make
                    multiple tool calls as needed. The entire conversation state is persisted, ensuring continuity
                    across sessions and enabling the agent to maintain context throughout extended interactions.
                </p>
                <div className="mermaid-diagram" style={{ margin: '1.5rem 0', padding: '0.5rem 0' }}>
                    <OpenClawWorkflowDiagram />
                </div>
                
                <hr style={{ backgroundColor: "white" }} />
                <h2 className="headings" style={{ marginTop: '18px' }}>References</h2>
                <ol>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://ieeexplore.ieee.org/document/585892">Dorigo, M., &amp; Gambardella, L. M. (1997). Ant colony system: A cooperative learning approach to the traveling salesman problem. <i>IEEE Transactions on Evolutionary Computation, 1(1)</i>, 53–66.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://ieeexplore.ieee.org/document/1597059">Dorigo, M., Birattari, M., &amp; Stutzle, T. (2006). Ant colony optimization — artificial ants as a computational intelligence technique. <i>IEEE Computational Intelligence Magazine, 1(4)</i>, 28–39.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://books.google.com/books?vid=ISBN9780195131598">Bonabeau, E., Dorigo, M., &amp; Theraulaz, G. (1999). <i>Swarm Intelligence: From Natural to Artificial Systems</i>. Oxford University Press.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://arxiv.org/abs/1903.01893">Gupta, P. (2019). Algorithms inspired by nature: A survey. <i>arXiv:1903.01893 [cs.NE]</i>.</a></li>
                </ol>
                <hr style={{ backgroundColor: "white" }} />
                <p style={{ textAlign: 'center', opacity: 0.62, fontSize: '13px', letterSpacing: '0.5px', marginTop: '8px' }}>
                    written with <FaHeart style={{ color: '#e05', verticalAlign: 'middle', fontSize: '11px', margin: '0 2px' }} /> and <SiClaude style={{ verticalAlign: 'middle', fontSize: '13px', margin: '0 3px 0 2px', color: '#D97757' }} /> claude sonnet
                </p>
            </div>
        );
    }
}
