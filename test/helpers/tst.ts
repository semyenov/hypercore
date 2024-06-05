type TypeResult = {
  type: "primitive" | "array" | "object";
  key: string;
  value?: string;
  children?: TypeResult[];
};

interface DetectTypesContext {
  visitedKeys: Set<string>;
}

function detectTypes(val: any, key: string, depth = 3): TypeResult {
  // If the current depth is greater than 2, return a generic object type
  if (depth === 0) return { type: "primitive", key, value: "DEPTH" };

  if (typeof val === "object" && val !== null) {
    if (Array.isArray(val)) {
      const elementType = detectTypes(val[0], "[0]", depth - 1);
      return { type: "array", value: `Array`, key, children: [elementType] };
    }

    const value = val.constructor?.name || "Object";
    switch (value) {
      case "Buffer":
        return { type: "primitive", key, value: "Buffer" };
      default: {
        const children = Object.entries(val).map(([currentKey, val]) => {
          const valueType = detectTypes(val, currentKey, depth - 1);
          return valueType;
        });

        return {
          type: "object",
          key,
          value,
          children,
        };
      }
    }
  }

  switch (typeof val) {
    case "string":
      return { type: "primitive", key, value: "string" };
    case "number":
      return { type: "primitive", key, value: "number" };
    case "boolean":
      return { type: "primitive", key, value: "boolean" };
    default:
      return { type: "primitive", key, value: typeof val };
  }
}

function printTree(data: TypeResult, indentLevel = 0): void {
  if (data.key.startsWith("_")) return;

  const indentation =
    indentLevel > 0 ? "│ ".repeat(indentLevel - 1) + "├" + "─" : ""; // Adjust the multiplier as needed

  switch (data.type) {
    case "primitive":
      console.log(`${indentation}${data.key}: ${data.value}`);
      break;
    case "array":
      console.log(`${indentation}${data.key}: Array`);
      data.children?.forEach((child) => printTree(child, indentLevel + 1));
      break;
    case "object":
      console.log(`${indentation}${data.key}: ${data.value} {`);
      if (data.children) {
        data.children.forEach((child) => printTree(child, indentLevel + 1));
        console.log(`${indentation.slice(0, -2)}`);
      }
      break;
    default:
      console.error("Unknown type");
  }
}

export = function detectTypesTest(root: any, depth = 1) {
  const data = detectTypes(root, "root", depth);
  printTree(data);
};
