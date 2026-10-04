// Garde-fou i18n : aucun texte affiché ne doit être écrit en dur dans les composants (`src/**/*.tsx`).
// Tout passe par le dictionnaire `fr` de `src/lib/i18n/fr` (voir CLAUDE.md, « Textes de l'UI »).
//
// Repère : du texte brut dans le JSX (<p>Bonjour</p>), une chaîne littérale ou un gabarit affiché
// comme enfant JSX ({"Bonjour"}, {ok ? "Oui" : "Non"}) et les attributs qui s'affichent
// (label, placeholder, title, description, aria-label, alt).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

const ROOT = new URL("../src", import.meta.url).pathname;
const IGNORED_DIRS = new Set([join(ROOT, "lib", "i18n")]);
const TEXT_ATTRIBUTES = new Set([
  "label",
  "placeholder",
  "title",
  "description",
  "aria-label",
  "alt",
]);
const HAS_WORD = /\p{L}{2,}/u;

function* tsxFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (IGNORED_DIRS.has(path)) continue;
    if (statSync(path).isDirectory()) yield* tsxFiles(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

/** Textes littéraux que l'expression peut afficher (chaînes, gabarits, branches d'un ?: / && / ??). */
function* literalTexts(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    yield node.text;
  } else if (ts.isTemplateExpression(node)) {
    yield node.head.text;
    for (const span of node.templateSpans) yield span.literal.text;
  } else if (ts.isParenthesizedExpression(node)) {
    yield* literalTexts(node.expression);
  } else if (ts.isConditionalExpression(node)) {
    yield* literalTexts(node.whenTrue);
    yield* literalTexts(node.whenFalse);
  } else if (ts.isBinaryExpression(node)) {
    yield* literalTexts(node.right);
  }
}

const problems = [];

for (const file of tsxFiles(ROOT)) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    problems.push(`${relative(process.cwd(), file)}:${line + 1}  ${JSON.stringify(text.trim())}`);
  };

  const visit = (node) => {
    if (ts.isJsxText(node) && HAS_WORD.test(node.text)) {
      report(node, node.text);
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      // `{...}` enfant d'un élément : ce qu'il affiche est du texte.
      for (const text of literalTexts(node.expression)) if (HAS_WORD.test(text)) report(node, text);
    } else if (
      ts.isJsxAttribute(node) &&
      TEXT_ATTRIBUTES.has(node.name.getText()) &&
      node.initializer
    ) {
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      if (value)
        for (const text of literalTexts(value)) if (HAS_WORD.test(text)) report(node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (problems.length > 0) {
  console.error("Texte en dur dans le JSX : à déplacer dans `src/lib/i18n/fr` (puis `fr.xxx`) :\n");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
