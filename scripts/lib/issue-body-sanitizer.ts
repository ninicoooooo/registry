import { parse } from "yaml";

/**
 * Issue-form body sanitizer.
 *
 * GitHub issue forms render each field as an h3 label heading, and the
 * downstream parser treats every h3 line as a field boundary. An h3 line
 * inside a free-text field value therefore truncates that field.
 *
 * Before parsing, unknown h3 headings are demoted to h4. Known field headings
 * remain unchanged.
 */

const H3_LINE = /^###(?!#)[ \t]*(.*?)[ \t]*$/;

type IssueTemplate = {
  body?: Array<{ attributes?: { label?: unknown } }>;
};

/**
 * Extracts labels from parsed GitHub issue-form YAML. Parsing YAML preserves
 * quoted labels that wrap across physical lines.
 */
export function extractTemplateLabels(templateYaml: string): Set<string> {
  const template = parse(templateYaml) as IssueTemplate;
  const labels = new Set<string>();
  for (const field of template.body ?? []) {
    const label = field.attributes?.label;
    if (typeof label === "string" && label.length > 0) labels.add(label);
  }
  return labels;
}

export interface SanitizedIssueBody {
  body: string;
  /** Titles of the h3 lines that were demoted to h4. */
  demoted: string[];
}

/**
 * Demotes every unknown h3 heading to h4. Exact-label headings and all other
 * content pass through unchanged.
 */
export function sanitizeIssueBody(
  body: string,
  labels: ReadonlySet<string>,
): SanitizedIssueBody {
  const demoted: string[] = [];
  const lines = body.split("\n").map((line) => {
    const match = line.match(H3_LINE);
    if (!match || labels.has(match[1])) return line;
    demoted.push(match[1]);
    return `#${line}`;
  });
  return { body: lines.join("\n"), demoted };
}
