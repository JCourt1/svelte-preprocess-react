import MagicString from "magic-string";
import { compile, preprocess } from "svelte/compiler";
import type {
  CompileOptions,
  Element,
  Script,
  TemplateNode,
  Transition,
} from "svelte/types/compiler/interfaces";
import type {
  PreprocessorGroup,
  Processed,
} from "svelte/types/compiler/preprocess";
import fs from "fs/promises";
import path from "path";

type Options = {
  react?: number | "auto";
  errorMode?: "throw" | "warn";
  preprocess?: PreprocessorGroup | PreprocessorGroup[];
};

const defaults = {
  errorMode: "throw",
} as const;
export default function preprocessReact(
  options: Options = {}
): PreprocessorGroup {
  const errorMode = options.errorMode ?? defaults.errorMode;

  return {
    async markup({ content, filename }) {
      try {
        let preprocessed: Processed | undefined;
        if (options.preprocess) {
          preprocessed = await preprocess(content, options.preprocess, {
            filename,
          });
          // eslint-disable-next-line no-param-reassign
          content = preprocessed.code;
        }
        let react: number = options?.react as number;
        if (!options.react || options.react === "auto") {
          react = await detectReactVersion();
        }
        const processed = transform(content, { filename, errorMode, react });
        if (!preprocessed) {
          return processed;
        }
        if (!processed.map) {
          return preprocessed;
        }
        return {
          code: processed.code,
          map: preprocessed.map ?? processed.map, // @todo apply sourcemaps
          dependencies: preprocessed.dependencies,
        };
      } catch (err) {
        if (errorMode === "throw") {
          throw err;
        }
        console.warn(err);
        return { code: content };
      }
    },
  };
}
type TransformOptions = {
  react: number;
  filename?: string;
  errorMode: CompileOptions["errorMode"];
};
function transform(content: string, options: TransformOptions) {
  const importStatement =
    options.react >= 18
      ? 'import sveltifyReact from "svelte-preprocess-react/sveltifyReact18";'
      : 'import sveltifyReact from "svelte-preprocess-react/sveltifyReact17";';

  const compiled = compile(content, {
    filename: options.filename,
    errorMode: options.errorMode,
    generate: false,
  });
  const s = new MagicString(content, { filename: options.filename });
  const components = replaceReactTags(compiled.ast.html, s);

  if (components.length === 0) {
    return { code: content };
  }
  const script = compiled.ast.instance || (compiled.ast.module as Script);
  const wrappers = components
    .map((component) => {
      return `const React$${component} = sveltifyReact(${component});`;
    })
    .join(";");

  if (!script) {
    s.prepend(`<script>\n${importStatement}\n\n${wrappers}\n</script>\n\n`);
  } else {
    s.appendRight(script.content.end, wrappers);
    s.appendRight(script.content.start, importStatement);
  }
  return {
    code: s.toString(),
    map: s.generateMap(),
  };
}

function replaceReactTags(
  node: TemplateNode,
  content: MagicString,
  components: string[] = []
) {
  /* eslint-disable no-param-reassign */
  if (node.type === "Element" && node.name.startsWith("react:")) {
    if (node.children && node.children.length > 0) {
      throw new Error(
        "Nested components are not (yet) supported in svelte-preprocess-react"
      );
    }
    const tag = node as Element;
    const component = tag.name.slice(6);
    const tagStart = node.start;
    const tagEnd = node.end;
    const closeStart = tagEnd - tag.name.length - 3;
    content.overwrite(tagStart + 1, tagStart + 7, "React$");
    if (content.slice(closeStart, closeStart + 8) === `</react:`) {
      content.overwrite(closeStart + 2, closeStart + 8, `React$`);
    }
    if (components.includes(component) === false) {
      components.push(component);
    }
    tag.attributes.forEach((attr) => {
      if (attr.type === "EventHandler") {
        const event = attr as Transition;
        if (event.modifiers.length > 0) {
          throw new Error(
            "event modifier are not (yet) supported for React components"
          );
        }
        const eventStart = event.start;
        content.overwrite(
          eventStart,
          eventStart + 4,
          `on${event.name[0].toUpperCase()}`
        );
      }
    });
  }
  node.children?.forEach((child) => {
    replaceReactTags(child, content, components);
  });
  return components;
}

async function detectReactVersion(): Promise<number> {
  try {
    const pkg = await fs.readFile(path.resolve(process.cwd(), "package.json"));
    const json = JSON.parse(pkg.toString());
    const semver = json.devDependencies.react || json.dependencies.react;
    const match = `${semver}`.match(/[^0-9]*([0-9]+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    throw new Error("No react in dependencies");
  } catch (err) {
    console.warn('Could not detect React version. Assuming "react@18"');
    return 18;
  }
}
