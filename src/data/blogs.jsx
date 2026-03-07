import { blogMeta } from './blog-meta.js';

// Map from slug → dynamic import loader (kept here so Vite can bundle them)
const loaders = {
    "runtime-optimizations-for-llms":                          () => import('../blogs/llmoptimizations'),
    "ant-colony-optimization":                                 () => import('../blogs/antcolonyopt'),
    "renju:-a-strategic-board-game-with-ai":                   () => import('../blogs/renju'),
    "coding-youtube's-load-balancer-using-github-copilot":     () => import('../blogs/openprequal'),
    "statistical-insights-on-cancer-in-america":               () => import('../blogs/cancerviz'),
    "transaction-isolation-in-database-systems":               () => import('../blogs/transisol'),
    "distributed-computing-with-mapreduce":                    () => import('../blogs/distribcomp'),
    "understanding-the-domain-name-system":                    () => import('../blogs/dns'),
    "exploring-github-repositories":                           () => import('../blogs/gitviz'),
    "analysing-apple-music-activity":                          () => import('../blogs/applemusic'),
    "a-voyage-across-the-ocean-of-music":                      () => import('../blogs/avatoom'),
    "algorithms-inspired-by-nature":                           () => import('../blogs/aibn'),
    "on-virtualization-and-containers":                        () => import('../blogs/ovac'),
    "quirks-of-javascript":                                    () => import('../blogs/qoj'),
    "evolution-of-human-languages":                            () => import('../blogs/eohl'),
};

export const blogList = blogMeta.map((entry) => ({
    ...entry,
    loader: loaders[entry.slug],
}));
