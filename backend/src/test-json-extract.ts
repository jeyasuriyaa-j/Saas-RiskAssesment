import { extractJSON } from './services/ai.service';


// Logger mocking removed to avoid type errors
// logger.info = console.log;
// logger.error = console.error;

const testCases = [
    {
        name: "Llama 3 Markdown Block",
        input: "Here is the JSON you requested:\n```json\n[{ \"id\": 1, \"title\": \"Test\" }]\n```",
        expected: [{ id: 1, title: "Test" }]
    },
    {
        name: "Llama 3 Plain Text Preamble",
        input: "Sure, here is the data:\n[{ \"id\": 2, \"title\": \"Test 2\" }]",
        expected: [{ id: 2, title: "Test 2" }]
    },
    {
        name: "Broken JSON (Fallback)",
        input: "Unexpected output...",
        shouldFail: true
    }
];

function runTests() {
    console.log("--- Testing JSON Extraction ---");
    let passed = 0;

    testCases.forEach((test, i) => {
        try {
            console.log(`Test ${i + 1}: ${test.name}`);
            const result = extractJSON(test.input);
            console.log("Parsed:", JSON.stringify(result));

            if (test.shouldFail) {
                console.error("FAILED: Should have thrown error");
            } else {
                passed++;
                console.log("PASSED");
            }
        } catch (e: any) {
            if (test.shouldFail) {
                passed++;
                console.log("PASSED (Expected Failure)");
            } else {
                console.error("FAILED:", e.message);
            }
        }
        console.log("---");
    });

    console.log(`Result: ${passed}/${testCases.length} passed.`);
}

runTests();
