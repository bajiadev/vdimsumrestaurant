const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "assets/images/sample.png");
const outPath = path.join(__dirname, "lib/favicon-bytes.ts");
const buffer = fs.readFileSync(filePath);
const byteArray = Array.from(buffer);

const lines = [];
lines.push("// Auto-generated favicon PNG bytes");
lines.push("export const faviconPngBytes = [");
for (let i = 0; i < byteArray.length; i += 16) {
  lines.push(
    "  " +
      byteArray.slice(i, i + 16).join(", ") +
      (i + 16 < byteArray.length ? "," : ""),
  );
}
lines.push("];\n");

fs.writeFileSync(outPath, lines.join("\n"));
console.log("Wrote favicon-bytes.ts!");
