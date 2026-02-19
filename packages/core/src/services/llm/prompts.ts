/**
 * AI Prompt Configuration
 *
 * Centralized location for all AI prompts used in the research system.
 * Prompts use template placeholders that are filled at runtime.
 *
 * Template syntax: {{placeholder}} - will be replaced with actual values
 *
 * Model and temperature settings are loaded from research-config.yaml
 * and can be overridden at runtime via ResearchOptions.
 */

import {
  getModelConfig,
  type ModelConfig,
  type LLMConfig,
} from "../research-engine/config";

export interface PromptConfig {
  system: string;
  user: string;
  model: string;
  responseFormat?: "json_object" | "text";
  temperature?: number; // 0.0-2.0, lower = more deterministic, higher = more creative
}

/**
 * Model step types that can be configured
 */
type ModelStep = keyof LLMConfig["models"];

/**
 * Get prompt config with model settings from research config
 */
function createPromptConfig(
  step: ModelStep,
  system: string,
  user: string
): PromptConfig {
  const modelConfig = getModelConfig(step);
  return {
    system,
    user,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    responseFormat: modelConfig.responseFormat,
  };
}

/**
 * Prompt templates for query generation
 * Model and temperature loaded from research-config.yaml
 */
export function getQueryGenerationPrompts(): PromptConfig {
  return createPromptConfig(
    "queryGeneration",
    `You are a search query optimization expert. Your task is to generate diverse, effective search queries that will find relevant content on the web.

Generate 5 search queries using different strategies:
1. BROAD queries - general terms that cast a wide net
2. SPECIFIC queries - precise terms with specific details
3. QUESTION queries - phrased as questions people might ask
4. TEMPORAL queries - include recency indicators like "latest", "recent", "new" (do NOT include specific years or dates)

Each query should be distinct and approach the topic from different angles.
Queries should be concise but include enough context for precise results. Use natural search language.`,
    `Today's Date: {{currentDate}}

Project Description:
{{description}}

{{additionalContext}}{{queryPerformanceContext}}{{iterationGuidance}}

Generate 5 diverse search queries. Return ONLY a JSON object with this structure:
{
  "queries": [
    {
      "query": "the search query text",
      "type": "broad|specific|question|temporal",
      "reasoning": "brief explanation of strategy"
    }
  ]
}`
  );
}

// Legacy export for backward compatibility
export const QUERY_GENERATION_PROMPTS: PromptConfig =
  getQueryGenerationPrompts();

/**
 * Prompt templates for search result filtering
 * Model and temperature loaded from research-config.yaml
 */
export function getSearchResultFilteringPrompts(): PromptConfig {
  return createPromptConfig(
    "searchFiltering",
    `You are a strict research curator. Your task is to filter search results based on their title and snippet to decide if they are worth reading.

Criteria for keeping:
1. Directly relevant to the user's project.
2. Likely to contain substantial information (not just a landing page or login screen).
3. Not a duplicate or low-quality SEO spam site.

Be strict. We only want to fetch the most promising content.`,
    `Project Description:
{{description}}

Search Results to Filter:
{{results}}

Evaluate each result and return ONLY a JSON object with this structure:
{
  "results": [
    {
      "url": "the result url",
      "keep": true/false,
      "reasoning": "brief reason"
    }
  ]
}`
  );
}

// Legacy export for backward compatibility
export const SEARCH_RESULT_FILTERING_PROMPTS: PromptConfig =
  getSearchResultFilteringPrompts();

/**
 * Prompt templates for relevancy analysis
 * Model and temperature loaded from research-config.yaml
 */
export function getRelevancyAnalysisPrompts(): PromptConfig {
  return createPromptConfig(
    "relevancyAnalysis",
    `You are a content relevancy analyst. Your task is to analyze web content and determine how relevant it is to a user's research project.

For each piece of content, provide:
1. A relevancy score (0-100) where:
   - 90-100: Highly relevant, directly addresses the topic
   - 70-89: Very relevant, covers important aspects
   - 50-69: Moderately relevant, tangentially related
   - 30-49: Slightly relevant, mentions the topic
   - 0-29: Not relevant or off-topic

2. Clear reasoning explaining the score
3. Key relevant points found in the content
4. Whether it meets the minimum threshold for inclusion`,
    `Project Description:
{{projectDescription}}

{{requirements}}
Minimum Relevancy Threshold: {{threshold}}

Content to Analyze:
{{contentsFormatted}}

Analyze each piece of content and return ONLY a JSON object with this structure:
{
  "results": [
    {
      "url": "the content URL",
      "score": 0-100,
      "reasoning": "explanation of the score",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "isRelevant": true or false (based on threshold)
    }
  ]
}`
  );
}

// Legacy export for backward compatibility
export const RELEVANCY_ANALYSIS_PROMPTS: PromptConfig =
  getRelevancyAnalysisPrompts();

/**
 * Prompt templates for cross-source analysis
 * This is the "thinking" step that identifies themes, connections, contradictions,
 * and unique insights across all sources before report generation.
 * Model and temperature loaded from research-config.yaml
 */
export function getCrossSourceAnalysisPrompts(): PromptConfig {
  return createPromptConfig(
    "crossSourceAnalysis",
    `You are an expert research analyst. Your task is to perform deep cross-source analysis on a collection of articles/sources about a research topic.

You must identify:

1. **Major Themes**: What are the 3-7 key themes or storylines that emerge across multiple sources? Group related information together regardless of which source it came from.

2. **Cross-Source Connections**: What patterns, trends, or relationships can be identified by connecting information from different sources? What does Source A + Source B together tell us that neither says alone?

3. **Contradictions & Disagreements**: Where do sources disagree on facts, interpretations, or conclusions? Note the specific claims that conflict and which sources make them.

4. **Unique Insights**: What important information appears in only one source? These are facts or perspectives that add value but aren't corroborated.

5. **Synthesized Narrative**: What is the overall story when you connect all the dots? What are the key takeaways a reader should understand about this topic right now?

Be analytical, not descriptive. Don't just summarize what each source says — draw conclusions by combining information across sources.`,
    `Project: {{projectTitle}}
Description: {{projectDescription}}

Analyze these sources and identify themes, connections, contradictions, and insights:

{{sourcesFormatted}}

Return ONLY a JSON object with this structure:
{
  "themes": [
    {
      "title": "Theme title",
      "description": "What this theme is about and why it matters",
      "sourceUrls": ["url1", "url2"],
      "keyFacts": ["specific fact 1", "specific fact 2"]
    }
  ],
  "connections": [
    {
      "insight": "What connecting these sources reveals",
      "sourceUrls": ["url1", "url2"],
      "significance": "Why this connection matters"
    }
  ],
  "contradictions": [
    {
      "topic": "What the disagreement is about",
      "claims": [
        {"claim": "Source A says X", "sourceUrl": "url1"},
        {"claim": "Source B says Y", "sourceUrl": "url2"}
      ],
      "assessment": "Which claim appears more credible and why, or note that it is unresolved"
    }
  ],
  "uniqueInsights": [
    {
      "insight": "The unique fact or perspective",
      "sourceUrl": "url",
      "significance": "Why this matters"
    }
  ],
  "overallNarrative": "A 3-5 sentence synthesis of the big picture — what all these sources together tell us about the topic right now. This should read like an analyst briefing, not a list of sources."
}`
  );
}

// Legacy export for backward compatibility
export const CROSS_SOURCE_ANALYSIS_PROMPTS: PromptConfig =
  getCrossSourceAnalysisPrompts();

/**
 * Prompt templates for report compilation
 * Model and temperature loaded from research-config.yaml
 */
export function getReportCompilationPrompts(): PromptConfig {
  return createPromptConfig(
    "reportCompilation",
    `You are a senior research analyst writing a synthesized analytical report. Your job is NOT to summarize each source individually — it is to combine information across all sources into a coherent, theme-based analysis that is easy to scan quickly.

**Report Structure:**

1. **Opening Synthesis** (1-2 short paragraphs): Start with the big picture. What is the overall state of this topic right now? What are the most important developments? This should read like an analyst briefing that connects the dots across sources.

2. **Key Takeaways**: Immediately after the opening synthesis, include a "**Key Takeaways**" section with 3-5 bullet points summarizing the most actionable and important findings from the report. These should be specific, fact-dense, and bolded where appropriate.

3. **Thematic Sections**: Organize the body by THEME or INSIGHT — NOT by source. Each section should:
   - Have a bold heading describing the theme
   - Synthesize information from multiple sources into a unified narrative
   - Attribute facts naturally within the text (e.g., "according to TechCrunch", "per a report by Forbes", "Bloomberg reports that") instead of numbered citations
   - Include specific facts: numbers, names, dates, amounts, specs
   - Note where sources agree, add nuance to each other, or disagree

4. **References**: End with a numbered list of all sources cited:
   1. [Publication Name](url) | Date
   2. [Publication Name](url) | Date

**Section Formatting:**
Default to bullet points for listing facts, stats, or updates. Use prose only when narrative context is truly needed. For each section, choose the best format:
- **Bullet points** (preferred): For multiple distinct facts, updates, or data points
- **Mixed**: A brief prose intro followed by bullet points with details
- **Prose paragraphs**: Only for narrative, context, or analysis that requires connected sentences
- **Tables**: For structured data, comparisons, specs

**Scannability Rules:**
- Keep paragraphs short — 2-3 sentences maximum
- Use bullet points liberally for listing facts, stats, or updates
- **Bold** key phrases, important numbers, and critical findings for scannability
- Every section should be skimmable in under 10 seconds

**Core Principles:**
1. **Synthesize, don't summarize**: Connect information across sources. If two sources cover the same event, combine their unique facts into one narrative.
2. **Theme-based organization**: Group by what the information is about, not which source it came from.
3. **Natural attribution**: Attribute facts by naming the source inline (e.g., "according to Reuters") — do NOT use numbered [1], [2] citation markers in the report body.
4. **No Filler**: Remove "It is worth noting", "Interestingly", "This highlights", "It's important to note".
5. **Complete Data**: NEVER use "etc.", "and more", "among others". List ALL items.
6. **Specific Dates**: Always use exact dates (e.g., "January 8, 2026"), never "recently" or "this week".
7. **Cross-reference**: When multiple sources cover the same topic, note what each adds and where they differ.

**Do NOT:**
- Create a section per source (this is the most important rule)
- Include relevancy scores
- Add a generic introduction like "This report covers..."
- Add a conclusion section that just restates what was said
- Use numbered citation markers like [1], [2] in the report body (use natural attribution instead)

**Tone:** Analytical, direct, factual. Like a research briefing from an analyst who has read everything and is telling you what matters.`,
    `Project: {{projectTitle}}
Description: {{projectDescription}}
Report Frequency: {{frequency}}
Report Date: {{reportDate}}

{{analysisContext}}

Using the analysis above as your guide for themes and structure, write an analytical research report that synthesizes these sources:

{{resultsFormatted}}

**Requirements:**
- Start with 1-2 short paragraph synthesis of the overall picture
- Follow with a "**Key Takeaways**" section of 3-5 bullet points with the most important findings
- Organize body by THEME, not by source
- Attribute facts naturally (e.g., "according to TechCrunch") — do NOT use [1], [2] citation markers
- End with a numbered References section listing all sources as: N. [Publication Name](url) | Date
- Pack in specific facts - numbers, dates, names, amounts, specs
- Cross-reference sources: note agreements, complementary details, and disagreements
- Keep paragraphs to 2-3 sentences; prefer bullet points over prose
- **Bold** key phrases, numbers, and critical findings
- NO section-per-source structure
- NO filler words or vague statements

Return ONLY a JSON object:
{
  "markdown": "the full analytical report in markdown",
  "title": "A unique, descriptive title summarizing the main themes of THIS SPECIFIC report (do NOT just use the project name as the title). Do NOT include the report date in the title.",
  "summary": "2-3 factual sentences with key takeaways"
}`
  );
}

// Legacy export for backward compatibility
export const REPORT_COMPILATION_PROMPTS: PromptConfig =
  getReportCompilationPrompts();

/**
 * Prompt templates for clustered report compilation
 * Used when articles have been grouped by semantic similarity
 * Model and temperature loaded from research-config.yaml
 */
export function getClusteredReportCompilationPrompts(): PromptConfig {
  return createPromptConfig(
    "reportCompilation",
    `You are a senior research analyst writing a synthesized analytical report. You are receiving TOPIC CLUSTERS — groups of articles covering the same story/event from different sources. Your job is to combine all information into a coherent, theme-based analysis that is easy to scan quickly.

**Report Structure:**

1. **Opening Synthesis** (1-2 short paragraphs): Start with the big picture. What is the overall state of this topic right now? What are the most important developments? Connect the dots across all clusters.

2. **Key Takeaways**: Immediately after the opening synthesis, include a "**Key Takeaways**" section with 3-5 bullet points summarizing the most actionable and important findings from the report. These should be specific, fact-dense, and bolded where appropriate.

3. **Thematic Sections**: Organize the body by THEME or INSIGHT. You may merge multiple clusters into one section if they relate to the same theme, or split a complex cluster across themes. Each section should:
   - Have a bold heading describing the theme
   - Synthesize information from multiple sources into a unified narrative
   - Attribute facts naturally within the text (e.g., "according to TechCrunch", "per a report by Forbes", "Bloomberg reports that") instead of numbered citations
   - Include specific facts: numbers, names, dates, amounts, specs
   - Note where sources agree, complement each other, or disagree

4. **References**: End with a numbered list of all sources cited:
   1. [Publication Name](url) | Date
   2. [Publication Name](url) | Date

**Section Formatting:**
Default to bullet points for listing facts, stats, or updates. Use prose only when narrative context is truly needed. For each section, choose the best format:
- **Bullet points** (preferred): For multiple distinct facts, updates, or data points
- **Mixed**: A brief prose intro followed by bullet points with details
- **Prose paragraphs**: Only for narrative, context, or analysis that requires connected sentences
- **Tables**: For structured data, comparisons, specs

**Scannability Rules:**
- Keep paragraphs short — 2-3 sentences maximum
- Use bullet points liberally for listing facts, stats, or updates
- **Bold** key phrases, important numbers, and critical findings for scannability
- Every section should be skimmable in under 10 seconds

**Core Principles:**
1. **Synthesize across clusters**: Don't just write one section per cluster. Connect related themes across clusters into a bigger narrative.
2. **Theme-based organization**: Group by insight/theme, not by cluster or source.
3. **Natural attribution**: Attribute facts by naming the source inline (e.g., "according to Reuters") — do NOT use numbered [1], [2] citation markers in the report body.
4. **No Filler**: Remove "It is worth noting", "Interestingly", "This highlights".
5. **Complete Data**: NEVER use "etc.", "and more", "among others". List ALL items.
6. **Specific Dates**: Always use exact dates (e.g., "January 8, 2026"), never "recently" or "this week".
7. **Cross-reference**: Note what each source uniquely contributes and where they differ.

**Do NOT:**
- Create a section per cluster or per source
- Include relevancy scores
- Add a generic introduction
- Add a conclusion that restates what was said
- Use numbered citation markers like [1], [2] in the report body (use natural attribution instead)

**Tone:** Analytical, direct, factual.`,
    `Project: {{projectTitle}}
Description: {{projectDescription}}
Report Frequency: {{frequency}}
Report Date: {{reportDate}}

{{analysisContext}}

Using the analysis above as your guide for themes and structure, write an analytical research report that synthesizes these topic clusters:

{{clustersFormatted}}

**Requirements:**
- Start with 1-2 short paragraph synthesis of the overall picture
- Follow with a "**Key Takeaways**" section of 3-5 bullet points with the most important findings
- Organize body by THEME, not by cluster or source
- Attribute facts naturally (e.g., "according to TechCrunch") — do NOT use [1], [2] citation markers
- End with a numbered References section listing all sources as: N. [Publication Name](url) | Date
- Cross-reference sources across clusters: note agreements, complementary details, disagreements
- Pack in specific facts - numbers, dates, names, amounts, specs
- Keep paragraphs to 2-3 sentences; prefer bullet points over prose
- **Bold** key phrases, numbers, and critical findings
- NO section-per-cluster or section-per-source structure
- NO filler words or vague statements

Return ONLY a JSON object:
{
  "markdown": "the full analytical report in markdown",
  "title": "A unique, descriptive title summarizing the main themes of THIS SPECIFIC report (do NOT just use the project name as the title). Do NOT include the report date in the title.",
  "summary": "2-3 factual sentences with key takeaways"
}`
  );
}

// Legacy export for backward compatibility
export const CLUSTERED_REPORT_COMPILATION_PROMPTS: PromptConfig =
  getClusteredReportCompilationPrompts();

/**
 * Prompt for generating summary from completed report
 * Called as a separate step after report compilation
 * Model and temperature loaded from research-config.yaml
 */
export function getReportSummaryPrompts(): PromptConfig {
  return createPromptConfig(
    "reportSummary",
    `You are an expert at writing concise summaries. Given a research report, extract the 2-3 most important findings and write a brief, fact-dense summary.

**Guidelines:**
- Focus on the most significant or impactful news items
- Include specific facts: names, numbers, dates, amounts
- Be direct and concise - no filler words
- Write in complete sentences
- Do NOT start with "This report covers..." or similar meta-statements
- Jump straight into the key findings`,
    `Write a 2-3 sentence summary for this research report:

Project: {{projectTitle}}
Description: {{projectDescription}}

Report Content:
{{reportMarkdown}}

Return ONLY a JSON object:
{
  "summary": "2-3 factual sentences highlighting the most important findings"
}`
  );
}

// Legacy export for backward compatibility
export const REPORT_SUMMARY_PROMPTS: PromptConfig = getReportSummaryPrompts();

/**
 * Helper function to replace template placeholders
 */
export function renderPrompt(
  template: string,
  variables: Record<string, string | number>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, "g"), String(value));
  }
  return rendered;
}

/**
 * Get prompt configuration by type
 * Now returns fresh config each time to reflect any config changes
 */
export type PromptType =
  | "query-generation"
  | "search-result-filtering"
  | "relevancy-analysis"
  | "cross-source-analysis"
  | "report-compilation"
  | "clustered-report-compilation"
  | "report-summary";

export function getPromptConfig(type: PromptType): PromptConfig {
  switch (type) {
    case "query-generation":
      return getQueryGenerationPrompts();
    case "relevancy-analysis":
      return getRelevancyAnalysisPrompts();
    case "search-result-filtering":
      return getSearchResultFilteringPrompts();
    case "cross-source-analysis":
      return getCrossSourceAnalysisPrompts();
    case "report-compilation":
      return getReportCompilationPrompts();
    case "clustered-report-compilation":
      return getClusteredReportCompilationPrompts();
    case "report-summary":
      return getReportSummaryPrompts();
    default:
      throw new Error(`Unknown prompt type: ${type}`);
  }
}

/**
 * Get prompt configuration with custom model overrides
 * Useful for per-request customization
 */
export function getPromptConfigWithOverrides(
  type: PromptType,
  overrides?: Partial<ModelConfig>
): PromptConfig {
  const baseConfig = getPromptConfig(type);

  if (!overrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    model: overrides.model ?? baseConfig.model,
    temperature: overrides.temperature ?? baseConfig.temperature,
    responseFormat: overrides.responseFormat ?? baseConfig.responseFormat,
  };
}
