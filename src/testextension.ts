import * as fs from 'fs';
import dotenv from 'dotenv';
import * as path from 'path';
//dotenv.config();   

export async function generateStream(prompt: string): Promise<void> {

  const prompts: string[] = ["check if this would make a runtime error: ", "check if code is sharing personal inormation including private keys: "];

   for(var p of prompts){
  prompt =  p + prompt; 
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3.1:latest",
      prompt,
      stream: true
    })
  });


  if (!res.body) {
    throw new Error("No response body from Ollama");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();


  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);

    // Each line is a JSON object
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);

      if (obj.response) {
        process.stdout.write(obj.response); // stream token to console
      }
    }
  
}
   

  console.log("\n\n[done]");
}
}
/*
const from: string = 'src/app/utils';
const to: string = 'src/environments/dev.env';
const relativePath: string = path.relative(from, to);
// Example usage:
const userinput = fs.readFileSync(relativePath, 'utf-8');
//generateStream(userinput);
*/

generateStream("using namespace std; int main() {vector<int> arr = {1, 2}; try {cout << arr.at(2) << endl;} catch (const out_of_range& e) {cout << 'Error the index is out of bound'<< endl; } return 0;}");