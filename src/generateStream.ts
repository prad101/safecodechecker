export async function generateStream(prompt: string): Promise<string> {
    const prompts = [
        "check if this would make a runtime error: ",
        "check if code is sharing personal information including private keys, database credentials, or cryptographic secrets:"
    ];
    let finalResult = "";
    for (const p of prompts) {
        const fullPrompt = p + prompt;

        const res = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3.1:latest",
                prompt: fullPrompt,
                stream: true
            })
        });

        if (!res.body) {
            throw new Error("No response body from Ollama");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let partialResult = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            for (const line of chunk.split("\n")) {
                if (!line.trim()) continue;
                const obj = JSON.parse(line);
                if (obj.response) {
                    partialResult += obj.response;
                    // console.log(obj.response); 
                }
            }
        }
        finalResult += partialResult + "\n\n-----------------------\n\n";
        // console.log("\n\n[done]");
    }
    return finalResult;
}
