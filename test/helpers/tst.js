"use strict";
function detectTypes(val, key, depth) {
    var _a;
    if (depth === void 0) { depth = 3; }
    // If the current depth is greater than 2, return a generic object type
    if (depth === 0)
        return { type: "primitive", key: key, value: "DEPTH" };
    if (typeof val === "object" && val !== null) {
        if (Array.isArray(val)) {
            var elementType = detectTypes(val[0], "[0]", depth - 1);
            return { type: "array", value: "Array", key: key, children: [elementType] };
        }
        var value = ((_a = val.constructor) === null || _a === void 0 ? void 0 : _a.name) || "Object";
        switch (value) {
            case "Buffer":
                return { type: "primitive", key: key, value: "Buffer" };
            default: {
                var children = Object.entries(val).map(function (_a) {
                    var currentKey = _a[0], val = _a[1];
                    var valueType = detectTypes(val, currentKey, depth - 1);
                    return valueType;
                });
                return {
                    type: "object",
                    key: key,
                    value: value,
                    children: children,
                };
            }
        }
    }
    switch (typeof val) {
        case "string":
            return { type: "primitive", key: key, value: "string" };
        case "number":
            return { type: "primitive", key: key, value: "number" };
        case "boolean":
            return { type: "primitive", key: key, value: "boolean" };
        default:
            return { type: "primitive", key: key, value: typeof val };
    }
}
function printTree(data, indentLevel) {
    var _a;
    if (indentLevel === void 0) { indentLevel = 0; }
    if (data.key.startsWith("_"))
        return;
    var indentation = indentLevel > 0 ? "│ ".repeat(indentLevel - 1) + "├" + "─" : ""; // Adjust the multiplier as needed
    switch (data.type) {
        case "primitive":
            console.log("".concat(indentation).concat(data.key, ": ").concat(data.value));
            break;
        case "array":
            console.log("".concat(indentation).concat(data.key, ": Array"));
            (_a = data.children) === null || _a === void 0 ? void 0 : _a.forEach(function (child) { return printTree(child, indentLevel + 1); });
            break;
        case "object":
            console.log("".concat(indentation).concat(data.key, ": ").concat(data.value, " {"));
            if (data.children) {
                data.children.forEach(function (child) { return printTree(child, indentLevel + 1); });
                console.log("".concat(indentation.slice(0, -2)));
            }
            break;
        default:
            console.error("Unknown type");
    }
}
module.exports = function detectTypesTest(root, depth) {
    if (depth === void 0) { depth = 1; }
    var data = detectTypes(root, "root", depth);
    printTree(data);
};
