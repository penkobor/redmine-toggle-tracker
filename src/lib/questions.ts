import readline from "readline";

export function askQuestion<T>(
  question: string,
  transformer?: (answer: string) => T
): Promise<T> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise<T>((resolve, reject) => {
    rl.question(question, (answer) => {
      try {
        const result = transformer
          ? transformer(answer)
          : (answer as unknown as T);
        rl.close();
        resolve(result);
      } catch (err) {
        rl.close();
        reject(err);
      }
    });
  });
}
