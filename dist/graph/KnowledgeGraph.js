"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_KNOWLEDGE_GRAPH = void 0;
exports.buildGraph = buildGraph;
exports.queryGraph = queryGraph;
exports.listKnowledgeDomains = listKnowledgeDomains;
const tokenizer_1 = require("../shared/tokenizer");
const BM25_K1 = 1.5;
const BM25_B = 0.75;
const INTENT_AFFINITY_BOOST = 1.4;
const RELATED_DOMAIN_WEIGHT = 0.6;
function domain(id, label, keywords, related_domains, intent_affinity) {
    return { id, label, keywords, related_domains, intent_affinity };
}
const DOMAIN_NODES = [
    domain("javascript", "JavaScript", ["javascript", "ecmascript", "browser", "frontend", "runtime", "async", "closure", "event loop", "npm", "dom"], ["typescript", "nodejs", "react", "frontend"], ["CODE", "DEBUG"]),
    domain("typescript", "TypeScript", ["typescript", "type safety", "interface", "generic", "compiler", "tsconfig", "types", "annotation", "strict mode"], ["javascript", "nodejs", "react", "testing"], ["CODE", "DEBUG"]),
    domain("nodejs", "Node.js", ["node", "nodejs", "server", "backend", "express", "process", "stream", "filesystem", "module", "package"], ["javascript", "typescript", "apis", "devops"], ["CODE", "DEBUG"]),
    domain("python", "Python", ["python", "script", "package", "interpreter", "pandas", "django", "flask", "asyncio", "decorator", "virtualenv"], ["data_science", "machine_learning", "algorithms", "apis"], ["CODE", "DEBUG"]),
    domain("java", "Java", ["java", "jvm", "spring", "object oriented", "class", "interface", "gradle", "maven", "thread"], ["apis", "databases", "testing", "devops"], ["CODE", "DEBUG"]),
    domain("csharp", "C#", ["csharp", "dotnet", ".net", "asp.net", "linq", "visual studio", "entity framework", "delegate"], ["apis", "databases", "testing", "mobile"], ["CODE", "DEBUG"]),
    domain("golang", "Go", ["golang", "go", "goroutine", "concurrency", "module", "server", "interface", "channel", "binary"], ["networking", "cloud", "devops", "apis"], ["CODE", "DEBUG"]),
    domain("rust", "Rust", ["rust", "ownership", "borrow checker", "cargo", "lifetime", "trait", "memory safety", "systems"], ["algorithms", "security", "networking", "devops"], ["CODE", "DEBUG"]),
    domain("react", "React", ["react", "component", "hook", "state", "jsx", "props", "render", "frontend", "reactive", "ui"], ["javascript", "typescript", "frontend", "css"], ["CODE", "DEBUG", "CREATIVE"]),
    domain("frontend", "Frontend Engineering", ["frontend", "ui", "ux", "layout", "interaction", "browser", "rendering", "client side", "design system"], ["react", "css", "javascript", "writing"], ["CODE", "CREATIVE"]),
    domain("css", "CSS", ["css", "style", "layout", "grid", "flexbox", "animation", "responsive", "selector", "visual"], ["frontend", "react", "writing", "marketing"], ["CODE", "CREATIVE"]),
    domain("mobile", "Mobile Development", ["mobile", "ios", "android", "swift", "kotlin", "react native", "app store", "touch", "device"], ["frontend", "react", "testing", "apis"], ["CODE", "DEBUG"]),
    domain("testing", "Testing", ["test", "unit test", "integration", "mock", "assertion", "coverage", "jest", "regression", "qa"], ["typescript", "javascript", "python", "nodejs"], ["CODE", "DEBUG"]),
    domain("devops", "DevOps", ["deployment", "ci", "cd", "docker", "container", "pipeline", "infrastructure", "observability", "release"], ["cloud", "nodejs", "security", "testing"], ["CODE", "DEBUG", "DECISION"]),
    domain("apis", "APIs", ["api", "endpoint", "rest", "graphql", "request", "response", "schema", "integration", "payload", "authentication"], ["nodejs", "databases", "security", "cloud"], ["CODE", "DEBUG", "FACTUAL"]),
    domain("databases", "Databases", ["database", "storage", "query", "index", "transaction", "postgres", "mysql", "document store", "cache"], ["sql", "apis", "security", "business"], ["CODE", "DEBUG", "DECISION"]),
    domain("sql", "SQL", ["sql", "select", "join", "aggregate", "query plan", "table", "row", "column", "database"], ["databases", "data_science", "finance", "business"], ["CODE", "DEBUG", "FACTUAL"]),
    domain("algorithms", "Algorithms", ["algorithm", "optimization", "runtime", "complexity", "search", "sort", "graph", "dynamic programming", "greedy"], ["data_structures", "mathematics", "python", "rust"], ["CODE", "CONCEPTUAL", "DECISION"]),
    domain("data_structures", "Data Structures", ["data structure", "array", "linked list", "tree", "heap", "hash map", "stack", "queue", "graph"], ["algorithms", "javascript", "python", "java"], ["CODE", "CONCEPTUAL"]),
    domain("networking", "Networking", ["network", "http", "tcp", "udp", "dns", "latency", "packet", "socket", "bandwidth"], ["security", "cloud", "golang", "apis"], ["CODE", "DEBUG", "FACTUAL"]),
    domain("security", "Security", ["security", "authentication", "authorization", "encryption", "vulnerability", "attack", "oauth", "token", "threat"], ["networking", "cloud", "law", "apis"], ["CODE", "DEBUG", "DECISION"]),
    domain("cloud", "Cloud Infrastructure", ["cloud", "aws", "gcp", "azure", "serverless", "scaling", "compute", "storage", "kubernetes"], ["devops", "security", "networking", "business"], ["CODE", "DEBUG", "DECISION"]),
    domain("machine_learning", "Machine Learning", ["machine learning", "model", "training", "inference", "classification", "regression", "feature", "dataset"], ["data_science", "python", "mathematics", "business"], ["CONCEPTUAL", "DECISION", "FACTUAL"]),
    domain("data_science", "Data Science", ["data science", "analysis", "statistics", "dataset", "visualization", "regression", "distribution", "metric"], ["machine_learning", "python", "sql", "mathematics"], ["FACTUAL", "CONCEPTUAL", "DECISION"]),
    domain("mathematics", "Mathematics", ["math", "mathematics", "equation", "proof", "probability", "calculus", "algebra", "geometry", "statistics"], ["algorithms", "physics", "data_science", "finance"], ["FACTUAL", "CONCEPTUAL"]),
    domain("physics", "Physics", ["physics", "force", "energy", "motion", "quantum", "relativity", "wave", "thermodynamics", "field"], ["mathematics", "chemistry", "algorithms", "history"], ["FACTUAL", "CONCEPTUAL"]),
    domain("chemistry", "Chemistry", ["chemistry", "molecule", "reaction", "compound", "acid", "base", "organic", "element", "bond"], ["biology", "medicine", "physics", "cooking"], ["FACTUAL", "CONCEPTUAL"]),
    domain("biology", "Biology", ["biology", "cell", "genetics", "evolution", "organism", "enzyme", "ecosystem", "anatomy", "physiology"], ["medicine", "chemistry", "psychology", "education"], ["FACTUAL", "CONCEPTUAL"]),
    domain("medicine", "Medicine", ["medicine", "symptom", "diagnosis", "treatment", "disease", "clinical", "patient", "drug", "health"], ["biology", "chemistry", "law", "psychology"], ["FACTUAL", "DECISION", "CONCEPTUAL"]),
    domain("law", "Law", ["law", "legal", "contract", "liability", "compliance", "policy", "regulation", "court", "rights"], ["business", "security", "medicine", "finance"], ["FACTUAL", "DECISION"]),
    domain("finance", "Finance", ["finance", "budget", "valuation", "investment", "cash flow", "revenue", "cost", "market", "accounting"], ["business", "mathematics", "marketing", "law"], ["FACTUAL", "DECISION"]),
    domain("business", "Business", ["business", "strategy", "operations", "growth", "management", "startup", "market", "execution", "customer"], ["finance", "marketing", "writing", "law"], ["DECISION", "CONCEPTUAL", "CREATIVE"]),
    domain("marketing", "Marketing", ["marketing", "campaign", "positioning", "audience", "conversion", "brand", "copy", "channel", "growth"], ["business", "writing", "psychology", "frontend"], ["CREATIVE", "DECISION"]),
    domain("writing", "Writing", ["writing", "draft", "email", "essay", "story", "post", "headline", "tone", "editing", "outline"], ["marketing", "business", "education", "history"], ["CREATIVE", "CONCEPTUAL"]),
    domain("history", "History", ["history", "timeline", "empire", "war", "ancient", "revolution", "century", "civilization", "date"], ["geography", "law", "education", "writing"], ["FACTUAL", "CONCEPTUAL"]),
    domain("geography", "Geography", ["geography", "capital", "country", "population", "region", "map", "border", "city", "continent"], ["history", "education", "business", "sports"], ["FACTUAL", "CONCEPTUAL"]),
    domain("psychology", "Psychology", ["psychology", "behavior", "cognition", "emotion", "motivation", "habit", "bias", "therapy", "learning"], ["education", "marketing", "medicine", "writing"], ["CONCEPTUAL", "DECISION", "CREATIVE"]),
    domain("education", "Education", ["education", "teaching", "learning", "curriculum", "student", "lesson", "pedagogy", "explain", "study"], ["psychology", "writing", "history", "mathematics"], ["CONCEPTUAL", "FACTUAL", "CREATIVE"]),
    domain("cooking", "Cooking", ["cooking", "recipe", "ingredient", "bake", "roast", "saute", "flavor", "kitchen", "meal"], ["chemistry", "writing", "business", "medicine"], ["CREATIVE", "FACTUAL", "DECISION"]),
    domain("sports", "Sports", ["sports", "team", "player", "score", "season", "coach", "training", "match", "competition"], ["psychology", "geography", "business", "medicine"], ["FACTUAL", "DECISION", "CREATIVE"])
];
function buildDocument(node) {
    const tokens = (0, tokenizer_1.tokenizeAndStem)(node.keywords.join(" "));
    const termFrequency = new Map();
    for (const token of tokens) {
        termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
    }
    return {
        node,
        tokens,
        termFrequency,
        length: tokens.length
    };
}
function computeDocumentFrequency(documents) {
    const frequency = new Map();
    for (const document of documents) {
        const uniqueTokens = new Set(document.tokens);
        for (const token of uniqueTokens) {
            frequency.set(token, (frequency.get(token) ?? 0) + 1);
        }
    }
    return frequency;
}
function bm25Score(graph, document, queryTerms) {
    if (queryTerms.length === 0) {
        return 0;
    }
    const uniqueQueryTerms = new Set(queryTerms);
    let score = 0;
    for (const term of uniqueQueryTerms) {
        const termFrequency = document.termFrequency.get(term) ?? 0;
        if (termFrequency === 0) {
            continue;
        }
        const documentFrequency = graph.documentFrequency.get(term) ?? 0;
        if (documentFrequency === 0) {
            continue;
        }
        const idf = Math.log(1 + (graph.documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
        const numerator = termFrequency * (BM25_K1 + 1);
        const denominator = termFrequency +
            BM25_K1 * (1 - BM25_B + BM25_B * (document.length / Math.max(graph.averageDocumentLength, 1)));
        score += idf * (numerator / denominator);
    }
    return score;
}
function fallbackNodesForIntent(graph, intent) {
    return graph.nodes
        .filter((node) => node.intent_affinity.includes(intent))
        .slice(0, 5)
        .map((node, index) => ({
        id: node.id,
        label: node.label,
        score: Number((0.15 - index * 0.01).toFixed(4)),
        source: index < 2 ? "primary" : "related"
    }));
}
function buildGraph(nodes = DOMAIN_NODES) {
    const documents = nodes.map(buildDocument);
    const totalLength = documents.reduce((sum, document) => sum + document.length, 0);
    return {
        nodes,
        documents,
        documentFrequency: computeDocumentFrequency(documents),
        nodeById: new Map(nodes.map((node) => [node.id, node])),
        averageDocumentLength: totalLength / Math.max(documents.length, 1)
    };
}
function queryGraph(graph, prompt, intent) {
    const queryTerms = (0, tokenizer_1.tokenizeAndStem)(prompt);
    const scoredPrimary = graph.documents
        .map((document) => {
        let score = bm25Score(graph, document, queryTerms);
        if (document.node.intent_affinity.includes(intent)) {
            score *= INTENT_AFFINITY_BOOST;
        }
        return {
            id: document.node.id,
            label: document.node.label,
            score,
            source: "primary"
        };
    })
        .sort((left, right) => right.score - left.score);
    const topPrimary = scoredPrimary.filter((item) => item.score > 0).slice(0, 2);
    if (topPrimary.length === 0) {
        return fallbackNodesForIntent(graph, intent);
    }
    const combined = new Map();
    for (const item of topPrimary) {
        combined.set(item.id, item);
    }
    for (const primary of topPrimary) {
        const node = graph.nodeById.get(primary.id);
        if (!node) {
            continue;
        }
        for (const relatedId of node.related_domains) {
            const relatedNode = graph.nodeById.get(relatedId);
            if (!relatedNode) {
                continue;
            }
            const existing = combined.get(relatedId);
            const relatedScore = Number((primary.score * RELATED_DOMAIN_WEIGHT).toFixed(4));
            if (existing) {
                existing.score = Number(Math.max(existing.score, relatedScore).toFixed(4));
                continue;
            }
            combined.set(relatedId, {
                id: relatedId,
                label: relatedNode.label,
                score: relatedScore,
                source: "related",
                relatedTo: primary.id
            });
        }
    }
    return Array.from(combined.values())
        .sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }
        if (left.source !== right.source) {
            return left.source === "primary" ? -1 : 1;
        }
        return 0;
    })
        .slice(0, 5)
        .map((item) => ({
        ...item,
        score: Number(item.score.toFixed(4))
    }));
}
function listKnowledgeDomains() {
    return structuredClone(DOMAIN_NODES);
}
exports.DEFAULT_KNOWLEDGE_GRAPH = buildGraph();
//# sourceMappingURL=KnowledgeGraph.js.map