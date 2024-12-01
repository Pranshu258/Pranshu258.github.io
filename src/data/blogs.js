import Avatoom from '../blogs/avatoom';
import Ovac from '../blogs/ovac';
import Aibn from '../blogs/aibn';
import Qoj from '../blogs/qoj';
import Eohl from '../blogs/eohl';
import Gitviz from '../blogs/gitviz';
import Applemusic from '../blogs/applemusic';
import DNS from '../blogs/dns';
import TransIsol from '../blogs/transisol';
import DistribComp from '../blogs/distribcomp';

export let blogList = [
    {
        name: "Transaction Isolation in Database Systems",
        description: "Transactional database systems allow different isolation levels. An isolation level specifies how and when parts of the transaction can and should become visible to other transactions that are being executed at the same time.",
        tags: [
            "Database Systems",
            "Transactions"
        ],
        component: <TransIsol/>
    },
    {
        name: "Distributed Computing with MapReduce",
        description: "MapReduce was one of the first frameworks that democratized distributed computing, by making it easier for engineers to write applications that run on distributed systems without having distributed computing expertise.",
        tags: [
            "Distributed Systems",
            "MapReduce"
        ],
        component: <DistribComp/>
    },
    {
        name: "Understanding the Domain Name System",
        description: "The domain name system (DNS) is a critical part of the internet infrastructure. It is responsible for translating human readable domain names into machine readable IP addresses. This blog post will explore the DNS system and its inner workings.",
        tags: [
            "Computer Networks",
            "DNS"
        ],
        component: <DNS/>
    },
    {
        name: "Exploring GitHub Repositories",
        description: "Exploring two repositories which have become the flag-bearers of web development, Angular and React, and trying to understand their journey on GitHub over the past few years.",
        tags: [
            "Data Visualization",
            "Python"
        ],
        component: <Gitviz/>
    },
    {
        name: "Analysing Apple Music Activity",
        description: "Exploring apple music data of a user collected over a duration of two years. We will try to infer listening habits and other music specific traits of user from the data.",
        tags: [
            "Data Visualization",
            "Python"
        ],
        component: <Applemusic/>
    },
    {
        name: "A voyage across the Ocean of Music",
        description: "Analysing song lyrics to find patterns that can be used to create new lyrics with the help of unsupervised and supervised machine learning techniques.",
        tags: [
            "Machine Learning",
            "Python"
        ],
        component: <Avatoom/>
    },
    {
        name: "Algorithms inspired by Nature",
        description: "Nature is known to be the best optimizer. Natural processes more often than not reach an optimal equilibrium. Scientists have always strived to understand and model such processes. Thus, many algorithms exist today that are inspired by nature.",
        tags: [
            "Artificial Intelligence",
            "Evolutionary Computing"
        ],
        component: <Aibn/>
    },
    {
        name: "On Virtualization and Containers",
        description: "A comparative discussion of virtual machines and containers. Virtualization is a mechanism to share hardware resources amongst multiple operating system instances on the same machine. While containers are isolated execution environments which share the operating system resources.",
        tags: [
            "Cloud Computing",
            "Virtualization"
        ],
        component: <Ovac/>
    },
    {
        name: "Quirks of JavaScript",
        description: "JavaScript is one of the most widely used programing languages in the world. It is the langauge that drives almost all the client side code on the internet. However, it has become a language which most people use but don't love.",
        tags: [
            "Programming Languages",
            "Web Development"
        ],
        component: <Qoj/>
    },
    {
        name: "Evolution of Human Languages",
        description: "Language is an essential part of our existence enabling us to transfer unlimited non-genetic information among individuals. But how, when and why exactly did we evolve to acquire the faculty of language.",
        tags: [
            "Human Psychology",
            "Psycholinguistics"
        ],
        component: <Eohl/>
    }
]