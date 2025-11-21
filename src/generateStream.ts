import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

// Load YAML
// const yamlPath = 'src/prompts.yaml';
const yamlPath = path.join(__dirname, "../src/prompts.yaml");
let prompts: any = {};

try {
    prompts = yaml.load(fs.readFileSync(yamlPath, "utf8"));
} catch (err) {
    console.error("Failed to load YAML prompts:", err);
}

// get prompt template
const promptTemplate = prompts.security_analysis.comprehensive_check.prompt;

export async function generateStream(code: string): Promise<string> {

    let jsonResult: any = {};

    const model = "llama3.1:latest"

    const finalPrompt = promptTemplate.replace("{code}", code) +
        "\n\nReturn ONLY valid JSON. If unable, return raw text.";
    console.log("Sending prompt\n", finalPrompt.substring(0, 100) + "...");

    const res = await fetch(
        "http://localhost:11434/api/generate", 
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                // model: "codellama:7b",
                prompt: finalPrompt,
                options: {
                    temperature: 0.2,
                    top_k: 10,
                    top_p: 0.9,
                    repeat_penalty: 1.2,
                    num_predict: 2048,
                },
                stream: false
            })
        }
    );

    if (!res.body) {
        throw new Error("No response body from Ollama");
    }
    // print model name
    console.log("Receiving streamed response from", model);
    jsonResult = await res.json(); // { response: "..." }
    let output = extractJson(jsonResult.response);

    // Parse JSON, raw text if fails
    try {
        const jsonObj = JSON.parse(output);
        return JSON.stringify(jsonObj, null, 2); // pretty JSON
    } catch (err) {
        console.warn("JSON parse failed, returning raw model output.");
        return output; // fallback: raw LLM text
    }
}

// Extract JSON substring from text
function extractJson(text: string): string {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
        console.warn("No JSON object found in LLM output, returning raw text.");
    }

    return text.substring(start, end + 1);
}
