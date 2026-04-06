// Plain JS (no JSX, no dynamic imports) so it can be consumed by
// both the React app and the Node.js RSS-generation script.

const toSlug = (name) => name.replace(/\s+/g, '-').toLowerCase();

export const blogMeta = [
    {
        name: "Diving into OpenClaw",
        description: "OpenClaw is a self-hosted gateway that connects your favorite chat apps — WhatsApp, Telegram, Discord, iMessage, and more — to AI coding agents like Pi. You run a single Gateway process on your own machine (or a server), and it becomes the bridge between your messaging apps and an always-available AI assistant. In this article, we will dive into the design and system architecture of OpenClaw.",
        tags: ["Agentic AI", "AI Chat"],
        date: "March 28, 2026",
    },
    {
        name: "Runtime optimizations for LLMs",
        description: "Large Language Models (LLMs) are a class of deep learning models that have gained significant attention in recent years due to their ability to generate human-like text. In this article, we explore runtime optimizations that are used to improve performance and reduce resource consumption in production.",
        tags: ["Large Language Models", "Performance Optimization"],
        date: "March 8, 2026",
    },
    {
        name: "Ant Colony Optimization",
        description: "An interactive visualization of the Ant Colony Optimization algorithm, a swarm intelligence technique inspired by the foraging behavior of real ants. Watch virtual ants collaborate through pheromone trails to solve the Traveling Salesman Problem.",
        tags: ["Swarm Intelligence", "Optimization"],
        date: "February 25, 2026",
    },
    {
        name: "Renju: A Strategic Board Game with AI",
        description: "A modern web implementation of Renju (Five in a Row) using React and HTML5 Canvas. Features an AI opponent powered by minimax with alpha-beta pruning at variable depths, real-time AI thinking visualization, move history highlighting, and winning line animation. Play directly in your browser while learning about game theory, search algorithms, and interactive web development.",
        tags: ["Game Development", "Artificial Intelligence"],
        date: "February 15, 2026",
    },
    {
        name: "Coding YouTube's load balancer using Github Copilot",
        description: "Can we vibe code 'Prequal', the load balancing algorithm used by Google for services that make YouTube? Let's find out, using GitHub Copilot. Google's Prequal is an adaptive load balancing algorithm that uses real-time metrics like requests-in-flight, and latency to make intelligent routing decisions.",
        tags: ["Distributed Systems", "Load Balancing"],
        date: "September 14, 2025",
    },
    {
        name: "Statistical insights on Cancer in America",
        description: "Cancer is a group of diseases characterized by abnormal and uncontrolled growth of cells, that can invade and spread to other parts of the body. The USCS online databases provide cancer incidence and mortality data for the United States. In this article we will analyse the data to find trends in the cancer incidences for leading cancer sites in the human body.",
        tags: ["Cancer Statistics", "Healthcare", "Data Visualization"],
        date: "Dec 5, 2024",
    },
    {
        name: "Transaction Isolation in Database Systems",
        description: "Transactional database systems allow different isolation levels. An isolation level specifies how and when parts of the transaction can and should become visible to other transactions that are being executed at the same time.",
        tags: ["Database Systems", "Transactions"],
        date: "Nov 30, 2024",
    },
    {
        name: "Distributed Computing with MapReduce",
        description: "MapReduce was one of the first frameworks that democratized distributed computing, by making it easier for engineers to write applications that run on distributed systems without having distributed computing expertise.",
        tags: ["Distributed Systems", "MapReduce"],
        date: "Nov 29, 2024",
    },
    {
        name: "Understanding the Domain Name System",
        description: "The domain name system (DNS) is a critical part of the internet infrastructure. It is responsible for translating human readable domain names into machine readable IP addresses. This blog post will explore the DNS system and its inner workings.",
        tags: ["Computer Networks", "DNS"],
        date: "Oct 13, 2024",
    },
    {
        name: "Exploring GitHub Repositories",
        description: "Exploring two repositories which have become the flag-bearers of web development, Angular and React, and trying to understand their journey on GitHub over the past few years.",
        tags: ["Data Visualization", "Python"],
        date: "May 12, 2020",
    },
    {
        name: "Analysing Apple Music Activity",
        description: "Exploring apple music data of a user collected over a duration of two years. We will try to infer listening habits and other music specific traits of user from the data.",
        tags: ["Data Visualization", "Python"],
        date: "May 2, 2020",
    },
    {
        name: "A voyage across the Ocean of Music",
        description: "Analysing song lyrics to find patterns that can be used to create new lyrics with the help of unsupervised and supervised machine learning techniques.",
        tags: ["Machine Learning", "Python"],
        date: "November 18, 2019",
    },
    {
        name: "Algorithms inspired by Nature",
        description: "Nature is known to be the best optimizer. Natural processes more often than not reach an optimal equilibrium. Scientists have always strived to understand and model such processes. Thus, many algorithms exist today that are inspired by nature.",
        tags: ["Artificial Intelligence", "Evolutionary Computing"],
        date: "Feb 22, 2019",
    },
    {
        name: "On Virtualization and Containers",
        description: "A comparative discussion of virtual machines and containers. Virtualization is a mechanism to share hardware resources amongst multiple operating system instances on the same machine. While containers are isolated execution environments which share the operating system resources.",
        tags: ["Cloud Computing", "Virtualization"],
        date: "Feb 20, 2019",
    },
    {
        name: "Quirks of JavaScript",
        description: "JavaScript is one of the most widely used programing languages in the world. It is the langauge that drives almost all the client side code on the internet. However, it has become a language which most people use but don't love.",
        tags: ["Programming Languages", "Web Development"],
        date: "June 5, 2017",
    },
    {
        name: "Evolution of Human Languages",
        description: "Language is an essential part of our existence enabling us to transfer unlimited non-genetic information among individuals. But how, when and why exactly did we evolve to acquire the faculty of language.",
        tags: ["Human Psychology", "Psycholinguistics"],
        date: "May 5, 2017",
    },
].map((entry) => ({ ...entry, slug: toSlug(entry.name) }));
