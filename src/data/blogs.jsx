const toSlug = (name) => name.replace(/\s+/g, '-').toLowerCase();

const createBlogEntry = ({ name, description, tags, loader }) => ({
    name,
    slug: toSlug(name),
    description,
    tags,
    loader
});

export const blogList = [
    createBlogEntry({
        name: "Renju: A Strategic Board Game with AI",
        description: "A modern web implementation of Renju (Five in a Row) using React and HTML5 Canvas. Features an AI opponent powered by minimax with alpha-beta pruning at variable depths, real-time AI thinking visualization, move history highlighting, and winning line animation. Play directly in your browser while learning about game theory, search algorithms, and interactive web development.",
        tags: [
            "Game Development",
            "Artificial Intelligence",
            "React",
            "Canvas"
        ],
        loader: () => import('../blogs/renju')
    }),
    createBlogEntry({
        name: "Coding YouTube's load balancer using Github Copilot",
        description: "Can we vibe code 'Prequal', the load balancing algorithm used by Google for services that make YouTube? Let's find out, using GitHub Copilot. Google's Prequal is an adaptive load balancing algorithm that uses real-time metrics like requests-in-flight, and latency to make intelligent routing decisions.",
        tags: [
            "Distributed Systems",
            "Load Balancing"
        ],
        loader: () => import('../blogs/openprequal')
    }),
    createBlogEntry({
        name: "Statistical insights on Cancer in America",
        description: "Cancer is a group of diseases characterized by abnormal and uncontrolled growth of cells, that can invade and spread to other parts of the body. The USCS online databases provide cancer incidence and mortality data for the United States. In this article we will analyse the data to find trends in the cancer incidences for leading cancer sites in the human body.",
        tags: [
            "Cancer Statistics",
            "Healthcare",
            "Data Visualization"
        ],
        loader: () => import('../blogs/cancerviz')
    }),
    createBlogEntry({
        name: "Transaction Isolation in Database Systems",
        description: "Transactional database systems allow different isolation levels. An isolation level specifies how and when parts of the transaction can and should become visible to other transactions that are being executed at the same time.",
        tags: [
            "Database Systems",
            "Transactions"
        ],
        loader: () => import('../blogs/transisol')
    }),
    createBlogEntry({
        name: "Distributed Computing with MapReduce",
        description: "MapReduce was one of the first frameworks that democratized distributed computing, by making it easier for engineers to write applications that run on distributed systems without having distributed computing expertise.",
        tags: [
            "Distributed Systems",
            "MapReduce"
        ],
        loader: () => import('../blogs/distribcomp')
    }),
    createBlogEntry({
        name: "Understanding the Domain Name System",
        description: "The domain name system (DNS) is a critical part of the internet infrastructure. It is responsible for translating human readable domain names into machine readable IP addresses. This blog post will explore the DNS system and its inner workings.",
        tags: [
            "Computer Networks",
            "DNS"
        ],
        loader: () => import('../blogs/dns')
    }),
    createBlogEntry({
        name: "Exploring GitHub Repositories",
        description: "Exploring two repositories which have become the flag-bearers of web development, Angular and React, and trying to understand their journey on GitHub over the past few years.",
        tags: [
            "Data Visualization",
            "Python"
        ],
        loader: () => import('../blogs/gitviz')
    }),
    createBlogEntry({
        name: "Analysing Apple Music Activity",
        description: "Exploring apple music data of a user collected over a duration of two years. We will try to infer listening habits and other music specific traits of user from the data.",
        tags: [
            "Data Visualization",
            "Python"
        ],
        loader: () => import('../blogs/applemusic')
    }),
    createBlogEntry({
        name: "A voyage across the Ocean of Music",
        description: "Analysing song lyrics to find patterns that can be used to create new lyrics with the help of unsupervised and supervised machine learning techniques.",
        tags: [
            "Machine Learning",
            "Python"
        ],
        loader: () => import('../blogs/avatoom')
    }),
    createBlogEntry({
        name: "Algorithms inspired by Nature",
        description: "Nature is known to be the best optimizer. Natural processes more often than not reach an optimal equilibrium. Scientists have always strived to understand and model such processes. Thus, many algorithms exist today that are inspired by nature.",
        tags: [
            "Artificial Intelligence",
            "Evolutionary Computing"
        ],
        loader: () => import('../blogs/aibn')
    }),
    createBlogEntry({
        name: "On Virtualization and Containers",
        description: "A comparative discussion of virtual machines and containers. Virtualization is a mechanism to share hardware resources amongst multiple operating system instances on the same machine. While containers are isolated execution environments which share the operating system resources.",
        tags: [
            "Cloud Computing",
            "Virtualization"
        ],
        loader: () => import('../blogs/ovac')
    }),
    createBlogEntry({
        name: "Quirks of JavaScript",
        description: "JavaScript is one of the most widely used programing languages in the world. It is the langauge that drives almost all the client side code on the internet. However, it has become a language which most people use but don't love.",
        tags: [
            "Programming Languages",
            "Web Development"
        ],
        loader: () => import('../blogs/qoj')
    }),
    createBlogEntry({
        name: "Evolution of Human Languages",
        description: "Language is an essential part of our existence enabling us to transfer unlimited non-genetic information among individuals. But how, when and why exactly did we evolve to acquire the faculty of language.",
        tags: [
            "Human Psychology",
            "Psycholinguistics"
        ],
        loader: () => import('../blogs/eohl')
    })
];